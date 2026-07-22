import { describe, it, expect } from 'vitest';
import {
  trimPlaceholders,
  manifestToRegistryEntry,
  assembleGuiState,
  type GuiRouteDetail,
  type GuiRegistryEntry,
} from '../src/gui/state.js';
import type { RenderingNode } from '../src/types.js';
import type { ComponentManifest } from '../src/registry/manifest.js';

function node(over: Partial<RenderingNode> = {}): RenderingNode {
  return { componentName: 'Hero', fields: {}, params: {}, placeholders: {}, ...over };
}

describe('trimPlaceholders', () => {
  it('keeps component name, dataSource, field values and nested placeholders; drops params', () => {
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
          fields: { Title: { value: 'Big' }, Image: { value: { src: 'x.jpg' } } },
          placeholders: {
            'hero-inner': [{ componentName: 'Card', fields: { Text: { value: 'hi' } }, placeholders: {} }],
          },
        },
      ],
    });
  });

  it('omits dataSource when the rendering has none', () => {
    const out = trimPlaceholders({ main: [node()] });
    expect(out.main[0]).not.toHaveProperty('dataSource');
    expect(out.main[0]).toEqual({ componentName: 'Hero', fields: {}, placeholders: {} });
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

  it('maps name, componentName, description, placement and placeholders', () => {
    expect(manifestToRegistryEntry(manifest)).toEqual({
      name: 'Tabs',
      componentName: 'Tabs',
      description: 'Editable tabs',
      placement: 'partial design',
      placeholders: [{ key: 'tabs-{*}', dynamic: true, allowedRenderings: ['Tab'] }],
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
      placeholders: [{ key: 'tabs-{*}', dynamic: true, allowedRenderings: ['Tab'] }],
    });
  });
});

describe('assembleGuiState', () => {
  const route: GuiRouteDetail = {
    routePath: '/', name: 'Home', updatedAt: '2026-07-01', components: ['Hero'], layout: {},
  };
  const registry: GuiRegistryEntry[] = [
    { name: 'Tabs', componentName: 'Tabs', description: 'Editable tabs', placeholders: [] },
  ];
  const now = () => new Date('2026-07-21T10:00:00.000Z');

  it('combines routes, registry and dictionary entries with a timestamp', async () => {
    const entries = [{ key: 'nav.home', value: 'Home' }];
    const state = await assembleGuiState({
      site: 'my-site',
      language: 'en',
      routes: async () => [route],
      dictionary: async () => entries,
      registry,
      now,
    });
    expect(state).toEqual({
      site: 'my-site',
      language: 'en',
      fetchedAt: '2026-07-21T10:00:00.000Z',
      routes: [route],
      registry,
      dictionary: entries,
    });
    expect(state.errors).toBeUndefined();
  });

  it('degrades a dictionary failure to no entries plus an errors entry', async () => {
    const state = await assembleGuiState({
      site: 'my-site',
      language: 'en',
      routes: async () => [route],
      dictionary: async () => { throw new Error('edge down'); },
      registry,
      now,
    });
    expect(state.dictionary).toEqual([]);
    expect(state.errors).toEqual(['dictionary: edge down']);
    expect(state.routes).toEqual([route]);
  });

  it('propagates a routes failure (no state without routes)', async () => {
    await expect(assembleGuiState({
      site: 'my-site',
      language: 'en',
      routes: async () => { throw new Error('HTTP 401'); },
      dictionary: async () => [],
      registry: [],
      now,
    })).rejects.toThrow(/401/);
  });
});
