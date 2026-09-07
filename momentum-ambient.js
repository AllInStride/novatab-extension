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
    const WORKBENCH_CACHE_KEY = 'momentumAmbientWorkbenchV2';

    function publicTarget(target) {
        if (typeof target !== 'string' || target.length > 240 || target.trim() !== target || /[\u0000-\u001f\u007f\\]/.test(target)) return false;
        if (['home', 'inbox', 'work', 'review', 'projects', 'knowledge', 'clio', 'capture'].includes(target)) return true;
        const match = /^(task|project)\(([^(),]+)(?:,(overview|work|knowledge|decisions|activity))?\)$/.exec(target);
        return Boolean(match && (!match[3] || match[1] === 'project') && match[2].length <= 200
            && !match[2].startsWith('/') && !match[2].split('/').includes('..') && match[2].trim() === match[2]);
    }

    async function openWorkbench(chromeApi, target, requestId) {
        if (!publicTarget(target) || typeof requestId !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(requestId)) throw new Error('invalid_launch');
        let deadline;
        let receipt;
        try {
            receipt = await Promise.race([
                chromeApi.runtime.sendNativeMessage(NATIVE_HOST, { schemaVersion: 1, action: 'open', requestId, target }),
                new Promise((_, reject) => { deadline = setTimeout(() => reject(new Error('timeout')), FETCH_TIMEOUT_MILLISECONDS); }),
            ]);
        } finally { clearTimeout(deadline); }
        if (!plainRecord(receipt) || !exactKeys(receipt, ['openingId', 'outcome', 'reason', 'schemaVersion', 'window'])
            || receipt.schemaVersion !== 1 || !['accepted', 'duplicate', 'rejected', 'unavailable'].includes(receipt.outcome)
            || ![null, 'main', 'compact'].includes(receipt.window)
            || ![null, 'invalidRequest', 'invalidTarget', 'notAllowedForSource', 'windowUnavailable'].includes(receipt.reason)) throw new Error('invalid_launch_receipt');
        if (['accepted', 'duplicate'].includes(receipt.outcome) && (receipt.reason !== null
            || receipt.window !== (target === 'capture' ? 'compact' : 'main')
            || typeof receipt.openingId !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(receipt.openingId))) throw new Error('invalid_launch_receipt');
        return receipt;
    }

    function parseWorkbenchPayload(value) {
        const shape = (record, keys) => plainRecord(record) && exactKeys(record, keys);
        const count = number => Number.isSafeInteger(number) && number >= 0 && number <= 10000;
        const nullableTime = time => time === null || validTimestamp(time);
        if (!shape(value, ['calendar', 'inbox', 'now', 'observedAt', 'schemaVersion', 'shipping'])
            || value.schemaVersion !== 2 || !validTimestamp(value.observedAt)) invalidPayload();
        const now = value.now, calendar = value.calendar, inbox = value.inbox, shipping = value.shipping;
        if (!shape(now, ['fetchedAt', 'state', 'tasks']) || !['live', 'stale', 'unavailable'].includes(now.state)
            || !nullableTime(now.fetchedAt) || !Array.isArray(now.tasks) || now.tasks.length > 3) invalidPayload();
        if (now.state === 'unavailable' ? now.tasks.length !== 0 || now.fetchedAt !== null : now.fetchedAt === null) invalidPayload();
        parseAmbientPayload({ schemaVersion: 1, cacheState: 'live', fetchedAt: value.observedAt, tasks: now.tasks, pulsePendingCount: 0 });
        if (!shape(calendar, ['events', 'fetchedAt', 'state', 'total']) || !['live', 'stale', 'partial', 'disabled', 'unavailable'].includes(calendar.state)
            || !nullableTime(calendar.fetchedAt) || !Array.isArray(calendar.events) || calendar.events.length > 3) invalidPayload();
        if (['disabled', 'unavailable'].includes(calendar.state) ? calendar.total !== null || calendar.events.length !== 0
            : !count(calendar.total) || calendar.total < calendar.events.length || calendar.fetchedAt === null) invalidPayload();
        for (const event of calendar.events) if (!shape(event, ['allDay', 'end', 'start', 'title'])
            || !boundedString(event.title, 2000) || !validTimestamp(event.start) || !validTimestamp(event.end)
            || Date.parse(event.end) < Date.parse(event.start) || typeof event.allDay !== 'boolean') invalidPayload();
        if (!shape(inbox, ['pulse', 'state', 'tasks', 'total']) || !['complete', 'partial', 'unavailable'].includes(inbox.state)) invalidPayload();
        if (inbox.state === 'unavailable' ? inbox.total !== null || inbox.tasks !== null || inbox.pulse !== null
            : !count(inbox.total) || !count(inbox.tasks) || !count(inbox.pulse) || inbox.tasks + inbox.pulse !== inbox.total) invalidPayload();
        if (!shape(shipping, ['items', 'state', 'total']) || !['complete', 'unavailable'].includes(shipping.state)
            || !Array.isArray(shipping.items) || shipping.items.length > 3) invalidPayload();
        if (shipping.state === 'unavailable' ? shipping.total !== null || shipping.items.length !== 0
            : !count(shipping.total) || shipping.total < shipping.items.length) invalidPayload();
        for (const item of shipping.items) if (!shape(item, ['id', 'name', 'verifiedAt']) || !boundedString(item.id, 200)
            || !boundedString(item.name, 2000) || !validTimestamp(item.verifiedAt)) invalidPayload();
        return value;
    }

    async function loadWorkbench(chromeApi, now = new Date()) {
        let deadline;
        try {
            const response = await Promise.race([
                chromeApi.runtime.sendNativeMessage(NATIVE_HOST, { schemaVersion: 2, action: 'workbench' }),
                new Promise((_, reject) => { deadline = setTimeout(() => reject(new Error('timeout')), FETCH_TIMEOUT_MILLISECONDS); }),
            ]);
            if (new TextEncoder().encode(JSON.stringify(response)).length > MAX_RESPONSE_BYTES) invalidPayload();
            const payload = parseWorkbenchPayload(response);
            const age = now.getTime() - Date.parse(payload.observedAt);
            if (age < -60000 || age > LAST_GOOD_MILLISECONDS) invalidPayload();
            try { await chromeApi.storage.local.set({ [WORKBENCH_CACHE_KEY]: payload }); } catch (_) { /* a valid current projection is still usable */ }
            return { kind: 'live', payload };
        } catch (_) {
            try {
                const stored = await chromeApi.storage.local.get(WORKBENCH_CACHE_KEY);
                const payload = parseWorkbenchPayload(stored[WORKBENCH_CACHE_KEY]);
                const age = now.getTime() - Date.parse(payload.observedAt);
                if (age >= 0 && age <= LAST_GOOD_MILLISECONDS) return { kind: 'cached', payload };
            } catch (_) { /* no trusted projection */ }
            return { kind: 'unavailable' };
        } finally { clearTimeout(deadline); }
    }

    function renderWorkbench(container, state, chromeApi, now = new Date()) {
        while (container.firstChild) container.removeChild(container.firstChild);
        const add = (parent, tag, text, className) => {
            const node = document.createElement(tag); node.textContent = text;
            if (className) node.className = className;
            parent.appendChild(node); return node;
        };
        const age = timestamp => {
            if (!timestamp) return 'age unavailable';
            const minutes = Math.max(0, Math.floor((now.getTime() - Date.parse(timestamp)) / 60000));
            if (minutes < 1) return 'just now';
            if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
            const hours = Math.floor(minutes / 60);
            return hours < 24 ? `${hours} hour${hours === 1 ? '' : 's'} ago` : `${Math.floor(hours / 24)} day${hours < 48 ? '' : 's'} ago`;
        };
        const dateTime = timestamp => new Intl.DateTimeFormat(undefined, {
            weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
        }).format(new Date(timestamp));
        const header = add(container, 'div', '', 'momentum-workbench-header');
        add(header, 'h2', 'Momentum');
        const badge = add(header, 'span', state.kind === 'live' ? 'Live' : state.kind === 'cached' ? 'Last good' : 'Unavailable', `momentum-ambient-badge ${state.kind}`);
        badge.setAttribute?.('aria-label', `Momentum data ${badge.textContent.toLowerCase()}`);
        add(container, 'p', state.kind === 'unavailable' ? 'Your overview is unavailable. You can still try opening Momentum.'
            : `${state.kind === 'cached' ? 'Last good view' : 'Updated'} ${age(state.payload.observedAt)}.`, 'momentum-workbench-freshness');
        const notice = add(container, 'p', '', 'momentum-workbench-notice');
        notice.setAttribute?.('aria-live', 'polite');
        const launch = (parent, label, target, className) => {
            const button = add(parent, 'button', label, className); button.type = 'button';
            let requestId = null;
            button.addEventListener('click', async () => {
                button.disabled = true;
                requestId = requestId || globalObject.crypto.randomUUID();
                try {
                    const receipt = await openWorkbench(chromeApi, target, requestId);
                    if (receipt.outcome === 'accepted') notice.textContent = `Opening ${label} in Momentum.`;
                    else if (receipt.outcome === 'duplicate') notice.textContent = `Momentum already received the request to open ${label}.`;
                    else if (receipt.outcome === 'rejected') notice.textContent = `Momentum did not open ${label}; this destination is not available from NovaTab.`;
                    else notice.textContent = `Momentum is unavailable. ${label} was not opened.`;
                    if (receipt.outcome === 'accepted' || receipt.outcome === 'duplicate' || receipt.outcome === 'rejected') requestId = null;
                } catch (_) { notice.textContent = `Momentum could not confirm opening ${label}. Retry will reuse the same request.`; }
                finally { button.disabled = false; }
            });
            return button;
        };
        const actions = add(container, 'nav', '', 'momentum-workbench-actions');
        actions.setAttribute?.('aria-label', 'Momentum shortcuts');
        launch(actions, 'Open Work', 'work', 'momentum-action-primary');
        launch(actions, 'Capture', 'capture', 'momentum-action-primary');
        launch(actions, 'Inbox', 'inbox'); launch(actions, 'Review', 'review');
        if (state.kind === 'unavailable') return;
        const payload = state.payload;
        const freshness = source => state.kind === 'cached' && !['unavailable', 'disabled'].includes(source.state) ? 'cached' : source.state;
        const section = (title, meta) => {
            const node = add(container, 'section', '', 'momentum-workbench-section');
            const heading = add(node, 'div', '', 'momentum-workbench-section-heading');
            add(heading, 'h3', title); add(heading, 'span', meta, 'momentum-workbench-meta');
            return node;
        };
        const nowSection = section('Now', `${freshness(payload.now)} · ${age(payload.now.fetchedAt)}`);
        if (!payload.now.tasks.length) add(nowSection, 'p', payload.now.state === 'unavailable' ? 'Current tasks are unavailable.' : 'No tasks are in Now.', 'momentum-workbench-empty');
        for (const task of payload.now.tasks) {
            const row = add(nowSection, 'div', '', 'momentum-workbench-row');
            add(row, 'span', task.priority, `momentum-priority ${task.priority.toLowerCase()}`);
            launch(row, task.name, `task(${task.id})`, 'momentum-workbench-row-action');
            add(row, 'span', task.dueDate ? `Due ${new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(`${task.dueDate}T12:00:00`))}` : 'No due date', 'momentum-workbench-row-meta');
        }
        const calendarSection = section('Calendar', `${freshness(payload.calendar)} · ${age(payload.calendar.fetchedAt)}`);
        if (!payload.calendar.events.length) add(calendarSection, 'p', payload.calendar.state === 'disabled' ? 'Calendar is not enabled.' : payload.calendar.state === 'unavailable' ? 'Calendar is unavailable.' : 'No upcoming events in this view.', 'momentum-workbench-empty');
        for (const event of payload.calendar.events) {
            const row = add(calendarSection, 'div', '', 'momentum-workbench-row momentum-calendar-row');
            add(row, 'strong', event.title);
            add(row, 'span', event.allDay ? `${dateTime(event.start).split(' at ')[0]} · all day` : dateTime(event.start), 'momentum-workbench-row-meta');
        }
        const inboxMeta = payload.inbox.total === null ? 'unavailable' : `${state.kind === 'cached' ? 'cached · ' : ''}${payload.inbox.state}`;
        const inboxSection = section('Inbox', inboxMeta);
        if (payload.inbox.total === null) add(inboxSection, 'p', 'Inbox counts are unavailable.', 'momentum-workbench-empty');
        else {
            add(inboxSection, 'strong', `${payload.inbox.total} item${payload.inbox.total === 1 ? '' : 's'} waiting`, 'momentum-inbox-count');
            add(inboxSection, 'p', `${payload.inbox.tasks} task${payload.inbox.tasks === 1 ? '' : 's'} · ${payload.inbox.pulse} Pulse item${payload.inbox.pulse === 1 ? '' : 's'}`, 'momentum-workbench-row-meta');
        }
        const shippingSection = section('Shipped', `${state.kind === 'cached' ? 'cached · ' : ''}${payload.shipping.state}`);
        if (!payload.shipping.items.length) add(shippingSection, 'p', payload.shipping.state === 'unavailable' ? 'Verified shipped work is unavailable.' : 'No verified shipped work in this view.', 'momentum-workbench-empty');
        for (const item of payload.shipping.items) {
            const row = add(shippingSection, 'div', '', 'momentum-workbench-row');
            launch(row, item.name, `task(${item.id})`, 'momentum-workbench-row-action');
            add(row, 'span', `Verified ${dateTime(item.verifiedAt)}`, 'momentum-workbench-row-meta');
        }
    }

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
        renderWorkbench(container, await loadWorkbench(chrome), chrome);
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

    const api = { CACHE_KEY, loadAmbient, parseAmbientPayload, parseNativeGrant, renderAmbient, resolveAmbientState,
        WORKBENCH_CACHE_KEY, openWorkbench, parseWorkbenchPayload, loadWorkbench, renderWorkbench };
    globalObject.MomentumAmbient = api;
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    if (typeof document !== 'undefined') document.addEventListener('DOMContentLoaded', start);
}(typeof globalThis === 'undefined' ? this : globalThis));
