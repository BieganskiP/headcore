import { describe, it, expect } from 'vitest';
import { usageCounts, registryCoverage, buildRouteTree, routeCount, freshness, freshnessBucket, componentInstances, composition, routeComplexity } from '../src/lib/analytics';
import type { GuiRouteDetail, GuiRegistryEntry, GuiLayoutNode } from '../src/lib/types';

function route(routePath: string, components: string[], updatedAt: string | null = null): GuiRouteDetail {
  return { routePath, name: routePath, updatedAt, components, layout: {} };
}

function layoutNode(componentName: string, over: Partial<GuiLayoutNode> = {}): GuiLayoutNode {
  return { componentName, fields: {}, placeholders: {}, ...over };
}

const registry: GuiRegistryEntry[] = [
  { name: 'Tabs', componentName: 'Tabs', description: 'tabs', placeholders: [{ key: 'headcore-tabs', dynamic: false, allowedRenderings: ['Tab'] }] },
  { name: 'Breadcrumbs', componentName: 'Breadcrumbs', description: 'crumbs', placeholders: [] },
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

describe('componentInstances', () => {
  it('finds every rendering per route with its placeholder path, sorted by route', () => {
    const hero = layoutNode('Hero', { dataSource: '{GUID-1}', fields: { Title: { value: 'Big' } } });
    const nestedHero = layoutNode('Hero', { fields: { Title: { value: 'Inner' } } });
    const routes: GuiRouteDetail[] = [
      {
        ...route('/b', ['Card', 'Hero']),
        layout: { main: [layoutNode('Card', { placeholders: { inner: [nestedHero] } })] },
      },
      { ...route('/a', ['Hero']), layout: { main: [hero, layoutNode('Aside')] } },
      { ...route('/c', ['Aside']), layout: { main: [layoutNode('Aside')] } },
    ];

    expect(componentInstances(routes, 'Hero')).toEqual([
      { route: routes[1], instances: [{ path: 'main[0]', node: hero }] },
      { route: routes[0], instances: [{ path: 'main[0] › inner[0]', node: nestedHero }] },
    ]);
  });

  it('returns an empty list when the component is nowhere in the layouts', () => {
    expect(componentInstances([route('/', ['Hero'])], 'Hero')).toEqual([]);
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

describe('composition', () => {
  it('aggregates containment edges with counts and placeholder keys across routes', () => {
    const routes: GuiRouteDetail[] = [
      {
        ...route('/', ['Tabs', 'Tab']),
        layout: {
          main: [
            layoutNode('Tabs', { placeholders: { 'headcore-tabs': [layoutNode('Tab'), layoutNode('Tab')] } }),
          ],
        },
      },
      {
        ...route('/about', ['Tabs', 'Tab', 'Hero']),
        layout: {
          main: [
            layoutNode('Hero'),
            layoutNode('Tabs', { placeholders: { 'headcore-tabs': [layoutNode('Tab')], other: [layoutNode('Tab')] } }),
          ],
        },
      },
    ];

    const { nodes, edges } = composition(routes);
    expect(edges).toEqual([
      { parent: 'Tabs', child: 'Tab', count: 4, placeholders: ['headcore-tabs', 'other'] },
    ]);
    expect(nodes).toEqual([
      { name: 'Tabs', depth: 0, instances: 2, routes: 2 },
      { name: 'Hero', depth: 0, instances: 1, routes: 1 },
      { name: 'Tab', depth: 1, instances: 4, routes: 2 },
    ]);
  });

  it('keeps the shallowest depth when a component appears both top-level and nested', () => {
    const routes: GuiRouteDetail[] = [
      { ...route('/a', ['Hero']), layout: { main: [layoutNode('Hero')] } },
      {
        ...route('/b', ['Card', 'Hero']),
        layout: { main: [layoutNode('Card', { placeholders: { inner: [layoutNode('Hero')] } })] },
      },
    ];
    const { nodes, edges } = composition(routes);
    expect(nodes.find((n) => n.name === 'Hero')).toEqual({ name: 'Hero', depth: 0, instances: 2, routes: 2 });
    expect(edges).toEqual([{ parent: 'Card', child: 'Hero', count: 1, placeholders: ['inner'] }]);
  });

  it('returns empty results for routes without layouts', () => {
    expect(composition([route('/', [])])).toEqual({ nodes: [], edges: [] });
  });
});

describe('routeComplexity', () => {
  it('counts every rendering and the deepest nesting, heaviest route first', () => {
    const routes: GuiRouteDetail[] = [
      { ...route('/light', ['Hero']), layout: { main: [layoutNode('Hero')] } },
      {
        ...route('/heavy', ['Tabs', 'Tab', 'Card']),
        layout: {
          main: [
            layoutNode('Tabs', {
              placeholders: { tabs: [layoutNode('Tab', { placeholders: { inner: [layoutNode('Card')] } }), layoutNode('Tab')] },
            }),
          ],
        },
      },
      route('/empty', []),
    ];

    expect(routeComplexity(routes).map((c) => ({ path: c.route.routePath, renderings: c.renderings, maxDepth: c.maxDepth }))).toEqual([
      { path: '/heavy', renderings: 4, maxDepth: 3 },
      { path: '/light', renderings: 1, maxDepth: 1 },
      { path: '/empty', renderings: 0, maxDepth: 0 },
    ]);
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

  it('exposes the single-route bucket used by the routes freshness filter', () => {
    const today = new Date('2026-07-21T00:00:00Z');
    expect(freshnessBucket('2026-07-20', today)).toBe('week');
    expect(freshnessBucket('2024-01-01', today)).toBe('older');
    expect(freshnessBucket(null, today)).toBe('unknown');
    expect(freshnessBucket('2027-01-01', today)).toBe('unknown');
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
