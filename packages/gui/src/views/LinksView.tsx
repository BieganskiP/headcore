import { useMemo, useState } from 'react';
import type { GuiState } from '../lib/types';
import type { View } from '../lib/router';
import { analyzeLinks, linkEdges, type RouteEdge } from '../lib/links';

const COL_W = 240;
const NODE_W = 176;
const NODE_H = 32;
const GAP_Y = 14;
const PAD = 24;
const PAD_TOP = 44;
const LABEL_MAX = 18;
const GRAPH_MAX_ROUTES = 80;

function StatCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white/60 p-4 text-left dark:border-slate-800 dark:bg-slate-900/40">
      <div className="font-mono text-2xl font-semibold tabular-nums tracking-tight">{value}</div>
      <div className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">{label}</div>
      {hint && <div className="mt-1 text-xs text-slate-400 dark:text-slate-500">{hint}</div>}
    </div>
  );
}

interface Positioned {
  routePath: string;
  x: number;
  y: number;
  unreached: boolean;
}

interface LinkGraphLayout {
  nodes: Positioned[];
  byRoute: Map<string, Positioned>;
  columns: Array<{ x: number; label: string }>;
  width: number;
  height: number;
}

/**
 * Columns by click depth from '/', a trailing column for unreachable routes;
 * within a column, nodes are pulled toward the average row of their linkers
 * (single barycenter pass, as in GraphView) to shorten edges.
 */
function layoutLinkGraph(routePaths: string[], depths: Map<string, number>, edges: RouteEdge[]): LinkGraphLayout {
  const maxDepth = depths.size > 0 ? Math.max(...depths.values()) : -1;
  const layers: string[][] = Array.from({ length: maxDepth + 1 }, () => []);
  for (const [path, depth] of depths) layers[depth].push(path);
  const labels = layers.map((_, d) => `depth ${d}`);
  const unreached = new Set(routePaths.filter((p) => !depths.has(p)));
  if (unreached.size > 0) {
    layers.push([...unreached]);
    labels.push('unreached');
  }

  const parentsOf = new Map<string, string[]>();
  for (const e of edges) {
    const list = parentsOf.get(e.to) ?? [];
    list.push(e.from);
    parentsOf.set(e.to, list);
  }

  const row = new Map<string, number>();
  layers.forEach((names, col) => {
    if (col === 0) {
      names.sort((a, b) => a.localeCompare(b));
    } else {
      const bary = (name: string): number => {
        const rows = (parentsOf.get(name) ?? []).map((p) => row.get(p)).filter((r): r is number => r !== undefined);
        return rows.length > 0 ? rows.reduce((a, b) => a + b, 0) / rows.length : Number.POSITIVE_INFINITY;
      };
      names.sort((a, b) => bary(a) - bary(b) || a.localeCompare(b));
    }
    names.forEach((name, i) => row.set(name, i));
  });

  const nodes: Positioned[] = [];
  const byRoute = new Map<string, Positioned>();
  let maxRows = 0;
  layers.forEach((names, col) => {
    maxRows = Math.max(maxRows, names.length);
    names.forEach((routePath, i) => {
      const p: Positioned = {
        routePath,
        x: PAD + col * COL_W,
        y: PAD_TOP + i * (NODE_H + GAP_Y),
        unreached: unreached.has(routePath),
      };
      nodes.push(p);
      byRoute.set(routePath, p);
    });
  });

  return {
    nodes,
    byRoute,
    columns: labels.map((label, col) => ({ x: PAD + col * COL_W, label })),
    width: PAD * 2 + Math.max(0, layers.length - 1) * COL_W + NODE_W,
    height: PAD_TOP + PAD + Math.max(1, maxRows) * (NODE_H + GAP_Y) - GAP_Y,
  };
}

function edgePath(from: Positioned, to: Positioned): string {
  const x1 = from.x + NODE_W;
  const y1 = from.y + NODE_H / 2;
  const x2 = to.x;
  const y2 = to.y + NODE_H / 2;
  const dx = x2 >= x1 ? Math.max(32, (x2 - x1) / 2) : 48;
  return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
}

