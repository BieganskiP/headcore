import { describe, it, expect } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { resolveComponentNames } from '../src/registry.js';

function writeComp(root: string, name: string, registryDependencies: string[]) {
  const dir = join(root, name.toLowerCase());
  mkdirSync(dir, { recursive: true });
  const manifest = {
    name,
    description: `${name} component`,
    files: [`${name}.tsx`],
    dependencies: [],
    registryDependencies,
    sitecore: {
      template: { name, fields: [] },
      rendering: { componentName: name, type: 'JSON Rendering' },
      placeholders: [],
      params: [],
    },
  };
  writeFileSync(join(dir, 'manifest.json'), JSON.stringify(manifest), 'utf8');
}

describe('resolveComponentNames', () => {
  it('returns a leaf component alone', () => {
    const root = mkdtempSync(join(tmpdir(), 'headcore-resolve-'));
    writeComp(root, 'Tab', []);
    expect(resolveComponentNames('Tab', root)).toEqual(['Tab']);
  });

  it('lists dependencies before the component that needs them', () => {
    const root = mkdtempSync(join(tmpdir(), 'headcore-resolve-'));
    writeComp(root, 'Tab', []);
    writeComp(root, 'Tabs', ['tab']);
    expect(resolveComponentNames('Tabs', root)).toEqual(['Tab', 'Tabs']);
  });

  it('dedupes a shared dependency', () => {
    const root = mkdtempSync(join(tmpdir(), 'headcore-resolve-'));
    writeComp(root, 'D', []);
    writeComp(root, 'B', ['d']);
    writeComp(root, 'C', ['d']);
    writeComp(root, 'A', ['b', 'c']);
    expect(resolveComponentNames('A', root)).toEqual(['D', 'B', 'C', 'A']);
  });

  it('does not infinite-loop on a cycle', () => {
    const root = mkdtempSync(join(tmpdir(), 'headcore-resolve-'));
    writeComp(root, 'A', ['b']);
    writeComp(root, 'B', ['a']);
    expect(resolveComponentNames('A', root)).toEqual(['B', 'A']);
  });
});
