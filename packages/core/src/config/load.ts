import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { config as loadEnvFiles } from 'dotenv';
import { resolveStorybook } from './storybook.js';
import type { HeadcoreConfig, StorybookConfig } from '../types.js';

const REQUIRED_STRING_FIELDS: Array<keyof HeadcoreConfig> = [
  'componentPath',
  'componentPropsImport',
  'sitecorePackage',
];

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

export async function loadConfig(path: string): Promise<HeadcoreConfig> {
  if (!existsSync(path)) {
    throw new Error(`Config file not found: ${path}`);
  }

  // Next.js precedence: shell env > .env.local > .env. dotenv never overrides
  // already-set keys, and with a path array the first file wins. Missing files are fine.
  const configDir = dirname(path);
  loadEnvFiles({ path: [join(configDir, '.env.local'), join(configDir, '.env')], quiet: true });

  // jiti 1.x is a CJS package; use createRequire to load it in ESM context
  const req = createRequire(import.meta.url);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const createJiti = req('jiti') as (filename: string, opts?: Record<string, unknown>) => any;
  const jiti = createJiti(import.meta.url, { interopDefault: true });
  const loaded = (await jiti.import(path, {})) as Partial<HeadcoreConfig>;

  assert(loaded && typeof loaded === 'object', 'Config must export a default object');
  assert(loaded.edge, 'Config is missing "edge" section');
  const hasContextId = Boolean(loaded.edge.contextId);
  const hasLegacy = Boolean(loaded.edge.endpoint) || Boolean(loaded.edge.apiKey);
  assert(
    !(hasContextId && hasLegacy),
    'Config sets both "edge.contextId" and "edge.endpoint"/"edge.apiKey" — choose one auth mode',
  );
  if (!hasContextId) {
    assert(
      hasLegacy,
      'Config is missing auth: set "edge.contextId" (check SITECORE_EDGE_CONTEXT_ID env var) or "edge.endpoint" + "edge.apiKey"',
    );
    assert(loaded.edge.endpoint, 'Config is missing "edge.endpoint" (check SITECORE_EDGE_URL env var)');
    assert(loaded.edge.apiKey, 'Config is missing "edge.apiKey" (check SITECORE_EDGE_TOKEN env var)');
  }
  assert(loaded.edge.site, 'Config is missing "edge.site"');
  assert(loaded.edge.defaultLanguage, 'Config is missing "edge.defaultLanguage"');
  for (const field of REQUIRED_STRING_FIELDS) {
    assert(loaded[field], `Config is missing "${field}"`);
  }

  const styling = loaded.styling ?? 'css';
  assert(
    styling === 'css' || styling === 'tailwind' || styling === 'none',
    `Config "styling" must be 'css', 'tailwind', or 'none' (got "${styling}")`,
  );

  const sb = loaded.storybook as Partial<StorybookConfig> | undefined;
  if (sb !== undefined) {
    assert(typeof sb === 'object' && sb !== null, 'Config "storybook" must be an object');
    if (sb.enabled !== undefined) {
      assert(typeof sb.enabled === 'boolean', 'Config "storybook.enabled" must be a boolean');
    }
    if (sb.titlePrefix !== undefined) {
      assert(typeof sb.titlePrefix === 'string', 'Config "storybook.titlePrefix" must be a string');
    }
    if (sb.decoratorPath !== undefined) {
      assert(
        typeof sb.decoratorPath === 'string' && sb.decoratorPath.length > 0,
        'Config "storybook.decoratorPath" must be a non-empty string',
      );
    }
  }

  return {
    edge: loaded.edge,
    componentPath: loaded.componentPath!,
    componentFolder: loaded.componentFolder ?? true,
    componentPropsImport: loaded.componentPropsImport!,
    sitecorePackage: loaded.sitecorePackage!,
    useDatasourceCheck: loaded.useDatasourceCheck ?? true,
    generateMocks: loaded.generateMocks ?? true,
    styling,
    fieldTypeOverrides: loaded.fieldTypeOverrides ?? {},
    i18nPath: loaded.i18nPath ?? 'src/lib/i18n',
    i18nPackage: loaded.i18nPackage ?? 'next-localization',
    storybook: resolveStorybook(loaded),
  } as HeadcoreConfig;
}
