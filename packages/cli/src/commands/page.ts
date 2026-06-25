import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';
import {
  loadConfig as defaultLoadConfig,
  EdgeClient,
  parseLayout,
  collectRenderings,
  mergeContracts,
  generateFiles,
  type RenderingNode,
  type GeneratedFile,
} from '@sitecore-scaffold/core';
import type { InspectDeps } from './inspect.js';

export interface PageInput {
  route: string | undefined;
  lang: string | undefined;
  dryRun: boolean;
  force: boolean;
}

export interface PageComponentResult {
  name: string;
  instanceCount: number;
  status: 'generated' | 'skipped';
  files: GeneratedFile[];
}

export interface PageResult {
  route: string;
  components: PageComponentResult[];
  warnings: string[];
}

const CONFIG_PATH = `${process.cwd()}/sitecore-scaffold.config.ts`;

export async function runPage(input: PageInput, deps?: Partial<InspectDeps>): Promise<PageResult> {
  if (!input.route) throw new Error('page requires a <route> argument');

  const loadConfig = deps?.loadConfig ?? defaultLoadConfig;
  const config = await loadConfig(CONFIG_PATH);
  const lang = input.lang ?? config.edge.defaultLanguage;

  const getLayout = deps?.getLayout ?? ((route: string, l: string) => new EdgeClient(config.edge).getLayout(route, l));
  const rendered = await getLayout(input.route, lang);
  const tree = parseLayout(rendered, input.route);

  const groups = new Map<string, RenderingNode[]>();
  for (const node of collectRenderings(tree)) {
    if (!groups.has(node.componentName)) groups.set(node.componentName, []);
    groups.get(node.componentName)!.push(node);
  }

  const components: PageComponentResult[] = [];
  const warnings: string[] = [];

  for (const [name, nodes] of groups) {
    const merged = mergeContracts(nodes, config.fieldTypeOverrides);
    warnings.push(...merged.warnings);
    const files = generateFiles(merged.contract, nodes[0], config);

    if (input.dryRun) {
      components.push({ name, instanceCount: nodes.length, status: 'generated', files });
      continue;
    }

    if (!input.force && files.some((f) => existsSync(f.path))) {
      components.push({ name, instanceCount: nodes.length, status: 'skipped', files });
      continue;
    }

    for (const file of files) {
      mkdirSync(dirname(file.path), { recursive: true });
      writeFileSync(file.path, file.contents, 'utf8');
    }
    components.push({ name, instanceCount: nodes.length, status: 'generated', files });
  }

  return { route: input.route, components, warnings };
}
