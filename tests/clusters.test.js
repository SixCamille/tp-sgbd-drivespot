import assert from 'node:assert/strict';
import test from 'node:test';
import { groupPois, roundCoordinate } from '../src/services/clusters.js';

function pois(count, latitude = 45.7572, longitude = 4.8322) {
  return Array.from({ length: count }, (_, index) => ({
    id: `node/${index}`,
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
    [...pois(5, 1.23449, 2.0001), ...pois(5, 1.23451, 2.0001)],
    5,
  );
  assert.equal(clusters.length, 2);
  assert.deepEqual(
    clusters.map((cluster) => cluster.gridLatitude).sort(),
    [1.234, 1.235],
  );
});

test('applique exactement le seuil métier de cinq POI', () => {
  assert.equal(groupPois(pois(4)).length, 0);
  assert.equal(groupPois(pois(5)).length, 1);
  assert.equal(groupPois(pois(6)).length, 1);
});

