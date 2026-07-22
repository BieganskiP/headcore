import type { GuiRouteDetail, GuiLayoutNode } from './types';

export interface DatasourceUsage {
  routePath: string;
  /** Placeholder path of the rendering, e.g. "main[0] › inner[1]". */
  path: string;
  componentName: string;
}

export interface DatasourceInfo {
  id: string;
  components: string[];
  routePaths: string[];
  usages: DatasourceUsage[];
  /** Referenced from more than one route — editing the item affects several pages. */
  shared: boolean;
}

/**
 * Groups every rendering by its dataSource id across all routes, so shared
 * content items (and their blast radius) are visible in one place.
 */
export function datasourceMap(routes: GuiRouteDetail[]): DatasourceInfo[] {
  const byId = new Map<string, DatasourceUsage[]>();

  for (const route of routes) {
    const walk = (placeholders: Record<string, GuiLayoutNode[]>, prefix: string): void => {
      for (const [key, nodes] of Object.entries(placeholders)) {
        nodes.forEach((n, i) => {
          const path = `${prefix}${key}[${i}]`;
          if (n.dataSource !== undefined && n.dataSource !== '') {
            const list = byId.get(n.dataSource) ?? [];
            list.push({ routePath: route.routePath, path, componentName: n.componentName });
            byId.set(n.dataSource, list);
          }
          walk(n.placeholders, `${path} › `);
        });
      }
    };
    walk(route.layout, '');
  }

  const result: DatasourceInfo[] = [];
  for (const [id, usages] of byId) {
    usages.sort((a, b) => a.routePath.localeCompare(b.routePath) || a.path.localeCompare(b.path));
    const components = [...new Set(usages.map((u) => u.componentName))].sort((a, b) => a.localeCompare(b));
    const routePaths = [...new Set(usages.map((u) => u.routePath))].sort((a, b) => a.localeCompare(b));
    result.push({ id, components, routePaths, usages, shared: routePaths.length > 1 });
  }

  return result.sort((a, b) =>
    b.routePaths.length - a.routePaths.length
    || b.usages.length - a.usages.length
    || a.id.localeCompare(b.id));
}
