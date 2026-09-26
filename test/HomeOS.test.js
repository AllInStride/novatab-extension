const fs = require('node:fs');
const path = require('node:path');
const HomeOS = require('../home-os.js');

// Public repository tests use fabricated destinations. The real catalog is a
// local build artifact because it contains private navigation metadata.
const generatedAt = '2026-09-26T06:38:43Z';
const link = (label, url) => ({ label, url, access: 'local', verifiedAt: generatedAt });
const item = (id, kind, links, tags = []) => ({
  id, name: id, kind, status: 'available', tags, links,
});
const catalog = {
  schemaVersion: 1, generatedAt,
  sourceCoverage: ['admin-registry', 'writing-catalog', 'project-catalog'],
  items: [
    item('active-example', 'article', [link('Open draft', 'obsidian://open?vault=example&file=draft')], ['writing']),
    item('project-example', 'project', [link('Project', 'https://example.com/project')]),
    ...['a', 'b', 'c', 'd'].map((suffix) => item(`publication-${suffix}`, 'publication', [])),
    item('writing-hub', 'document', [link('Open Writing Hub', 'obsidian://open?vault=example&file=hub')], ['writing']),
    item('writing-published', 'document', [], ['published']),
    item('writing-studio', 'document', [], ['Obsidian']),
  ],
  retired: [],
};

describe('Home OS bundled catalog', () => {
  test('extension-page CSP permits fetching its bundled catalog', () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, '../manifest.json'), 'utf8'));
    const connect = manifest.content_security_policy.extension_pages
      .split(';').map((directive) => directive.trim())
      .find((directive) => directive.startsWith('connect-src '));
    expect(connect).toBeDefined();
    expect(connect.split(/\s+/)).toContain("'self'");
  });
  test('conforms to the generated catalog contract', () => {
    expect(catalog.schemaVersion).toBe(1);
    expect(HomeOS.validateCatalog(catalog)).toBe(true);
    expect(catalog.items.map((item) => item.id)).toEqual([...catalog.items.map((item) => item.id)].sort());
    expect(catalog.items.filter((item) => item.kind === 'publication')).toHaveLength(4);
    expect(catalog.items.find((item) => item.id === 'writing-hub').links[0].url).toMatch(/^obsidian:\/\//);
    expect(catalog.items.some((item) => item.links.some((link) => /status\/projects\.html/.test(link.url)))).toBe(false);
  });

  test('rejects duplicate IDs and executable URLs', () => {
    const duplicate = structuredClone(catalog);
    duplicate.items.push(structuredClone(duplicate.items[0]));
    expect(HomeOS.validateCatalog(duplicate)).toBe(false);
    const script = structuredClone(catalog);
    script.items[0].links = [{ label: 'Bad', url: 'javascript:alert(1)', access: 'public', verifiedAt: catalog.generatedAt }];
    expect(HomeOS.validateCatalog(script)).toBe(false);
    const unknown = structuredClone(catalog);
    unknown.items[0].privateSource = 'hidden';
    expect(HomeOS.validateCatalog(unknown)).toBe(false);
    const secret = structuredClone(catalog);
    secret.items[0].name = 'api_key=sk-test-secret';
    expect(HomeOS.validateCatalog(secret)).toBe(false);
    const control = structuredClone(catalog);
    control.items[0].tags = ['bad\u0001tag'];
    expect(HomeOS.validateCatalog(control)).toBe(false);
    const unsorted = structuredClone(catalog);
    [unsorted.items[0], unsorted.items[1]] = [unsorted.items[1], unsorted.items[0]];
    expect(HomeOS.validateCatalog(unsorted)).toBe(false);
    const conflict = structuredClone(catalog);
    conflict.items[1].links.push({ ...conflict.items[0].links[0], access: 'tailnet' });
    expect(HomeOS.validateCatalog(conflict)).toBe(false);
  });

  test('keeps freshness distinct from each link verification date', () => {
    const now = Date.parse(catalog.generatedAt);
    expect(HomeOS.freshness(catalog, now + 35 * 60 * 60 * 1000)).toBe('live');
    expect(HomeOS.freshness(catalog, now + 37 * 60 * 60 * 1000)).toBe('stale');
    expect(HomeOS.freshness(catalog, now + 9 * 24 * 60 * 60 * 1000)).toBe('expired');
  });

  test('searches names, tags, action, and link labels in source order', () => {
    const writing = HomeOS.filterCatalog(catalog.items, 'published');
    expect(writing.some((item) => item.id === 'writing-published')).toBe(true);
    expect(HomeOS.filterCatalog(catalog.items, 'Obsidian').some((item) => item.id === 'writing-studio')).toBe(true);
    expect(HomeOS.filterCatalog(catalog.items, 'Open Writing Hub').some((item) => item.id === 'writing-hub')).toBe(true);
  });

  test('page leaves Momentum and custom categories available', () => {
    const html = fs.readFileSync(path.join(__dirname, '../new_tab.html'), 'utf8');
    expect(html).toContain('id="momentum-ambient"');
    expect(html).toContain('id="categories-container"');
    expect(html).toContain('id="home-os-root"');
    expect(html.indexOf('momentum-ambient.js')).toBeLessThan(html.indexOf('home-os.js'));
  });

  test('invalid bundle uses a valid local copy and rejects an expired copy', async () => {
    const now = Date.parse(catalog.generatedAt) + 2 * 24 * 60 * 60 * 1000;
    const originalFetch = global.fetch;
    global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ broken: true }) }));
    global.chrome.runtime.getURL = jest.fn(() => 'home-os-catalog.json');
    setMockStorageData({ homeOsLastValidCatalog: catalog });
    try {
      const current = await HomeOS.loadCatalog(Date.parse(catalog.generatedAt) + 60 * 60 * 1000);
      expect(current.state).toBe('live');
      const recovered = await HomeOS.loadCatalog(now);
      expect(recovered.state).toBe('stale');
      expect(recovered.catalog).toEqual(catalog);
      const expired = await HomeOS.loadCatalog(now + 8 * 24 * 60 * 60 * 1000);
      expect(expired.state).toBe('unavailable');
      expect(expired.catalog).toBeNull();
    } finally { global.fetch = originalFetch; }
  });
});
