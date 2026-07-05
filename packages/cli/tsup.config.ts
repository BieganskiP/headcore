import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  clean: true,
  banner: { js: '#!/usr/bin/env node' },
  // Bundle the workspace core into the CLI so the published package is
  // self-contained. jiti stays external and is declared as a runtime dependency.
  noExternal: [/^@sitecore-scaffold\/core/],
});
