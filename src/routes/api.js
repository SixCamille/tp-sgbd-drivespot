import { Router } from 'express';
import { AppError, publicError } from '../errors.js';
import { isValidCoordinate } from '../services/bounds.js';

function requestAbortSignal(request, response) {
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

export function createApiRouter({ config, geocodingService, searchService }) {
  const router = Router();

  router.get('/config', (_request, response) => {
    response.json({
      dataMode: config.dataMode,
      defaultCenter: { latitude: 45.7578, longitude: 4.832 },
      clusterThreshold: 5,
    });
  });

  router.get('/suggestions', async (request, response) => {
    try {
      const query = String(request.query.q ?? '');
      if (query.trim().length < 3) return response.json({ suggestions: [] });
      const suggestions = await geocodingService.suggest(query, {
        signal: requestAbortSignal(request, response),
      });
      return response.json({ suggestions });
    } catch (error) {
      const result = publicError(error);
      return response.status(result.status).json(result.body);
    }
  });

  router.post('/search', async (request, response) => {
    try {
      const signal = requestAbortSignal(request, response);
      const latitude = Number(request.body?.latitude);
      const longitude = Number(request.body?.longitude);
      let center;

      if (isValidCoordinate(latitude, longitude)) {
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
    } catch (error) {
      const result = publicError(error);
      return response.status(result.status).json(result.body);
    }
  });

  return router;
}

