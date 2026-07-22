import type { GuiRouteDetail, GuiLayoutNode } from './types';

export type LinkKind = 'internal' | 'external' | 'media' | 'special';

export interface PageLink {
  /** routePath of the page the link was found on. */
  from: string;
  /** Raw href as authored. */
  href: string;
  kind: LinkKind;
  /** Normalized route path for internal links, null otherwise. */
  target: string | null;
  /** '(page)' for route-level fields. */
  componentName: string;
  /** Placeholder path like "main[0] › inner[1]"; '' for route-level fields. */
  path: string;
  field: string;
}

export interface RouteEdge {
  from: string;
  to: string;
  count: number;
}

export interface LinkAnalysis {
  links: PageLink[];
  broken: PageLink[];
  orphans: string[];
  inbound: Map<string, number>;
  outbound: Map<string, number>;
  depths: Map<string, number>;
}

const HREF_RE = /href\s*=\s*(?:"([^"]*)"|'([^']*)')/gi;

export function classifyHref(href: string): LinkKind {
  if (href === '' || /^(mailto:|tel:|#|javascript:)/i.test(href)) return 'special';
  if (href.startsWith('/-/') || href.startsWith('/sitecore/')) return 'media';
  if (/^https?:\/\//i.test(href) || href.startsWith('//')) return 'external';
  if (href.startsWith('/')) return 'internal';
  return 'special';
}

/** Strip query/hash, decode escapes, lowercase, drop the trailing slash (except bare '/'). */
export function normalizeRoutePath(href: string): string {
  let p = href.split(/[?#]/)[0];
  try {
    p = decodeURIComponent(p);
  } catch {
    // Malformed escape sequence — compare the raw path.
  }
  p = p.toLowerCase();
  if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
  return p === '' ? '/' : p;
}

/** Regex hrefs out of strings (rich text) and take .href from link-field objects, recursing arrays/objects. */
function visitValue(value: unknown, onHref: (href: string) => void): void {
  if (typeof value === 'string') {
    for (const m of value.matchAll(HREF_RE)) onHref(m[1] ?? m[2] ?? '');
  } else if (Array.isArray(value)) {
    for (const v of value) visitValue(v, onHref);
  } else if (value !== null && typeof value === 'object') {
    const rec = value as Record<string, unknown>;
    if (typeof rec.href === 'string') onHref(rec.href);
    else for (const v of Object.values(rec)) visitValue(v, onHref);
  }
}

export function extractLinks(routes: GuiRouteDetail[]): PageLink[] {
  const links: PageLink[] = [];

  const record = (from: string, componentName: string, path: string, field: string, href: string): void => {
    const kind = classifyHref(href);
    links.push({ from, href, kind, target: kind === 'internal' ? normalizeRoutePath(href) : null, componentName, path, field });
  };

  for (const route of routes) {
    for (const [field, raw] of Object.entries(route.routeFields ?? {})) {
      visitValue(raw, (href) => record(route.routePath, '(page)', '', field, href));
    }
    const walk = (placeholders: Record<string, GuiLayoutNode[]>, prefix: string): void => {
      for (const [key, nodes] of Object.entries(placeholders)) {
        nodes.forEach((n, i) => {
          const path = `${prefix}${key}[${i}]`;
          for (const [field, raw] of Object.entries(n.fields)) {
            visitValue(raw, (href) => record(route.routePath, n.componentName, path, field, href));
          }
          walk(n.placeholders, `${path} › `);
        });
      }
    };
    walk(route.layout, '');
  }

  return links;
}

/** Deduplicated route→route edges from resolved internal links (self-links excluded). */
export function linkEdges(routes: GuiRouteDetail[]): RouteEdge[] {
  const known = knownRoutes(routes);
  const counts = new Map<string, RouteEdge>();
  for (const l of extractLinks(routes)) {
    if (l.kind !== 'internal' || l.target === null) continue;
    const to = known.get(l.target);
    if (to === undefined || to === l.from) continue;
    // Newline separator: it cannot appear in a route path.
    const key = `${l.from}\n${to}`;
    const edge = counts.get(key);
    if (edge) edge.count += 1;
    else counts.set(key, { from: l.from, to, count: 1 });
  }
  return [...counts.values()];
}

function knownRoutes(routes: GuiRouteDetail[]): Map<string, string> {
  const known = new Map<string, string>();
  for (const r of routes) known.set(normalizeRoutePath(r.routePath), r.routePath);
  return known;
}

export function analyzeLinks(routes: GuiRouteDetail[]): LinkAnalysis {
  const links = extractLinks(routes);
  const known = knownRoutes(routes);

  const broken: PageLink[] = [];
  const inbound = new Map<string, number>();
  const outbound = new Map<string, number>();
  const inboundFromOther = new Set<string>();
  const adjacency = new Map<string, Set<string>>();

  for (const l of links) {
    if (l.kind !== 'internal' || l.target === null) continue;
    const to = known.get(l.target);
    if (to === undefined) {
      broken.push(l);
      continue;
    }
    outbound.set(l.from, (outbound.get(l.from) ?? 0) + 1);
    inbound.set(to, (inbound.get(to) ?? 0) + 1);
    if (to !== l.from) {
      inboundFromOther.add(to);
      const targets = adjacency.get(l.from) ?? new Set<string>();
      targets.add(to);
      adjacency.set(l.from, targets);
    }
  }

  const orphans = routes
    .map((r) => r.routePath)
    .filter((p) => normalizeRoutePath(p) !== '/' && !inboundFromOther.has(p))
    .sort((a, b) => a.localeCompare(b));

  const depths = new Map<string, number>();
  const home = known.get('/');
  if (home !== undefined) {
    depths.set(home, 0);
    const queue = [home];
    while (queue.length > 0) {
      const current = queue.shift() as string;
      const depth = depths.get(current) as number;
      for (const next of adjacency.get(current) ?? []) {
        if (!depths.has(next)) {
          depths.set(next, depth + 1);
          queue.push(next);
        }
      }
    }
  }

  return { links, broken, orphans, inbound, outbound, depths };
}
