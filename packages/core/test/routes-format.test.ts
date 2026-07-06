import { describe, it, expect } from 'vitest';
import { filterRoutes, sortRoutes, renderRoutesTable, renderRoutesJson } from '../src/routes/format.js';
import type { RouteInfo } from '../src/edge/client.js';

const routes: RouteInfo[] = [
  { routePath: '/products', name: 'Products', updatedAt: '2026-07-04' },
  { routePath: '/', name: 'Home', updatedAt: '2026-06-28' },
  { routePath: '/about', name: 'About Us', updatedAt: null },
  { routePath: '/products/widget-x', name: 'Widget X', updatedAt: '2026-07-04' },
];

describe('filterRoutes', () => {
  it('keeps routes whose path contains the substring, case-insensitively', () => {
    expect(filterRoutes(routes, '/PRODUCTS').map((r) => r.routePath))
      .toEqual(['/products', '/products/widget-x']);
  });

  it('returns everything when the filter is undefined', () => {
    expect(filterRoutes(routes, undefined)).toEqual(routes);
  });

  it('returns an empty array when nothing matches', () => {
    expect(filterRoutes(routes, '/nope')).toEqual([]);
  });
});

describe('sortRoutes', () => {
  it('sorts by path ascending', () => {
    expect(sortRoutes(routes, 'path').map((r) => r.routePath))
      .toEqual(['/', '/about', '/products', '/products/widget-x']);
  });

  it('sorts by updated newest-first, null last, ties broken by path', () => {
    expect(sortRoutes(routes, 'updated').map((r) => r.routePath))
      .toEqual(['/products', '/products/widget-x', '/', '/about']);
  });

  it('does not mutate its input', () => {
    const copy = [...routes];
    sortRoutes(routes, 'path');
    expect(routes).toEqual(copy);
  });
});

describe('renderRoutesTable', () => {
  it('renders aligned columns, a blank cell for null updatedAt, and a count footer', () => {
    const out = renderRoutesTable(sortRoutes(routes, 'path'), 'en');
    const lines = out.split('\n');
    expect(lines[0]).toMatch(/^ROUTE\s+NAME\s+UPDATED$/);
    expect(lines[1]).toMatch(/^\/\s+Home\s+2026-06-28$/);
    // /about has no updated date: the row simply ends after the name.
    expect(lines[2]).toMatch(/^\/about\s+About Us$/);
    expect(out.endsWith('4 routes (lang: en)')).toBe(true);
    // All rows start their NAME column at the same offset.
    expect(lines[1].indexOf('Home')).toBe(lines[2].indexOf('About Us'));
  });

  it('uses singular "route" for one result', () => {
    const out = renderRoutesTable([routes[1]], 'en');
    expect(out.endsWith('1 route (lang: en)')).toBe(true);
  });

  it('renders only the zero-count footer when there are no routes', () => {
    expect(renderRoutesTable([], 'da')).toBe('0 routes (lang: da)');
  });
});

describe('renderRoutesJson', () => {
  it('renders a JSON array of routePath/name/updatedAt', () => {
    const parsed = JSON.parse(renderRoutesJson([routes[1], routes[2]]));
    expect(parsed).toEqual([
      { routePath: '/', name: 'Home', updatedAt: '2026-06-28' },
      { routePath: '/about', name: 'About Us', updatedAt: null },
    ]);
  });

  it('renders an empty array for no routes', () => {
    expect(renderRoutesJson([])).toBe('[]');
  });
});
