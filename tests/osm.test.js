import assert from 'node:assert/strict';
import test from 'node:test';
import { buildOverpassQuery } from '../src/services/osm.js';

test('la requête Overpass couvre les tags cadrés sans demander les géométries complètes', () => {
  const query = buildOverpassQuery({ south: 1, west: 2, north: 3, east: 4 });
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

