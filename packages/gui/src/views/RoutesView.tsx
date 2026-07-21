import { useMemo, useState } from 'react';
import type { GuiState, GuiRouteDetail } from '../lib/types';
import type { View } from '../lib/router';
import { buildRouteTree, routeCount, type RouteTreeNode } from '../lib/analytics';
import { Badge } from '../components/Badge';

function RouteLink({ route, navigate }: { route: GuiRouteDetail; navigate: (v: View) => void }) {
  return (
    <button
      className="font-medium text-sky-600 hover:underline focus-visible:ring-2 focus-visible:ring-sky-400 dark:text-sky-400"
      onClick={() => navigate({ view: 'inspector', route: route.routePath })}
      title={`Inspect ${route.routePath}`}
    >
      {route.name || route.routePath}
    </button>
  );
}

function TreeNode({ node, navigate, depth }: { node: RouteTreeNode; navigate: (v: View) => void; depth: number }) {
  const [open, setOpen] = useState(depth < 2);
  const count = routeCount(node);

  return (
    <li>
      <div className="flex items-center gap-2 py-0.5" style={{ paddingLeft: `${depth * 16}px` }}>
        {node.children.length > 0 ? (
          <button className="w-4 text-slate-400 focus-visible:ring-2 focus-visible:ring-sky-400" onClick={() => setOpen(!open)} aria-label={open ? 'collapse' : 'expand'}>
            {open ? '▾' : '▸'}
          </button>
        ) : (
          <span className="w-4" />
        )}
        <code className="text-sm">{node.segment}</code>
        {node.route && <RouteLink route={node.route} navigate={navigate} />}
        {node.route && node.route.components.length > 0 && (
          <span className="flex flex-wrap gap-1">
            {node.route.components.map((c) => (
              <button key={c} className="focus-visible:ring-2 focus-visible:ring-sky-400" onClick={() => navigate({ view: 'components', component: c })}>
                <Badge>{c}</Badge>
              </button>
            ))}
          </span>
        )}
        {count > 0 && <span className="text-xs text-slate-400">({count})</span>}
      </div>
      {open && node.children.length > 0 && (
        <ul>
          {node.children.map((c) => <TreeNode key={c.routePath} node={c} navigate={navigate} depth={depth + 1} />)}
        </ul>
      )}
    </li>
  );
}

export function RoutesView({ state, navigate }: { state: GuiState; navigate: (v: View) => void }) {
  const [mode, setMode] = useState<'tree' | 'table'>('tree');
  const [filter, setFilter] = useState('');
  const [sort, setSort] = useState<'path' | 'updated'>('path');

  const filtered = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    const matched = needle
      ? state.routes.filter((r) => r.routePath.toLowerCase().includes(needle) || r.name.toLowerCase().includes(needle))
      : state.routes;
    return [...matched].sort((a, b) => {
      if (sort === 'updated' && a.updatedAt !== b.updatedAt) {
        if (a.updatedAt === null) return 1;
        if (b.updatedAt === null) return -1;
        return b.updatedAt.localeCompare(a.updatedAt);
      }
      return a.routePath.localeCompare(b.routePath);
    });
  }, [state.routes, filter, sort]);

  const tree = useMemo(() => buildRouteTree(filtered), [filtered]);

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <h1 className="text-xl font-semibold">Routes</h1>
        <span className="text-sm text-slate-500 dark:text-slate-400">{filtered.length} of {state.routes.length}</span>
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter by path or name…"
          aria-label="Filter routes"
          className="ml-auto w-64 rounded border border-slate-300 bg-transparent px-2 py-1 text-sm dark:border-slate-700"
        />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as 'path' | 'updated')}
          aria-label="Sort routes"
          className="rounded border border-slate-300 bg-transparent px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-950"
        >
          <option value="path">Sort: path</option>
          <option value="updated">Sort: updated</option>
        </select>
        <button
          className="rounded border border-slate-300 px-2 py-1 text-sm focus-visible:ring-2 focus-visible:ring-sky-400 dark:border-slate-700"
          onClick={() => setMode(mode === 'tree' ? 'table' : 'tree')}
        >
          {mode === 'tree' ? 'Table' : 'Tree'}
        </button>
      </div>

      {mode === 'tree' ? (
        <ul><TreeNode node={tree} navigate={navigate} depth={0} /></ul>
      ) : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
              <th className="py-2 pr-4">Route</th>
              <th className="py-2 pr-4">Name</th>
              <th className="py-2 pr-4">Updated</th>
              <th className="py-2">Components</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.routePath} className="border-b border-slate-100 dark:border-slate-900">
                <td className="py-1.5 pr-4">
                  <button className="text-sky-600 hover:underline focus-visible:ring-2 focus-visible:ring-sky-400 dark:text-sky-400" onClick={() => navigate({ view: 'inspector', route: r.routePath })}>
                    <code>{r.routePath}</code>
                  </button>
                </td>
                <td className="py-1.5 pr-4">{r.name}</td>
                <td className="py-1.5 pr-4 text-slate-500 dark:text-slate-400">{r.updatedAt ?? '—'}</td>
                <td className="py-1.5">
                  <span className="flex flex-wrap gap-1">
                    {r.components.map((c) => (
                      <button key={c} className="focus-visible:ring-2 focus-visible:ring-sky-400" onClick={() => navigate({ view: 'components', component: c })}>
                        <Badge>{c}</Badge>
                      </button>
                    ))}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
