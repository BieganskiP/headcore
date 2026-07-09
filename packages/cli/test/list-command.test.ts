import { describe, it, expect } from 'vitest';
import { runList } from '../src/commands/list.js';

describe('runList', () => {
  it('lists Tabs with its description', () => {
    const out = runList();
    expect(out).toContain('Tabs');
    expect(out).toContain('tabbed container');
  });

  it('lists Accordion with its description', () => {
    const out = runList();
    expect(out).toContain('Accordion');
    expect(out).toContain('accordion');
  });

  it('lists Breadcrumbs with its description', () => {
    const out = runList();
    expect(out).toContain('Breadcrumbs');
    expect(out).toContain('context-driven breadcrumb trail');
  });
});
