import { describe, it, expect, vi } from 'vitest';
import { readFileSync, mkdtempSync, existsSync, readFileSync as rf } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runComponent } from '../src/commands/component.js';

const rendered = JSON.parse(
  readFileSync(fileURLToPath(new URL('../../core/test/fixtures/about-us-layout.json', import.meta.url)), 'utf8'),
);

function makeConfig(componentPath: string) {
  return {
    edge: { endpoint: 'https://e', apiKey: 'k', site: 's', defaultLanguage: 'en' },
    componentPath, componentPropsImport: '@/lib/component-props',
    sitecorePackage: '@sitecore-content-sdk/nextjs', useDatasourceCheck: true, generateMocks: true, fieldTypeOverrides: {},
  };
}

describe('runComponent', () => {
  it('writes three files for a found rendering', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'scaffold-cmp-'));
    const config = makeConfig(join(dir, 'components'));
    const result = await runComponent(
      { name: 'Hero', route: '/about-us', lang: undefined, dryRun: false, force: false },
      { loadConfig: vi.fn().mockResolvedValue(config), getLayout: vi.fn().mockResolvedValue(rendered) },
    );
    expect(result.written.length).toBe(3);
    expect(existsSync(join(dir, 'components', 'Hero.tsx'))).toBe(true);
    expect(rf(join(dir, 'components', 'Hero.types.ts'), 'utf8')).toContain('HeroProps');
  });

  it('errors listing available names when rendering not found', async () => {
    const config = makeConfig('/tmp/never');
    await expect(
      runComponent(
        { name: 'Nope', route: '/about-us', lang: undefined, dryRun: false, force: false },
        { loadConfig: vi.fn().mockResolvedValue(config), getLayout: vi.fn().mockResolvedValue(rendered) },
      ),
    ).rejects.toThrow(/Hero, PromoCards/);
  });

  it('dry-run returns files without writing', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'scaffold-dry-'));
    const config = makeConfig(join(dir, 'components'));
    const result = await runComponent(
      { name: 'Hero', route: '/about-us', lang: undefined, dryRun: true, force: false },
      { loadConfig: vi.fn().mockResolvedValue(config), getLayout: vi.fn().mockResolvedValue(rendered) },
    );
    expect(result.written.length).toBe(0);
    expect(result.preview.length).toBe(3);
    expect(existsSync(join(dir, 'components', 'Hero.tsx'))).toBe(false);
  });

  it('refuses to overwrite without force', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'scaffold-force-'));
    const config = makeConfig(join(dir, 'components'));
    const deps = { loadConfig: vi.fn().mockResolvedValue(config), getLayout: vi.fn().mockResolvedValue(rendered) };
    const input = { name: 'Hero', route: '/about-us', lang: undefined, dryRun: false, force: false };
    await runComponent(input, deps);
    await expect(runComponent(input, deps)).rejects.toThrow(/--force/);
  });

  it('errors with ambiguous when multiple renderings share the same componentName', async () => {
    const ambiguousRendered = {
      sitecore: {
        context: { pageState: 'normal', language: 'en' },
        route: {
          name: 'test',
          placeholders: {
            'headless-main': [
              { uid: 'a1', componentName: 'Hero', dataSource: '/data/hero1', params: {}, fields: { heading: { value: 'First' } }, placeholders: {} },
              { uid: 'a2', componentName: 'Hero', dataSource: '/data/hero2', params: {}, fields: { heading: { value: 'Second' } }, placeholders: {} },
            ],
          },
        },
      },
    };
    const config = makeConfig('/tmp/never');
    await expect(
      runComponent(
        { name: 'Hero', route: '/test', lang: undefined, dryRun: false, force: false },
        { loadConfig: vi.fn().mockResolvedValue(config), getLayout: vi.fn().mockResolvedValue(ambiguousRendered) },
      ),
    ).rejects.toThrow(/ambiguous/i);
  });
});
