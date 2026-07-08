import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const cliRoot = fileURLToPath(new URL('..', import.meta.url));

// Unit tests import from src and never exercise the tsup bundle, so a broken
// dist (e.g. a CJS dep inlined into the ESM output) is invisible to them.
// This test builds the real artifact and runs it.
describe('built CLI (dist smoke test)', () => {
  it('produces a bundle that starts up and reaches arg parsing', () => {
    const build = spawnSync('npx', ['tsup'], { cwd: cliRoot, shell: true, encoding: 'utf8' });
    expect(build.status, build.stderr).toBe(0);

    const run = spawnSync(process.execPath, [join(cliRoot, 'dist', 'index.js')], { encoding: 'utf8' });
    expect(run.stderr).not.toMatch(/dynamic require/i);
    expect(run.stderr).toMatch(/usage/i);
    expect(run.status).toBe(1);
  }, 120_000);
});
