import { describe, it, expect, vi } from 'vitest';
import { readFileSync, mkdtempSync, existsSync, readFileSync as rf, writeFileSync } from 'node:fs';
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
    componentPath, componentFolder: false, componentPropsImport: 'lib/component-props',
    sitecorePackage: '@sitecore-content-sdk/nextjs', useDatasourceCheck: true, generateMocks: true, styling: 'none', fieldTypeOverrides: {},
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

  it('generates a variant module with named exports including a prepended Default', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'scaffold-var-'));
    const config = makeConfig(join(dir, 'components'));
    const result = await runComponent(
      { name: 'Hero', route: '/about-us', lang: undefined, dryRun: true, force: false, variants: ['ThreeCard'] },
      { loadConfig: vi.fn().mockResolvedValue(config), getLayout: vi.fn().mockResolvedValue(rendered) },
    );
    const tsx = result.preview.find((f) => f.path.endsWith('Hero.tsx'))!.contents;
    expect(tsx).toContain('const HeroVariant = (');
    expect(tsx).toContain('export const Default =');
    expect(tsx).toContain('export const ThreeCard =');
    expect(tsx).not.toContain('export default');
  });

  it('writes story, mock, and decorator when storybook is enabled', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'scaffold-sb-'));
    const config = {
      ...makeConfig(join(dir, 'components')),
      generateMocks: false, // storybook implies mock emission even with generateMocks off
      storybook: { enabled: true, titlePrefix: 'Sitecore', decoratorPath: join(dir, '.storybook/sitecore-decorator.tsx') },
    };
    const result = await runComponent(
      { name: 'Hero', route: '/about-us', lang: undefined, dryRun: false, force: false },
      { loadConfig: vi.fn().mockResolvedValue(config), getLayout: vi.fn().mockResolvedValue(rendered) },
    );
    expect(existsSync(join(dir, 'components', 'Hero.stories.tsx'))).toBe(true);
    expect(existsSync(join(dir, 'components', 'Hero.mock.json'))).toBe(true);
    expect(existsSync(join(dir, '.storybook', 'sitecore-decorator.tsx'))).toBe(true);
    expect(result.written.some((f) => f.path.endsWith('sitecore-decorator.tsx'))).toBe(true);
  });

  it('does not overwrite an existing decorator, even with --force', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'scaffold-sb2-'));
    const decoratorPath = join(dir, '.storybook/sitecore-decorator.tsx');
    const config = {
      ...makeConfig(join(dir, 'components')),
      storybook: { enabled: true, titlePrefix: 'Sitecore', decoratorPath },
    };
    const deps = { loadConfig: vi.fn().mockResolvedValue(config), getLayout: vi.fn().mockResolvedValue(rendered) };
    await runComponent({ name: 'Hero', route: '/about-us', lang: undefined, dryRun: false, force: false }, deps);
    writeFileSync(decoratorPath, '// user edited\n', 'utf8');
    await runComponent({ name: 'Hero', route: '/about-us', lang: undefined, dryRun: false, force: true }, deps);
    expect(rf(decoratorPath, 'utf8')).toBe('// user edited\n');
  });

  it('previews the decorator on dry-run without writing it', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'scaffold-sb-dry-'));
    const decoratorPath = join(dir, '.storybook/sitecore-decorator.tsx');
    const config = {
      ...makeConfig(join(dir, 'components')),
      storybook: { enabled: true, titlePrefix: 'Sitecore', decoratorPath },
    };
    const result = await runComponent(
      { name: 'Hero', route: '/about-us', lang: undefined, dryRun: true, force: false },
      { loadConfig: vi.fn().mockResolvedValue(config), getLayout: vi.fn().mockResolvedValue(rendered) },
    );
    expect(result.preview.some((f) => f.path === decoratorPath)).toBe(true);
    expect(existsSync(decoratorPath)).toBe(false);
    expect(result.written).toEqual([]);
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
