import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';
import {
  loadConfig as defaultLoadConfig,
  EdgeClient,
  parseLayout,
  collectRenderings,
  buildContract,
  generateFiles,
  normalizeVariants,
  type GeneratedFile,
} from 'headcore-core';
import type { InspectDeps } from './inspect.js';
import { resolveCliConfigPath } from '../config-path.js';
import { decoratorOutput } from '../storybook.js';

export interface ComponentInput {
  name: string | undefined;
  route: string | undefined;
  lang: string | undefined;
  dryRun: boolean;
  force: boolean;
  variants?: string[];
}

export interface ComponentResult {
  written: GeneratedFile[];
  preview: GeneratedFile[];
}

export async function runComponent(input: ComponentInput, deps?: Partial<InspectDeps>): Promise<ComponentResult> {
  if (!input.name) throw new Error('component requires a <Name> argument');
  if (!input.route) throw new Error('component requires --route <route>');

  const loadConfig = deps?.loadConfig ?? defaultLoadConfig;
  const config = await loadConfig(resolveCliConfigPath());
  const lang = input.lang ?? config.edge.defaultLanguage;

  const getLayout = deps?.getLayout ?? ((route: string, l: string) => new EdgeClient(config.edge).getLayout(route, l));
  const rendered = await getLayout(input.route, lang);
  const tree = parseLayout(rendered, input.route);

  const all = collectRenderings(tree);
  const matches = all.filter((n) => n.componentName === input.name);
  if (matches.length === 0) {
    const names = [...new Set(all.map((n) => n.componentName))].join(', ');
    throw new Error(`rendering "${input.name}" not found on ${input.route}. Available: ${names}`);
  }
  if (matches.length > 1) {
    throw new Error(
      `rendering "${input.name}" is ambiguous on ${input.route}: ${matches.length} instances found. ` +
      `(Scaffold a single instance is ambiguous here; use \`page <route>\` to scaffold all components, which merges duplicate instances.)`,
    );
  }
  const node = matches[0];

  const contract = buildContract(node, config.fieldTypeOverrides);
  const variants =
    input.variants && input.variants.length > 0 ? normalizeVariants(input.variants) : undefined;
  const files = generateFiles(contract, node, config, variants);
  // The decorator rides the normal write pipeline; write-once is enforced by
  // decoratorOutput returning null when the file already exists.
  const decorator = decoratorOutput(config);
  if (decorator) files.push(decorator);

  if (input.dryRun) return { written: [], preview: files };

  if (!input.force) {
    const clash = files.find((f) => existsSync(f.path));
    if (clash) throw new Error(`${clash.path} already exists. Use --force to overwrite or --dry-run to preview.`);
  }

  for (const file of files) {
    mkdirSync(dirname(file.path), { recursive: true });
    writeFileSync(file.path, file.contents, 'utf8');
  }
  return { written: files, preview: files };
}
