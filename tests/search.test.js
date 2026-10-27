// Indépendance de l'orchestrateur vis-à-vis de l'implémentation du fournisseur de POI.
import assert from 'node:assert/strict';
import test from 'node:test';
import { createSearchService } from '../src/services/search.js';

test('un fournisseur vide produit des listes vides sans erreur', async () => {
  const service = createSearchService({
    poiProvider: { source: 'Fournisseur de test', fetchPois: async () => [] },
  });
  const result = await service.search({ latitude: 45.7578, longitude: 4.832 });
  assert.deepEqual(result.pois, []);
  assert.deepEqual(result.clusters, []);
  assert.equal(result.source, 'Fournisseur de test');
});

test("l'orchestrateur accepte des POI déjà normalisés sans connaître leur origine", async () => {
  const poi = {
    id: 'repository/42',
    category: 'stop',
    latitude: 45.7578,
    longitude: 4.832,
  };
  const service = createSearchService({
    poiProvider: { source: 'Repository de test', fetchPois: async () => [poi] },
  });

  const result = await service.search({ latitude: 45.7578, longitude: 4.832 });

  assert.deepEqual(result.pois, [poi]);
  assert.equal(result.source, 'Repository de test');
});

