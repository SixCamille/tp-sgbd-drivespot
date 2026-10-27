// Erreur métier transportant le statut HTTP et le code public de l'API.
export class AppError extends Error {
  constructor(message, { status = 500, code = 'INTERNAL_ERROR', cause } = {}) {
    super(message, { cause });
    this.name = 'AppError';
    this.status = status;
    this.code = code;
  }
}

export function publicError(error) {
  // Seules les erreurs prévues exposent leur message ; les autres sont journalisées.
  if (error instanceof AppError) {
    return { status: error.status, body: { error: error.message, code: error.code } };
  }

  console.error(error);
  return {
    status: 500,
    body: {
      error: 'Une erreur inattendue empêche la recherche.',
      code: 'INTERNAL_ERROR',
    },
  };
}

export function apiErrorHandler(error, _request, response, next) {
  // Une connexion abandonnée ne peut plus recevoir de réponse et ne constitue pas une erreur serveur.
  if (response.destroyed || error?.name === 'AbortError') return;
  if (response.headersSent) return next(error);

  if (error?.type === 'entity.parse.failed') {
    return response.status(400).json({
      error: 'Le corps de la requête contient un JSON invalide.',
      code: 'MALFORMED_JSON',
    });
  }
  if (error?.type === 'entity.too.large') {
    return response.status(413).json({
      error: 'Le corps de la requête dépasse la taille autorisée.',
      code: 'REQUEST_TOO_LARGE',
    });
  }

  const result = publicError(error);
  return response.status(result.status).json(result.body);
}

