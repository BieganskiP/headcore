import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parseManifest, type ComponentManifest } from 'headcore-core';

/** Absolute path to the bundled component registry. */
export function defaultRegistryRoot(): string {
  return join(dirname(fileURLToPath(import.meta.url)), '..', 'registry');
}

export interface ComponentFile {
  file: string;
  contents: string;
}

function manifestPath(root: string, dir: string): string {
  return join(root, dir, 'manifest.json');
}

/** List every component in the registry (by reading each folder's manifest). */
export function listComponents(root: string = defaultRegistryRoot()): ComponentManifest[] {
  if (!existsSync(root)) return [];
  return readdirSync(root)
    .filter((entry) => statSync(join(root, entry)).isDirectory() && existsSync(manifestPath(root, entry)))
    .map((entry) => parseManifest(JSON.parse(readFileSync(manifestPath(root, entry), 'utf8'))));
}

/** Read and validate a single component's manifest by folder name (case-insensitive). */
export function readComponentManifest(name: string, root: string = defaultRegistryRoot()): ComponentManifest {
  const dir = existsSync(manifestPath(root, name))
    ? name
    : readdirSync(root).find((e) => e.toLowerCase() === name.toLowerCase());
  if (!dir || !existsSync(manifestPath(root, dir))) {
    throw new Error(`Unknown component "${name}". Run \`headcore list\` to see available components.`);
  }
  return parseManifest(JSON.parse(readFileSync(manifestPath(root, dir), 'utf8')));
}

/** Read a component's source files (contents) as declared in its manifest. */
export function readComponentFiles(name: string, root: string = defaultRegistryRoot()): ComponentFile[] {
  const manifest = readComponentManifest(name, root);
  const dir = readdirSync(root).find((e) => e.toLowerCase() === name.toLowerCase()) ?? name;
  return manifest.files.map((file) => ({
    file,
    contents: readFileSync(join(root, dir, file), 'utf8'),
  }));
}

/**
 * Resolve a component together with its transitive `registryDependencies`,
 * dependencies first, deduped and cycle-safe. Returns canonical component names.
 */
export function resolveComponentNames(name: string, root: string = defaultRegistryRoot()): string[] {
  const ordered: string[] = [];
  const done = new Set<string>();
  const inProgress = new Set<string>();

  const visit = (n: string) => {
    const manifest = readComponentManifest(n, root);
    const key = manifest.name.toLowerCase();
    if (done.has(key) || inProgress.has(key)) return;
    inProgress.add(key);
    for (const dep of manifest.registryDependencies) visit(dep);
    inProgress.delete(key);
    done.add(key);
    ordered.push(manifest.name);
  };

  visit(name);
  return ordered;
}
