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
});

describe('generateFiles', () => {
  it('produces three files at componentPath when mocks enabled and styling none', () => {
    const files = generateFiles(contract, node, {
      componentPath: 'src/components',
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

  it('omits mock file when mocks disabled', () => {
    const files = generateFiles(contract, node, {
      componentPath: 'src/components',
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
      componentPropsImport: 'lib/component-props',
      sitecorePackage: '@sitecore-content-sdk/nextjs',
      useDatasourceCheck: true,
      generateMocks: false,
      styling: 'tailwind',
      fieldTypeOverrides: {},
    });
    expect(files.some((f) => f.path.endsWith('.css'))).toBe(false);
  });
});
