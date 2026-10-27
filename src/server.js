// Entrée du processus : charge la configuration, démarre HTTP et gère l'arrêt.
import { createApp } from './app.js';
import { loadConfig } from './config.js';

const config = loadConfig();
const app = createApp(config);

const server = app.listen(config.port, () => {
  console.log(`DriveSpots écoute sur http://localhost:${config.port}.`);
});

function shutdown() {
  // Laisse les connexions déjà ouvertes se terminer avant de quitter.
  server.close(() => process.exit(0));
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

