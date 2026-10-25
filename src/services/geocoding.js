import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { AppError } from '../errors.js';
import { requestJson } from '../utils/requestJson.js';

function formatPhotonFeature(feature) {
  const [longitude, latitude] = feature?.geometry?.coordinates ?? [];
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  const properties = feature.properties ?? {};
  const label = [
    properties.name || properties.street,
    properties.housenumber,
    properties.city,
    properties.postcode,
    properties.country,
  ]
    .filter(Boolean)
    .join(' ');
  return { id: properties.osm_id ?? label, label, latitude, longitude };
}

export function createGeocodingService(config, { fetchImpl = globalThis.fetch } = {}) {
  let fixturePromise;
  const loadFixtures = () => {
    fixturePromise ??= readFile(resolve(config.fixtureDirectory, 'addresses.json'), 'utf8').then(
      JSON.parse,
    );
    return fixturePromise;
  };

  async function suggest(query, { signal } = {}) {
    const normalizedQuery = query.trim();
    if (normalizedQuery.length < 3) return [];

    if (config.dataMode === 'fixture') {
      const addresses = await loadFixtures();
      const words = normalizedQuery.toLocaleLowerCase('fr').split(/\s+/);
      return addresses
        .filter((address) => {
          const label = address.label.toLocaleLowerCase('fr');
          return words.every((word) => label.includes(word));
        })
        .slice(0, 5);
    }

    const url = new URL(config.photonEndpoint);
    url.searchParams.set('q', normalizedQuery);
    url.searchParams.set('limit', '5');
    url.searchParams.set('lang', 'fr');
    const payload = await requestJson(url, {
      fetchImpl,
      timeoutMs: config.geocodingTimeoutMs,
      signal,
      headers: { 'User-Agent': config.userAgent },
    });
    if (!Array.isArray(payload?.features)) {
      throw new AppError('Le service de géocodage a renvoyé un format inattendu.', {
        status: 502,
        code: 'MALFORMED_GEOCODING_RESPONSE',
      });
    }
    return payload.features.map(formatPhotonFeature).filter(Boolean);
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

