// Sélectionne l'implémentation du contrat POI sans coupler l'API à sa source.
import { createOsmProvider } from './osmProvider.js';

export function createPoiProvider(config, dependencies) {
  // Contrat attendu : { source, fetchPois({ center, bounds, signal }) => Poi[] }.
  // TODO STUDENTS: injecter ici un fournisseur adossé au repository SQL.
  return createOsmProvider(config, dependencies);
}

