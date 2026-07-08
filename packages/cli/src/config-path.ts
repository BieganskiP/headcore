import { resolveConfigPath } from 'headcore-core';

/**
 * Resolve the config path for CLI commands, emitting a deprecation warning to
 * stderr when the legacy `sitecore-scaffold.config.ts` name is used.
 */
export function resolveCliConfigPath(): string {
  const resolved = resolveConfigPath();
  if (resolved.legacy) {
    process.stderr.write(
      'warning: "sitecore-scaffold.config.ts" is deprecated and will stop being read in a future release; rename it to "headcore.config.ts"\n',
    );
  }
  return resolved.path;
}
