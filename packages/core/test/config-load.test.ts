import { describe, it, expect, beforeEach, afterEach } from 'vitest';
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

  const BASE = `
  componentPath: 'src/components', componentPropsImport: 'lib/component-props',
  sitecorePackage: '@sitecore-content-sdk/nextjs', useDatasourceCheck: true, generateMocks: true, fieldTypeOverrides: {},`;

  describe('auth modes', () => {
    it('accepts a contextId-only edge config', async () => {
      const p = writeConfig(dir, `export default {
      edge: { contextId: 'ctx-abc', site: 'my-site', defaultLanguage: 'en' },${BASE}
    };`);
      const cfg = await loadConfig(p);
      expect(cfg.edge.contextId).toBe('ctx-abc');
      expect(cfg.edge.apiKey).toBeUndefined();
    });

    it('throws when neither contextId nor endpoint+apiKey is configured', async () => {
      const p = writeConfig(dir, `export default {
      edge: { site: 's', defaultLanguage: 'en' },${BASE}
    };`);
      await expect(loadConfig(p)).rejects.toThrow(/SITECORE_EDGE_CONTEXT_ID/);
    });

    it('throws when both contextId and apiKey auth are configured', async () => {
      const p = writeConfig(dir, `export default {
      edge: { contextId: 'ctx-abc', endpoint: 'https://edge.example', apiKey: 'k', site: 's', defaultLanguage: 'en' },${BASE}
    };`);
      await expect(loadConfig(p)).rejects.toThrow(/one auth mode/i);
    });

    it('throws when endpoint is set without apiKey', async () => {
      const p = writeConfig(dir, `export default {
      edge: { endpoint: 'https://edge.example', site: 's', defaultLanguage: 'en' },${BASE}
    };`);
      await expect(loadConfig(p)).rejects.toThrow(/edge\.apiKey/);
    });
  });

  describe('env file loading', () => {
    afterEach(() => {
      delete process.env.SCAFFOLD_T1_CTX;
      delete process.env.SCAFFOLD_T2_CTX;
      delete process.env.SCAFFOLD_T3_CTX;
    });

    it('resolves config values from .env.local next to the config file', async () => {
      writeFileSync(join(dir, '.env.local'), 'SCAFFOLD_T1_CTX=ctx-from-env-local\n', 'utf8');
      const p = writeConfig(dir, `export default {
        edge: { contextId: process.env.SCAFFOLD_T1_CTX, site: 's', defaultLanguage: 'en' },${BASE}
      };`);
      const cfg = await loadConfig(p);
      expect(cfg.edge.contextId).toBe('ctx-from-env-local');
    });

    it('prefers .env.local over .env', async () => {
      writeFileSync(join(dir, '.env'), 'SCAFFOLD_T2_CTX=from-dotenv\n', 'utf8');
      writeFileSync(join(dir, '.env.local'), 'SCAFFOLD_T2_CTX=from-dotenv-local\n', 'utf8');
      const p = writeConfig(dir, `export default {
        edge: { contextId: process.env.SCAFFOLD_T2_CTX, site: 's', defaultLanguage: 'en' },${BASE}
      };`);
      const cfg = await loadConfig(p);
      expect(cfg.edge.contextId).toBe('from-dotenv-local');
    });

    it('never overrides vars already set in the shell', async () => {
      process.env.SCAFFOLD_T3_CTX = 'from-shell';
      writeFileSync(join(dir, '.env.local'), 'SCAFFOLD_T3_CTX=from-dotenv-local\n', 'utf8');
      const p = writeConfig(dir, `export default {
        edge: { contextId: process.env.SCAFFOLD_T3_CTX, site: 's', defaultLanguage: 'en' },${BASE}
      };`);
      const cfg = await loadConfig(p);
      expect(cfg.edge.contextId).toBe('from-shell');
    });
  });

  describe('storybook section', () => {
    it('defaults to disabled with standard prefix and decorator path when absent', async () => {
      const p = writeConfig(dir, `export default {
      edge: { contextId: 'ctx', site: 's', defaultLanguage: 'en' },${BASE}
    };`);
      const cfg = await loadConfig(p);
      expect(cfg.storybook).toEqual({
        enabled: false,
        titlePrefix: 'Sitecore',
        decoratorPath: '.storybook/sitecore-decorator.tsx',
      });
    });

    it('accepts a full storybook section', async () => {
      const p = writeConfig(dir, `export default {
      edge: { contextId: 'ctx', site: 's', defaultLanguage: 'en' },${BASE}
      storybook: { enabled: true, titlePrefix: '', decoratorPath: 'src/stories/sitecore.tsx' },
    };`);
      const cfg = await loadConfig(p);
      expect(cfg.storybook).toEqual({
        enabled: true,
        titlePrefix: '',
        decoratorPath: 'src/stories/sitecore.tsx',
      });
    });

    it('fills defaults for omitted storybook fields', async () => {
      const p = writeConfig(dir, `export default {
      edge: { contextId: 'ctx', site: 's', defaultLanguage: 'en' },${BASE}
      storybook: { enabled: true },
    };`);
      const cfg = await loadConfig(p);
      expect(cfg.storybook).toEqual({
        enabled: true,
        titlePrefix: 'Sitecore',
        decoratorPath: '.storybook/sitecore-decorator.tsx',
      });
    });

    it('throws when storybook is not an object', async () => {
      const p = writeConfig(dir, `export default {
      edge: { contextId: 'ctx', site: 's', defaultLanguage: 'en' },${BASE}
      storybook: true,
    };`);
      await expect(loadConfig(p)).rejects.toThrow(/storybook.*object/i);
    });

    it('throws when storybook.enabled is not a boolean', async () => {
      const p = writeConfig(dir, `export default {
      edge: { contextId: 'ctx', site: 's', defaultLanguage: 'en' },${BASE}
      storybook: { enabled: 'yes' },
    };`);
      await expect(loadConfig(p)).rejects.toThrow(/storybook\.enabled/);
    });

    it('throws when storybook.decoratorPath is empty', async () => {
      const p = writeConfig(dir, `export default {
      edge: { contextId: 'ctx', site: 's', defaultLanguage: 'en' },${BASE}
      storybook: { enabled: true, decoratorPath: '' },
    };`);
      await expect(loadConfig(p)).rejects.toThrow(/storybook\.decoratorPath/);
    });
  });
});
