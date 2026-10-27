export const CLUSTER_CATEGORY_THRESHOLD = 3;

export function roundCoordinate(value, decimals = 3) {
  if (!Number.isFinite(value)) throw new TypeError('Coordonnée non numérique.');
  const factor = 10 ** decimals;
  const rounded = Math.sign(value) * Math.round((Math.abs(value) + Number.EPSILON) * factor);
  const result = rounded / factor;
  return Object.is(result, -0) ? 0 : result;
}

export function groupPois(pois, categoryThreshold = CLUSTER_CATEGORY_THRESHOLD) {
  const groups = new Map();

  for (const poi of pois) {
    const gridLatitude = roundCoordinate(poi.latitude);
    const gridLongitude = roundCoordinate(poi.longitude);
    const key = `${gridLatitude.toFixed(3)}:${gridLongitude.toFixed(3)}`;
    const group = groups.get(key) ?? {
      id: key,
      gridLatitude,
      gridLongitude,
      pois: [],
    };
    group.pois.push(poi);
    groups.set(key, group);
  }

  return [...groups.values()]
    .map((group) => ({
      ...group,
      categoryCount: new Set(group.pois.map((poi) => poi.category).filter(Boolean)).size,
    }))
    .filter((group) => group.categoryCount >= categoryThreshold)
    .map((group) => ({
      ...group,
      count: group.pois.length,
      latitude:
        group.pois.reduce((sum, poi) => sum + poi.latitude, 0) / group.pois.length,
      longitude:
        group.pois.reduce((sum, poi) => sum + poi.longitude, 0) / group.pois.length,
    }));
}

