import { AppError } from '../errors.js';

export async function requestJson(
  url,
  {
    fetchImpl = globalThis.fetch,
    timeoutMs = 10_000,
    signal,
    headers = {},
    method = 'GET',
    body,
  } = {},
) {
  const timeoutController = new AbortController();
  const timeout = setTimeout(() => timeoutController.abort(), timeoutMs);
  const combinedSignal = signal
    ? AbortSignal.any([signal, timeoutController.signal])
    : timeoutController.signal;

  try {
    const response = await fetchImpl(url, {
      method,
      body,
      headers: { Accept: 'application/json', ...headers },
      signal: combinedSignal,
    });

    if (!response.ok) {
      throw new AppError(`Le service distant a répondu avec le statut ${response.status}.`, {
        status: 502,
        code: 'UPSTREAM_ERROR',
      });
    }

    try {
      return await response.json();
    } catch (cause) {
      throw new AppError('Le service distant a renvoyé une réponse illisible.', {
        status: 502,
        code: 'MALFORMED_UPSTREAM_RESPONSE',
        cause,
      });
    }
  } catch (error) {
    if (error instanceof AppError) throw error;
    if (error?.name === 'AbortError') {
      throw new AppError('Le service distant a mis trop de temps à répondre.', {
        status: 504,
        code: 'UPSTREAM_TIMEOUT',
        cause: error,
      });
    }
    throw new AppError('Le service distant est momentanément indisponible.', {
      status: 502,
      code: 'UPSTREAM_UNAVAILABLE',
      cause: error,
    });
  } finally {
    clearTimeout(timeout);
  }
}

