import { describe, it, expect } from 'vitest';
import { renderSitecoreInstructions } from '../src/registry/instructions.js';
import type { ComponentManifest } from '../src/registry/manifest.js';

const manifest: ComponentManifest = {
  name: 'Tabs',
  description: 'A tabbed container.',
  files: ['Tabs.tsx'],
  dependencies: [],
  registryDependencies: [],
  sitecore: {
    template: { name: 'Tabs', fields: [{ name: 'Heading', type: 'Single-Line Text' }] },
    rendering: { componentName: 'Tabs', type: 'JSON Rendering' },
    placeholders: [
      { key: 'tabs-1', dynamic: false, allowedRenderings: ['*'] },
      { key: 'tabs-2', dynamic: false, allowedRenderings: ['*'] },
    ],
    params: [{ name: 'Tab1Label' }, { name: 'Tab2Label' }],
  },
};

describe('renderSitecoreInstructions', () => {
  it('includes the template, fields, rendering, placeholders and params', () => {
    const md = renderSitecoreInstructions(manifest);
    expect(md).toContain('# Sitecore setup for Tabs');
    expect(md).toContain('Heading (Single-Line Text)');
    expect(md).toContain('JSON Rendering');
    expect(md).toContain('tabs-1');
    expect(md).toContain('tabs-2');
    expect(md).toContain('Tab1Label');
  });

  it('notes when there are no datasource fields', () => {
    const noFields: ComponentManifest = {
      ...manifest,
      sitecore: { ...manifest.sitecore, template: { name: 'Tabs', fields: [] } },
    };
    expect(renderSitecoreInstructions(noFields)).toContain('No datasource fields');
  });

  it('renders a typed param with its type and description', () => {
    const typed: ComponentManifest = {
      ...manifest,
      sitecore: {
        ...manifest.sitecore,
        params: [
          { name: 'AllowMultiple', type: 'Checkbox', description: 'Allow multiple panels to be open at once.' },
        ],
      },
    };
    const md = renderSitecoreInstructions(typed);
    expect(md).toContain('AllowMultiple (Checkbox) — Allow multiple panels to be open at once.');
  });

  it('still says None when there are no params', () => {
    const noParams: ComponentManifest = {
      ...manifest,
      sitecore: { ...manifest.sitecore, params: [] },
    };
    expect(renderSitecoreInstructions(noParams)).toContain('None.');
  });
});
