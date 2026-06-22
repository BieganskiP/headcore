import { describe, it, expect } from 'vitest';
import { renderTypesFile } from '../src/codegen/types-file.js';
import { renderComponentFile } from '../src/codegen/component-file.js';
import type { ComponentContract, GeneratedFile } from '../src/types.js';
import { typecheckComponents } from './helpers/typecheck.js';

const PROPS_IMPORT = 'lib/component-props';
const SDK = '@sitecore-content-sdk/nextjs';

function filesFor(
  contract: ComponentContract,
  opts: { useDatasourceCheck?: boolean; variants?: string[] } = {},
): GeneratedFile[] {
  return [
    {
      path: `${contract.name}/${contract.name}.types.ts`,
      contents: renderTypesFile(contract, PROPS_IMPORT),
    },
    {
      path: `${contract.name}/${contract.name}.tsx`,
      contents: renderComponentFile(contract, {
        propsImport: PROPS_IMPORT,
        sitecorePackage: SDK,
        useDatasourceCheck: opts.useDatasourceCheck ?? true,
        styling: 'none',
        variants: opts.variants,
      }),
    },
  ];
}

const kitchenSink: ComponentContract = {
  name: 'Hero',
  fields: [
    { name: 'heading', tsType: 'Field<string>', optional: false, renderer: 'Text', sitecoreImport: 'Text' },
    { name: 'description', tsType: 'Field<string>', optional: true, renderer: 'RichText', sitecoreImport: 'RichText' },
    { name: 'image', tsType: 'ImageField', optional: true, renderer: 'Image', sitecoreImport: 'Image' },
    { name: 'ctaLink', tsType: 'LinkField', optional: true, renderer: 'Link', sitecoreImport: 'Link' },
  ],
  params: ['variant'],
  placeholders: ['hero-body'],
};

describe('generated output compiles', () => {
  it('compiles a kitchen-sink component (all renderers + params + placeholder)', () => {
    const diagnostics = typecheckComponents([{ dir: 'Hero', files: filesFor(kitchenSink) }]);
    expect(diagnostics).toEqual([]);
  });
});
