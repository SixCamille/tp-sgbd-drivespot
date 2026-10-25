import { createOverpassClient } from '../services/osm.js';

export function createOsmProvider(config, dependencies) {
  const fetchElements = createOverpassClient(config, dependencies);
  return {
    async fetchPois({ bounds, signal }) {
      return fetchElements(bounds, { signal });
    },
  };
}

