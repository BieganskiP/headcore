import type { RouteInfo } from '../edge/client.js';

export type RouteSort = 'path' | 'updated';

export function filterRoutes(routes: RouteInfo[], substring: string | undefined): RouteInfo[] {
  if (!substring) return routes;
  const needle = substring.toLowerCase();
  return routes.filter((r) => r.routePath.toLowerCase().includes(needle));
}

export function sortRoutes(routes: RouteInfo[], order: RouteSort): RouteInfo[] {
  const sorted = [...routes];
  sorted.sort((a, b) => {
    if (order === 'updated' && a.updatedAt !== b.updatedAt) {
      if (a.updatedAt === null) return 1;
      if (b.updatedAt === null) return -1;
      return b.updatedAt.localeCompare(a.updatedAt);
    }
    return a.routePath.localeCompare(b.routePath);
  });
  return sorted;
}

export function renderRoutesTable(routes: RouteInfo[], lang: string): string {
  const footer = `${routes.length} route${routes.length === 1 ? '' : 's'} (lang: ${lang})`;
  if (routes.length === 0) return footer;

  const rows = [
    { routePath: 'ROUTE', name: 'NAME', updatedAt: 'UPDATED' },
    ...routes.map((r) => ({ routePath: r.routePath, name: r.name, updatedAt: r.updatedAt ?? '' })),
  ];
  const pathWidth = Math.max(...rows.map((r) => r.routePath.length));
  const nameWidth = Math.max(...rows.map((r) => r.name.length));
  const lines = rows.map((r) =>
    `${r.routePath.padEnd(pathWidth)}  ${r.name.padEnd(nameWidth)}  ${r.updatedAt}`.trimEnd(),
  );
  return `${lines.join('\n')}\n\n${footer}`;
}

export function renderRoutesJson(routes: RouteInfo[]): string {
  if (routes.length === 0) return '[]';
  return JSON.stringify(
    routes.map((r) => ({ routePath: r.routePath, name: r.name, updatedAt: r.updatedAt })),
    null,
    2,
  );
}
