import assert from 'node:assert/strict';
import test from 'node:test';
import {
  centerOfClosedWay,
  midpointAlongLine,
  normalizeOverpassElements,
} from '../src/services/normalizePoi.js';

const wideBounds = { south: -80, west: -170, north: 80, east: 170 };

test('normalise un node en conservant son identité OSM', () => {
  const [poi] = normalizeOverpassElements(
    {
      elements: [
        {
          type: 'node',
          id: 42,
          lat: 45.7,
          lon: 4.8,
          tags: { highway: 'stop', name: 'Stop test' },
        },
      ],
    },
    { bounds: wideBounds },
  );
  assert.equal(poi.id, 'node/42');
  assert.equal(poi.category, 'stop');
  assert.equal(poi.latitude, 45.7);
});

test('place un way ouvert au milieu de sa longueur cumulée', () => {
  const point = midpointAlongLine([
    { lat: 0, lon: 0 },
    { lat: 0, lon: 1 },
    { lat: 0, lon: 3 },
  ]);
  assert.equal(point.latitude, 0);
  assert.ok(Math.abs(point.longitude - 1.5) < 0.000001);
});

test('ne compte pas deux fois le dernier sommet fermé', () => {
  const point = centerOfClosedWay([
    { lat: 0, lon: 0 },
    { lat: 0, lon: 2 },
    { lat: 2, lon: 2 },
    { lat: 2, lon: 0 },
    { lat: 0, lon: 0 },
  ]);
  assert.deepEqual(point, { latitude: 1, longitude: 1 });
});

test('déduplique osm_type/osm_id et classe une traversée cyclable une seule fois', () => {
  const crossing = {
    type: 'node',
    id: 8,
    lat: 45.7,
    lon: 4.8,
    tags: { highway: 'crossing', bicycle: 'yes' },
  };
  const pois = normalizeOverpassElements(
    { elements: [crossing, { ...crossing }] },
    { bounds: wideBounds },
  );
  assert.equal(pois.length, 1);
  assert.equal(pois[0].category, 'traversee_cyclable');
});

test('ignore les formats anormaux, géométries absentes et points hors carré', () => {
  assert.deepEqual(normalizeOverpassElements(null, { bounds: wideBounds }), []);
  const pois = normalizeOverpassElements(
    {
      elements: [
        { type: 'way', id: 1, tags: { junction: 'roundabout' } },
        { type: 'node', id: 2, lat: 90, lon: 175, tags: { highway: 'stop' } },
      ],
    },
    { bounds: wideBounds },
  );
  assert.deepEqual(pois, []);
});

