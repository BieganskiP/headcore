import { describe, it, expect } from 'vitest';
import { buildSearchIndex, searchEntries } from '../src/lib/search';
import type { GuiState } from '../src/lib/types';

const state: GuiState = {
  site: 'demo',
  language: 'en',
  fetchedAt: '2026-07-22T00:00:00.000Z',
  routes: [
    { routePath: '/', name: 'Home', updatedAt: null, components: ['Hero'], layout: {} },
    { routePath: '/about', name: 'About us', updatedAt: null, components: ['Hero', 'Tabs'], layout: {} },
  ],
  registry: [
    { name: 'Tabs', componentName: 'Tabs', description: 'tabs', placeholders: [] },
    { name: 'Carousel', componentName: 'Carousel', description: 'slides', placeholders: [] },
  ],
  dictionary: [{ key: 'nav/home', value: 'Home' }],
};

describe('buildSearchIndex', () => {
  it('indexes routes, used components, unused registry components, and dictionary keys', () => {
    const index = buildSearchIndex(state);
    expect(index).toEqual([
      { kind: 'route', label: '/', detail: 'Home', view: { view: 'inspector', route: '/' } },
      { kind: 'route', label: '/about', detail: 'About us', view: { view: 'inspector', route: '/about' } },
      { kind: 'component', label: 'Hero', detail: '2 routes', view: { view: 'components', component: 'Hero' } },
      { kind: 'component', label: 'Tabs', detail: '1 route', view: { view: 'components', component: 'Tabs' } },
      { kind: 'component', label: 'Carousel', detail: 'in registry, unused', view: { view: 'components', component: 'Carousel' } },
      { kind: 'dictionary', label: 'nav/home', detail: 'Home', view: { view: 'dictionary', q: 'nav/home' } },
    ]);
  });
});

describe('searchEntries', () => {
  const index = buildSearchIndex(state);

  it('ranks label prefix over label substring over detail substring', () => {
    const results = searchEntries(index, 'home');
    expect(results.map((r) => `${r.kind}:${r.label}`)).toEqual([
      'dictionary:nav/home', // label substring
      'route:/',             // detail "Home"
    ]);
    expect(searchEntries(index, 'nav')[0].label).toBe('nav/home'); // prefix first
  });

  it('is case-insensitive', () => {
    expect(searchEntries(index, 'HERO').map((r) => r.label)).toEqual(['Hero']);
  });

  it('returns nothing for an empty or whitespace query', () => {
    expect(searchEntries(index, '')).toEqual([]);
    expect(searchEntries(index, '   ')).toEqual([]);
  });

  it('caps results at the limit', () => {
    expect(searchEntries(index, 'o', 2)).toHaveLength(2);
  });
});
