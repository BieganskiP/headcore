import { describe, it, expect } from 'vitest';
import { renderStoryFile } from '../src/codegen/story-file.js';
import { generateFiles } from '../src/codegen/index.js';
import type { ComponentContract, RenderingNode } from '../src/types.js';

const baseConfig = {
  componentPath: 'src/components/sitecore',
  componentFolder: true,
  titlePrefix: 'Sitecore',
  decoratorPath: '.storybook/sitecore-decorator.tsx',
};

describe('renderStoryFile', () => {
  it('renders a leaf-component story with no component map', () => {
    const out = renderStoryFile('Tab', undefined, baseConfig);
    expect(out).toContain("import type { Meta, StoryObj } from '@storybook/react';");
    expect(out).toContain("import Tab from './Tab';");
    expect(out).toContain("import mock from './Tab.mock.json';");
    expect(out).toContain("import { withSitecore } from '../../../../.storybook/sitecore-decorator';");
    expect(out).toContain("title: 'Sitecore/Tab',");
    expect(out).toContain('decorators: [withSitecore()],');
    expect(out).toContain('satisfies Meta<typeof Tab>');
    expect(out).toContain("args: { ...mock, rendering: { componentName: 'Tab', dataSource: 'storybook', ...mock } },");
  });

  it('imports placeholder children as siblings and passes a component map', () => {
    const placeholders = {
      'headcore-carousel': [
        { componentName: 'CarouselSlide' },
        { componentName: 'CarouselSlide' },
      ],
    };
    const out = renderStoryFile('Carousel', placeholders, baseConfig);
    expect(out).toContain("import CarouselSlide from '../CarouselSlide/CarouselSlide';");
    expect(out.match(/import CarouselSlide/g)).toHaveLength(1); // deduped
    expect(out).toContain('decorators: [withSitecore({ CarouselSlide })],');
  });

  it('collects grandchildren recursively into the component map', () => {
    const placeholders = {
      outer: [
        {
          componentName: 'CarouselSlide',
          placeholders: { inner: [{ componentName: 'Hero' }] },
        },
      ],
    };
    const out = renderStoryFile('Carousel', placeholders, baseConfig);
    expect(out).toContain('withSitecore({ CarouselSlide, Hero })');
  });

  it('uses flat sibling imports and a shallower decorator path when componentFolder is false', () => {
    const out = renderStoryFile(
      'Carousel',
      { slot: [{ componentName: 'CarouselSlide' }] },
      { ...baseConfig, componentFolder: false },
    );
    expect(out).toContain("import CarouselSlide from './CarouselSlide';");
    expect(out).toContain("import { withSitecore } from '../../../.storybook/sitecore-decorator';");
  });

  it('drops the prefix from the title when titlePrefix is empty', () => {
    const out = renderStoryFile('Tab', undefined, { ...baseConfig, titlePrefix: '' });
    expect(out).toContain("title: 'Tab',");
  });

  it('excludes the component itself from its own map', () => {
    const out = renderStoryFile('Nested', { slot: [{ componentName: 'Nested' }] }, baseConfig);
    expect(out).toContain('withSitecore()');
  });
});

const node: RenderingNode = {
  componentName: 'Hero',
  fields: { heading: { value: 'About' } },
  params: {},
  placeholders: {},
};

const contract: ComponentContract = {
  name: 'Hero',
  fields: [{ name: 'heading', tsType: 'Field<string>', optional: false, renderer: 'Text', sitecoreImport: 'Text' }],
  params: [],
  placeholders: [],
};

const codegenConfig = {
  componentPath: 'src/components',
  componentFolder: false,
  componentPropsImport: 'lib/component-props',
  sitecorePackage: '@sitecore-content-sdk/nextjs',
  useDatasourceCheck: true,
  generateMocks: false,
  styling: 'none' as const,
  fieldTypeOverrides: {},
  i18nPath: 'src/lib/i18n',
  i18nPackage: 'next-localization',
};

describe('generateFiles with storybook', () => {
  it('emits a story and forces the mock even when generateMocks is off', () => {
    const files = generateFiles(contract, node, {
      ...codegenConfig,
      storybook: { enabled: true, titlePrefix: 'Sitecore', decoratorPath: '.storybook/sitecore-decorator.tsx' },
    });
    const paths = files.map((f) => f.path);
    expect(paths).toContain('src/components/Hero.stories.tsx');
    expect(paths).toContain('src/components/Hero.mock.json');
    const story = files.find((f) => f.path.endsWith('.stories.tsx'))!.contents;
    expect(story).toContain("title: 'Sitecore/Hero',");
  });

  it('emits no story when storybook is absent or disabled', () => {
    const withoutSection = generateFiles(contract, node, codegenConfig);
    const disabled = generateFiles(contract, node, {
      ...codegenConfig,
      storybook: { enabled: false, titlePrefix: 'Sitecore', decoratorPath: '.storybook/sitecore-decorator.tsx' },
    });
    expect(withoutSection.some((f) => f.path.endsWith('.stories.tsx'))).toBe(false);
    expect(disabled.some((f) => f.path.endsWith('.stories.tsx'))).toBe(false);
    expect(withoutSection.some((f) => f.path.endsWith('.mock.json'))).toBe(false);
  });
});
