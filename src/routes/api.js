// Couche HTTP : valide les entrées, résout le centre et délègue aux services.
import { Router } from 'express';
import { AppError } from '../errors.js';
import { isValidCoordinate } from '../services/bounds.js';

function requestAbortSignal(request, response) {
  // Interrompt aussi les appels externes si le client ferme la connexion HTTP.
  const controller = new AbortController();
  request.once('aborted', () => controller.abort());
  response.once('close', () => {
    if (!response.writableEnded) controller.abort();
  });
  return controller.signal;
}

function parseCoordinates(value) {
  const match = value.match(
    /^\s*(-?\d+(?:\.\d+)?)\s*[,;]\s*(-?\d+(?:\.\d+)?)\s*$/,
  );
  if (!match) return null;
  const latitude = Number(match[1]);
  const longitude = Number(match[2]);
  return isValidCoordinate(latitude, longitude) ? { latitude, longitude } : null;
}

export function createApiRouter({ geocodingService, searchService }) {
  const router = Router();

  router.get('/suggestions', async (request, response) => {
    const query = String(request.query.q ?? '');
    if (query.trim().length < 3) return response.json({ suggestions: [] });
    const suggestions = await geocodingService.suggest(query, {
      signal: requestAbortSignal(request, response),
    });
    return response.json({ suggestions });
  });

  router.post('/search', async (request, response) => {
    const signal = requestAbortSignal(request, response);
    const latitude = request.body?.latitude;
    const longitude = request.body?.longitude;
    let center;

    // Priorité : suggestion déjà géocodée, coordonnées saisies, puis géocodage texte.
    if (
      typeof latitude === 'number' &&
      typeof longitude === 'number' &&
      isValidCoordinate(latitude, longitude)
    ) {
      center = {
        latitude,
        longitude,
        label: String(request.body?.address || 'Position choisie'),
      };
    } else {
      const address = String(request.body?.address ?? '').trim();
      if (address.length < 3) {
        throw new AppError('Choisissez une suggestion ou saisissez une adresse précise.', {
          status: 400,
          code: 'INVALID_ADDRESS',
        });
      }
      const coordinates = parseCoordinates(address);
      center = coordinates
        ? { ...coordinates, label: `Coordonnées ${address}` }
        : await geocodingService.geocodeFirst(address, { signal });
    }

    const result = await searchService.search(center, { signal });
    return response.json(result);
  });

  return router;
}

