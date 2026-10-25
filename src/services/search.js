import { performance } from 'node:perf_hooks';
import { calculateBoundingBox } from './bounds.js';
import { groupPois } from './clusters.js';
import { normalizeOverpassElements } from './normalizePoi.js';

export function createSearchService({ poiProvider }) {
  return {
    async search(center, { signal } = {}) {
      const startedAt = performance.now();
      const bounds = calculateBoundingBox(center.latitude, center.longitude);
      const payload = await poiProvider.fetchPois({ center, bounds, signal });
      const pois = normalizeOverpassElements(payload, { bounds });

      // TODO STUDENTS: comparer ce calcul JavaScript à une agrégation SQL ROUND/GROUP BY.
      const clusters = groupPois(pois);

      // TODO STUDENTS: le futur stockage se branche ici, sans modifier l'API ni le frontend.
      return {
        center,
        bounds,
        pois,
        clusters,
        source: 'OpenStreetMap',
        serverDurationMs: Math.round((performance.now() - startedAt) * 10) / 10,
      };
    },
  };
}

