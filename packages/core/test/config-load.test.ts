import { describe, it, expect, beforeEach } from 'vitest';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadConfig } from '../src/config/load.js';

function writeConfig(dir: string, body: string): string {
  const p = join(dir, 'sitecore-scaffold.config.ts');
  writeFileSync(p, body, 'utf8');
  return p;
}

describe('loadConfig', () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'scaffold-'));
    process.env.SITECORE_EDGE_URL = 'https://edge.example/api/graphql/v1';
    process.env.SITECORE_EDGE_TOKEN = 'secret-token';
  });

  it('loads a valid config with env resolution', async () => {
    const p = writeConfig(dir, `export default {
      edge: { endpoint: process.env.SITECORE_EDGE_URL, apiKey: process.env.SITECORE_EDGE_TOKEN, site: 'my-site', defaultLanguage: 'en' },
      componentPath: 'src/components',
      componentPropsImport: 'lib/component-props',
      sitecorePackage: '@sitecore-content-sdk/nextjs',
      useDatasourceCheck: true,
      generateMocks: true,
      fieldTypeOverrides: {},
    };`);
    const cfg = await loadConfig(p);
    expect(cfg.edge.endpoint).toBe('https://edge.example/api/graphql/v1');
    expect(cfg.edge.apiKey).toBe('secret-token');
    expect(cfg.componentPath).toBe('src/components');
    expect(cfg.styling).toBe('css'); // default when not specified
    expect(cfg.componentFolder).toBe(true); // default when not specified
  });

  it('throws when styling is not a recognized value', async () => {
    const p = writeConfig(dir, `export default {
      edge: { endpoint: process.env.SITECORE_EDGE_URL, apiKey: process.env.SITECORE_EDGE_TOKEN, site: 's', defaultLanguage: 'en' },
      componentPath: 'src/components', componentPropsImport: 'lib/component-props',
      sitecorePackage: '@sitecore-content-sdk/nextjs', useDatasourceCheck: true, generateMocks: true,
      styling: 'scss', fieldTypeOverrides: {},
    };`);
    await expect(loadConfig(p)).rejects.toThrow(/styling/i);
  });

  it('throws a clear error when edge.endpoint is missing', async () => {
    const p = writeConfig(dir, `export default {
      edge: { apiKey: 'x', site: 's', defaultLanguage: 'en' },
      componentPath: 'src/components', componentPropsImport: 'lib/component-props',
      sitecorePackage: '@sitecore-content-sdk/nextjs', useDatasourceCheck: true, generateMocks: true, fieldTypeOverrides: {},
    };`);
    await expect(loadConfig(p)).rejects.toThrow(/edge\.endpoint/);
  });

  it('throws when config file does not exist', async () => {
    await expect(loadConfig(join(dir, 'missing.config.ts'))).rejects.toThrow(/not found/i);
  });

  it('defaults i18nPath and i18nPackage when not specified', async () => {
    const p = writeConfig(dir, `export default {
    edge: { endpoint: process.env.SITECORE_EDGE_URL, apiKey: process.env.SITECORE_EDGE_TOKEN, site: 'my-site', defaultLanguage: 'en' },
    componentPath: 'src/components',
    componentPropsImport: 'lib/component-props',
    sitecorePackage: '@sitecore-content-sdk/nextjs',
    useDatasourceCheck: true,
    generateMocks: true,
    fieldTypeOverrides: {},
  };`);
    const cfg = await loadConfig(p);
    expect(cfg.i18nPath).toBe('src/lib/i18n');
    expect(cfg.i18nPackage).toBe('next-localization');
  });
});
