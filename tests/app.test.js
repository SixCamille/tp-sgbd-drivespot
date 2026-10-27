// Parcours d'intégration HTTP complet avec des doubles GeoGouv et Overpass hors ligne.
import assert from 'node:assert/strict';
import test from 'node:test';
import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';

const overpassElements = [
  { junction: 'roundabout' },
  { highway: 'mini_roundabout' },
  { highway: 'traffic_signals' },
  { highway: 'stop' },
  { highway: 'give_way' },
  { highway: 'crossing' },
  { traffic_calming: 'bump' },
  { traffic_calming: 'table' },
  { railway: 'level_crossing' },
  { highway: 'crossing', bicycle: 'yes' },
  { highway: 'stop' },
  { highway: 'traffic_signals' },
  { highway: 'crossing' },
  { traffic_calming: 'hump' },
  { junction: 'roundabout' },
].map((tags, index) => ({
  type: 'node',
  id: index + 1,
  lat: 45.7578 + (index < 6 ? index * 0.00001 : (index - 5) * 0.0014),
  lon: 4.832 + (index < 6 ? index * 0.00001 : (index - 5) * 0.0014),
  tags,
}));

async function withServer(action) {
  const config = loadConfig({
    NEXTGIS_OVERPASS_URL: 'https://overpass.nextgis.test/test-key/api/interpreter',
  });
  const fetchImpl = async (url) => {
    const requestedUrl = new URL(url);
    if (requestedUrl.hostname === 'overpass.nextgis.test') {
      return { ok: true, json: async () => ({ elements: overpassElements }) };
    }
    const query = requestedUrl.searchParams.get('text');
    const isPartDieu = query.toLocaleLowerCase('fr').includes('part-dieu');
    return {
      ok: true,
      json: async () => ({
        status: 'OK',
        results: [
          isPartDieu
            ? {
                x: 4.859,
                y: 45.7606,
                fulltext: 'Gare Part-Dieu, 69003 Lyon',
              }
            : {
                x: 4.832,
                y: 45.7578,
                fulltext: 'Place Bellecour, 69002 Lyon',
              },
        ],
      }),
    };
  };
  const server = createApp(config, { fetchImpl }).listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  try {
    const { port } = server.address();
    await action(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test('le parcours API expose suggestions, dix catégories et un cluster', async () => {
  await withServer(async (baseUrl) => {
    const suggestionsResponse = await fetch(`${baseUrl}/api/suggestions?q=Bellecour`);
    assert.equal(suggestionsResponse.status, 200);
    const suggestions = await suggestionsResponse.json();
    assert.ok(suggestions.suggestions.length > 0);

    const searchResponse = await fetch(`${baseUrl}/api/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        address: 'Place Bellecour, Lyon',
        latitude: 45.7578,
        longitude: 4.832,
      }),
    });
    assert.equal(searchResponse.status, 200);
    const result = await searchResponse.json();
    assert.equal(result.source, 'OpenStreetMap');
    assert.equal(result.pois.length, 15);
    assert.equal(new Set(result.pois.map((poi) => poi.category)).size, 10);
    assert.equal(result.clusters.length, 1);
    assert.equal(result.clusters[0].count, 6);
    assert.equal(result.clusters[0].categoryCount, 6);
  });
});

test('une recherche accepte une adresse sans suggestion sélectionnée', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: 'Gare Part-Dieu Lyon' }),
    });
    assert.equal(response.status, 200);
  });
});

test('des coordonnées saisies permettent de rechercher sans service de géocodage', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: '45.7578, 4.8320' }),
    });
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.equal(result.center.latitude, 45.7578);
    assert.equal(result.center.longitude, 4.832);
  });
});

test('une recherche vide renvoie une erreur explicite', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: '' }),
    });
    assert.equal(response.status, 400);
    assert.equal((await response.json()).code, 'INVALID_ADDRESS');
  });
});

