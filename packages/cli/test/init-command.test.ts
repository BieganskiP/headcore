import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig } from 'headcore-core';
import { runInit } from '../src/commands/init.js';

const ENV_KEY = 'SITECORE_EDGE_CONTEXT_ID';
const savedEnv = process.env[ENV_KEY];

afterEach(() => {
  if (savedEnv === undefined) delete process.env[ENV_KEY];
  else process.env[ENV_KEY] = savedEnv;
});

describe('runInit', () => {
  it('writes headcore.config.ts into the target directory', () => {
    const dir = mkdtempSync(join(tmpdir(), 'headcore-init-'));
    const result = runInit({ dryRun: false, force: false, cwd: dir });

    expect(result.path).toBe(join(dir, 'headcore.config.ts'));
    expect(result.written).toBe(true);
    const contents = readFileSync(result.path, 'utf8');
    // Named const + `export default headcoreConfig` keeps Next.js ESLint's
    // import/no-anonymous-default-export rule happy in consuming projects.
    expect(contents).toContain('const headcoreConfig = {');
    expect(contents).toContain('export default headcoreConfig;');
    expect(contents).not.toContain('export default {');
    expect(contents).toContain('process.env.SITECORE_EDGE_CONTEXT_ID');
    expect(contents).toContain("componentPath: 'src/components/sitecore'");
  });

  it('dry-run writes nothing', () => {
    const dir = mkdtempSync(join(tmpdir(), 'headcore-init-'));
    const result = runInit({ dryRun: true, force: false, cwd: dir });

    expect(result.written).toBe(false);
    expect(existsSync(join(dir, 'headcore.config.ts'))).toBe(false);
  });

  it('refuses to overwrite an existing config without --force', () => {
    const dir = mkdtempSync(join(tmpdir(), 'headcore-init-'));
    runInit({ dryRun: false, force: false, cwd: dir });
    expect(() => runInit({ dryRun: false, force: false, cwd: dir })).toThrow(/already exists/);
  });

  it('overwrites an existing config with --force', () => {
    const dir = mkdtempSync(join(tmpdir(), 'headcore-init-'));
    const path = join(dir, 'headcore.config.ts');
    writeFileSync(path, '// stale\n', 'utf8');

    const result = runInit({ dryRun: false, force: true, cwd: dir });
    expect(result.written).toBe(true);
    expect(readFileSync(path, 'utf8')).toContain('const headcoreConfig = {');
  });

  it('produces a config that passes loadConfig once the context ID env var is set', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'headcore-init-'));
    const { path } = runInit({ dryRun: false, force: false, cwd: dir });

    process.env[ENV_KEY] = 'test-context-id';
    const config = await loadConfig(path);
    expect(config.edge.contextId).toBe('test-context-id');
    expect(config.edge.site).toBe('my-site');
    expect(config.componentPath).toBe('src/components/sitecore');
    expect(config.styling).toBe('css');
  });

  it('stays in sync with headcore.config.example.ts at the repo root', () => {
    const dir = mkdtempSync(join(tmpdir(), 'headcore-init-'));
    const { path } = runInit({ dryRun: false, force: false, cwd: dir });

    const body = (file: string) => {
      const contents = readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
      // Compare from the config object onward; only the header comment may differ.
      return contents.slice(contents.indexOf('const headcoreConfig'));
    };
    const example = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'headcore.config.example.ts');
    expect(body(path)).toBe(body(example));
  });
});
