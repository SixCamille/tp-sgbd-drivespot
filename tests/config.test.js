import assert from 'node:assert/strict';
import test from 'node:test';
import { loadConfig } from '../src/config.js';

test("place l'URL personnelle NextGIS avant les instances de repli", () => {
  const config = loadConfig({
    NEXTGIS_OVERPASS_URL: 'https://overpass.nextgis.test/test-key/api/interpreter',
    OVERPASS_ENDPOINTS: 'https://fallback-1.test, https://fallback-2.test',
  });

  assert.deepEqual(config.overpassEndpoints, [
    'https://overpass.nextgis.test/test-key/api/interpreter',
    'https://fallback-1.test',
    'https://fallback-2.test',
  ]);
});

test("ignore NextGIS tant qu'aucune URL personnelle n'est configurée", () => {
  const config = loadConfig({
    NEXTGIS_OVERPASS_URL: '',
  });

  assert.deepEqual(config.overpassEndpoints, [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.private.coffee/api/interpreter',
  ]);
});
