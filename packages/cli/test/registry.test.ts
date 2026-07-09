import { describe, it, expect } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { listComponents, readComponentManifest, readComponentFiles } from '../src/registry.js';

// packages/cli/registry, resolved relative to this test file (cwd-independent).
const REGISTRY_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', 'registry');

describe('registry access', () => {
  it('lists the Tabs component', () => {
    const comps = listComponents();
    expect(comps.map((c) => c.name)).toContain('Tabs');
  });

  it('lists the Tab component', () => {
    const comps = listComponents();
    expect(comps.map((c) => c.name)).toContain('Tab');
  });

  it('reads the Tab manifest with a title field and dynamic content placeholder', () => {
    const m = readComponentManifest('tab');
    expect(m.name).toBe('Tab');
    expect(m.sitecore.template.fields.map((f) => f.name)).toContain('title');
    const ph = m.sitecore.placeholders.find((p) => p.key === 'headcore-tab-content');
    expect(ph?.dynamic).toBe(true);
  });

  it('reads the Tabs manifest', () => {
    const m = readComponentManifest('tabs');
    expect(m.name).toBe('Tabs');
    expect(m.files).toContain('Tabs.tsx');
  });

  it('reads Tabs files with contents', () => {
    const files = readComponentFiles('tabs');
    const tsx = files.find((f) => f.file === 'Tabs.tsx');
    expect(tsx).toBeDefined();
    expect(tsx!.contents).toContain("import { Text, Placeholder }");
  });

  it('throws a helpful error for an unknown component', () => {
    expect(() => readComponentManifest('nope')).toThrow(/nope/);
  });

  it('resolves manifests from an explicit root', () => {
    const comps = listComponents(REGISTRY_ROOT);
    expect(comps.length).toBeGreaterThan(0);
  });
});
