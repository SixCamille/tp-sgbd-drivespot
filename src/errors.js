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

