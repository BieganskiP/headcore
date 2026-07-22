import { useMemo, useState } from 'react';
import type { GuiState, GuiRouteDetail } from '../lib/types';
import type { View } from '../lib/router';
import { buildRouteTree, routeCount, freshnessBucket, type RouteTreeNode, type FreshKey } from '../lib/analytics';
import { liveUrl, type DeepLinkContext } from '../lib/deepLinks';
import { downloadCsv } from '../lib/export';
import { FRESH_META } from '../lib/freshnessMeta';
import { Badge } from '../components/Badge';

function LivePageLink({ href }: { href: string | null }) {
  if (href === null) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      title="Open live page"
      className="font-mono text-xs text-slate-400 hover:text-sky-600 focus-visible:ring-2 focus-visible:ring-sky-400 dark:text-slate-500 dark:hover:text-sky-400"
      onClick={(e) => e.stopPropagation()}
    >
      ↗
    </a>
  );
}

function RouteLink({ route, navigate }: { route: GuiRouteDetail; navigate: (v: View) => void }) {
  return (
    <button
      type="button"
      className="font-medium text-sky-600 hover:underline focus-visible:ring-2 focus-visible:ring-sky-400 dark:text-sky-400"
      onClick={() => navigate({ view: 'inspector', route: route.routePath })}
      title={`Inspect ${route.routePath}`}
    >
      {route.name || route.routePath}
    </button>
  );
}

function TreeNode({ node, navigate, depth, linkCtx }: { node: RouteTreeNode; navigate: (v: View) => void; depth: number; linkCtx: DeepLinkContext }) {
  const [open, setOpen] = useState(depth < 2);
  const count = useMemo(() => routeCount(node), [node]);

  return (
    <li>
      <div className="flex items-center gap-2 py-0.5" style={{ paddingLeft: `${depth * 16}px` }}>
        {node.children.length > 0 ? (
          <button type="button" className="w-4 text-slate-400 focus-visible:ring-2 focus-visible:ring-sky-400" onClick={() => setOpen(!open)} aria-label={open ? `collapse ${node.segment}` : `expand ${node.segment}`}>
            {open ? '▾' : '▸'}
          </button>
        ) : (
          <span className="w-4" />
        )}
        <code className="text-sm">{node.segment}</code>
        {node.route && <RouteLink route={node.route} navigate={navigate} />}
        {node.route && <LivePageLink href={liveUrl(linkCtx, node.route.routePath)} />}
        {node.route && node.route.components.length > 0 && (
          <span className="flex flex-wrap gap-1">
            {node.route.components.map((c) => (
              <button type="button" key={c} className="focus-visible:ring-2 focus-visible:ring-sky-400" onClick={() => navigate({ view: 'components', component: c })}>
                <Badge>{c}</Badge>
              </button>
            ))}
          </span>
        )}
        {count > 0 && <span className="text-xs text-slate-400">({count})</span>}
      </div>
      {open && node.children.length > 0 && (
        <ul>
          {node.children.map((c) => <TreeNode key={c.routePath} node={c} navigate={navigate} depth={depth + 1} linkCtx={linkCtx} />)}
        </ul>
      )}
    </li>
  );
}

