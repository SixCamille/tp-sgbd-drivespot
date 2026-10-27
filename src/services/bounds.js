// Géométrie locale volontairement simple pour construire le carré de 3 km.
const EARTH_KM_PER_LATITUDE_DEGREE = 111.32;
const HALF_SIDE_KM = 1.5;

export function isValidCoordinate(latitude, longitude) {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

export function calculateBoundingBox(latitude, longitude) {
  if (!isValidCoordinate(latitude, longitude)) {
    throw new TypeError('Coordonnées centrales invalides.');
  }

  const latitudeDelta = HALF_SIDE_KM / EARTH_KM_PER_LATITUDE_DEGREE;
  // Un degré de longitude couvre moins de kilomètres lorsque la latitude augmente.
  const cosine = Math.cos((latitude * Math.PI) / 180);
  if (Math.abs(cosine) < 0.01) {
    throw new RangeError('Le calcul simplifié du carré est invalide près des pôles.');
  }
  const longitudeDelta = HALF_SIDE_KM / (EARTH_KM_PER_LATITUDE_DEGREE * cosine);

  return {
    south: latitude - latitudeDelta,
    west: longitude - longitudeDelta,
    north: latitude + latitudeDelta,
    east: longitude + longitudeDelta,
  };
}

export function isInsideBounds(latitude, longitude, bounds) {
  return (
    isValidCoordinate(latitude, longitude) &&
    latitude >= bounds.south &&
    latitude <= bounds.north &&
    longitude >= bounds.west &&
    longitude <= bounds.east
  );
}

