import { describe, it, expect } from 'vitest';
import { renderMockFile } from '../src/codegen/mock-file.js';
import { generateFiles } from '../src/codegen/index.js';
import type { ComponentContract, RenderingNode } from '../src/types.js';

const node: RenderingNode = {
  componentName: 'Hero',
  dataSource: '/Data/Hero',
  fields: { heading: { value: 'About' } },
  params: { variant: 'dark' },
  placeholders: {},
};

const contract: ComponentContract = {
  name: 'Hero',
  fields: [{ name: 'heading', tsType: 'Field<string>', optional: false, renderer: 'Text', sitecoreImport: 'Text' }],
  params: ['variant'],
  placeholders: [],
};

describe('renderMockFile', () => {
  it('serializes the rendering fields and params as JSON', () => {
    const out = renderMockFile(node);
    const parsed = JSON.parse(out);
    expect(parsed.fields.heading.value).toBe('About');
    expect(parsed.params.variant).toBe('dark');
  });

  it('includes nested placeholder nodes with componentName when present', () => {
    const container: RenderingNode = {
      componentName: 'Carousel',
      fields: {},
      params: {},
      placeholders: {
        'headcore-carousel': [
          {
            componentName: 'CarouselSlide',
            fields: { title: { value: 'First slide' } },
            params: {},
            placeholders: {},
          },
        ],
      },
    };
    const parsed = JSON.parse(renderMockFile(container));
    const slide = parsed.placeholders['headcore-carousel'][0];
    expect(slide.componentName).toBe('CarouselSlide');
    expect(slide.fields.title.value).toBe('First slide');
    expect(slide.placeholders).toBeUndefined(); // empty child placeholders omitted
  });

  it('omits the placeholders key when the node has none', () => {
    const parsed = JSON.parse(renderMockFile(node));
    expect(parsed.placeholders).toBeUndefined();
    expect(Object.keys(parsed)).toEqual(['fields', 'params']);
  });

  it('filters out empty placeholder arrays and keeps child dataSource', () => {
    const container: RenderingNode = {
      componentName: 'Carousel',
      fields: {},
      params: {},
      placeholders: {
        empty: [],
        'headcore-carousel': [
          { componentName: 'CarouselSlide', dataSource: '/Data/Slide', fields: {}, params: {}, placeholders: {} },
        ],
      },
    };
    const parsed = JSON.parse(renderMockFile(container));
    expect(Object.keys(parsed.placeholders)).toEqual(['headcore-carousel']);
    expect(parsed.placeholders['headcore-carousel'][0].dataSource).toBe('/Data/Slide');
  });

  it('omits placeholders entirely when all arrays are empty', () => {
    const container: RenderingNode = {
      componentName: 'Tabs',
      fields: {},
      params: {},
      placeholders: { 'headcore-tabs': [] },
    };
    expect(JSON.parse(renderMockFile(container)).placeholders).toBeUndefined();
  });
});

describe('generateFiles', () => {
  it('produces three flat files at componentPath when componentFolder is false', () => {
    const files = generateFiles(contract, node, {
      componentPath: 'src/components',
      componentFolder: false,
      componentPropsImport: 'lib/component-props',
      sitecorePackage: '@sitecore-content-sdk/nextjs',
      useDatasourceCheck: true,
      generateMocks: true,
      styling: 'none',
      fieldTypeOverrides: {},
    });
    const paths = files.map((f) => f.path).sort();
    expect(paths).toEqual([
      'src/components/Hero.mock.json',
      'src/components/Hero.tsx',
      'src/components/Hero.types.ts',
    ]);
  });

  it('nests files in a per-component folder when componentFolder is true', () => {
    const files = generateFiles(contract, node, {
      componentPath: 'src/components/sitecore',
      componentFolder: true,
      componentPropsImport: 'lib/component-props',
      sitecorePackage: '@sitecore-content-sdk/nextjs',
      useDatasourceCheck: true,
      generateMocks: true,
      styling: 'css',
      fieldTypeOverrides: {},
    });
    const paths = files.map((f) => f.path).sort();
    expect(paths).toEqual([
      'src/components/sitecore/Hero/Hero.mock.json',
      'src/components/sitecore/Hero/Hero.module.css',
      'src/components/sitecore/Hero/Hero.tsx',
      'src/components/sitecore/Hero/Hero.types.ts',
    ]);
  });

  it('omits mock file when mocks disabled', () => {
    const files = generateFiles(contract, node, {
      componentPath: 'src/components',
      componentFolder: false,
      componentPropsImport: 'lib/component-props',
      sitecorePackage: '@sitecore-content-sdk/nextjs',
      useDatasourceCheck: true,
      generateMocks: false,
      styling: 'none',
      fieldTypeOverrides: {},
    });
    expect(files.map((f) => f.path)).not.toContain('src/components/Hero.mock.json');
  });

  it('emits a CSS module file when styling is css', () => {
    const files = generateFiles(contract, node, {
      componentPath: 'src/components',
      componentFolder: false,
      componentPropsImport: 'lib/component-props',
      sitecorePackage: '@sitecore-content-sdk/nextjs',
      useDatasourceCheck: true,
      generateMocks: false,
      styling: 'css',
      fieldTypeOverrides: {},
    });
    const css = files.find((f) => f.path === 'src/components/Hero.module.css');
    expect(css).toBeDefined();
    expect(css?.contents).toContain('.root {');
    expect(css?.contents).toContain('.card {');
  });

  it('emits no CSS file when styling is tailwind', () => {
    const files = generateFiles(contract, node, {
      componentPath: 'src/components',
      componentFolder: false,
      componentPropsImport: 'lib/component-props',
      sitecorePackage: '@sitecore-content-sdk/nextjs',
      useDatasourceCheck: true,
      generateMocks: false,
      styling: 'tailwind',
      fieldTypeOverrides: {},
    });
    expect(files.some((f) => f.path.endsWith('.css'))).toBe(false);
  });

  it('forwards variants to the component file', () => {
    const files = generateFiles(
      contract,
      node,
      {
        componentPath: 'src/components',
        componentFolder: false,
        componentPropsImport: 'lib/component-props',
        sitecorePackage: '@sitecore-content-sdk/nextjs',
        useDatasourceCheck: true,
        generateMocks: false,
        styling: 'none',
        fieldTypeOverrides: {},
      },
      ['Default', 'ThreeCard'],
    );
    const tsx = files.find((f) => f.path === 'src/components/Hero.tsx');
    expect(tsx?.contents).toContain('const HeroVariant = (');
    expect(tsx?.contents).toContain('export const ThreeCard =');
  });
});
