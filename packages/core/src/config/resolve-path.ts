import { existsSync } from 'node:fs';
import { join } from 'node:path';

const NEW_FILENAME = 'headcore.config.ts';
const LEGACY_FILENAME = 'sitecore-scaffold.config.ts';

export interface ResolvedConfigPath {
  /** Absolute path to the config file to load. */
  path: string;
  /** True when the deprecated `sitecore-scaffold.config.ts` filename was used. */
  legacy: boolean;
}

/**
 * Resolve which config file to load from `cwd`, preferring the current
 * `headcore.config.ts` name and falling back to the deprecated
 * `sitecore-scaffold.config.ts`. When neither exists, the new path is returned
 * so the caller's "not found" handling reports the current filename.
 */
export function resolveConfigPath(cwd: string = process.cwd()): ResolvedConfigPath {
  const newPath = join(cwd, NEW_FILENAME);
  if (existsSync(newPath)) return { path: newPath, legacy: false };

  const legacyPath = join(cwd, LEGACY_FILENAME);
  if (existsSync(legacyPath)) return { path: legacyPath, legacy: true };

  return { path: newPath, legacy: false };
}
