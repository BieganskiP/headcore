import { describe, it, expect } from 'vitest';
import { trimPlaceholders, manifestToRegistryEntry } from '../src/gui/state.js';
import type { RenderingNode } from '../src/types.js';
import type { ComponentManifest } from '../src/registry/manifest.js';

function node(over: Partial<RenderingNode> = {}): RenderingNode {
  return { componentName: 'Hero', fields: {}, params: {}, placeholders: {}, ...over };
}

describe('trimPlaceholders', () => {
  it('keeps component name, dataSource, field names and nested placeholders; drops values and params', () => {
    const input: Record<string, RenderingNode[]> = {
      'headless-main': [
        node({
          componentName: 'Hero',
          dataSource: '{GUID-1}',
          fields: { Title: { value: 'Big' }, Image: { value: { src: 'x.jpg' } } },
          params: { variant: 'dark' },
          placeholders: {
            'hero-inner': [node({ componentName: 'Card', fields: { Text: { value: 'hi' } } })],
          },
        }),
      ],
    };

    expect(trimPlaceholders(input)).toEqual({
      'headless-main': [
        {
          componentName: 'Hero',
          dataSource: '{GUID-1}',
          fieldNames: ['Title', 'Image'],
          placeholders: {
            'hero-inner': [{ componentName: 'Card', fieldNames: ['Text'], placeholders: {} }],
          },
        },
      ],
    });
  });

  it('omits dataSource when the rendering has none', () => {
    const out = trimPlaceholders({ main: [node()] });
    expect(out.main[0]).not.toHaveProperty('dataSource');
    expect(out.main[0]).toEqual({ componentName: 'Hero', fieldNames: [], placeholders: {} });
  });

  it('returns an empty object for empty placeholders', () => {
    expect(trimPlaceholders({})).toEqual({});
  });
});

describe('manifestToRegistryEntry', () => {
  const manifest: ComponentManifest = {
    name: 'Tabs',
    description: 'Editable tabs',
    files: ['Tabs.tsx'],
    dependencies: [],
    registryDependencies: ['Tab'],
    sitecore: {
      template: { name: 'Tabs', fields: [] },
      rendering: { componentName: 'Tabs', type: 'JSON Rendering' },
      placeholders: [{ key: 'tabs-{*}', dynamic: true, allowedRenderings: ['Tab'] }],
      params: [],
      placement: 'partial design',
    },
  };

  it('maps name, componentName, description and placement', () => {
    expect(manifestToRegistryEntry(manifest)).toEqual({
      name: 'Tabs',
      componentName: 'Tabs',
      description: 'Editable tabs',
      placement: 'partial design',
    });
  });

  it('omits placement when the manifest has none', () => {
    const noPlacement: ComponentManifest = {
      ...manifest,
      sitecore: { ...manifest.sitecore, placement: undefined },
    };
    expect(manifestToRegistryEntry(noPlacement)).toEqual({
      name: 'Tabs',
      componentName: 'Tabs',
      description: 'Editable tabs',
    });
  });
});
