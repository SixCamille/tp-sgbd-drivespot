import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateBoundingBox, isInsideBounds } from '../src/services/bounds.js';

test('calcule un carré approximatif de 3 km centré sur Lyon', () => {
  const center = { latitude: 45.7578, longitude: 4.832 };
  const bounds = calculateBoundingBox(center.latitude, center.longitude);
  const heightKm = (bounds.north - bounds.south) * 111.32;
  const widthKm =
    (bounds.east - bounds.west) *
    111.32 *
    Math.cos((center.latitude * Math.PI) / 180);

  assert.ok(Math.abs(heightKm - 3) < 0.001);
  assert.ok(Math.abs(widthKm - 3) < 0.001);
  assert.equal(isInsideBounds(center.latitude, center.longitude, bounds), true);
});

test("l'écart de longitude tient compte de la latitude", () => {
  const equator = calculateBoundingBox(0, 4);
  const lyon = calculateBoundingBox(45.7578, 4);
  assert.ok(lyon.east - lyon.west > equator.east - equator.west);
});

test('refuse les coordonnées invalides', () => {
  assert.throws(() => calculateBoundingBox(95, 4), /invalides/);
});

