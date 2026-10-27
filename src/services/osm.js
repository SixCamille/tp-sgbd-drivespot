import { AppError } from '../errors.js';
import { requestJson } from '../utils/requestJson.js';

const SELECTORS = [
  ['junction', 'roundabout'],
  ['highway', 'mini_roundabout'],
  ['highway', 'traffic_signals'],
  ['highway', 'stop'],
  ['highway', 'give_way'],
  ['highway', 'crossing'],
  ['traffic_calming', 'bump'],
  ['traffic_calming', 'hump'],
  ['traffic_calming', 'table'],
  ['railway', 'level_crossing'],
  ['cycleway', 'crossing'],
];

const WAY_SELECTORS = new Set([
  'junction=roundabout',
  'traffic_calming=bump',
  'traffic_calming=hump',
  'traffic_calming=table',
]);

export function buildOverpassQuery(bounds) {
  const bbox = `${bounds.south},${bounds.west},${bounds.north},${bounds.east}`;
  const statements = SELECTORS.flatMap(([key, value]) => {
    const selectors = [`node["${key}"="${value}"](${bbox});`];
    if (WAY_SELECTORS.has(`${key}=${value}`)) {
      selectors.push(`way["${key}"="${value}"](${bbox});`);
    }
    return selectors;
  }).join('\n  ');
  return `[out:json][timeout:25];\n(\n  ${statements}\n);\nout body center;`;
}

export function createOverpassClient(config, { fetchImpl = globalThis.fetch } = {}) {
  let previousRequestAt = 0;

  return async function fetchElements(bounds, { signal } = {}) {
    const waitMs = Math.max(0, 1_200 - (Date.now() - previousRequestAt));
    if (waitMs > 0) {
      await new Promise((resolve, reject) => {
        const timer = setTimeout(resolve, waitMs);
        signal?.addEventListener(
          'abort',
          () => {
            clearTimeout(timer);
            reject(signal.reason);
          },
          { once: true },
        );
      });
    }
    previousRequestAt = Date.now();

    const payload = await requestJson(config.overpassEndpoint, {
      fetchImpl,
      timeoutMs: config.overpassTimeoutMs,
      signal,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        'User-Agent': config.userAgent,
      },
      body: new URLSearchParams({ data: buildOverpassQuery(bounds) }),
    });
    if (!Array.isArray(payload?.elements)) {
      throw new AppError('Overpass a renvoyé un format inattendu.', {
        status: 502,
        code: 'MALFORMED_OSM_RESPONSE',
      });
    }
    return payload;
  };
}

