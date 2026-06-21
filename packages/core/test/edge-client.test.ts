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
