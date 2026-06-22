import { describe, it, expect } from 'vitest';
import { renderComponentFile } from '../src/codegen/component-file.js';
import type { ComponentContract } from '../src/types.js';

const contract: ComponentContract = {
  name: 'Hero',
  fields: [
    { name: 'heading', tsType: 'Field<string>', optional: false, renderer: 'Text', sitecoreImport: 'Text' },
    { name: 'description', tsType: 'Field<string>', optional: true, renderer: 'RichText', sitecoreImport: 'RichText' },
    { name: 'image', tsType: 'ImageField', optional: true, renderer: 'Image', sitecoreImport: 'Image' },
    { name: 'ctaLink', tsType: 'LinkField', optional: true, renderer: 'Link', sitecoreImport: 'Link' },
  ],
  params: ['variant'],
  placeholders: [],
};

describe('renderComponentFile', () => {
  it('imports only used renderers and wraps in withDatasourceCheck when enabled', () => {
    const out = renderComponentFile(contract, {
      propsImport: 'lib/component-props',
      sitecorePackage: '@sitecore-content-sdk/nextjs',
      useDatasourceCheck: true,
      styling: 'none',
    });
    expect(out).toContain('Text');
    expect(out).toContain('RichText');
    expect(out).toContain('Image as SitecoreImage');
    expect(out).toContain('Link as SitecoreLink');
    expect(out).toContain('withDatasourceCheck');
    expect(out).toContain('<Text tag="h1" field={fields.heading} />');
    expect(out).toContain('{fields.image && <SitecoreImage field={fields.image} />}');
    expect(out).toContain('export default withDatasourceCheck()<HeroProps>(Hero);');
  });

  it('exports plainly when datasource check disabled', () => {
    const out = renderComponentFile(contract, {
      propsImport: 'lib/component-props',
      sitecorePackage: '@sitecore-content-sdk/nextjs',
      useDatasourceCheck: false,
      styling: 'none',
    });
    expect(out).toContain('export default Hero;');
    expect(out).not.toContain('withDatasourceCheck');
  });

  it('generates data-variant attribute from params', () => {
    const out = renderComponentFile(contract, {
      propsImport: 'lib/component-props',
      sitecorePackage: '@sitecore-content-sdk/nextjs',
      useDatasourceCheck: false,
      styling: 'none',
    });
    expect(out).toContain('data-variant={params?.variant}');
  });

  it('generates kebab-case data attribute for camelCase param', () => {
    const camelContract: ComponentContract = {
      ...contract,
      params: ['backgroundColor'],
    };
    const out = renderComponentFile(camelContract, {
      propsImport: 'lib/component-props',
      sitecorePackage: '@sitecore-content-sdk/nextjs',
      useDatasourceCheck: false,
      styling: 'none',
    });
    expect(out).toContain('data-background-color={params?.backgroundColor}');
  });

  it('kebab-cases a param starting with a capital without a leading dash', () => {
    const sxaContract: ComponentContract = {
      ...contract,
      params: ['DynamicPlaceholderId'],
    };
    const out = renderComponentFile(sxaContract, {
      propsImport: 'lib/component-props',
      sitecorePackage: '@sitecore-content-sdk/nextjs',
      useDatasourceCheck: false,
      styling: 'none',
    });
    expect(out).toContain('data-dynamic-placeholder-id={params?.DynamicPlaceholderId}');
    expect(out).not.toContain('data--');
  });

  it('emits plain <section> with no data attributes when params is empty', () => {
    const noParamsContract: ComponentContract = {
      ...contract,
      params: [],
    };
    const out = renderComponentFile(noParamsContract, {
      propsImport: 'lib/component-props',
      sitecorePackage: '@sitecore-content-sdk/nextjs',
      useDatasourceCheck: false,
      styling: 'none',
    });
    expect(out).toContain('<section>');
    expect(out).not.toContain('data-');
  });

  it('renders a typed card map for a Cards field, pulling inner-field renderers into imports', () => {
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
    const out = renderComponentFile(cardsContract, {
      propsImport: 'lib/component-props',
      sitecorePackage: '@sitecore-content-sdk/nextjs',
      useDatasourceCheck: false,
      styling: 'none',
    });
    expect(out).toContain("import { TabsProps, TabsItem } from './Tabs.types';");
    expect(out).toContain('{fields.Tabs?.map((item: TabsItem) => (');
    expect(out).toContain('<article className="card" key={item.id}>');
    expect(out).toContain('<Text tag="span" field={item.fields.Name} />');
    expect(out).toContain('{item.fields.Icon && <SitecoreImage field={item.fields.Icon} />}');
    // inner-field renderers must be imported even though the card field itself has no import
    expect(out).toContain('Text');
    expect(out).toContain('Image as SitecoreImage');
  });

  it('renders nested card maps with distinct loop variables and imports nested item types', () => {
    const nested: ComponentContract = {
      name: 'ColumnSlider',
      fields: [
        {
          name: 'Tabs', tsType: 'TabsItem[]', optional: false, renderer: 'Cards', sitecoreImport: null,
          itemTypeName: 'TabsItem',
          itemFields: [
            { name: 'Tab Title', tsType: 'Field<string>', optional: false, renderer: 'Text', sitecoreImport: 'Text' },
            {
              name: 'Column Slider Items', tsType: 'ColumnSliderItemsItem[]', optional: false, renderer: 'Cards',
              sitecoreImport: null, itemTypeName: 'ColumnSliderItemsItem',
              itemFields: [
                { name: 'Slide Title', tsType: 'Field<string>', optional: false, renderer: 'Text', sitecoreImport: 'Text' },
              ],
            },
          ],
        },
      ],
      params: [],
      placeholders: [],
    };
    const out = renderComponentFile(nested, {
      propsImport: 'lib/component-props',
      sitecorePackage: '@sitecore-content-sdk/nextjs',
      useDatasourceCheck: false,
      styling: 'none',
    });
    expect(out).toContain("import { ColumnSliderProps, TabsItem, ColumnSliderItemsItem } from './ColumnSlider.types';");
    expect(out).toContain('{fields.Tabs?.map((item: TabsItem) => (');
    expect(out).toContain("{item.fields['Column Slider Items']?.map((itemItem: ColumnSliderItemsItem) => (");
    expect(out).toContain("<Text tag=\"span\" field={itemItem.fields['Slide Title']} />");
  });

  it('uses bracket access for field and param names with spaces', () => {
    const spacedContract: ComponentContract = {
      name: 'Promo',
      fields: [
        { name: 'Button Link', tsType: 'LinkField', optional: false, renderer: 'Link', sitecoreImport: 'Link' },
      ],
      params: ['Some Param'],
      placeholders: [],
    };
    const out = renderComponentFile(spacedContract, {
      propsImport: 'lib/component-props',
      sitecorePackage: '@sitecore-content-sdk/nextjs',
      useDatasourceCheck: false,
      styling: 'none',
    });
    expect(out).toContain("<SitecoreLink field={fields['Button Link']} />");
    expect(out).toContain("data-some-param={params?.['Some Param']}");
    expect(out).not.toContain('fields.Button Link');
  });

  it('omits the params destructure when there are no params', () => {
    const noParams: ComponentContract = {
      name: 'Bare',
      fields: [
        { name: 'heading', tsType: 'Field<string>', optional: false, renderer: 'Text', sitecoreImport: 'Text' },
      ],
      params: [],
      placeholders: [],
    };
    const out = renderComponentFile(noParams, {
      propsImport: 'lib/component-props',
      sitecorePackage: '@sitecore-content-sdk/nextjs',
      useDatasourceCheck: false,
      styling: 'none',
    });
    expect(out).toContain('const Bare = ({ fields }: BareProps) => {');
    expect(out).not.toContain('params');
  });

  it('renders placeholders with the Placeholder component and rendering prop', () => {
    const withPlaceholders: ComponentContract = {
      name: 'Container',
      fields: [],
      params: [],
      placeholders: ['container-1', 'container-2'],
    };
    const out = renderComponentFile(withPlaceholders, {
      propsImport: 'lib/component-props',
      sitecorePackage: '@sitecore-content-sdk/nextjs',
      useDatasourceCheck: false,
      styling: 'none',
    });
    expect(out).toContain('Placeholder');
    expect(out).toContain('const Container = ({ fields, rendering }: ContainerProps) => {');
    expect(out).toContain('<Placeholder name="container-1" rendering={rendering} />');
    expect(out).toContain('<Placeholder name="container-2" rendering={rendering} />');
  });

  it('applies CSS module classes and import when styling is css', () => {
    const out = renderComponentFile(contract, {
      propsImport: 'lib/component-props',
      sitecorePackage: '@sitecore-content-sdk/nextjs',
      useDatasourceCheck: false,
      styling: 'css',
    });
    expect(out).toContain("import styles from './Hero.module.css';");
    expect(out).toContain('<section className={styles.root}');
  });

  it('applies tailwind utility classes when styling is tailwind', () => {
    const out = renderComponentFile(contract, {
      propsImport: 'lib/component-props',
      sitecorePackage: '@sitecore-content-sdk/nextjs',
      useDatasourceCheck: false,
      styling: 'tailwind',
    });
    expect(out).toContain('<section className="flex flex-col gap-4"');
    expect(out).not.toContain('.module.css');
  });

  it('renders a number field with <Text> and does not make it the h1 heading', () => {
    const numberContract: ComponentContract = {
      name: 'Stat',
      fields: [
        { name: 'count', tsType: 'Field<number>', optional: false, renderer: 'Text', sitecoreImport: 'Text' },
        { name: 'label', tsType: 'Field<string>', optional: false, renderer: 'Text', sitecoreImport: 'Text' },
      ],
      params: [],
      placeholders: [],
    };
    const out = renderComponentFile(numberContract, {
      propsImport: 'lib/component-props',
      sitecorePackage: '@sitecore-content-sdk/nextjs',
      useDatasourceCheck: false,
      styling: 'none',
    });
    expect(out).toContain('<Text tag="span" field={fields.count} />');
    // the string field, not the number, becomes the h1
    expect(out).toContain('<Text tag="h1" field={fields.label} />');
    expect(out).not.toContain('{/* TODO: render field "count"');
  });

  it('omits sitecore content sdk import when no renderers and no datasource check', () => {
    const rawOnlyContract: ComponentContract = {
      name: 'SimpleBox',
      fields: [
        { name: 'title', tsType: 'Field<string>', optional: true, renderer: 'raw', sitecoreImport: null },
      ],
      params: [],
      placeholders: [],
    };
    const out = renderComponentFile(rawOnlyContract, {
      propsImport: 'lib/component-props',
      sitecorePackage: '@sitecore-content-sdk/nextjs',
      useDatasourceCheck: false,
      styling: 'none',
    });
    expect(out).not.toContain("from '@sitecore-content-sdk/nextjs'");
    expect(out).toContain("import { SimpleBoxProps } from './SimpleBox.types';");
  });

  const variantContract: ComponentContract = {
    name: 'GridModule',
    fields: [
      { name: 'Title', tsType: 'Field<string>', optional: false, renderer: 'Text', sitecoreImport: 'Text' },
    ],
    params: [],
    placeholders: [],
  };

  it('emits a shared inner component and named export wrappers in variant mode', () => {
    const out = renderComponentFile(variantContract, {
      propsImport: 'lib/component-props',
      sitecorePackage: '@sitecore-content-sdk/nextjs',
      useDatasourceCheck: true,
      styling: 'none',
      variants: ['Default', 'ThreeCard'],
    });
    expect(out).toContain('const GridModuleVariant = ({ fields, variant }: GridModuleProps & { variant: string }) => {');
    expect(out).toContain('<section data-variant={variant}>');
    expect(out).toContain('<Text tag="h1" field={fields.Title} />');
    expect(out).toContain('const renderDefault = (props: GridModuleProps) => <GridModuleVariant {...props} variant="Default" />;');
    expect(out).toContain('export const Default = withDatasourceCheck()<GridModuleProps>(renderDefault);');
    expect(out).toContain('export const ThreeCard = withDatasourceCheck()<GridModuleProps>(renderThreeCard);');
    expect(out).not.toContain('export default');
  });

  it('emits plain variant exports when datasource check is disabled', () => {
    const out = renderComponentFile(variantContract, {
      propsImport: 'lib/component-props',
      sitecorePackage: '@sitecore-content-sdk/nextjs',
      useDatasourceCheck: false,
      styling: 'none',
      variants: ['Default', 'ThreeCard'],
    });
    expect(out).toContain('export const Default = (props: GridModuleProps) => <GridModuleVariant {...props} variant="Default" />;');
    expect(out).toContain('export const ThreeCard = (props: GridModuleProps) => <GridModuleVariant {...props} variant="ThreeCard" />;');
    expect(out).not.toContain('withDatasourceCheck');
  });

  it('renders a single default-export component when no variants are given', () => {
    const out = renderComponentFile(variantContract, {
      propsImport: 'lib/component-props',
      sitecorePackage: '@sitecore-content-sdk/nextjs',
      useDatasourceCheck: true,
      styling: 'none',
    });
    expect(out).toContain('export default withDatasourceCheck()<GridModuleProps>(GridModule);');
    expect(out).not.toContain('Variant');
  });

  it('passes params through and keeps param data-attrs in variant mode', () => {
    const variantWithParam: ComponentContract = {
      name: 'GridParam',
      fields: [
        { name: 'Title', tsType: 'Field<string>', optional: false, renderer: 'Text', sitecoreImport: 'Text' },
      ],
      params: ['theme'],
      placeholders: [],
    };
    const out = renderComponentFile(variantWithParam, {
      propsImport: 'lib/component-props',
      sitecorePackage: '@sitecore-content-sdk/nextjs',
      useDatasourceCheck: false,
      styling: 'none',
      variants: ['Default', 'ThreeCard'],
    });
    // inner component destructures params, and the section keeps both data-variant and the param attr
    expect(out).toContain('const GridParamVariant = ({ fields, params, variant }: GridParamProps & { variant: string }) => {');
    expect(out).toContain('<section data-variant={variant} data-theme={params?.theme}>');
  });
});
