import assert from 'node:assert/strict';
import test from 'node:test';
import { loadConfig } from '../src/config.js';

test("place l'endpoint NextGIS authentifié avant les instances de repli", () => {
  const config = loadConfig({
    NEXTGIS_OVERPASS_URL: 'https://overpass.nextgis.test/',
    NEXTGIS_OVERPASS_API_KEY: 'test/key',
    OVERPASS_ENDPOINTS: 'https://fallback-1.test, https://fallback-2.test',
  });

  assert.deepEqual(config.overpassEndpoints, [
    'https://overpass.nextgis.test/test%2Fkey/api/interpreter',
    'https://fallback-1.test',
    'https://fallback-2.test',
  ]);
});

test("ignore NextGIS tant qu'aucune clé n'est configurée", () => {
  const config = loadConfig({
    NEXTGIS_OVERPASS_URL: 'https://overpass.nextgis.test',
    NEXTGIS_OVERPASS_API_KEY: '',
  });

  assert.deepEqual(config.overpassEndpoints, [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.private.coffee/api/interpreter',
  ]);
});
