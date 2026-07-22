import { describe, it, expect, vi } from 'vitest';
import { EdgeClient } from '../src/edge/client.js';

const config = {
  endpoint: 'https://edge.example/api/graphql/v1',
  apiKey: 'secret-token',
  site: 'my-site',
  defaultLanguage: 'en',
};

describe('EdgeClient.getLayout', () => {
  it('posts the layout query and returns rendered JSON', async () => {
    const rendered = { sitecore: { route: { placeholders: {} } } };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { layout: { item: { rendered } } } }),
    });
    const client = new EdgeClient(config, fetchMock as unknown as typeof fetch);
    const result = await client.getLayout('/about-us', 'en');
    expect(result).toEqual(rendered);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(config.endpoint);
    expect((init.headers as Record<string, string>).sc_apikey).toBe('secret-token');
    expect(JSON.parse(init.body as string).variables).toMatchObject({ site: 'my-site', routePath: '/about-us', language: 'en' });
  });

  it('throws masking the key on HTTP error', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 401, text: async () => 'unauthorized' });
    const client = new EdgeClient(config, fetchMock as unknown as typeof fetch);
    await expect(client.getLayout('/x', 'en')).rejects.toThrow(/401/);
    await expect(client.getLayout('/x', 'en')).rejects.not.toThrow(/secret-token/);
  });

  it('throws on GraphQL errors array', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ errors: [{ message: 'bad query' }] }),
    });
    const client = new EdgeClient(config, fetchMock as unknown as typeof fetch);
    await expect(client.getLayout('/x', 'en')).rejects.toThrow(/bad query/);
  });

  it('throws a clear error when route layout is null', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { layout: { item: null } } }),
    });
    const client = new EdgeClient(config, fetchMock as unknown as typeof fetch);
    await expect(client.getLayout('/missing', 'en')).rejects.toThrow(/no route/i);
  });
});

describe('EdgeClient.getDictionary', () => {
  it('returns all entries for a single-page dictionary', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: { site: { siteInfo: { dictionary: {
          results: [{ key: 'Nav.Login', value: 'Log in' }],
          pageInfo: { endCursor: 'C1', hasNext: false },
        } } } },
      }),
    });
    const client = new EdgeClient(config, fetchMock as unknown as typeof fetch);
    const entries = await client.getDictionary('en');
    expect(entries).toEqual([{ key: 'Nav.Login', value: 'Log in' }]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('follows pagination and concatenates all entries', async () => {
    const page1 = {
      data: { site: { siteInfo: { dictionary: {
        results: [{ key: 'Nav.Login', value: 'Log in' }],
        pageInfo: { endCursor: 'CURSOR1', hasNext: true },
      } } } },
    };
    const page2 = {
      data: { site: { siteInfo: { dictionary: {
        results: [{ key: 'Home.Title', value: 'Home' }],
        pageInfo: { endCursor: 'CURSOR2', hasNext: false },
      } } } },
    };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => page1 })
      .mockResolvedValueOnce({ ok: true, json: async () => page2 });
    const client = new EdgeClient(config, fetchMock as unknown as typeof fetch);

    const entries = await client.getDictionary('en');

    expect(entries).toEqual([
      { key: 'Nav.Login', value: 'Log in' },
      { key: 'Home.Title', value: 'Home' },
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    // Second call must pass the first page's endCursor as `after`.
    const secondBody = JSON.parse(fetchMock.mock.calls[1][1].body as string);
    expect(secondBody.variables.after).toBe('CURSOR1');
    expect(secondBody.variables).toMatchObject({ site: 'my-site', language: 'en' });
  });

  it('throws on GraphQL errors array', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ errors: [{ message: 'bad dictionary query' }] }),
    });
    const client = new EdgeClient(config, fetchMock as unknown as typeof fetch);
    await expect(client.getDictionary('en')).rejects.toThrow(/bad dictionary query/);
  });

  it('throws masking the key on HTTP error', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 401, text: async () => 'unauthorized' });
    const client = new EdgeClient(config, fetchMock as unknown as typeof fetch);
    await expect(client.getDictionary('en')).rejects.toThrow(/401/);
    await expect(client.getDictionary('en')).rejects.not.toThrow(/secret-token/);
  });
});

const contextConfig = {
  contextId: 'ctx-123 456', // space on purpose: must be URL-encoded
  site: 'my-site',
  defaultLanguage: 'en',
};

