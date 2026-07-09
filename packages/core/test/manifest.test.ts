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
    expect(m.sitecore.params).toEqual([{ name: 'Tab1Label' }]);
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

  it('accepts object params with type and description', () => {
    const m = parseManifest({
      ...valid,
      sitecore: {
        ...valid.sitecore,
        params: [{ name: 'AllowMultiple', type: 'Checkbox', description: 'Allow many open panels.' }],
      },
    });
    expect(m.sitecore.params).toEqual([
      { name: 'AllowMultiple', type: 'Checkbox', description: 'Allow many open panels.' },
    ]);
  });

  it('accepts mixed string and object params', () => {
    const m = parseManifest({
      ...valid,
      sitecore: { ...valid.sitecore, params: ['Plain', { name: 'Typed', type: 'Checkbox' }] },
    });
    expect(m.sitecore.params).toEqual([{ name: 'Plain' }, { name: 'Typed', type: 'Checkbox' }]);
  });

  it('throws for a param object without a name', () => {
    expect(() =>
      parseManifest({ ...valid, sitecore: { ...valid.sitecore, params: [{ type: 'Checkbox' }] } }),
    ).toThrow(/param/i);
  });

  it('throws for an empty-string param name', () => {
    expect(() =>
      parseManifest({ ...valid, sitecore: { ...valid.sitecore, params: [''] } }),
    ).toThrow(/param/i);
  });

  it('throws for a param entry that is neither string nor object', () => {
    expect(() =>
      parseManifest({ ...valid, sitecore: { ...valid.sitecore, params: [42] } }),
    ).toThrow(/param/i);
  });

  it('accepts an optional placement string', () => {
    const m = parseManifest({
      ...valid,
      sitecore: { ...valid.sitecore, placement: 'Add once to a shared placeholder.' },
    });
    expect(m.sitecore.placement).toBe('Add once to a shared placeholder.');
  });

  it('defaults placement to undefined when omitted', () => {
    expect(parseManifest(valid).sitecore.placement).toBeUndefined();
  });

  it('throws for a non-string placement', () => {
    expect(() =>
      parseManifest({ ...valid, sitecore: { ...valid.sitecore, placement: 42 } }),
    ).toThrow(/placement/i);
  });
});
