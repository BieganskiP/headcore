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
