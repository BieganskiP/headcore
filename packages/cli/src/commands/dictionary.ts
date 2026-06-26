import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';
import {
  loadConfig as defaultLoadConfig,
  EdgeClient,
  buildDictionary,
  renderDictionaryFile,
  renderTypedTFile,
  type DictionaryEntry,
  type GeneratedFile,
} from '@sitecore-scaffold/core';

export interface DictionaryDeps {
  loadConfig: typeof defaultLoadConfig;
  getDictionary: (lang: string) => Promise<DictionaryEntry[]>;
}

export interface DictionaryInput {
  lang: string | undefined;
  dryRun: boolean;
  force: boolean;
}

export interface DictionaryFileResult extends GeneratedFile {
  /** Whether this file is rewritten on every run, or scaffolded once. */
  mode: 'overwrite' | 'scaffold';
  status: 'generated' | 'skipped';
}

export interface DictionaryResult {
  files: DictionaryFileResult[];
  warnings: string[];
}

const CONFIG_PATH = `${process.cwd()}/sitecore-scaffold.config.ts`;

export async function runDictionary(input: DictionaryInput, deps?: Partial<DictionaryDeps>): Promise<DictionaryResult> {
  const loadConfig = deps?.loadConfig ?? defaultLoadConfig;
  const config = await loadConfig(CONFIG_PATH);
  const lang = input.lang ?? config.edge.defaultLanguage;

  const getDictionary = deps?.getDictionary ?? ((l: string) => new EdgeClient(config.edge).getDictionary(l));
  const entries = await getDictionary(lang);
  const { keys, warnings } = buildDictionary(entries);

  const keysPath = `${config.i18nPath}/dictionary-keys.ts`;
  const wrapperPath = `${config.i18nPath}/use-typed-t.ts`;

  const files: DictionaryFileResult[] = [
    { path: keysPath, contents: renderDictionaryFile(keys), mode: 'overwrite', status: 'generated' },
    { path: wrapperPath, contents: renderTypedTFile(config.i18nPackage), mode: 'scaffold', status: 'generated' },
  ];

  if (input.dryRun) return { files, warnings };

  for (const file of files) {
    // The wrapper is scaffolded once; never clobber a customized one unless --force.
    if (file.mode === 'scaffold' && !input.force && existsSync(file.path)) {
      file.status = 'skipped';
      continue;
    }
    mkdirSync(dirname(file.path), { recursive: true });
    writeFileSync(file.path, file.contents, 'utf8');
  }

  return { files, warnings };
}
