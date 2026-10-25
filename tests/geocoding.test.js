import assert from 'node:assert/strict';
import test from 'node:test';
import { createGeocodingService } from '../src/services/geocoding.js';

const config = {
  dataMode: 'live',
  fixtureDirectory: '',
  geogouvCompletionEndpoint: 'https://data.geopf.test/geocodage/completion/',
  geocodingTimeoutMs: 1_000,
  userAgent: 'DriveSpot-Test/1.0',
};

test('transforme les résultats GeoGouv et envoie les paramètres d’autocomplétion', async () => {
  let requestedUrl;
  const fetchImpl = async (url) => {
    requestedUrl = new URL(url);
    return {
      ok: true,
      json: async () => ({
        status: 'OK',
        results: [
          {
            x: 4.831662,
            y: 45.757597,
            fulltext: 'Place Bellecour, 69002 Lyon',
          },
        ],
      }),
    };
  };

  const service = createGeocodingService(config, { fetchImpl });
  const suggestions = await service.suggest('Place Bellecour');

  assert.equal(requestedUrl.searchParams.get('text'), 'Place Bellecour');
  assert.equal(requestedUrl.searchParams.get('type'), 'StreetAddress');
  assert.equal(requestedUrl.searchParams.get('maximumResponses'), '5');
  assert.deepEqual(suggestions[0], {
    id: '4.831662:45.757597:0',
    label: 'Place Bellecour, 69002 Lyon',
    latitude: 45.757597,
    longitude: 4.831662,
  });
});

test('refuse une réponse GeoGouv malformée', async () => {
  const service = createGeocodingService(config, {
    fetchImpl: async () => ({ ok: true, json: async () => ({ status: 'OK' }) }),
  });
  await assert.rejects(
    service.suggest('Place Bellecour'),
    (error) => error.code === 'MALFORMED_GEOCODING_RESPONSE',
  );
});

