import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';
import {
  loadConfig as defaultLoadConfig,
  EdgeClient,
  parseLayout,
  buildContract,
  generateFiles,
  normalizeVariants,
  type RenderingNode,
  type GeneratedFile,
} from '@sitecore-scaffold/core';
import type { InspectDeps } from './inspect.js';

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

const CONFIG_PATH = `${process.cwd()}/sitecore-scaffold.config.ts`;

function collectRenderings(placeholders: Record<string, RenderingNode[]>, acc: RenderingNode[]): void {
  for (const renderings of Object.values(placeholders)) {
    for (const node of renderings) {
      acc.push(node);
      collectRenderings(node.placeholders, acc);
    }
  }
}

export async function runComponent(input: ComponentInput, deps?: Partial<InspectDeps>): Promise<ComponentResult> {
  if (!input.name) throw new Error('component requires a <Name> argument');
  if (!input.route) throw new Error('component requires --route <route>');

  const loadConfig = deps?.loadConfig ?? defaultLoadConfig;
  const config = await loadConfig(CONFIG_PATH);
  const lang = input.lang ?? config.edge.defaultLanguage;

  const getLayout = deps?.getLayout ?? ((route: string, l: string) => new EdgeClient(config.edge).getLayout(route, l));
  const rendered = await getLayout(input.route, lang);
  const tree = parseLayout(rendered, input.route);

  const all: RenderingNode[] = [];
  collectRenderings(tree.placeholders, all);
  const matches = all.filter((n) => n.componentName === input.name);
  if (matches.length === 0) {
    const names = [...new Set(all.map((n) => n.componentName))].join(', ');
    throw new Error(`rendering "${input.name}" not found on ${input.route}. Available: ${names}`);
  }
  if (matches.length > 1) {
    throw new Error(
      `rendering "${input.name}" is ambiguous on ${input.route}: ${matches.length} instances found. ` +
      `(MVP 1 scaffolds one component; multiple instances are not yet disambiguated.)`,
    );
  }
  const node = matches[0];

  const contract = buildContract(node, config.fieldTypeOverrides);
  const variants =
    input.variants && input.variants.length > 0 ? normalizeVariants(input.variants) : undefined;
  const files = generateFiles(
    contract,
    node,
    {
      componentPath: config.componentPath,
      componentFolder: config.componentFolder,
      componentPropsImport: config.componentPropsImport,
      sitecorePackage: config.sitecorePackage,
      useDatasourceCheck: config.useDatasourceCheck,
      generateMocks: config.generateMocks,
      styling: config.styling,
      fieldTypeOverrides: config.fieldTypeOverrides,
    },
    variants,
  );

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
