(function exposeMomentumAmbient(globalObject) {
    'use strict';

    const NATIVE_HOST = 'com.allinstride.momentum.novatab';
    const CACHE_KEY = 'momentumAmbientLastGoodV1';
    const MAX_RESPONSE_BYTES = 16_384;
    const FETCH_TIMEOUT_MILLISECONDS = 5_000;
    const LAST_GOOD_MILLISECONDS = 24 * 60 * 60 * 1000;
    const AMBIENT_KEYS = ['cacheState', 'fetchedAt', 'pulsePendingCount', 'schemaVersion', 'tasks'];
    const TASK_KEYS = ['dueDate', 'id', 'name', 'priority'];
    const GRANT_KEYS = ['capability', 'endpoint', 'expiresAt', 'schemaVersion'];

    function parseAmbientPayload(value) {
        if (!plainRecord(value) || !exactKeys(value, AMBIENT_KEYS) || value.schemaVersion !== 1) invalidPayload();
        if (value.cacheState !== 'live' && value.cacheState !== 'stale') invalidPayload();
        if (!validTimestamp(value.fetchedAt)) invalidPayload();
        if (!Number.isSafeInteger(value.pulsePendingCount) || value.pulsePendingCount < 0) invalidPayload();
        if (!Array.isArray(value.tasks) || value.tasks.length > 3) invalidPayload();
        const tasks = value.tasks.map((task) => {
            if (!plainRecord(task) || !exactKeys(task, TASK_KEYS)) invalidPayload();
            if (!boundedString(task.id, 128) || !boundedString(task.name, 500)) invalidPayload();
            if (!['P0', 'P1', 'P2', 'P3'].includes(task.priority)) invalidPayload();
            if (task.dueDate !== null && (typeof task.dueDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(task.dueDate))) invalidPayload();
            return task;
        });
        return { schemaVersion: 1, cacheState: value.cacheState, fetchedAt: value.fetchedAt, tasks, pulsePendingCount: value.pulsePendingCount };
    }

    function parseNativeGrant(value) {
        if (!plainRecord(value) || !exactKeys(value, GRANT_KEYS) || value.schemaVersion !== 1) invalidGrant();
        if (typeof value.endpoint !== 'string' || !/^http:\/\/127\.0\.0\.1:[1-9]\d{0,4}\/v1\/ambient$/.test(value.endpoint)) invalidGrant();
        const url = new URL(value.endpoint);
        const port = Number(url.port);
        if (!Number.isInteger(port) || port < 1 || port > 65535) invalidGrant();
        if (typeof value.capability !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(value.capability)) invalidGrant();
        if (!validTimestamp(value.expiresAt)) invalidGrant();
        return value;
    }

    function resolveAmbientState(live, cached, now = new Date()) {
        try {
            if (live !== null) {
                const payload = parseAmbientPayload(live);
                return { kind: payload.cacheState === 'live' ? 'live' : 'cached', payload };
            }
        } catch (_) { /* independently validate cache */ }
        try {
            const payload = parseAmbientPayload(cached);
            const age = now.getTime() - Date.parse(payload.fetchedAt);
            if (Number.isFinite(age) && age >= 0 && age <= LAST_GOOD_MILLISECONDS) return { kind: 'cached', payload };
        } catch (_) { /* unavailable */ }
        return { kind: 'unavailable' };
    }

    async function loadAmbient(chromeApi, fetchImpl, now = new Date()) {
        const controller = new AbortController();
        const deadline = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MILLISECONDS);
        try {
            const grant = parseNativeGrant(await chromeApi.runtime.sendNativeMessage(
                NATIVE_HOST,
                { schemaVersion: 1, action: 'grant' },
            ));
            if (Date.parse(grant.expiresAt) <= now.getTime()) throw new Error('ambient_unavailable');
            const response = await fetchImpl(grant.endpoint, {
                method: 'GET',
                headers: { 'X-Momentum-Capability': grant.capability },
                cache: 'no-store',
                credentials: 'omit',
                redirect: 'error',
                referrerPolicy: 'no-referrer',
                signal: controller.signal,
            });
            if (!response.ok || response.status !== 200 || response.headers.get('content-type')?.split(';')[0].trim() !== 'application/json') {
                throw new Error('ambient_unavailable');
            }
            const text = await readBoundedUtf8(response, MAX_RESPONSE_BYTES);
            const payload = parseAmbientPayload(JSON.parse(text));
            await chromeApi.storage.local.set({ [CACHE_KEY]: payload });
            return { kind: payload.cacheState === 'live' ? 'live' : 'cached', payload };
        } catch (_) {
            try {
                const stored = await chromeApi.storage.local.get(CACHE_KEY);
                return resolveAmbientState(null, stored[CACHE_KEY] ?? null, now);
            } catch (_) {
                return { kind: 'unavailable' };
            }
        } finally {
            clearTimeout(deadline);
        }
    }

    async function readBoundedUtf8(response, maximumBytes) {
        const reader = response.body?.getReader?.();
        if (!reader) throw new Error('ambient_unavailable');
        const chunks = [];
        let length = 0;
        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                if (!(value instanceof Uint8Array)) throw new Error('ambient_unavailable');
                length += value.byteLength;
                if (length > maximumBytes) throw new Error('ambient_unavailable');
                chunks.push(value);
            }
        } catch (error) {
            try { await reader.cancel(); } catch (_) { /* bounded failure */ }
            throw error;
        }
        const bytes = new Uint8Array(length);
        let offset = 0;
        for (const chunk of chunks) {
            bytes.set(chunk, offset);
            offset += chunk.byteLength;
        }
        return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    }

    function renderAmbient(container, state) {
        while (container.firstChild) container.removeChild(container.firstChild);
        const heading = document.createElement('div');
        heading.className = 'momentum-ambient-heading';
        const title = document.createElement('h2');
        title.textContent = 'Momentum';
        const badge = document.createElement('span');
        badge.className = `momentum-ambient-badge ${state.kind}`;
        badge.textContent = state.kind === 'live' ? 'Live' : state.kind === 'cached' ? 'Last good' : 'Unavailable';
        heading.append(title, badge);
        container.appendChild(heading);
        if (state.kind === 'unavailable') {
            const message = document.createElement('p');
            message.className = 'momentum-ambient-unavailable';
            message.textContent = 'Momentum is unavailable. Open Momentum Command to reconnect.';
            container.appendChild(message);
            return;
        }
        const summary = document.createElement('p');
        summary.className = 'momentum-ambient-pulse';
        summary.textContent = `${state.payload.pulsePendingCount} Pulse item${state.payload.pulsePendingCount === 1 ? '' : 's'} pending`;
        container.appendChild(summary);
        const list = document.createElement('ol');
        list.className = 'momentum-ambient-tasks';
        for (const task of state.payload.tasks) {
            const item = document.createElement('li');
            const priority = document.createElement('span');
            priority.className = `momentum-priority ${task.priority.toLowerCase()}`;
            priority.textContent = task.priority;
            const name = document.createElement('span');
            name.textContent = task.name;
            item.append(priority, name);
            list.appendChild(item);
        }
        container.appendChild(list);
    }

    async function start() {
        const container = document.getElementById('momentum-ambient');
        if (!container) return;
        renderAmbient(container, await loadAmbient(chrome, fetch));
    }

    function plainRecord(value) {
        return value !== null && typeof value === 'object' && !Array.isArray(value)
            && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
    }
    function exactKeys(value, expected) {
        const keys = Object.keys(value).sort();
        return keys.length === expected.length && keys.every((key, index) => key === expected[index]);
    }
    function boundedString(value, maximumBytes) {
        return typeof value === 'string' && value.length > 0 && value.trim() === value
            && new TextEncoder().encode(value).length <= maximumBytes && !/[\u0000-\u001f\u007f]/.test(value);
    }
    function validTimestamp(value) {
        return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)
            && Number.isFinite(Date.parse(value));
    }
    function invalidPayload() { throw new Error('invalid_ambient_payload'); }
    function invalidGrant() { throw new Error('invalid_native_grant'); }

    const api = { CACHE_KEY, loadAmbient, parseAmbientPayload, parseNativeGrant, renderAmbient, resolveAmbientState };
    globalObject.MomentumAmbient = api;
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    if (typeof document !== 'undefined') document.addEventListener('DOMContentLoaded', start);
}(typeof globalThis === 'undefined' ? this : globalThis));
