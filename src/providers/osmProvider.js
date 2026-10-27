import { createOverpassClient } from '../services/osm.js';
import { normalizeOverpassElements } from '../services/normalizePoi.js';

export function createOsmProvider(config, dependencies) {
  const fetchElements = createOverpassClient(config, dependencies);
  return {
    source: 'OpenStreetMap',
    async fetchPois({ bounds, signal }) {
      const payload = await fetchElements(bounds, { signal });
      return normalizeOverpassElements(payload, { bounds });
    },
  };
}

