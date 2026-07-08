import { describe, it, expect, vi, afterEach } from 'vitest';
import { mkdtempSync, readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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
    const { output, count } = await runRoutes(
      { lang: undefined, filter: undefined, sort: 'path', json: false, out: undefined },
      d,
    );
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
    const { output } = await runRoutes(
      { lang: 'da', filter: undefined, sort: 'path', json: false, out: undefined },
      d,
    );
    expect(d.getRoutes).toHaveBeenCalledWith('da');
    expect(output.endsWith('(lang: da)')).toBe(true);
  });

  it('applies filter and sort before rendering', async () => {
    const { output, count } = await runRoutes(
      { lang: undefined, filter: '/products', sort: 'updated', json: false, out: undefined },
      deps(),
    );
    expect(count).toBe(1);
    expect(output).toContain('/products');
    expect(output).not.toContain('/about');
  });

  it('renders JSON when --json is set', async () => {
    const { output } = await runRoutes(
      { lang: undefined, filter: undefined, sort: 'path', json: true, out: undefined },
      deps(),
    );
    expect(JSON.parse(output)).toEqual([
      { routePath: '/', name: 'Home', updatedAt: '2026-06-28' },
      { routePath: '/about', name: 'About Us', updatedAt: null },
      { routePath: '/products', name: 'Products', updatedAt: '2026-07-04' },
    ]);
  });

  it('reports zero routes without failing', async () => {
    const { output, count } = await runRoutes(
      { lang: undefined, filter: undefined, sort: 'path', json: false, out: undefined },
      deps([]),
    );
    expect(count).toBe(0);
    expect(output).toBe('0 routes (lang: en)');
  });

  it('orders by updated newest-first with nulls last when sort is updated', async () => {
    const { output } = await runRoutes(
      { lang: undefined, filter: undefined, sort: 'updated', json: true, out: undefined },
      deps(),
    );
    expect(JSON.parse(output).map((r: RouteInfo) => r.routePath)).toEqual(['/products', '/', '/about']);
  });
});

describe('runRoutes --out', () => {
  const tmpDirs: string[] = [];
  function tmp(): string {
    const dir = mkdtempSync(join(tmpdir(), 'routes-out-'));
    tmpDirs.push(dir);
    return dir;
  }
  afterEach(() => {
    for (const dir of tmpDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
  });

  it('writes the JSON export to the file and reports a confirmation', async () => {
    const out = join(tmp(), 'routes.json');
    const { output, count } = await runRoutes(
      { lang: undefined, filter: undefined, sort: 'path', json: true, out },
      deps(),
    );
    expect(count).toBe(3);
    expect(output).toBe(`Wrote 3 route(s) to ${out}`);
    const contents = readFileSync(out, 'utf8');
    expect(contents.endsWith('\n')).toBe(true);
    expect(JSON.parse(contents)).toEqual([
      { routePath: '/', name: 'Home', updatedAt: '2026-06-28' },
      { routePath: '/about', name: 'About Us', updatedAt: null },
      { routePath: '/products', name: 'Products', updatedAt: '2026-07-04' },
    ]);
  });

  it('implies --json: writes JSON even when json is false', async () => {
    const out = join(tmp(), 'routes.json');
    await runRoutes({ lang: undefined, filter: undefined, sort: 'path', json: false, out }, deps());
    expect(JSON.parse(readFileSync(out, 'utf8'))).toHaveLength(3);
  });

  it('creates missing parent directories', async () => {
    const out = join(tmp(), 'reports', 'nested', 'routes.json');
    await runRoutes({ lang: undefined, filter: undefined, sort: 'path', json: false, out }, deps());
    expect(existsSync(out)).toBe(true);
  });

  it('overwrites an existing file', async () => {
    const out = join(tmp(), 'routes.json');
    writeFileSync(out, 'stale', 'utf8');
    await runRoutes({ lang: undefined, filter: undefined, sort: 'path', json: false, out }, deps());
    expect(readFileSync(out, 'utf8')).not.toContain('stale');
    expect(JSON.parse(readFileSync(out, 'utf8'))).toHaveLength(3);
  });

  it('applies filter before writing and reports the filtered count', async () => {
    const out = join(tmp(), 'routes.json');
    const { output } = await runRoutes(
      { lang: undefined, filter: '/products', sort: 'path', json: false, out },
      deps(),
    );
    expect(output).toBe(`Wrote 1 route(s) to ${out}`);
    expect(JSON.parse(readFileSync(out, 'utf8'))).toEqual([
      { routePath: '/products', name: 'Products', updatedAt: '2026-07-04' },
    ]);
  });
});
