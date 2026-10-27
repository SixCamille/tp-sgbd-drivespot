import assert from 'node:assert/strict';
import test from 'node:test';
import { loadConfig } from '../src/config.js';

test("utilise uniquement l'URL personnelle NextGIS", () => {
  const config = loadConfig({
    NEXTGIS_OVERPASS_URL: 'https://overpass.nextgis.test/test-key/api/interpreter',
  });

  assert.equal(
    config.overpassEndpoint,
    'https://overpass.nextgis.test/test-key/api/interpreter',
  );
});

test("refuse de démarrer sans URL personnelle NextGIS", () => {
  assert.throws(() => loadConfig({ NEXTGIS_OVERPASS_URL: '' }), {
    message: 'NEXTGIS_OVERPASS_URL doit être configurée.',
  });
});
