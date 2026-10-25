import express from 'express';
import { resolve } from 'node:path';
import { createPoiProvider } from './providers/index.js';
import { createApiRouter } from './routes/api.js';
import { createGeocodingService } from './services/geocoding.js';
import { createSearchService } from './services/search.js';

export function createApp(config, dependencies = {}) {
  const app = express();
  const geocodingService = createGeocodingService(config, dependencies);
  const poiProvider = createPoiProvider(config, dependencies);
  const searchService = createSearchService({ poiProvider });

  app.disable('x-powered-by');
  app.use(express.json({ limit: '20kb' }));
  app.use('/api', createApiRouter({ config, geocodingService, searchService }));
  app.use(
    '/vendor/leaflet',
    express.static(resolve(config.projectRoot, 'node_modules/leaflet/dist')),
  );
  app.use(express.static(config.publicDirectory));
  app.use((_request, response) => {
    response.status(404).json({ error: 'Ressource introuvable.', code: 'NOT_FOUND' });
  });
  return app;
}

