import { describe, it, expect } from 'vitest';
import { parseManifest } from '../src/registry/manifest.js';

const valid = {
  name: 'Tabs',
  description: 'A tabbed container.',
  files: ['Tabs.tsx', 'Tabs.types.ts'],
  dependencies: [],
  registryDependencies: [],
  sitecore: {
    template: { name: 'Tabs', fields: [{ name: 'Heading', type: 'Single-Line Text' }] },
    rendering: { componentName: 'Tabs', type: 'JSON Rendering' },
    placeholders: [{ key: 'tabs-1', dynamic: false, allowedRenderings: ['*'] }],
    params: ['Tab1Label'],
  },
};

describe('parseManifest', () => {
  it('returns a typed manifest for valid input', () => {
    const m = parseManifest(valid);
    expect(m.name).toBe('Tabs');
    expect(m.files).toEqual(['Tabs.tsx', 'Tabs.types.ts']);
    expect(m.sitecore.placeholders[0].key).toBe('tabs-1');
    expect(m.sitecore.params).toEqual(['Tab1Label']);
  });

  it('defaults optional array fields when omitted', () => {
    const { dependencies, registryDependencies, ...rest } = valid;
    const m = parseManifest(rest);
    expect(m.dependencies).toEqual([]);
    expect(m.registryDependencies).toEqual([]);
  });

  it('throws when name is missing', () => {
    const { name, ...rest } = valid;
    expect(() => parseManifest(rest)).toThrow(/name/i);
  });

  it('throws when files is empty', () => {
    expect(() => parseManifest({ ...valid, files: [] })).toThrow(/files/i);
  });

  it('throws when the sitecore section is missing', () => {
    const { sitecore, ...rest } = valid;
    expect(() => parseManifest(rest)).toThrow(/sitecore/i);
  });
});
