import { describe, it, expect, vi } from 'vitest';
import { readFileSync, mkdtempSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runDictionary } from '../src/commands/dictionary.js';

function makeConfig(i18nPath: string) {
  return {
    edge: { endpoint: 'https://e', apiKey: 'k', site: 's', defaultLanguage: 'en' },
    componentPath: 'src/components', componentFolder: false, componentPropsImport: 'lib/component-props',
    sitecorePackage: '@sitecore-content-sdk/nextjs', useDatasourceCheck: true, generateMocks: true,
    styling: 'none', fieldTypeOverrides: {}, i18nPath, i18nPackage: 'next-localization',
  };
}

const entries = [
  { key: 'Nav.Login', value: 'Log in' },
  { key: 'Home.Title', value: 'Home' },
];

function deps(config: ReturnType<typeof makeConfig>, dict = entries) {
  return { loadConfig: vi.fn().mockResolvedValue(config), getDictionary: vi.fn().mockResolvedValue(dict) };
}

describe('runDictionary', () => {
  it('writes the keys file and the wrapper, sorted', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'scaffold-dict-'));
    const i18n = join(dir, 'i18n');
    const d = deps(makeConfig(i18n));
    const result = await runDictionary({ lang: undefined, dryRun: false, force: false }, d);

    expect(result.warnings).toEqual([]);
    const keysFile = readFileSync(join(i18n, 'dictionary-keys.ts'), 'utf8');
    expect(keysFile.indexOf("'Home.Title'")).toBeLessThan(keysFile.indexOf("'Nav.Login'"));
    expect(existsSync(join(i18n, 'use-typed-t.ts'))).toBe(true);
    // lang falls back to config.edge.defaultLanguage when not passed
    expect(d.getDictionary).toHaveBeenCalledWith('en');
  });

  it('always overwrites the keys file but preserves a customized wrapper', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'scaffold-dict-keep-'));
    const i18n = join(dir, 'i18n');
    mkdirSync(i18n, { recursive: true });
    writeFileSync(join(i18n, 'dictionary-keys.ts'), '// stale', 'utf8');
    writeFileSync(join(i18n, 'use-typed-t.ts'), '// hand-edited', 'utf8');

    const result = await runDictionary({ lang: undefined, dryRun: false, force: false }, deps(makeConfig(i18n)));

    expect(readFileSync(join(i18n, 'dictionary-keys.ts'), 'utf8')).not.toBe('// stale');
    expect(readFileSync(join(i18n, 'use-typed-t.ts'), 'utf8')).toBe('// hand-edited');
    const wrapper = result.files.find((f) => f.path.endsWith('use-typed-t.ts'))!;
    expect(wrapper.status).toBe('skipped');
  });

  it('overwrites the wrapper with --force', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'scaffold-dict-force-'));
    const i18n = join(dir, 'i18n');
    mkdirSync(i18n, { recursive: true });
    writeFileSync(join(i18n, 'use-typed-t.ts'), '// hand-edited', 'utf8');

    await runDictionary({ lang: undefined, dryRun: false, force: true }, deps(makeConfig(i18n)));

    expect(readFileSync(join(i18n, 'use-typed-t.ts'), 'utf8')).not.toBe('// hand-edited');
  });

  it('dry-run previews both files and writes nothing', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'scaffold-dict-dry-'));
    const i18n = join(dir, 'i18n');
    const result = await runDictionary({ lang: undefined, dryRun: true, force: false }, deps(makeConfig(i18n)));

    expect(result.files.map((f) => f.path.split(/[\\/]/).pop()).sort())
      .toEqual(['dictionary-keys.ts', 'use-typed-t.ts']);
    expect(existsSync(join(i18n, 'dictionary-keys.ts'))).toBe(false);
  });

  it('surfaces a warning for an empty dictionary', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'scaffold-dict-empty-'));
    const result = await runDictionary(
      { lang: undefined, dryRun: true, force: false },
      deps(makeConfig(join(dir, 'i18n')), []),
    );
    expect(result.warnings.join('\n')).toMatch(/no dictionary entries/i);
  });
});
