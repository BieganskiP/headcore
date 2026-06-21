import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { runInspect } from '../src/commands/inspect.js';

const rendered = JSON.parse(
  readFileSync(fileURLToPath(new URL('../../core/test/fixtures/about-us-layout.json', import.meta.url)), 'utf8'),
);

const config = {
  edge: { endpoint: 'https://e', apiKey: 'k', site: 's', defaultLanguage: 'en' },
  componentPath: 'src/components', componentPropsImport: '@/lib/component-props',
  sitecorePackage: '@sitecore-content-sdk/nextjs', useDatasourceCheck: true, generateMocks: true, fieldTypeOverrides: {},
};

describe('runInspect', () => {
  it('returns a formatted tree string for the route', async () => {
    const deps = {
      loadConfig: vi.fn().mockResolvedValue(config),
      getLayout: vi.fn().mockResolvedValue(rendered),
    };
    const out = await runInspect({ route: '/about-us', lang: undefined }, deps);
    expect(out).toContain('Route: /about-us');
    expect(out).toContain('Hero');
    expect(deps.getLayout).toHaveBeenCalledWith('/about-us', 'en');
  });

  it('throws when route flag missing', async () => {
    const deps = { loadConfig: vi.fn().mockResolvedValue(config), getLayout: vi.fn() };
    await expect(runInspect({ route: undefined, lang: undefined }, deps)).rejects.toThrow(/route/i);
  });
});