function lastSegment(routePath: string): string {
  const parts = routePath.split('/').filter((s) => s !== '');
  const label = parts.length > 0 ? parts[parts.length - 1] : '/';
  return label.length > LABEL_MAX ? label.slice(0, LABEL_MAX - 1) + '…' : label;
}

export function LinksView({ state, navigate }: { state: GuiState; navigate: (v: View) => void }) {
  const analysis = useMemo(() => analyzeLinks(state.routes), [state.routes]);
  const edges = useMemo(() => linkEdges(state.routes), [state.routes]);
  const layout = useMemo(
    () => layoutLinkGraph(state.routes.map((r) => r.routePath), analysis.depths, edges),
    [state.routes, analysis.depths, edges],
  );
  const [hover, setHover] = useState<string | null>(null);

  const related = useMemo(() => {
    if (hover === null) return null;
    const set = new Set([hover]);
    for (const e of edges) {
      if (e.from === hover) set.add(e.to);
      if (e.to === hover) set.add(e.from);
    }
    return set;
  }, [hover, edges]);

  const internal = analysis.links.filter((l) => l.kind === 'internal').length;
  const external = analysis.links.filter((l) => l.kind === 'external').length;
  const showGraph = state.routes.length <= GRAPH_MAX_ROUTES;
  const hasUnreached = layout.nodes.some((n) => n.unreached);

  const routeButton = (routePath: string) => (
    <button
      type="button"
      className="text-sky-600 hover:underline focus-visible:ring-2 focus-visible:ring-sky-400 dark:text-sky-400"
      onClick={() => navigate({ view: 'inspector', route: routePath })}
    >
      <code>{routePath}</code>
    </button>
  );

  if (state.routes.length === 0) {
    return (
      <div className="max-w-4xl">
        <h1 className="mb-4 text-xl font-semibold">Links</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">No routes to analyze.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl">
      <div className="mb-4 flex items-baseline gap-3">
        <h1 className="text-xl font-semibold">Links</h1>
        <span className="text-sm text-slate-500 dark:text-slate-400">
          {analysis.links.length} link{analysis.links.length === 1 ? '' : 's'} found across {state.routes.length} route{state.routes.length === 1 ? '' : 's'}
        </span>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Internal links" value={internal} hint="pointing at this site's routes" />
        <StatCard label="Broken links" value={analysis.broken.length} hint="internal, target route not found" />
        <StatCard label="Orphan pages" value={analysis.orphans.length} hint="no inbound links from other pages" />
        <StatCard label="External links" value={external} />
      </div>

      <section className="mb-8">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Broken internal links ({analysis.broken.length})
        </h2>
        {analysis.broken.length === 0 ? (
          <p className="text-sm text-emerald-700 dark:text-emerald-400">No broken internal links.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <th scope="col" className="py-2 pr-4">On page</th>
                <th scope="col" className="py-2 pr-4">Href</th>
                <th scope="col" className="py-2">Where</th>
              </tr>
            </thead>
            <tbody>
              {analysis.broken.map((l, i) => (
                <tr key={`${l.from}|${l.href}|${l.path}|${l.field}|${i}`} className="border-b border-slate-100 align-top hover:bg-slate-50 dark:border-slate-900 dark:hover:bg-slate-900/50">
                  <td className="py-1.5 pr-4">{routeButton(l.from)}</td>
                  <td className="py-1.5 pr-4"><code className="break-all">{l.href}</code></td>
                  <td className="py-1.5 font-mono text-xs text-slate-400 dark:text-slate-500">
                    {l.componentName} · {l.field}{l.path !== '' && <> · {l.path}</>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="mb-8">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Orphan pages ({analysis.orphans.length})
        </h2>
        {analysis.orphans.length === 0 ? (
          <p className="text-sm text-emerald-700 dark:text-emerald-400">Every page is linked from at least one other page.</p>
        ) : (
          <>
            <p className="mb-2 text-sm text-slate-500 dark:text-slate-400">
              No other page links to these routes — visitors and crawlers can only reach them by direct URL.
            </p>
            <ul className="text-sm">
              {analysis.orphans.map((p) => (
                <li key={p} className="py-0.5">{routeButton(p)}</li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Link graph
        </h2>
        {!showGraph ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Graph hidden for large sites ({state.routes.length} routes &gt; {GRAPH_MAX_ROUTES}).
          </p>
        ) : (
          <>
            <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
              Columns are click depth from <code>/</code>; an arrow means the left page links to the right one
              (thicker means more links). Hover to trace, click to open the page in the inspector.
            </p>
            <div className="overflow-auto rounded-xl border border-slate-200 bg-white/40 dark:border-slate-800 dark:bg-slate-900/20">
              <svg width={layout.width} height={layout.height} role="img" aria-label="Internal link graph by click depth">
                {layout.columns.map((c) => (
                  <text key={c.label} x={c.x} y={20} className="fill-slate-400 text-[10px] uppercase tracking-wide dark:fill-slate-500">
                    {c.label}
                  </text>
                ))}
                {edges.map((e) => {
                  const from = layout.byRoute.get(e.from);
                  const to = layout.byRoute.get(e.to);
                  if (!from || !to) return null;
                  const active = hover !== null && (e.from === hover || e.to === hover);
                  const dimmed = hover !== null && !active;
                  return (
                    <path
                      key={`${e.from}→${e.to}`}
                      d={edgePath(from, to)}
                      fill="none"
                      strokeWidth={1 + Math.min(4, Math.log2(e.count + 1))}
                      className={active ? 'stroke-sky-500' : dimmed ? 'stroke-slate-200 dark:stroke-slate-800' : 'stroke-slate-300 dark:stroke-slate-700'}
                    >
                      <title>{`${e.from} → ${e.to} (×${e.count})`}</title>
                    </path>
                  );
                })}
                {layout.nodes.map((n) => {
                  const active = hover === n.routePath || (related?.has(n.routePath) ?? false);
                  const dimmed = related !== null && !related.has(n.routePath);
                  const inCount = analysis.inbound.get(n.routePath) ?? 0;
                  const outCount = analysis.outbound.get(n.routePath) ?? 0;
                  const depth = analysis.depths.get(n.routePath);
                  return (
                    <g
                      key={n.routePath}
                      role="button"
                      tabIndex={0}
                      aria-label={`${n.routePath}: ${n.unreached ? 'unreachable from /' : `depth ${depth}`}, ${inCount} inbound, ${outCount} outbound. Open in inspector.`}
                      className={`cursor-pointer outline-none ${dimmed ? 'opacity-30' : ''}`}
                      onMouseEnter={() => setHover(n.routePath)}
                      onMouseLeave={() => setHover(null)}
                      onFocus={() => setHover(n.routePath)}
                      onBlur={() => setHover(null)}
                      onClick={() => navigate({ view: 'inspector', route: n.routePath })}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          navigate({ view: 'inspector', route: n.routePath });
                        }
                      }}
                    >
                      <title>{`${n.routePath} — ${n.unreached ? 'unreachable by clicking from /' : `depth ${depth}`} · ${inCount} in · ${outCount} out`}</title>
                      <rect
                        x={n.x}
                        y={n.y}
                        width={NODE_W}
                        height={NODE_H}
                        rx={6}
                        strokeWidth={active ? 2 : 1}
                        className={`${n.unreached ? 'stroke-rose-500' : active ? 'stroke-sky-500' : 'stroke-slate-300 dark:stroke-slate-700'} fill-white dark:fill-slate-900`}
                      />
                      <text
                        x={n.x + 10}
                        y={n.y + NODE_H / 2}
                        dominantBaseline="central"
                        className="fill-slate-900 font-mono text-xs font-medium dark:fill-slate-100"
                      >
                        {lastSegment(n.routePath)}
                      </text>
                      <text
                        x={n.x + NODE_W - 8}
                        y={n.y + NODE_H / 2}
                        dominantBaseline="central"
                        textAnchor="end"
                        className="fill-slate-400 text-[10px] dark:fill-slate-500"
                      >
                        {inCount}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
            <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-500 dark:text-slate-400">
              {hasUnreached && (
                <span className="flex items-center gap-1">
                  <span className="inline-block h-2 w-2 rounded-sm border border-rose-500" /> unreachable by clicking from <code>/</code>
                </span>
              )}
              <span>number on the right: inbound internal links</span>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
