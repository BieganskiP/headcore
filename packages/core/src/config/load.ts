import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import type { ScaffoldConfig } from '../types.js';

const REQUIRED_STRING_FIELDS: Array<keyof ScaffoldConfig> = [
  'componentPath',
  'componentPropsImport',
  'sitecorePackage',
];

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

export async function loadConfig(path: string): Promise<ScaffoldConfig> {
  if (!existsSync(path)) {
    throw new Error(`Config file not found: ${path}`);
  }

  // jiti 1.x is a CJS package; use createRequire to load it in ESM context
  const req = createRequire(import.meta.url);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const createJiti = req('jiti') as (filename: string, opts?: Record<string, unknown>) => any;
  const jiti = createJiti(import.meta.url, { interopDefault: true });
  const loaded = (await jiti.import(path, {})) as Partial<ScaffoldConfig>;

  assert(loaded && typeof loaded === 'object', 'Config must export a default object');
  assert(loaded.edge, 'Config is missing "edge" section');
  assert(loaded.edge.endpoint, 'Config is missing "edge.endpoint" (check SITECORE_EDGE_URL env var)');
  assert(loaded.edge.apiKey, 'Config is missing "edge.apiKey" (check SITECORE_EDGE_TOKEN env var)');
  assert(loaded.edge.site, 'Config is missing "edge.site"');
  assert(loaded.edge.defaultLanguage, 'Config is missing "edge.defaultLanguage"');
  for (const field of REQUIRED_STRING_FIELDS) {
    assert(loaded[field], `Config is missing "${field}"`);
  }

  return {
    edge: loaded.edge,
    componentPath: loaded.componentPath!,
    componentPropsImport: loaded.componentPropsImport!,
    sitecorePackage: loaded.sitecorePackage!,
    useDatasourceCheck: loaded.useDatasourceCheck ?? true,
    generateMocks: loaded.generateMocks ?? true,
    fieldTypeOverrides: loaded.fieldTypeOverrides ?? {},
  } as ScaffoldConfig;
}
