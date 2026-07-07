import { describe, it, expect, vi } from 'vitest';
import { runRoutes } from '../src/commands/routes.js';
import type { RouteInfo } from '@sitecore-scaffold/core';

const config = {
  edge: { endpoint: 'https://e', apiKey: 'k', site: 's', defaultLanguage: 'en' },
  componentPath: 'src/components', componentFolder: false, componentPropsImport: 'lib/component-props',
  sitecorePackage: '@sitecore-content-sdk/nextjs', useDatasourceCheck: true, generateMocks: true,
  styling: 'none', fieldTypeOverrides: {}, i18nPath: 'src/lib/i18n', i18nPackage: 'next-localization',
};

const routes: RouteInfo[] = [
  { routePath: '/products', name: 'Products', updatedAt: '2026-07-04' },
  { routePath: '/', name: 'Home', updatedAt: '2026-06-28' },
  { routePath: '/about', name: 'About Us', updatedAt: null },
];

function deps(result = routes) {
  return { loadConfig: vi.fn().mockResolvedValue(config), getRoutes: vi.fn().mockResolvedValue(result) };
}

describe('runRoutes', () => {
  it('renders a path-sorted table with a footer, defaulting lang from config', async () => {
    const d = deps();
    const { output, count } = await runRoutes({ lang: undefined, filter: undefined, sort: 'path', json: false }, d);
    expect(d.getRoutes).toHaveBeenCalledWith('en');
    expect(count).toBe(3);
    const lines = output.split('\n');
    expect(lines[0]).toMatch(/^ROUTE\s+NAME\s+UPDATED$/);
    expect(lines[1].startsWith('/')).toBe(true);
    expect(lines[2].startsWith('/about')).toBe(true);
    expect(output.endsWith('3 routes (lang: en)')).toBe(true);
  });

  it('passes an explicit --lang through to getRoutes and the footer', async () => {
    const d = deps();
    const { output } = await runRoutes({ lang: 'da', filter: undefined, sort: 'path', json: false }, d);
    expect(d.getRoutes).toHaveBeenCalledWith('da');
    expect(output.endsWith('(lang: da)')).toBe(true);
  });

  it('applies filter and sort before rendering', async () => {
    const { output, count } = await runRoutes(
      { lang: undefined, filter: '/products', sort: 'updated', json: false },
      deps(),
    );
    expect(count).toBe(1);
    expect(output).toContain('/products');
    expect(output).not.toContain('/about');
  });

  it('renders JSON when --json is set', async () => {
    const { output } = await runRoutes({ lang: undefined, filter: undefined, sort: 'path', json: true }, deps());
    expect(JSON.parse(output)).toEqual([
      { routePath: '/', name: 'Home', updatedAt: '2026-06-28' },
      { routePath: '/about', name: 'About Us', updatedAt: null },
      { routePath: '/products', name: 'Products', updatedAt: '2026-07-04' },
    ]);
  });

  it('reports zero routes without failing', async () => {
    const { output, count } = await runRoutes(
      { lang: undefined, filter: undefined, sort: 'path', json: false },
      deps([]),
    );
    expect(count).toBe(0);
    expect(output).toBe('0 routes (lang: en)');
  });
});
