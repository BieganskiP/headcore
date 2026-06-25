import { describe, it, expect, vi } from 'vitest';
import { readFileSync, mkdtempSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runPage } from '../src/commands/page.js';

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

function deps(config: ReturnType<typeof makeConfig>, layout: unknown = rendered) {
  return { loadConfig: vi.fn().mockResolvedValue(config), getLayout: vi.fn().mockResolvedValue(layout) };
}

describe('runPage', () => {
  it('generates one component per unique type on the route', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'scaffold-page-'));
    const config = makeConfig(join(dir, 'components'));
    const result = await runPage({ route: '/about-us', lang: undefined, dryRun: false, force: false }, deps(config));

    // collectRenderings is recursive, so the nested Card rendering is included too.
    const names = result.components.map((c) => c.name).sort();
    expect(names).toEqual(['Card', 'Hero', 'PromoCards']);
    expect(result.components.every((c) => c.status === 'generated')).toBe(true);
    expect(existsSync(join(dir, 'components', 'Hero.tsx'))).toBe(true);
    expect(existsSync(join(dir, 'components', 'PromoCards.tsx'))).toBe(true);
    expect(existsSync(join(dir, 'components', 'Card.tsx'))).toBe(true);
  });

  it('dedupes repeated component types into a single generated component', async () => {
    const layout = {
      sitecore: {
        context: { pageState: 'normal', language: 'en' },
        route: {
          name: 'test',
          placeholders: {
            'headless-main': [
              { uid: 'c1', componentName: 'Card', params: {}, fields: { heading: { value: 'One' } }, placeholders: {} },
              { uid: 'c2', componentName: 'Card', params: {}, fields: { heading: { value: 'Two' }, badge: { value: 'New' } }, placeholders: {} },
            ],
          },
        },
      },
    };
    const dir = mkdtempSync(join(tmpdir(), 'scaffold-page-dup-'));
    const config = makeConfig(join(dir, 'components'));
    const result = await runPage({ route: '/test', lang: undefined, dryRun: false, force: false }, deps(config, layout));

    expect(result.components.length).toBe(1);
    const card = result.components[0];
    expect(card.name).toBe('Card');
    expect(card.instanceCount).toBe(2);
    // `badge` only appears on the second instance, so it is optional.
    expect(readFileSync(join(dir, 'components', 'Card.types.ts'), 'utf8')).toMatch(/badge\?:/);
  });

  it('skips components whose files already exist and reports them', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'scaffold-page-skip-'));
    const config = makeConfig(join(dir, 'components'));
    mkdirSync(join(dir, 'components'), { recursive: true });
    writeFileSync(join(dir, 'components', 'Hero.tsx'), '// hand-edited', 'utf8');

    const result = await runPage({ route: '/about-us', lang: undefined, dryRun: false, force: false }, deps(config));

    const hero = result.components.find((c) => c.name === 'Hero')!;
    expect(hero.status).toBe('skipped');
    expect(readFileSync(join(dir, 'components', 'Hero.tsx'), 'utf8')).toBe('// hand-edited');
  });

  it('overwrites existing files with --force', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'scaffold-page-force-'));
    const config = makeConfig(join(dir, 'components'));
    mkdirSync(join(dir, 'components'), { recursive: true });
    writeFileSync(join(dir, 'components', 'Hero.tsx'), '// hand-edited', 'utf8');

    const result = await runPage({ route: '/about-us', lang: undefined, dryRun: false, force: true }, deps(config));

    expect(result.components.find((c) => c.name === 'Hero')!.status).toBe('generated');
    expect(readFileSync(join(dir, 'components', 'Hero.tsx'), 'utf8')).not.toBe('// hand-edited');
  });

  it('dry-run previews every component and writes nothing', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'scaffold-page-dry-'));
    const config = makeConfig(join(dir, 'components'));
    const result = await runPage({ route: '/about-us', lang: undefined, dryRun: true, force: false }, deps(config));

    expect(result.components.every((c) => c.status === 'generated')).toBe(true);
    expect(result.components.length).toBeGreaterThan(0);
    expect(existsSync(join(dir, 'components', 'Hero.tsx'))).toBe(false);
  });

  it('throws when the route argument is missing', async () => {
    await expect(
      runPage({ route: undefined, lang: undefined, dryRun: false, force: false }, deps(makeConfig('/tmp/never'))),
    ).rejects.toThrow(/route/i);
  });

  it('surfaces merge warnings for conflicting field types across instances', async () => {
    const layout = {
      sitecore: {
        context: { pageState: 'normal', language: 'en' },
        route: {
          name: 'test',
          placeholders: {
            'headless-main': [
              { uid: 'm1', componentName: 'Media', params: {}, fields: { asset: { value: { src: 'a.jpg' } } }, placeholders: {} },
              { uid: 'm2', componentName: 'Media', params: {}, fields: { asset: { value: { href: '/x' } } }, placeholders: {} },
            ],
          },
        },
      },
    };
    const dir = mkdtempSync(join(tmpdir(), 'scaffold-page-warn-'));
    const config = makeConfig(join(dir, 'components'));
    const result = await runPage({ route: '/test', lang: undefined, dryRun: true, force: false }, deps(config, layout));
    expect(result.warnings.join('\n')).toMatch(/Media\.asset.*conflicting/i);
  });
});
