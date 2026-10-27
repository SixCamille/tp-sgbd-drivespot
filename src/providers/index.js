import { createOsmProvider } from './osmProvider.js';

export function createPoiProvider(config, dependencies) {
  // TODO STUDENTS: injecter ici un fournisseur adossé au repository SQL.
  return createOsmProvider(config, dependencies);
}

