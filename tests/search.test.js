import assert from 'node:assert/strict';
import test from 'node:test';
import { createSearchService } from '../src/services/search.js';

test('une réponse OSM vide produit des listes vides sans erreur', async () => {
  const service = createSearchService({
    poiProvider: { fetchPois: async () => ({ elements: [] }) },
  });
  const result = await service.search({ latitude: 45.7578, longitude: 4.832 });
  assert.deepEqual(result.pois, []);
  assert.deepEqual(result.clusters, []);
  assert.equal(result.source, 'OpenStreetMap');
});