describe('EdgeClient context-ID mode', () => {
  it('posts getLayout to the edge-platform URL with sitecoreContextId and no sc_apikey header', async () => {
    const rendered = { sitecore: { route: { placeholders: {} } } };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { layout: { item: { rendered } } } }),
    });
    const client = new EdgeClient(contextConfig, fetchMock as unknown as typeof fetch);
    const result = await client.getLayout('/about-us', 'en');
    expect(result).toEqual(rendered);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(
      'https://edge-platform.sitecorecloud.io/v1/content/api/graphql/v1?sitecoreContextId=ctx-123%20456',
    );
    expect((init.headers as Record<string, string>).sc_apikey).toBeUndefined();
    expect(JSON.parse(init.body as string).variables).toMatchObject({ site: 'my-site', routePath: '/about-us', language: 'en' });
  });

  it('posts getDictionary to the edge-platform URL with sitecoreContextId and no sc_apikey header', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: { site: { siteInfo: { dictionary: {
          results: [{ key: 'Nav.Login', value: 'Log in' }],
          pageInfo: { endCursor: 'C1', hasNext: false },
        } } } },
      }),
    });
    const client = new EdgeClient(contextConfig, fetchMock as unknown as typeof fetch);
    const entries = await client.getDictionary('en');
    expect(entries).toEqual([{ key: 'Nav.Login', value: 'Log in' }]);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain('sitecoreContextId=ctx-123%20456');
    expect((init.headers as Record<string, string>).sc_apikey).toBeUndefined();
  });

  it('throws when neither contextId nor endpoint+apiKey is configured', () => {
    expect(() => new EdgeClient({ site: 's', defaultLanguage: 'en' })).toThrow(/contextId|apiKey/i);
  });
});

describe('EdgeClient.getRoutes', () => {
  function routesPage(
    results: Array<{ routePath: string; name?: string; updated?: string }>,
    pageInfo: { endCursor: string; hasNext: boolean },
  ) {
    return {
      data: { site: { siteInfo: { routes: {
        results: results.map((r) => ({
          routePath: r.routePath,
          route: { name: r.name ?? '', updated: r.updated ? { value: r.updated } : null },
        })),
        pageInfo,
      } } } },
    };
  }

  it('returns routes with normalized updated dates for a single page', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => routesPage(
        [
          { routePath: '/', name: 'Home', updated: '20260628T103000Z' },
          { routePath: '/about', name: 'About Us', updated: '2026-07-01T08:00:00Z' },
        ],
        { endCursor: 'C1', hasNext: false },
      ),
    });
    const client = new EdgeClient(config, fetchMock as unknown as typeof fetch);
    const routes = await client.getRoutes('en');
    expect(routes).toEqual([
      { routePath: '/', name: 'Home', updatedAt: '2026-06-28' },
      { routePath: '/about', name: 'About Us', updatedAt: '2026-07-01' },
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.variables).toMatchObject({ site: 'my-site', language: 'en' });
  });

  it('follows pagination and concatenates results', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => routesPage([{ routePath: '/', name: 'Home' }], { endCursor: 'CURSOR1', hasNext: true }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => routesPage([{ routePath: '/about', name: 'About Us' }], { endCursor: 'CURSOR2', hasNext: false }),
      });
    const client = new EdgeClient(config, fetchMock as unknown as typeof fetch);
    const routes = await client.getRoutes('en');
    expect(routes.map((r) => r.routePath)).toEqual(['/', '/about']);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const secondBody = JSON.parse(fetchMock.mock.calls[1][1].body as string);
    expect(secondBody.variables.after).toBe('CURSOR1');
  });

  it('yields null updatedAt for missing or unparseable __Updated values', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => routesPage(
        [
          { routePath: '/a', name: 'A' }, // no updated field at all
          { routePath: '/b', name: 'B', updated: 'not-a-date' },
        ],
        { endCursor: 'C1', hasNext: false },
      ),
    });
    const client = new EdgeClient(config, fetchMock as unknown as typeof fetch);
    const routes = await client.getRoutes('en');
    expect(routes).toEqual([
      { routePath: '/a', name: 'A', updatedAt: null },
      { routePath: '/b', name: 'B', updatedAt: null },
    ]);
  });

  it('throws on GraphQL errors array', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ errors: [{ message: 'bad routes query' }] }),
    });
    const client = new EdgeClient(config, fetchMock as unknown as typeof fetch);
    await expect(client.getRoutes('en')).rejects.toThrow(/bad routes query/);
  });

  it('throws masking the key on HTTP error', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 401, text: async () => 'unauthorized' });
    const client = new EdgeClient(config, fetchMock as unknown as typeof fetch);
    await expect(client.getRoutes('en')).rejects.toThrow(/401/);
    await expect(client.getRoutes('en')).rejects.not.toThrow(/secret-token/);
  });

  it('does not request rendered layout by default', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => routesPage([{ routePath: '/' }], { endCursor: 'C1', hasNext: false }),
    });
    const client = new EdgeClient(config, fetchMock as unknown as typeof fetch);
    const routes = await client.getRoutes('en');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body as string).query).not.toContain('rendered');
    expect(routes[0]).not.toHaveProperty('components');
  });
});