export function RoutesView({ state, fresh, navigate }: { state: GuiState; fresh?: FreshKey; navigate: (v: View) => void }) {
  const [mode, setMode] = useState<'tree' | 'table'>('tree');
  const [filter, setFilter] = useState('');
  const [sort, setSort] = useState<'path' | 'updated'>('path');

  const filtered = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    const today = new Date();
    let matched = needle
      ? state.routes.filter((r) => r.routePath.toLowerCase().includes(needle) || r.name.toLowerCase().includes(needle))
      : state.routes;
    if (fresh !== undefined) matched = matched.filter((r) => freshnessBucket(r.updatedAt, today) === fresh);
    return [...matched].sort((a, b) => {
      if (sort === 'updated' && a.updatedAt !== b.updatedAt) {
        if (a.updatedAt === null) return 1;
        if (b.updatedAt === null) return -1;
        return b.updatedAt.localeCompare(a.updatedAt);
      }
      return a.routePath.localeCompare(b.routePath);
    });
  }, [state.routes, filter, sort, fresh]);

  const tree = useMemo(() => buildRouteTree(filtered), [filtered]);
  const linkCtx: DeepLinkContext = { links: state.links, site: state.site, language: state.language };

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <h1 className="text-xl font-semibold">Routes</h1>
        <span className="text-sm text-slate-500 dark:text-slate-400">{filtered.length} of {state.routes.length}</span>
        {fresh !== undefined && (
          <button
            type="button"
            onClick={() => navigate({ view: 'routes' })}
            title="Clear the freshness filter"
            className="flex items-center gap-1 rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-800 hover:bg-sky-200 focus-visible:ring-2 focus-visible:ring-sky-400 dark:bg-sky-900/50 dark:text-sky-300 dark:hover:bg-sky-900"
          >
            updated {FRESH_META.find((m) => m.key === fresh)?.label ?? fresh}
            <span aria-hidden="true">✕</span>
          </button>
        )}
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
          disabled={mode === 'tree'}
          title={mode === 'tree' ? 'Tree is always sorted by segment' : undefined}
          className="rounded border border-slate-300 bg-transparent px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-950 disabled:opacity-50"
        >
          <option value="path">Sort: path</option>
          <option value="updated">Sort: updated</option>
        </select>
        <button
          type="button"
          className="rounded border border-slate-300 px-2 py-1 text-sm focus-visible:ring-2 focus-visible:ring-sky-400 dark:border-slate-700"
          onClick={() => setMode(mode === 'tree' ? 'table' : 'tree')}
        >
          {mode === 'tree' ? 'Table' : 'Tree'}
        </button>
        <button
          type="button"
          className="rounded border border-slate-300 px-2 py-1 text-sm focus-visible:ring-2 focus-visible:ring-sky-400 disabled:opacity-50 dark:border-slate-700"
          disabled={filtered.length === 0}
          title="Download the filtered routes as CSV"
          onClick={() => downloadCsv(
            `routes-${state.site}-${state.language}.csv`,
            ['route', 'name', 'updated', 'components'],
            filtered.map((r) => [r.routePath, r.name, r.updatedAt ?? '', r.components.join('; ')]),
          )}
        >
          CSV
        </button>
      </div>

      {mode === 'tree' ? (
        <ul><TreeNode node={tree} navigate={navigate} depth={0} linkCtx={linkCtx} /></ul>
      ) : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
              <th scope="col" className="py-2 pr-4">Route</th>
              <th scope="col" className="py-2 pr-4">Name</th>
              <th scope="col" className="py-2 pr-4">Updated</th>
              <th scope="col" className="py-2">Components</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.routePath} className="border-b border-slate-100 hover:bg-slate-50 dark:border-slate-900 dark:hover:bg-slate-900/50">
                <td className="py-1.5 pr-4">
                  <span className="flex items-baseline gap-1.5">
                    <button type="button" className="text-sky-600 hover:underline focus-visible:ring-2 focus-visible:ring-sky-400 dark:text-sky-400" onClick={() => navigate({ view: 'inspector', route: r.routePath })}>
                      <code>{r.routePath}</code>
                    </button>
                    <LivePageLink href={liveUrl(linkCtx, r.routePath)} />
                  </span>
                </td>
                <td className="py-1.5 pr-4">{r.name}</td>
                <td className="py-1.5 pr-4 font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400">{r.updatedAt ?? '—'}</td>
                <td className="py-1.5">
                  <span className="flex flex-wrap gap-1">
                    {r.components.map((c) => (
                      <button type="button" key={c} className="focus-visible:ring-2 focus-visible:ring-sky-400" onClick={() => navigate({ view: 'components', component: c })}>
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
