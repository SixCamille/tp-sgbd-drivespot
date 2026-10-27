// Transforme les éléments hétérogènes Overpass en POI au format métier commun.
import { isInsideBounds, isValidCoordinate } from './bounds.js';

// L'ordre exprime la priorité : une traversée cyclable ne doit pas aussi devenir piétonne.
const CATEGORY_RULES = [
  ['traversee_cyclable', 'Traversée cyclable', (tags) =>
    (tags.highway === 'crossing' && tags.bicycle === 'yes') ||
    (tags.highway === 'cycleway' && tags.cycleway === 'crossing')],
  ['giratoire', 'Giratoire', (tags) => tags.junction === 'roundabout'],
  ['mini_giratoire', 'Mini-giratoire', (tags) => tags.highway === 'mini_roundabout'],
  ['feu_tricolore', 'Feu tricolore', (tags) => tags.highway === 'traffic_signals'],
  ['stop', 'Stop', (tags) => tags.highway === 'stop'],
  ['cedez_le_passage', 'Cédez-le-passage', (tags) => tags.highway === 'give_way'],
  ['passage_pieton', 'Passage piéton', (tags) => tags.highway === 'crossing'],
  ['dos_ane', "Dos-d'âne", (tags) =>
    tags.traffic_calming === 'bump' || tags.traffic_calming === 'hump'],
  ['plateau_ralentisseur', 'Plateau ralentisseur', (tags) =>
    tags.traffic_calming === 'table'],
  ['passage_niveau', 'Passage à niveau', (tags) => tags.railway === 'level_crossing'],
];

function samePoint(first, last) {
  return first.lat === last.lat && first.lon === last.lon;
}

function segmentLength(first, second) {
  // Approximation plane suffisante à l'échelle locale, corrigée par la latitude moyenne.
  const averageLatitude = ((first.lat + second.lat) / 2) * (Math.PI / 180);
  const x = (second.lon - first.lon) * Math.cos(averageLatitude);
  const y = second.lat - first.lat;
  return Math.hypot(x, y);
}

export function midpointAlongLine(points) {
  if (!Array.isArray(points) || points.length === 0) return null;
  if (points.length === 1) return { latitude: points[0].lat, longitude: points[0].lon };

  const lengths = [];
  let total = 0;
  for (let index = 1; index < points.length; index += 1) {
    const length = segmentLength(points[index - 1], points[index]);
    lengths.push(length);
    total += length;
  }
  if (total === 0) return { latitude: points[0].lat, longitude: points[0].lon };

  const target = total / 2;
  let travelled = 0;
  for (let index = 0; index < lengths.length; index += 1) {
    if (travelled + lengths[index] >= target) {
      const ratio = (target - travelled) / lengths[index];
      const first = points[index];
      const second = points[index + 1];
      return {
        latitude: first.lat + (second.lat - first.lat) * ratio,
        longitude: first.lon + (second.lon - first.lon) * ratio,
      };
    }
    travelled += lengths[index];
  }
  const last = points.at(-1);
  return { latitude: last.lat, longitude: last.lon };
}

export function centerOfClosedWay(points) {
  if (!Array.isArray(points) || points.length < 3) return null;
  const vertices = samePoint(points[0], points.at(-1)) ? points.slice(0, -1) : points;
  if (vertices.length === 0) return null;
  return {
    latitude: vertices.reduce((sum, point) => sum + point.lat, 0) / vertices.length,
    longitude: vertices.reduce((sum, point) => sum + point.lon, 0) / vertices.length,
  };
}

function representativePoint(element) {
  if (element.type === 'node') {
    return { latitude: element.lat, longitude: element.lon };
  }
  if (element.type !== 'way') return null;

  const geometry = Array.isArray(element.geometry)
    ? element.geometry.filter((point) => isValidCoordinate(point.lat, point.lon))
    : [];
  if (geometry.length >= 2) {
    // Une géométrie détaillée est prioritaire sur le centre de repli fourni par Overpass.
    return samePoint(geometry[0], geometry.at(-1))
      ? centerOfClosedWay(geometry)
      : midpointAlongLine(geometry);
  }
  if (isValidCoordinate(element.center?.lat, element.center?.lon)) {
    return { latitude: element.center.lat, longitude: element.center.lon };
  }
  return null;
}

export function classifyTags(tags = {}) {
  const match = CATEGORY_RULES.find(([, , predicate]) => predicate(tags));
  return match ? { category: match[0], categoryLabel: match[1] } : null;
}

export function normalizeOverpassElements(payload, { bounds } = {}) {
  if (!payload || !Array.isArray(payload.elements)) return [];
  const seen = new Set();
  const pois = [];

  for (const element of payload.elements) {
    if (!element || !['node', 'way'].includes(element.type) || element.id == null) continue;
    const technicalId = `${element.type}/${element.id}`;
    // Overpass peut renvoyer plusieurs fois le même objet lorsqu'il correspond à plusieurs filtres.
    if (seen.has(technicalId)) continue;

    const classification = classifyTags(element.tags);
    const point = classification && representativePoint(element);
    if (
      !classification ||
      !point ||
      !isValidCoordinate(point.latitude, point.longitude) ||
      (bounds && !isInsideBounds(point.latitude, point.longitude, bounds))
    ) {
      continue;
    }

    seen.add(technicalId);
    pois.push({
      id: technicalId,
      osmType: element.type,
      osmId: element.id,
      name: element.tags?.name || classification.categoryLabel,
      ...classification,
      latitude: point.latitude,
      longitude: point.longitude,
      source: 'OpenStreetMap',
      tags: element.tags ?? {},
    });
  }
  return pois;
}

