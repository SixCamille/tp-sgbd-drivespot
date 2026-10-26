import { createOsmProvider } from './osmProvider.js';

export function createPoiProvider(config, dependencies) {
  // TODO STUDENTS: remplacer ce fournisseur par un repository SQL dans la suite du TP.
  return createOsmProvider(config, dependencies);
}

