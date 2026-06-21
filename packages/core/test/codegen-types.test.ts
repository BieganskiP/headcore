import { describe, it, expect } from 'vitest';
import { renderTypesFile } from '../src/codegen/types-file.js';
import type { ComponentContract } from '../src/types.js';

const contract: ComponentContract = {
  name: 'Hero',
  fields: [
    { name: 'heading', tsType: 'Field<string>', optional: false, renderer: 'Text', sitecoreImport: 'Text' },
    { name: 'image', tsType: 'ImageField', optional: true, renderer: 'Image', sitecoreImport: 'Image' },
  ],
  params: ['variant'],
  placeholders: [],
};

describe('renderTypesFile', () => {
  it('emits Fields, Params and Props types', () => {
    const out = renderTypesFile(contract, '@/lib/component-props');
    expect(out).toContain('type HeroFields = {');
    expect(out).toContain('heading: Field<string>;');
    expect(out).toContain('image?: ImageField;');
    expect(out).toContain('type HeroParams = {');
    expect(out).toContain('variant?: string;');
    expect(out).toContain('type HeroProps = ComponentProps & {');
    expect(out).toContain("import { ComponentProps } from '@/lib/component-props';");
  });

  it('imports only the type names actually used (Field and ImageField, not LinkField)', () => {
    const out = renderTypesFile(contract, '@/lib/component-props');
    expect(out).toContain("import { Field, ImageField } from '@sitecore-content-sdk/nextjs';");
    expect(out).not.toContain('LinkField');
  });

  it('omits sitecore import entirely when no known types are used', () => {
    const rawContract: ComponentContract = {
      name: 'Box',
      fields: [
        { name: 'items', tsType: 'ItemReference[]', optional: false, renderer: 'raw', sitecoreImport: null },
      ],
      params: [],
      placeholders: [],
    };
    const out = renderTypesFile(rawContract, '@/lib/component-props');
    expect(out).not.toContain("from '@sitecore-content-sdk/nextjs'");
  });

  it('emits a local ItemReference type definition when a field uses ItemReference[]', () => {
    const refContract: ComponentContract = {
      name: 'Tabs',
      fields: [
        { name: 'Tabs', tsType: 'ItemReference[]', optional: false, renderer: 'raw', sitecoreImport: null },
      ],
      params: [],
      placeholders: [],
    };
    const out = renderTypesFile(refContract, '@/lib/component-props');
    expect(out).toContain('type ItemReference = {');
    expect(out).toContain('Tabs: ItemReference[];');
    // The SDK does not export ItemReference, so it must not be imported.
    expect(out).not.toContain("import { ItemReference }");
  });

  it('emits a typed item interface for a Cards field with inner fields under fields', () => {
    const cardsContract: ComponentContract = {
      name: 'Tabs',
      fields: [
        {
          name: 'Tabs',
          tsType: 'TabsItem[]',
          optional: false,
          renderer: 'Cards',
          sitecoreImport: null,
          itemTypeName: 'TabsItem',
          itemFields: [
            { name: 'Name', tsType: 'Field<string>', optional: false, renderer: 'Text', sitecoreImport: 'Text' },
            { name: 'Icon', tsType: 'ImageField', optional: true, renderer: 'Image', sitecoreImport: 'Image' },
          ],
        },
      ],
      params: [],
      placeholders: [],
    };
    const out = renderTypesFile(cardsContract, '@/lib/component-props');
    expect(out).toContain('type TabsItem = {');
    expect(out).toContain('  fields: {');
    expect(out).toContain('    Name: Field<string>;');
    expect(out).toContain('    Icon?: ImageField;');
    expect(out).toContain('Tabs: TabsItem[];');
    // Inner field types must drive the SDK import even though the outer field is a card array.
    expect(out).toContain("import { Field, ImageField } from '@sitecore-content-sdk/nextjs';");
    // The item type must be exported so the component can import it.
    expect(out).toContain('export type { TabsFields, TabsParams, TabsProps, TabsItem };');
  });
});
