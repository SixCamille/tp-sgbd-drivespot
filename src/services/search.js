import { performance } from 'node:perf_hooks';
import { calculateBoundingBox } from './bounds.js';
import { groupPois } from './clusters.js';

export function createSearchService({ poiProvider }) {
  return {
    async search(center, { signal } = {}) {
      const startedAt = performance.now();
      const bounds = calculateBoundingBox(center.latitude, center.longitude);
      const pois = await poiProvider.fetchPois({ center, bounds, signal });

      // TODO STUDENTS: comparer ce calcul JavaScript à une agrégation SQL ROUND/GROUP BY.
      const clusters = groupPois(pois);

      return {
        center,
        bounds,
        pois,
        clusters,
        source: poiProvider.source,
        serverDurationMs: Math.round((performance.now() - startedAt) * 10) / 10,
      };
    },
  };
}

