import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function positiveInteger(value, fallback) {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function loadConfig(environment = process.env) {
  const dataMode = environment.DATA_MODE === 'live' ? 'live' : 'fixture';

  return {
    projectRoot,
    publicDirectory: resolve(projectRoot, 'public'),
    fixtureDirectory: resolve(projectRoot, 'fixtures'),
    port: positiveInteger(environment.PORT, 3000),
    dataMode,
    geogouvCompletionEndpoint:
      environment.GEOGOUV_COMPLETION_ENDPOINT ??
      'https://data.geopf.fr/geocodage/completion/',
    overpassEndpoint:
      environment.OVERPASS_ENDPOINT ?? 'https://overpass-api.de/api/interpreter',
    geocodingTimeoutMs: positiveInteger(environment.GEOCODING_TIMEOUT_MS, 8_000),
    overpassTimeoutMs: positiveInteger(environment.OVERPASS_TIMEOUT_MS, 30_000),
    userAgent:
      environment.PUBLIC_USER_AGENT ??
      'DriveSpot-TP/1.0 (educational project; configure PUBLIC_USER_AGENT)',
  };
}

