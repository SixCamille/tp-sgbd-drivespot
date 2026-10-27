// Point de composition de l'application : les couches sont assemblées ici,
// tandis que leurs règles métier restent dans les services et fournisseurs.
import express from 'express';
import { resolve } from 'node:path';
import { apiErrorHandler } from './errors.js';
import { createPoiProvider } from './providers/index.js';
import { createApiRouter } from './routes/api.js';
import { createGeocodingService } from './services/geocoding.js';
import { createSearchService } from './services/search.js';

export function createApp(config, dependencies = {}) {
  const app = express();
  // L'injection de dépendances permet aux tests de remplacer les appels réseau.
  const geocodingService = createGeocodingService(config, dependencies);
  const poiProvider = createPoiProvider(config, dependencies);
  const searchService = createSearchService({ poiProvider });

  app.disable('x-powered-by');
  // L'ordre est intentionnel : API, dépendances statiques, interface, puis 404.
  app.use(express.json({ limit: '20kb' }));
  app.use('/api', createApiRouter({ geocodingService, searchService }));
  app.use(
    '/vendor/leaflet',
    express.static(resolve(config.projectRoot, 'node_modules/leaflet/dist')),
  );
  app.use(express.static(config.publicDirectory));
  app.use((_request, response) => {
    response.status(404).json({ error: 'Ressource introuvable.', code: 'NOT_FOUND' });
  });
  // Ce dernier middleware uniformise aussi les erreurs produites par express.json().
  app.use(apiErrorHandler);
  return app;
}

