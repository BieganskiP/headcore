import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import { resolveConfigPath } from '../src/config/resolve-path.js';

function tmp(): string {
  return mkdtempSync(join(tmpdir(), 'headcore-cfg-'));
}

describe('resolveConfigPath', () => {
  it('prefers headcore.config.ts when present', () => {
    const dir = tmp();
    writeFileSync(join(dir, 'headcore.config.ts'), 'export default {};');
    writeFileSync(join(dir, 'sitecore-scaffold.config.ts'), 'export default {};');
    const r = resolveConfigPath(dir);
    expect(r.path).toBe(join(dir, 'headcore.config.ts'));
    expect(r.legacy).toBe(false);
  });

  it('falls back to the legacy filename with legacy=true', () => {
    const dir = tmp();
    writeFileSync(join(dir, 'sitecore-scaffold.config.ts'), 'export default {};');
    const r = resolveConfigPath(dir);
    expect(r.path).toBe(join(dir, 'sitecore-scaffold.config.ts'));
    expect(r.legacy).toBe(true);
  });

  it('returns the new path when neither file exists', () => {
    const dir = tmp();
    const r = resolveConfigPath(dir);
    expect(r.path).toBe(join(dir, 'headcore.config.ts'));
    expect(r.legacy).toBe(false);
  });
});
