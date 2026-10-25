import assert from 'node:assert/strict';
import test from 'node:test';
import { requestJson } from '../src/utils/requestJson.js';

test('signale une réponse JSON malformée', async () => {
  const fetchImpl = async () => ({
    ok: true,
    json: async () => {
      throw new SyntaxError('invalid json');
    },
  });
  await assert.rejects(
    requestJson('https://example.test', { fetchImpl }),
    (error) => error.code === 'MALFORMED_UPSTREAM_RESPONSE',
  );
});

test("signale l'indisponibilité du service", async () => {
  const fetchImpl = async () => {
    throw new TypeError('offline');
  };
  await assert.rejects(
    requestJson('https://example.test', { fetchImpl }),
    (error) => error.code === 'UPSTREAM_UNAVAILABLE',
  );
});

test("interrompt l'appel à expiration du délai", async () => {
  const fetchImpl = (_url, { signal }) =>
    new Promise((_resolve, reject) => {
      signal.addEventListener(
        'abort',
        () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })),
        { once: true },
      );
    });
  await assert.rejects(
    requestJson('https://example.test', { fetchImpl, timeoutMs: 5 }),
    (error) => error.code === 'UPSTREAM_TIMEOUT',
  );
});

