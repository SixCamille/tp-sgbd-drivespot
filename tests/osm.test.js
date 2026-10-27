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

test('essaie une seconde instance Overpass après une erreur transitoire', async () => {
  const requestedUrls = [];
  const client = createOverpassClient(
    {
      overpassEndpoints: ['https://overpass-1.test', 'https://overpass-2.test'],
      overpassTimeoutMs: 1_000,
      userAgent: 'DriveSpots-Test/1.0',
    },
    {
      fetchImpl: async (url) => {
        requestedUrls.push(url);
        return requestedUrls.length === 1
          ? { ok: false, status: 502 }
          : { ok: true, json: async () => ({ elements: [] }) };
      },
    },
  );

  assert.deepEqual(await client(bounds), { elements: [] });
  assert.deepEqual(requestedUrls, [
    'https://overpass-1.test',
    'https://overpass-2.test',
  ]);
});

test("ne tente pas de repli après l'annulation de la requête", async () => {
  const controller = new AbortController();
  let requestCount = 0;
  const client = createOverpassClient(
    {
      overpassEndpoints: ['https://overpass-1.test', 'https://overpass-2.test'],
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

