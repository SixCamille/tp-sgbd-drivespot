// Construction de la requête Overpass et comportement du client sans réseau réel.
import assert from 'node:assert/strict';
import test from 'node:test';
import { buildOverpassQuery, createOverpassClient } from '../src/services/osm.js';

const bounds = { south: 1, west: 2, north: 3, east: 4 };

test('la requête Overpass couvre les tags cadrés sans demander les géométries complètes', () => {
  const query = buildOverpassQuery(bounds);
  assert.match(query, /junction"="roundabout/);
  assert.match(query, /highway"="crossing/);
  assert.match(query, /traffic_calming"="table/);
  assert.match(query, /railway"="level_crossing/);
  assert.match(query, /way\["junction"="roundabout"\]/);
  assert.match(query, /way\["traffic_calming"="table"\]/);
  assert.doesNotMatch(query, /way\["highway"="stop"\]/);
  assert.doesNotMatch(query, /way\["railway"="level_crossing"\]/);
  assert.match(query, /out body center;/);
  assert.doesNotMatch(query, /\bgeom\b/);
  assert.match(query, /\(1,2,3,4\)/);
});

test("propage l'indisponibilité de l'unique endpoint Overpass", async () => {
  const requestedUrls = [];
  const client = createOverpassClient(
    {
      overpassEndpoint: 'https://overpass.nextgis.test/test-key/api/interpreter',
      overpassTimeoutMs: 1_000,
      userAgent: 'DriveSpots-Test/1.0',
    },
    {
      fetchImpl: async (url) => {
        requestedUrls.push(url);
        return { ok: false, status: 502 };
      },
    },
  );

  await assert.rejects(client(bounds), (error) => error.code === 'UPSTREAM_ERROR');
  assert.deepEqual(requestedUrls, [
    'https://overpass.nextgis.test/test-key/api/interpreter',
  ]);
});

test("propage l'annulation de la requête", async () => {
  const controller = new AbortController();
  let requestCount = 0;
  const client = createOverpassClient(
    {
      overpassEndpoint: 'https://overpass.nextgis.test/test-key/api/interpreter',
      overpassTimeoutMs: 1_000,
      userAgent: 'DriveSpots-Test/1.0',
    },
    {
      fetchImpl: async (_url, { signal }) => {
        requestCount += 1;
        controller.abort();
        signal.throwIfAborted();
      },
    },
  );

  await assert.rejects(client(bounds, { signal: controller.signal }), {
    name: 'AbortError',
  });
  assert.equal(requestCount, 1);
});

