const {
  CACHE_KEY,
  loadAmbient,
  parseAmbientPayload,
  parseNativeGrant,
  resolveAmbientState,
} = require('../momentum-ambient.js');

const live = {
  schemaVersion: 1,
  cacheState: 'live',
  fetchedAt: '2026-08-14T08:00:00.000Z',
  tasks: [
    { id: 'one', name: 'First', priority: 'P0', dueDate: null },
    { id: 'two', name: 'Second', priority: 'P1', dueDate: '2026-08-15' },
  ],
  pulsePendingCount: 3,
};

test('shipped browser asset is bound to the exact Momentum bridge contract', () => {
  const root = resolve(__dirname, '..');
  const asset = readFileSync(resolve(root, 'momentum-ambient.js'));
  const contract = JSON.parse(readFileSync(resolve(root, 'momentum-bridge.json'), 'utf8'));
  expect(Object.keys(contract).sort()).toEqual([
    'browserAssetSha256',
    'callerOrigin',
    'extensionId',
    'nativeHostName',
    'nativeHostPath',
    'nativeHostRequirement',
    'schemaVersion',
  ]);
  expect(contract.schemaVersion).toBe(1);
  expect(contract.extensionId).toBe('hldcbbiabmeilbmcgeaecmkmhmllagcg');
  expect(createHash('sha256').update(asset).digest('hex')).toBe(contract.browserAssetSha256);
});

test('strictly validates the minimal payload and IPv4-only one-shot grant', () => {
  expect(parseAmbientPayload(JSON.parse(JSON.stringify(live)))).toEqual(live);
  expect(() => parseAmbientPayload({ ...live, token: 'no' })).toThrow('invalid_ambient_payload');
  expect(() => parseAmbientPayload({ ...live, tasks: [live.tasks[0], live.tasks[0], live.tasks[0], live.tasks[0]] })).toThrow('invalid_ambient_payload');

  const grant = {
    schemaVersion: 1,
    endpoint: 'http://127.0.0.1:43123/v1/ambient',
    capability: 'a'.repeat(43),
    expiresAt: '2026-08-14T08:15:00.000Z',
  };
  expect(parseNativeGrant(grant)).toEqual(grant);
  for (const endpoint of [
    'http://localhost:43123/v1/ambient',
    'http://[::1]:43123/v1/ambient',
    'https://127.0.0.1:43123/v1/ambient',
  ]) expect(() => parseNativeGrant({ ...grant, endpoint })).toThrow('invalid_native_grant');
});

test('fetches live through native messaging without persisting the grant', async () => {
  const storage = {};
  const chromeApi = {
    runtime: {
      sendNativeMessage: jest.fn().mockResolvedValue({
        schemaVersion: 1,
        endpoint: 'http://127.0.0.1:43123/v1/ambient',
        capability: 'a'.repeat(43),
        expiresAt: '2026-08-14T08:15:00.000Z',
      }),
    },
    storage: { local: {
      get: jest.fn().mockResolvedValue(storage),
      set: jest.fn(async (value) => Object.assign(storage, value)),
    } },
  };
  const fetchImpl = jest.fn().mockResolvedValue(streamingResponse(JSON.stringify(live)));
  await expect(loadAmbient(chromeApi, fetchImpl, new Date('2026-08-14T08:01:00Z'))).resolves.toEqual({ kind: 'live', payload: live });
  expect(chromeApi.runtime.sendNativeMessage).toHaveBeenCalledWith(
    'com.allinstride.momentum.novatab',
    { schemaVersion: 1, action: 'grant' },
  );
  expect(fetchImpl).toHaveBeenCalledWith('http://127.0.0.1:43123/v1/ambient', expect.objectContaining({
    method: 'GET',
    headers: { 'X-Momentum-Capability': 'a'.repeat(43) },
    credentials: 'omit',
    redirect: 'error',
  }));
  expect(storage).toEqual({ [CACHE_KEY]: live });
  expect(JSON.stringify(storage)).not.toMatch(/capability|endpoint|authorization|bearer/i);
});

