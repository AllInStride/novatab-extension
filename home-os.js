/* Home OS HQ is a read-only projection of the bundled Admin catalog. */
(function (global) {
  'use strict';

  const sections = ['Home', 'Work', 'Writing', 'Projects', 'Reports', 'Sites', 'Documents', 'All Links'];
  const homeIds = new Set(['momentum', 'writing-hub', 'writing-reviews', 'writing-published', 'drive-writing-root', 'command-deck']);
  const storageKey = 'homeOsLastValidCatalog';
  const hour = 60 * 60 * 1000;
  const allowedAccess = new Set(['public', 'tailnet', 'local', 'authenticated']);
  const forbiddenValue = /(?:api[_-]?key|token|secret)\s*[:=]|\bBearer\s+[A-Za-z0-9._-]+|\bsk-[A-Za-z0-9_-]{8,}/i;
  const exactKeys = (value, keys) => value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).every((key) => keys.includes(key));
  function safeValues(value) {
    if (typeof value === 'string') return !hasControl(value) && !forbiddenValue.test(value);
    if (Array.isArray(value)) return value.every(safeValues);
    if (value && typeof value === 'object') return Object.entries(value).every(([key, nested]) => safeValues(key) && safeValues(nested));
    return true;
  }
  const validInstant = (value) => typeof value === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/.test(value) && !Number.isNaN(Date.parse(value));
  const hasControl = (value) => /[\x00-\x1f]/.test(value);
  const byteLength = (value) => new TextEncoder().encode(value).length;
  const validText = (value, max) => typeof value === 'string' && byteLength(value) > 0 && byteLength(value) <= max && !hasControl(value);
  const urlAllowed = (value) => typeof value === 'string' && /^(https?:\/\/|obsidian:\/\/|file:\/\/)/.test(value) && byteLength(value) <= 2048;

  function validateCatalog(value) {
    if (!exactKeys(value, ['schemaVersion', 'generatedAt', 'sourceCoverage', 'items', 'retired']) ||
        !safeValues(value) || value.schemaVersion !== 1 || !validInstant(value.generatedAt) ||
        !Array.isArray(value.items) || !value.items.length || value.items.length > 256 ||
        !Array.isArray(value.retired) || value.retired.length > 256 ||
        !Array.isArray(value.sourceCoverage) || value.sourceCoverage.length < 3 ||
        !value.sourceCoverage.every((entry) => validText(entry, 120))) return false;
    const ids = new Set();
    const urls = new Map();
    let previousId = '';
    for (const item of [...value.items, ...value.retired]) {
      if (!exactKeys(item, ['id', 'name', 'kind', 'status', 'tags', 'links', 'action']) ||
          !validText(item.id, 96) || !validText(item.name, 240) ||
          !validText(item.kind, 64) || !validText(item.status, 64) || ids.has(item.id) ||
          !Array.isArray(item.tags) || item.tags.length > 16 ||
          !item.tags.every((tag) => validText(tag, 64)) ||
          !Array.isArray(item.links) || item.links.length > 8) return false;
      ids.add(item.id);
      if (value.items.includes(item) && previousId && previousId >= item.id) return false;
      if (value.items.includes(item)) previousId = item.id;
      if (item.action !== undefined && !validText(item.action, 240)) return false;
      for (const link of item.links) {
        if (!exactKeys(link, ['label', 'url', 'access', 'verifiedAt']) ||
            !validText(link.label, 120) || !urlAllowed(link.url) ||
            !allowedAccess.has(link.access) || !validInstant(link.verifiedAt)) return false;
        const metadata = `${link.access}|${link.verifiedAt}`;
        if (urls.has(link.url) && urls.get(link.url) !== metadata) return false;
        urls.set(link.url, metadata);
      }
    }
    return true;
  }

  function freshness(catalog, now = Date.now()) {
    if (!validateCatalog(catalog)) return 'unavailable';
    const age = now - Date.parse(catalog.generatedAt);
    if (age < -hour || age > 8 * 24 * hour) return 'expired';
    return age <= 36 * hour ? 'live' : 'stale';
  }

  function filterCatalog(items, query) {
    const needle = String(query || '').trim().toLocaleLowerCase();
    if (!needle) return items;
    return items.filter((item) => [item.name, item.kind, item.status, item.action,
      ...(item.tags || []), ...(item.links || []).map((link) => link.label)]
      .some((value) => String(value || '').toLocaleLowerCase().includes(needle)));
  }

  function belongs(item, section) {
    if (section === 'All Links' || section === 'Home') return true;
    const text = [item.id, item.kind, item.name, ...(item.tags || [])].join(' ').toLowerCase();
    const patterns = {
      Work: /momentum|task|work/, Writing: /writing|article|draft|publication|review|medium|linkedin|voice/,
      Projects: /project/, Reports: /report|brief|dashboard|deck/, Sites: /site|website|brand|public/,
      Documents: /document|drive|folder|export|manuscript/,
    };
    return patterns[section].test(text);
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function renderItems(items, container) {
    container.replaceChildren();
    if (!items.length) {
      container.append(el('p', 'home-os-empty', 'No matching destinations'));
      return;
    }
    const list = el('div', 'home-os-grid');
    for (const item of items) {
      const card = el('article', 'home-os-card');
      card.append(el('h3', '', item.name));
      card.append(el('p', 'home-os-meta', `${item.kind} · ${item.status}`));
      if (item.action) card.append(el('p', 'home-os-action', item.action));
      if (!item.links.length) card.append(el('p', 'home-os-unlinked', 'Route unavailable in this catalog'));
      for (const link of item.links) {
        const anchor = el('a', 'home-os-link', link.label);
        anchor.href = link.url;
        anchor.target = '_blank';
        anchor.rel = 'noopener noreferrer';
        anchor.append(el('span', 'home-os-link-meta', ` · ${link.access} · checked ${link.verifiedAt.slice(0, 10)}`));
        card.append(anchor);
      }
      list.append(card);
    }
    container.append(list);
  }

  function renderShell({ catalog, root, state = freshness(catalog) }) {
    if (!root) throw new Error('Home OS root missing');
    const existingCategories = document.getElementById('categories-container');
    root.replaceChildren();
    const layout = el('div', 'home-os-layout');
    const rail = el('aside', 'home-os-rail');
    rail.append(el('p', 'home-os-eyebrow', 'Your daily doorway'));
    rail.append(el('h1', 'home-os-brand', 'Home OS HQ'));
    const nav = el('nav', 'home-os-nav');
    nav.setAttribute('aria-label', 'Home OS sections');
    const content = el('section', 'home-os-content');
    const title = el('h2', 'home-os-title', 'Home');
    const freshnessLabel = el('p', 'home-os-freshness');
    freshnessLabel.setAttribute('role', 'status');
    const intro = el('p', 'home-os-intro');
    const results = el('div', 'home-os-results');
    const custom = el('section', 'home-os-custom');
    custom.append(el('h3', '', 'Your NovaTab links'));
    custom.hidden = true;
    if (existingCategories) custom.append(existingCategories);
    const search = el('div', 'home-os-search');
    search.hidden = true;
    search.setAttribute('role', 'dialog');
    search.setAttribute('aria-modal', 'true');
    search.setAttribute('aria-label', 'Search destinations');
    const searchHeader = el('div', 'home-os-search-header');
    const label = el('label', '', 'Search destinations');
    label.htmlFor = 'home-os-search-input';
    const input = el('input', 'home-os-search-input');
    input.id = 'home-os-search-input';
    input.type = 'search';
    input.autocomplete = 'off';
    const close = el('button', 'home-os-search-close', 'Close');
    close.type = 'button';
    searchHeader.append(label, close);
    search.append(searchHeader, input, el('div', 'home-os-search-results'));
    let current = 'Home';
    let returnFocus = null;
    const ready = state === 'live' || state === 'stale';
    function show(section) {
      current = section;
      title.textContent = section;
      for (const button of nav.querySelectorAll('button[data-section]')) {
        if (button.dataset.section === section) button.setAttribute('aria-current', 'page');
        else button.removeAttribute('aria-current');
      }
      custom.hidden = section !== 'All Links';
      if (!ready) {
        intro.textContent = 'Catalog unavailable. The navigation and your saved NovaTab links remain available.';
        renderItems([], results);
      } else {
        intro.textContent = section === 'Home' ? 'Open a verified destination or choose a section.' : `Browse ${section.toLowerCase()} destinations.`;
        renderItems(catalog.items.filter((item) => section === 'Home' ? homeIds.has(item.id) : belongs(item, section)), results);
      }
    }
    for (const section of sections) {
      const button = el('button', 'home-os-nav-button', section);
      button.type = 'button';
      button.dataset.section = section;
      button.addEventListener('click', () => show(section));
      nav.append(button);
    }
    const searchButton = el('button', 'home-os-nav-button home-os-search-button', 'Search / Command ⌘K');
    searchButton.type = 'button';
    nav.append(searchButton);
    const searchResults = search.querySelector('.home-os-search-results');
    function updateSearch() { renderItems(ready ? filterCatalog(catalog.items, input.value) : [], searchResults); }
    function openSearch() { returnFocus = document.activeElement; search.hidden = false; input.value = ''; updateSearch(); input.focus(); }
    function closeSearch() { search.hidden = true; if (returnFocus?.focus) returnFocus.focus(); }
    searchButton.addEventListener('click', openSearch);
    close.addEventListener('click', closeSearch);
    input.addEventListener('input', updateSearch);
    root.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !search.hidden) { event.preventDefault(); closeSearch(); }
      if (event.key === 'Tab' && !search.hidden) {
        const focusables = [...search.querySelectorAll('button, input, a[href]')];
        const first = focusables[0], last = focusables[focusables.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    });
    const pageShortcut = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); openSearch(); }
    };
    document.addEventListener('keydown', pageShortcut);
    if (root._homeOsShortcut) document.removeEventListener('keydown', root._homeOsShortcut);
    root._homeOsShortcut = pageShortcut;
    rail.append(nav);
    if (ready) {
      const date = catalog.generatedAt.slice(0, 10);
      freshnessLabel.textContent = `Static catalog ${state}: generated ${date}. Link checks are dated on each destination.`;
    } else freshnessLabel.textContent = state === 'expired' ? 'Catalog unavailable: bundled data expired.' : 'Catalog unavailable.';
    content.append(title, freshnessLabel, intro, results, custom);
    layout.append(rail, content);
    root.append(layout, search);
    show(current);
    return { show, openSearch };
  }

  async function loadCatalog(now = Date.now()) {
    let bundled = null;
    try {
      const response = await fetch(chrome.runtime.getURL('home-os-catalog.json'));
      if (!response.ok) throw new Error('Catalog fetch failed');
      bundled = await response.json();
    } catch { /* The local last-valid copy is considered below. */ }
    if (validateCatalog(bundled) && freshness(bundled, now) !== 'expired') {
      try { await chrome.storage.local.set({ [storageKey]: bundled }); } catch { /* Render from the bundle. */ }
      return { catalog: bundled, state: freshness(bundled, now) };
    }
    try {
      const stored = (await chrome.storage.local.get(storageKey))[storageKey];
      const state = freshness(stored, now);
      if (state === 'live' || state === 'stale') return { catalog: stored, state };
    } catch { /* Show the unavailable state. */ }
    return { catalog: null, state: 'unavailable' };
  }

  const HomeOS = { validateCatalog, freshness, filterCatalog, renderShell, loadCatalog };
  global.HomeOS = HomeOS;
  if (typeof module !== 'undefined') module.exports = HomeOS;
  if (typeof document !== 'undefined' && global.chrome?.runtime?.getURL) {
    document.addEventListener('DOMContentLoaded', async () => {
      const root = document.getElementById('home-os-root');
      if (root) renderShell({ ...(await loadCatalog()), root });
    });
  }
})(typeof window !== 'undefined' ? window : globalThis);
