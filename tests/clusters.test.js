import assert from 'node:assert/strict';
import test from 'node:test';
import { groupPois, roundCoordinate } from '../src/services/clusters.js';

function pois(
  categories,
  latitude = 45.7572,
  longitude = 4.8322,
) {
  const values = Array.isArray(categories) ? categories : Array(categories).fill('stop');
  return values.map((category, index) => ({
    id: `node/${index}`,
    category,
    latitude: latitude + index * 0.000001,
    longitude: longitude + index * 0.000001,
  }));
}

test('arrondit à trois décimales avec une règle symétrique pour les négatifs', () => {
  assert.equal(roundCoordinate(1.2345), 1.235);
  assert.equal(roundCoordinate(-1.2345), -1.235);
  assert.equal(roundCoordinate(-0.0004), 0);
  assert.equal(roundCoordinate(-0.0005), -0.001);
});

test('sépare les POI placés de part et autre d’une frontière de case', () => {
  const clusters = groupPois(
    [
      ...pois(['stop', 'feu', 'giratoire'], 1.23449, 2.0001),
      ...pois(['stop', 'feu', 'giratoire'], 1.23451, 2.0001),
    ],
  );
  assert.equal(clusters.length, 2);
  assert.deepEqual(
    clusters.map((cluster) => cluster.gridLatitude).sort(),
    [1.234, 1.235],
  );
});

test('exige au moins trois catégories distinctes dans une case', () => {
  assert.equal(groupPois(pois(['stop', 'stop', 'stop'])).length, 0);
  assert.equal(groupPois(pois(['stop', 'feu', 'stop', 'feu'])).length, 0);

  const [cluster] = groupPois(pois(['stop', 'feu', 'giratoire', 'stop']));
  assert.equal(cluster.count, 4);
  assert.equal(cluster.categoryCount, 3);
});

