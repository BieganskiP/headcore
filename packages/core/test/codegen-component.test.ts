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
      propsImport: '@/lib/component-props',
      sitecorePackage: '@sitecore-content-sdk/nextjs',
      useDatasourceCheck: true,
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
      propsImport: '@/lib/component-props',
      sitecorePackage: '@sitecore-content-sdk/nextjs',
      useDatasourceCheck: false,
    });
    expect(out).toContain('export default Hero;');
    expect(out).not.toContain('withDatasourceCheck');
  });

  it('generates data-variant attribute from params', () => {
    const out = renderComponentFile(contract, {
      propsImport: '@/lib/component-props',
      sitecorePackage: '@sitecore-content-sdk/nextjs',
      useDatasourceCheck: false,
    });
    expect(out).toContain('data-variant={params?.variant}');
  });

  it('generates kebab-case data attribute for camelCase param', () => {
    const camelContract: ComponentContract = {
      ...contract,
      params: ['backgroundColor'],
    };
    const out = renderComponentFile(camelContract, {
      propsImport: '@/lib/component-props',
      sitecorePackage: '@sitecore-content-sdk/nextjs',
      useDatasourceCheck: false,
    });
    expect(out).toContain('data-background-color={params?.backgroundColor}');
  });

  it('kebab-cases a param starting with a capital without a leading dash', () => {
    const sxaContract: ComponentContract = {
      ...contract,
      params: ['DynamicPlaceholderId'],
    };
    const out = renderComponentFile(sxaContract, {
      propsImport: '@/lib/component-props',
      sitecorePackage: '@sitecore-content-sdk/nextjs',
      useDatasourceCheck: false,
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
      propsImport: '@/lib/component-props',
      sitecorePackage: '@sitecore-content-sdk/nextjs',
      useDatasourceCheck: false,
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
      propsImport: '@/lib/component-props',
      sitecorePackage: '@sitecore-content-sdk/nextjs',
      useDatasourceCheck: false,
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
      propsImport: '@/lib/component-props',
      sitecorePackage: '@sitecore-content-sdk/nextjs',
      useDatasourceCheck: false,
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
      propsImport: '@/lib/component-props',
      sitecorePackage: '@sitecore-content-sdk/nextjs',
      useDatasourceCheck: false,
    });
    expect(out).toContain('const Bare = ({ fields }: BareProps) => {');
    expect(out).not.toContain('params');
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
      propsImport: '@/lib/component-props',
      sitecorePackage: '@sitecore-content-sdk/nextjs',
      useDatasourceCheck: false,
    });
    expect(out).not.toContain("from '@sitecore-content-sdk/nextjs'");
    expect(out).toContain("import { SimpleBoxProps } from './SimpleBox.types';");
  });
});