test('labels a fetched stale payload as cached', async () => {
  const stale = { ...live, cacheState: 'stale' };
  const chromeApi = chromeForGrant();
  await expect(loadAmbient(
    chromeApi,
    jest.fn().mockResolvedValue(streamingResponse(JSON.stringify(stale))),
    new Date('2026-08-14T08:01:00Z'),
  )).resolves.toEqual({ kind: 'cached', payload: stale });
});

test('aborts a hanging fetch and bounds the response stream before full buffering', async () => {
  jest.useFakeTimers();
  try {
    const chromeApi = chromeForGrant();
    const hangingFetch = jest.fn((_url, options) => new Promise((_resolve, reject) => {
      options.signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
    }));
    const pending = loadAmbient(chromeApi, hangingFetch, new Date('2026-08-14T08:01:00Z'));
    await jest.advanceTimersByTimeAsync(5_001);
    await expect(pending).resolves.toEqual({ kind: 'unavailable' });

    const oversized = new Uint8Array(16_385).fill(120);
    await expect(loadAmbient(
      chromeApi,
      jest.fn().mockResolvedValue(streamingResponse(oversized)),
      new Date('2026-08-14T08:01:00Z'),
    )).resolves.toEqual({ kind: 'unavailable' });
  } finally {
    jest.useRealTimers();
  }
});

test('uses a bounded last-good payload offline and never renders expired cache', async () => {
  expect(resolveAmbientState(null, { ...live, cacheState: 'stale' }, new Date('2026-08-15T07:59:59Z'))).toEqual({
    kind: 'cached', payload: { ...live, cacheState: 'stale' },
  });
  expect(resolveAmbientState(null, live, new Date('2026-08-15T08:00:01Z'))).toEqual({ kind: 'unavailable' });

  const chromeApi = {
    runtime: { sendNativeMessage: jest.fn().mockRejectedValue(new Error('host absent')) },
    storage: { local: {
      get: jest.fn().mockResolvedValue({ [CACHE_KEY]: live }),
      set: jest.fn(),
    } },
  };
  await expect(loadAmbient(chromeApi, jest.fn(), new Date('2026-08-14T09:00:00Z'))).resolves.toEqual({
    kind: 'cached', payload: live,
  });
  expect(chromeApi.storage.local.set).not.toHaveBeenCalled();
});

test('rejects oversized, non-JSON, or redirected loopback responses without leaking details', async () => {
  const grant = {
    schemaVersion: 1,
    endpoint: 'http://127.0.0.1:43123/v1/ambient',
    capability: 'a'.repeat(43),
    expiresAt: '2026-08-14T08:15:00.000Z',
  };
  const chromeApi = {
    runtime: { sendNativeMessage: jest.fn().mockResolvedValue(grant) },
    storage: { local: { get: jest.fn().mockResolvedValue({}), set: jest.fn() } },
  };
  for (const response of [
    streamingResponse('{}', { contentType: 'text/html' }),
    streamingResponse('x'.repeat(16_385)),
    streamingResponse(new Uint8Array([0xff])),
    streamingResponse('{}', { status: 302 }),
  ]) {
    await expect(loadAmbient(chromeApi, jest.fn().mockResolvedValue(response), new Date())).resolves.toEqual({ kind: 'unavailable' });
  }
});

function chromeForGrant() {
  return {
    runtime: { sendNativeMessage: jest.fn().mockResolvedValue({
      schemaVersion: 1,
      endpoint: 'http://127.0.0.1:43123/v1/ambient',
      capability: 'a'.repeat(43),
      expiresAt: '2026-08-14T08:15:00.000Z',
    }) },
    storage: { local: { get: jest.fn().mockResolvedValue({}), set: jest.fn() } },
  };
}

function streamingResponse(value, { contentType = 'application/json', status = 200 } = {}) {
  const bytes = value instanceof Uint8Array ? value : new TextEncoder().encode(value);
  let delivered = false;
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => contentType },
    body: { getReader: () => ({
      read: async () => delivered ? { done: true } : (delivered = true, { done: false, value: bytes }),
      cancel: async () => {},
    }) },
  };
}
const { createHash } = require('node:crypto');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
