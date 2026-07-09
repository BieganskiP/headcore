import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import {
  loadConfig as defaultLoadConfig,
  renderSitecoreInstructions,
  type HeadcoreConfig,
} from 'headcore-core';
import { readComponentManifest, readComponentFiles, resolveComponentNames } from '../registry.js';
import { resolveCliConfigPath } from '../config-path.js';

export interface AddInput {
  name: string | undefined;
  dryRun: boolean;
  force: boolean;
}

export interface AddDeps {
  loadConfig: typeof defaultLoadConfig;
}

export interface AddResult {
  written: string[];
  preview: string[];
}

interface OutputFile {
  path: string;
  contents: string;
}

/** Rewrite the two project-specific import specifiers to match the user's config. */
function applyImportRewrites(file: string, contents: string, config: HeadcoreConfig): string {
  if (!file.endsWith('.tsx') && !file.endsWith('.ts')) return contents;
  return contents
    .split("'@sitecore-content-sdk/nextjs'").join(`'${config.sitecorePackage}'`)
    .split("'lib/component-props'").join(`'${config.componentPropsImport}'`);
}

export async function runAdd(input: AddInput, deps?: Partial<AddDeps>): Promise<AddResult> {
  if (!input.name) throw new Error('add requires a <Name> argument');

  const loadConfig = deps?.loadConfig ?? defaultLoadConfig;
  const config = await loadConfig(resolveCliConfigPath());

  const outputs: OutputFile[] = [];
  for (const name of resolveComponentNames(input.name)) {
    const manifest = readComponentManifest(name);
    const sourceFiles = readComponentFiles(name);

    // Destination: <componentPath>/<Name>/<file> when componentFolder, else flat.
    const targetDir = config.componentFolder ? join(config.componentPath, manifest.name) : config.componentPath;
    const docName = config.componentFolder ? 'SITECORE.md' : `${manifest.name}.SITECORE.md`;

    for (const f of sourceFiles) {
      outputs.push({ path: join(targetDir, f.file), contents: applyImportRewrites(f.file, f.contents, config) });
    }
    outputs.push({ path: join(targetDir, docName), contents: renderSitecoreInstructions(manifest) });
  }

  if (input.dryRun) {
    return { written: [], preview: outputs.map((o) => o.path) };
  }

  if (!input.force) {
    const clash = outputs.find((o) => existsSync(o.path));
    if (clash) throw new Error(`${clash.path} already exists. Use --force to overwrite or --dry-run to preview.`);
  }

  for (const o of outputs) {
    mkdirSync(dirname(o.path), { recursive: true });
    writeFileSync(o.path, o.contents, 'utf8');
  }
  return { written: outputs.map((o) => o.path), preview: outputs.map((o) => o.path) };
}
