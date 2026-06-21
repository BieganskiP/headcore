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
  it('produces three files at componentPath when mocks enabled', () => {
    const files = generateFiles(contract, node, {
      componentPath: 'src/components',
      componentPropsImport: '@/lib/component-props',
      sitecorePackage: '@sitecore-content-sdk/nextjs',
      useDatasourceCheck: true,
      generateMocks: true,
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
      componentPropsImport: '@/lib/component-props',
      sitecorePackage: '@sitecore-content-sdk/nextjs',
      useDatasourceCheck: true,
      generateMocks: false,
      fieldTypeOverrides: {},
    });
    expect(files.map((f) => f.path)).not.toContain('src/components/Hero.mock.json');
  });
});
