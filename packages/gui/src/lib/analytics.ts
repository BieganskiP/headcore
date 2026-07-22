import type { GuiRouteDetail, GuiRegistryEntry, GuiLayoutNode } from './types';

export interface ComponentUsage {
  name: string;
  /** Number of routes containing this component (each route counted once, however many instances it has). */
  count: number;
  routes: string[];
  inRegistry: boolean;
}

export function usageCounts(routes: GuiRouteDetail[], registry: GuiRegistryEntry[]): ComponentUsage[] {
  const registryNames = new Set(registry.map((r) => r.componentName));
  const byName = new Map<string, string[]>();
  for (const route of routes) {
    for (const name of route.components) {
      const list = byName.get(name) ?? [];
      list.push(route.routePath);
      byName.set(name, list);
    }
  }
  return [...byName.entries()]
    .map(([name, routePaths]) => ({
      name,
      count: routePaths.length,
      routes: [...routePaths].sort((a, b) => a.localeCompare(b)),
      inRegistry: registryNames.has(name),
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

export interface RenderingInstance {
  /** Placeholder path down to the rendering, e.g. "headless-main[0] › tabs[2]". */
  path: string;
  node: GuiLayoutNode;
}

export interface RouteInstances {
  route: GuiRouteDetail;
  instances: RenderingInstance[];
}

/** Every rendering of a component per route, with its placeholder path — sorted by route path. */
export function componentInstances(routes: GuiRouteDetail[], componentName: string): RouteInstances[] {
  const out: RouteInstances[] = [];
  for (const route of routes) {
    const instances: RenderingInstance[] = [];
    const walk = (placeholders: Record<string, GuiLayoutNode[]>, prefix: string): void => {
      for (const [key, nodes] of Object.entries(placeholders)) {
        nodes.forEach((n, i) => {
          const path = `${prefix}${key}[${i}]`;
          if (n.componentName === componentName) instances.push({ path, node: n });
          walk(n.placeholders, `${path} › `);
        });
      }
    };
    walk(route.layout, '');
    if (instances.length > 0) out.push({ route, instances });
  }
  return out.sort((a, b) => a.route.routePath.localeCompare(b.route.routePath));
}

export interface RegistryCoverage {
  used: GuiRegistryEntry[];
  unused: GuiRegistryEntry[];
}

export function registryCoverage(routes: GuiRouteDetail[], registry: GuiRegistryEntry[]): RegistryCoverage {
  const onPages = new Set(routes.flatMap((r) => r.components));
  const used: GuiRegistryEntry[] = [];
  const unused: GuiRegistryEntry[] = [];
  for (const entry of registry) (onPages.has(entry.componentName) ? used : unused).push(entry);
  return { used, unused };
}

export interface RouteTreeNode {
  segment: string;
  /** Full path of this node, even when no route exists here (intermediate segment). */
  routePath: string;
  route?: GuiRouteDetail;
  children: RouteTreeNode[];
}

export function buildRouteTree(routes: GuiRouteDetail[]): RouteTreeNode {
  const root: RouteTreeNode = { segment: '/', routePath: '/', children: [] };
  const index = new Map<string, RouteTreeNode>([['/', root]]);
  for (const route of routes) {
    if (route.routePath === '/') {
      root.route = route;
      continue;
    }
    let node = root;
    let path = '';
    for (const segment of route.routePath.split('/').filter(Boolean)) {
      path += '/' + segment;
      let child = index.get(path);
      if (!child) {
        child = { segment, routePath: path, children: [] };
        index.set(path, child);
        node.children.push(child);
      }
      node = child;
    }
    node.route = route;
  }
  const sortChildren = (n: RouteTreeNode): void => {
    n.children.sort((a, b) => a.segment.localeCompare(b.segment));
    for (const c of n.children) sortChildren(c);
  };
  sortChildren(root);
  return root;
}

/** Number of real routes in the subtree below this node (the node's own route is not counted). */
export function routeCount(node: RouteTreeNode): number {
  return node.children.reduce((acc, c) => acc + (c.route ? 1 : 0) + routeCount(c), 0);
}

export interface FreshnessBuckets {
  week: number;
  month: number;
  quarter: number;
  older: number;
  unknown: number;
}

export function freshness(routes: GuiRouteDetail[], today: Date): FreshnessBuckets {
  const buckets: FreshnessBuckets = { week: 0, month: 0, quarter: 0, older: 0, unknown: 0 };
  for (const r of routes) {
    if (!r.updatedAt) {
      buckets.unknown++;
      continue;
    }
    const ms = new Date(`${r.updatedAt}T00:00:00Z`).getTime();
    const days = Math.floor((today.getTime() - ms) / 86_400_000);
    // Malformed dates (NaN) and future dates are data anomalies, not freshness signals.
    if (Number.isNaN(days) || days < 0) {
      buckets.unknown++;
      continue;
    }
    if (days <= 7) buckets.week++;
    else if (days <= 30) buckets.month++;
    else if (days <= 90) buckets.quarter++;
    else buckets.older++;
  }
  return buckets;
}
