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

export interface CompositionNode {
  name: string;
  /** Shallowest placeholder depth at which the component appears (top level = 0). */
  depth: number;
  /** Total renderings across all routes. */
  instances: number;
  /** Distinct routes containing the component. */
  routes: number;
}

export interface CompositionEdge {
  parent: string;
  child: string;
  /** Total parent→child containments across all routes. */
  count: number;
  /** Placeholder keys through which the containment happens, sorted. */
  placeholders: string[];
}

export interface Composition {
  nodes: CompositionNode[];
  edges: CompositionEdge[];
}

/**
 * Aggregate how components nest via placeholders across all route layouts.
 * Nodes are sorted by depth, then routes desc, then name; edges by parent/child.
 */
export function composition(routes: GuiRouteDetail[]): Composition {
  const nodes = new Map<string, { depth: number; instances: number; routes: Set<string> }>();
  const edges = new Map<string, { parent: string; child: string; count: number; placeholders: Set<string> }>();

  const visit = (node: GuiLayoutNode, depth: number, routePath: string): void => {
    const entry = nodes.get(node.componentName) ?? { depth, instances: 0, routes: new Set<string>() };
    entry.depth = Math.min(entry.depth, depth);
    entry.instances++;
    entry.routes.add(routePath);
    nodes.set(node.componentName, entry);
    for (const [key, children] of Object.entries(node.placeholders)) {
      for (const child of children) {
        // Newline separator: it cannot appear in a Sitecore component name.
        const id = `${node.componentName}\n${child.componentName}`;
        const edge = edges.get(id) ?? { parent: node.componentName, child: child.componentName, count: 0, placeholders: new Set<string>() };
        edge.count++;
        edge.placeholders.add(key);
        edges.set(id, edge);
        visit(child, depth + 1, routePath);
      }
    }
  };

  for (const route of routes) {
    for (const top of Object.values(route.layout)) {
      for (const node of top) visit(node, 0, route.routePath);
    }
  }

  return {
    nodes: [...nodes.entries()]
      .map(([name, n]) => ({ name, depth: n.depth, instances: n.instances, routes: n.routes.size }))
      .sort((a, b) => a.depth - b.depth || b.routes - a.routes || a.name.localeCompare(b.name)),
    edges: [...edges.values()]
      .map((e) => ({ parent: e.parent, child: e.child, count: e.count, placeholders: [...e.placeholders].sort() }))
      .sort((a, b) => a.parent.localeCompare(b.parent) || a.child.localeCompare(b.child)),
  };
}

export interface RouteComplexity {
  route: GuiRouteDetail;
  /** Total renderings on the page, nested included. */
  renderings: number;
  /** Deepest placeholder nesting (top level = 1, 0 for an empty layout). */
  maxDepth: number;
}

/** Per-route rendering count and nesting depth, heaviest first. */
export function routeComplexity(routes: GuiRouteDetail[]): RouteComplexity[] {
  return routes
    .map((route) => {
      let renderings = 0;
      let maxDepth = 0;
      const walk = (nodes: GuiLayoutNode[], depth: number): void => {
        for (const n of nodes) {
          renderings++;
          if (depth > maxDepth) maxDepth = depth;
          for (const children of Object.values(n.placeholders)) walk(children, depth + 1);
        }
      };
      for (const top of Object.values(route.layout)) walk(top, 1);
      return { route, renderings, maxDepth };
    })
    .sort((a, b) => b.renderings - a.renderings || a.route.routePath.localeCompare(b.route.routePath));
}

export interface FreshnessBuckets {
  week: number;
  month: number;
  quarter: number;
  older: number;
  unknown: number;
}

export type FreshKey = keyof FreshnessBuckets;

export const FRESH_KEYS: FreshKey[] = ['week', 'month', 'quarter', 'older', 'unknown'];

export function freshnessBucket(updatedAt: string | null, today: Date): FreshKey {
  if (!updatedAt) return 'unknown';
  const ms = new Date(`${updatedAt}T00:00:00Z`).getTime();
  const days = Math.floor((today.getTime() - ms) / 86_400_000);
  // Malformed dates (NaN) and future dates are data anomalies, not freshness signals.
  if (Number.isNaN(days) || days < 0) return 'unknown';
  if (days <= 7) return 'week';
  if (days <= 30) return 'month';
  if (days <= 90) return 'quarter';
  return 'older';
}

export function freshness(routes: GuiRouteDetail[], today: Date): FreshnessBuckets {
  const buckets: FreshnessBuckets = { week: 0, month: 0, quarter: 0, older: 0, unknown: 0 };
  for (const r of routes) buckets[freshnessBucket(r.updatedAt, today)]++;
  return buckets;
}
