import { describe, it, expect } from 'vitest';
import { usageCounts, registryCoverage, buildRouteTree, routeCount, freshness } from '../src/lib/analytics';
import type { GuiRouteDetail, GuiRegistryEntry } from '../src/lib/types';

function route(routePath: string, components: string[], updatedAt: string | null = null): GuiRouteDetail {
  return { routePath, name: routePath, updatedAt, components, layout: {} };
}

const registry: GuiRegistryEntry[] = [
  { name: 'Tabs', componentName: 'Tabs', description: 'tabs' },
  { name: 'Breadcrumbs', componentName: 'Breadcrumbs', description: 'crumbs' },
];

describe('usageCounts', () => {
  it('counts routes per component, sorted by count desc then name', () => {
    const usage = usageCounts(
      [route('/', ['Hero', 'Tabs']), route('/about', ['Hero']), route('/contact', ['Aside'])],
      registry,
    );
    expect(usage).toEqual([
      { name: 'Hero', count: 2, routes: ['/', '/about'], inRegistry: false },
      { name: 'Aside', count: 1, routes: ['/contact'], inRegistry: false },
      { name: 'Tabs', count: 1, routes: ['/'], inRegistry: true },
    ]);
  });

  it('returns an empty list for no routes', () => {
    expect(usageCounts([], registry)).toEqual([]);
  });
});

describe('registryCoverage', () => {
  it('splits registry entries into used and unused', () => {
    const { used, unused } = registryCoverage([route('/', ['Tabs'])], registry);
    expect(used.map((e) => e.name)).toEqual(['Tabs']);
    expect(unused.map((e) => e.name)).toEqual(['Breadcrumbs']);
  });
});

describe('buildRouteTree', () => {
  it('nests routes by path segment with intermediate nodes', () => {
    const tree = buildRouteTree([
      route('/', ['Hero']),
      route('/news/2026/launch', []),
      route('/news', []),
    ]);
    expect(tree.route?.routePath).toBe('/');
    expect(tree.children).toHaveLength(1);
    const news = tree.children[0];
    expect(news.segment).toBe('news');
    expect(news.route?.routePath).toBe('/news');
    const y2026 = news.children[0];
    expect(y2026.segment).toBe('2026');
    expect(y2026.route).toBeUndefined(); // intermediate node without its own route
    expect(y2026.children[0].route?.routePath).toBe('/news/2026/launch');
    expect(routeCount(tree)).toBe(2); // root not counted by routeCount
  });
});

describe('freshness', () => {
  it('buckets updatedAt by age', () => {
    const today = new Date('2026-07-21T00:00:00Z');
    const buckets = freshness([
      route('/a', [], '2026-07-20'), // 1 day → week
      route('/b', [], '2026-07-01'), // 20 days → month
      route('/c', [], '2026-05-01'), // 81 days → quarter
      route('/d', [], '2025-01-01'), // ancient → older
      route('/e', [], null),         // unknown
    ], today);
    expect(buckets).toEqual({ week: 1, month: 1, quarter: 1, older: 1, unknown: 1 });
  });

  it('sends malformed and future dates to unknown', () => {
    const today = new Date('2026-07-21T00:00:00Z');
    const buckets = freshness([
      route('/x', [], 'not-a-date'),
      route('/y', [], '2026-08-01'), // future
    ], today);
    expect(buckets).toEqual({ week: 0, month: 0, quarter: 0, older: 0, unknown: 2 });
  });

  it('buckets exact boundary ages inclusively', () => {
    const today = new Date('2026-07-21T00:00:00Z');
    const buckets = freshness([
      route('/w', [], '2026-07-14'), // exactly 7 days → week
      route('/m', [], '2026-06-21'), // exactly 30 days → month
      route('/q', [], '2026-04-22'), // exactly 90 days → quarter
    ], today);
    expect(buckets).toEqual({ week: 1, month: 1, quarter: 1, older: 0, unknown: 0 });
  });
});
