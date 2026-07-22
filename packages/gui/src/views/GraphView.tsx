import { useMemo, useState } from 'react';
import type { GuiState } from '../lib/types';
import type { View } from '../lib/router';
import { composition, type Composition } from '../lib/analytics';

const COL_W = 240;
const NODE_W = 176;
const NODE_H = 32;
const GAP_Y = 14;
const PAD = 24;
const LABEL_MAX = 18;

interface Positioned {
  name: string;
  x: number;
  y: number;
  instances: number;
  routes: number;
}

interface GraphLayout {
  nodes: Positioned[];
  byName: Map<string, Positioned>;
  width: number;
  height: number;
}

/**
 * Columns by nesting depth; within a column, nodes are pulled toward the
 * average row of their parents (single barycenter pass) to shorten edges.
 */
function layoutGraph(comp: Composition): GraphLayout {
  const layers = new Map<number, string[]>();
  for (const n of comp.nodes) {
    const layer = layers.get(n.depth) ?? [];
    layer.push(n.name);
    layers.set(n.depth, layer);
  }
  const parentsOf = new Map<string, string[]>();
  for (const e of comp.edges) {
    const list = parentsOf.get(e.child) ?? [];
    list.push(e.parent);
    parentsOf.set(e.child, list);
  }

  const row = new Map<string, number>();
  const depths = [...layers.keys()].sort((a, b) => a - b);
  for (const depth of depths) {
    const names = layers.get(depth) ?? [];
    if (depth !== depths[0]) {
      const bary = (name: string): number => {
        const rows = (parentsOf.get(name) ?? []).map((p) => row.get(p)).filter((r): r is number => r !== undefined);
        return rows.length > 0 ? rows.reduce((a, b) => a + b, 0) / rows.length : Number.POSITIVE_INFINITY;
      };
      names.sort((a, b) => bary(a) - bary(b) || a.localeCompare(b));
    }
    names.forEach((name, i) => row.set(name, i));
  }

  const info = new Map(comp.nodes.map((n) => [n.name, n]));
  const nodes: Positioned[] = [];
  const byName = new Map<string, Positioned>();
  let maxRows = 0;
  depths.forEach((depth, col) => {
    const names = layers.get(depth) ?? [];
    maxRows = Math.max(maxRows, names.length);
    names.forEach((name, i) => {
      const n = info.get(name);
      if (!n) return;
      const p: Positioned = {
        name,
        x: PAD + col * COL_W,
        y: PAD + i * (NODE_H + GAP_Y),
        instances: n.instances,
        routes: n.routes,
      };
      nodes.push(p);
      byName.set(name, p);
    });
  });

  return {
    nodes,
    byName,
    width: PAD * 2 + Math.max(0, depths.length - 1) * COL_W + NODE_W,
    height: PAD * 2 + Math.max(1, maxRows) * (NODE_H + GAP_Y) - GAP_Y,
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

function truncate(name: string): string {
  return name.length > LABEL_MAX ? name.slice(0, LABEL_MAX - 1) + '…' : name;
}

export function GraphView({ state, navigate }: { state: GuiState; navigate: (v: View) => void }) {
  const comp = useMemo(() => composition(state.routes), [state.routes]);
  const layout = useMemo(() => layoutGraph(comp), [comp]);
  const registryNames = useMemo(() => new Set(state.registry.map((r) => r.componentName)), [state.registry]);
  const [hover, setHover] = useState<string | null>(null);

  const related = useMemo(() => {
    if (hover === null) return null;
    const set = new Set([hover]);
    for (const e of comp.edges) {
      if (e.parent === hover) set.add(e.child);
      if (e.child === hover) set.add(e.parent);
    }
    return set;
  }, [hover, comp.edges]);

  if (comp.nodes.length === 0) {
    return (
      <div className="max-w-4xl">
        <h1 className="mb-4 text-xl font-semibold">Graph</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">No layout data to draw — no route has any renderings.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-1 flex items-baseline gap-3">
        <h1 className="text-xl font-semibold">Graph</h1>
        <span className="text-sm text-slate-500 dark:text-slate-400">
          {comp.nodes.length} components · {comp.edges.length} containment{comp.edges.length === 1 ? '' : 's'} across {state.routes.length} routes
        </span>
      </div>
      <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
        Columns are placeholder nesting depth (leftmost renders at the top level). An arrow means the left component
        contains the right one in a placeholder; thicker means more often. Hover to trace, click to open the component.
      </p>

      {comp.edges.length === 0 && (
        <p className="mb-4 text-sm text-amber-700 dark:text-amber-400">
          No nested placeholders found — every rendering sits at the top level of its page.
        </p>
      )}

      <div className="overflow-auto rounded-xl border border-slate-200 bg-white/40 dark:border-slate-800 dark:bg-slate-900/20">
        <svg width={layout.width} height={layout.height} role="img" aria-label="Component composition graph">
          {comp.edges.map((e) => {
            const from = layout.byName.get(e.parent);
            const to = layout.byName.get(e.child);
            if (!from || !to) return null;
            const active = hover !== null && (e.parent === hover || e.child === hover);
            const dimmed = hover !== null && !active;
            return (
              <path
                key={`${e.parent}→${e.child}`}
                d={edgePath(from, to)}
                fill="none"
                strokeWidth={1 + Math.min(4, Math.log2(e.count + 1))}
                className={active ? 'stroke-sky-500' : dimmed ? 'stroke-slate-200 dark:stroke-slate-800' : 'stroke-slate-300 dark:stroke-slate-700'}
              >
                <title>{`${e.parent} → ${e.child} via ${e.placeholders.join(', ')} (×${e.count})`}</title>
              </path>
            );
          })}
          {layout.nodes.map((n) => {
            const active = hover === n.name || (related?.has(n.name) ?? false);
            const dimmed = related !== null && !related.has(n.name);
            return (
              <g
                key={n.name}
                role="button"
                tabIndex={0}
                aria-label={`${n.name}: ${n.instances} renderings on ${n.routes} routes. Open component details.`}
                className={`cursor-pointer outline-none ${dimmed ? 'opacity-30' : ''}`}
                onMouseEnter={() => setHover(n.name)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(n.name)}
                onBlur={() => setHover(null)}
                onClick={() => navigate({ view: 'components', component: n.name })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    navigate({ view: 'components', component: n.name });
                  }
                }}
              >
                <title>{`${n.name} — ${n.instances} rendering${n.instances === 1 ? '' : 's'} on ${n.routes} route${n.routes === 1 ? '' : 's'}`}</title>
                <rect
                  x={n.x}
                  y={n.y}
                  width={NODE_W}
                  height={NODE_H}
                  rx={6}
                  strokeWidth={active ? 2 : 1}
                  className={`${active ? 'stroke-sky-500' : 'stroke-slate-300 dark:stroke-slate-700'} fill-white dark:fill-slate-900`}
                />
                {registryNames.has(n.name) && (
                  <circle cx={n.x + 12} cy={n.y + NODE_H / 2} r={3} className="fill-emerald-500">
                    <title>registry component</title>
                  </circle>
                )}
                <text
                  x={n.x + (registryNames.has(n.name) ? 22 : 10)}
                  y={n.y + NODE_H / 2}
                  dominantBaseline="central"
                  className="fill-slate-900 text-xs font-medium dark:fill-slate-100"
                >
                  {truncate(n.name)}
                </text>
                <text
                  x={n.x + NODE_W - 8}
                  y={n.y + NODE_H / 2}
                  dominantBaseline="central"
                  textAnchor="end"
                  className="fill-slate-400 text-[10px] dark:fill-slate-500"
                >
                  {n.routes}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" /> registry component
        </span>
        <span>number on the right: routes using the component</span>
      </div>
    </div>
  );
}
