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

function representativePoint(element) {
  if (element.type === 'node') {
    return { latitude: element.lat, longitude: element.lon };
  }
  if (element.type !== 'way') return null;
  // Les ways utilisent uniquement le centre calculé par Overpass ; leur géométrie n'est pas chargée.
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

