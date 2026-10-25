import assert from 'node:assert/strict';
import test from 'node:test';
import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';

async function withServer(action) {
  const config = loadConfig({ DATA_MODE: 'fixture' });
  const fetchImpl = async (url) => {
    const query = new URL(url).searchParams.get('text');
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

test('le parcours fixture expose suggestions, dix catégories et un cluster', async () => {
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
  });
});

test('une recherche fixture accepte une adresse sans suggestion sélectionnée', async () => {
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

