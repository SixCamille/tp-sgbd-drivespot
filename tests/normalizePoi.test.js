// Cas de référence pour convertir les formes OSM en POI métier dédupliqués.
import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeOverpassElements } from '../src/services/normalizePoi.js';

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

test('place un way au centre fourni par Overpass sans charger sa géométrie', () => {
  const [poi] = normalizeOverpassElements(
    {
      elements: [
        {
          type: 'way',
          id: 7,
          center: { lat: 45.7, lon: 4.8 },
          tags: { junction: 'roundabout' },
        },
      ],
    },
    { bounds: wideBounds },
  );

  assert.equal(poi.latitude, 45.7);
  assert.equal(poi.longitude, 4.8);
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

test('ignore les formats anormaux, centres absents et points hors carré', () => {
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

