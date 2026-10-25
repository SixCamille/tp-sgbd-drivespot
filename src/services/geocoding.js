import { AppError } from '../errors.js';
import { requestJson } from '../utils/requestJson.js';

function formatGeogouvResult(result, index) {
  const longitude = result?.x;
  const latitude = result?.y;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  const label =
    result.fulltext || [result.street, result.zipcode, result.city].filter(Boolean).join(' ');
  if (!label) return null;
  return {
    id: `${longitude}:${latitude}:${index}`,
    label,
    latitude,
    longitude,
  };
}

export function createGeocodingService(config, { fetchImpl = globalThis.fetch } = {}) {
  async function suggest(query, { signal } = {}) {
    const normalizedQuery = query.trim();
    if (normalizedQuery.length < 3) return [];

    const url = new URL(config.geogouvCompletionEndpoint);
    url.searchParams.set('text', normalizedQuery);
    url.searchParams.set('type', 'StreetAddress');
    url.searchParams.set('maximumResponses', '5');
    const payload = await requestJson(url, {
      fetchImpl,
      timeoutMs: config.geocodingTimeoutMs,
      signal,
      headers: { 'User-Agent': config.userAgent },
    });
    if (!Array.isArray(payload?.results)) {
      throw new AppError('Le service de géocodage a renvoyé un format inattendu.', {
        status: 502,
        code: 'MALFORMED_GEOCODING_RESPONSE',
      });
    }
    return payload.results.map(formatGeogouvResult).filter(Boolean);
  }

  async function geocodeFirst(query, options) {
    const [result] = await suggest(query, options);
    if (!result) {
      throw new AppError('Adresse introuvable. Essayez une adresse plus précise.', {
        status: 404,
        code: 'ADDRESS_NOT_FOUND',
      });
    }
    return result;
  }

  return { suggest, geocodeFirst };
}

