// Adaptateur entre le format brut d'Overpass et le contrat POI de l'application.
import { createOverpassClient } from '../services/osm.js';
import { normalizeOverpassElements } from '../services/normalizePoi.js';

export function createOsmProvider(config, dependencies) {
  const fetchElements = createOverpassClient(config, dependencies);
  return {
    source: 'OpenStreetMap',
    async fetchPois({ bounds, signal }) {
      const payload = await fetchElements(bounds, { signal });
      // La normalisation reste à cette frontière : l'orchestrateur ignore le format OSM.
      return normalizeOverpassElements(payload, { bounds });
    },
  };
}