describe('EdgeClient.getRoutes with components', () => {
  function layout(names: Array<string | { name: string; children: string[] }>) {
    return {
      sitecore: {
        route: {
          placeholders: {
            'headless-main': names.map((n) =>
              typeof n === 'string'
                ? { componentName: n, placeholders: {} }
                : {
                    componentName: n.name,
                    placeholders: { inner: n.children.map((c) => ({ componentName: c, placeholders: {} })) },
                  },
            ),
          },
        },
      },
    };
  }

  function routesPageWithRendered(
    results: Array<{ routePath: string; rendered: unknown }>,
    pageInfo: { endCursor: string; hasNext: boolean },
  ) {
    return {
      data: { site: { siteInfo: { routes: {
        results: results.map((r) => ({
          routePath: r.routePath,
          route: { name: '', updated: null, rendered: r.rendered },
        })),
        pageInfo,
      } } } },
    };
  }

  it('requests rendered layout and returns unique component names per route', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => routesPageWithRendered(
        [
          { routePath: '/', rendered: layout([{ name: 'Hero', children: ['Card'] }, 'Card', 'RichText']) },
          { routePath: '/about', rendered: layout(['RichText']) },
        ],
        { endCursor: 'C1', hasNext: false },
      ),
    });
    const client = new EdgeClient(config, fetchMock as unknown as typeof fetch);
    const routes = await client.getRoutes('en', { components: true });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body as string).query).toContain('rendered');
    expect(routes.map((r) => r.components)).toEqual([['Hero', 'Card', 'RichText'], ['RichText']]);
  });

  it('yields an empty components list when rendered is null or malformed', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => routesPageWithRendered(
        [
          { routePath: '/a', rendered: null },
          { routePath: '/b', rendered: { unexpected: true } },
        ],
        { endCursor: 'C1', hasNext: false },
      ),
    });
    const client = new EdgeClient(config, fetchMock as unknown as typeof fetch);
    const routes = await client.getRoutes('en', { components: true });
    expect(routes.map((r) => r.components)).toEqual([[], []]);
  });
});

describe('EdgeClient.getRoutesDetailed', () => {
  function renderedLayout() {
    return {
      sitecore: {
        route: {
          placeholders: {
            'headless-main': [
              {
                componentName: 'Hero',
                dataSource: '{GUID-1}',
                fields: { Title: { value: 'Big' } },
                placeholders: { inner: [{ componentName: 'Card', placeholders: {} }] },
              },
            ],
          },
        },
      },
    };
  }

  function page(results: Array<{ routePath: string; rendered: unknown }>, pageInfo: { endCursor: string; hasNext: boolean }) {
    return {
      data: { site: { siteInfo: { routes: {
        results: results.map((r) => ({
          routePath: r.routePath,
          route: { name: 'Page', updated: { value: '20260701T080000Z' }, rendered: r.rendered },
        })),
        pageInfo,
      } } } },
    };
  }

  it('returns routes with components and a trimmed layout tree', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => page([{ routePath: '/', rendered: renderedLayout() }], { endCursor: 'C1', hasNext: false }),
    });
    const client = new EdgeClient(config, fetchMock as unknown as typeof fetch);
    const routes = await client.getRoutesDetailed('en');

    expect(JSON.parse(fetchMock.mock.calls[0][1].body as string).query).toContain('rendered');
    expect(routes).toEqual([
      {
        routePath: '/',
        name: 'Page',
        updatedAt: '2026-07-01',
        components: ['Hero', 'Card'],
        layout: {
          'headless-main': [
            {
              componentName: 'Hero',
              dataSource: '{GUID-1}',
              fields: { Title: { value: 'Big' } },
              placeholders: { inner: [{ componentName: 'Card', fields: {}, placeholders: {} }] },
            },
          ],
        },
      },
    ]);
  });

  it('yields empty components and layout for null or malformed rendered', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => page(
        [
          { routePath: '/a', rendered: null },
          { routePath: '/b', rendered: { unexpected: true } },
        ],
        { endCursor: 'C1', hasNext: false },
      ),
    });
    const client = new EdgeClient(config, fetchMock as unknown as typeof fetch);
    const routes = await client.getRoutesDetailed('en');
    expect(routes.map((r) => r.components)).toEqual([[], []]);
    expect(routes.map((r) => r.layout)).toEqual([{}, {}]);
  });

  it('follows pagination', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => page([{ routePath: '/', rendered: null }], { endCursor: 'CURSOR1', hasNext: true }) })
      .mockResolvedValueOnce({ ok: true, json: async () => page([{ routePath: '/about', rendered: null }], { endCursor: 'CURSOR2', hasNext: false }) });
    const client = new EdgeClient(config, fetchMock as unknown as typeof fetch);
    const routes = await client.getRoutesDetailed('en');
    expect(routes.map((r) => r.routePath)).toEqual(['/', '/about']);
    expect(JSON.parse(fetchMock.mock.calls[1][1].body as string).variables.after).toBe('CURSOR1');
  });
});
