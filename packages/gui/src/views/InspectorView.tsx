import { useMemo } from 'react';
import type { GuiState, GuiLayoutNode } from '../lib/types';
import type { View } from '../lib/router';
import { Badge } from '../components/Badge';

function LayoutNode({ node, navigate }: { node: GuiLayoutNode; navigate: (v: View) => void }) {
  return (
    <li className="mt-1">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="font-medium text-sky-600 hover:underline focus-visible:ring-2 focus-visible:ring-sky-400 dark:text-sky-400"
          onClick={() => navigate({ view: 'components', component: node.componentName })}
          title={`Show usage of ${node.componentName}`}
        >
          {node.componentName}
        </button>
        {node.dataSource && (
          <code className="text-xs text-slate-400 dark:text-slate-500" title="dataSource">{node.dataSource}</code>
        )}
        {node.fieldNames.length > 0 && (
          <span className="text-xs text-slate-500 dark:text-slate-400">fields: {node.fieldNames.join(', ')}</span>
        )}
      </div>
      <PlaceholderList placeholders={node.placeholders} navigate={navigate} />
    </li>
  );
}

function PlaceholderList({ placeholders, navigate }: { placeholders: Record<string, GuiLayoutNode[]>; navigate: (v: View) => void }) {
  const entries = Object.entries(placeholders);
  if (entries.length === 0) return null;
  return (
    <ul className="ml-4 border-l border-slate-200 pl-4 dark:border-slate-800">
      {entries.map(([key, nodes]) => (
        <li key={key} className="mt-1">
          <Badge tone="slate">{key}</Badge>
          <ul className="mt-1">{nodes.map((n, i) => <LayoutNode key={`${n.componentName}-${i}`} node={n} navigate={navigate} />)}</ul>
        </li>
      ))}
    </ul>
  );
}

export function InspectorView({ state, route, navigate }: { state: GuiState; route?: string; navigate: (v: View) => void }) {
  const selected = route !== undefined ? state.routes.find((r) => r.routePath === route) : undefined;

  const sortedRoutes = useMemo(
    () => [...state.routes].sort((a, b) => a.routePath.localeCompare(b.routePath)),
    [state.routes],
  );

  return (
    <div className="max-w-4xl">
      <div className="mb-4 flex items-center gap-3">
        <h1 className="text-xl font-semibold">Inspector</h1>
        <select
          value={selected?.routePath ?? ''}
          onChange={(e) => navigate({ view: 'inspector', route: e.target.value || undefined })}
          aria-label="Select route to inspect"
          className="rounded border border-slate-300 bg-transparent px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-950"
        >
          <option value="">Pick a route…</option>
          {sortedRoutes.map((r) => (
            <option key={r.routePath} value={r.routePath}>{r.routePath}</option>
          ))}
        </select>
      </div>

      {route !== undefined && selected === undefined && (
        <p className="text-sm text-amber-700 dark:text-amber-400">
          No route <code>{route}</code> in the current data — it may not exist in this language.
        </p>
      )}

      {selected && (
        <>
          <div className="mb-4 text-sm text-slate-500 dark:text-slate-400">
            <span className="font-medium text-slate-900 dark:text-slate-100">{selected.name}</span>
            {' · '}<code>{selected.routePath}</code>
            {selected.updatedAt && <> · updated {selected.updatedAt}</>}
            {' · '}{selected.components.length} component{selected.components.length === 1 ? '' : 's'}
          </div>
          {Object.keys(selected.layout).length === 0
            ? <p className="text-sm text-slate-500 dark:text-slate-400">No layout data for this route.</p>
            : <PlaceholderList placeholders={selected.layout} navigate={navigate} />}
        </>
      )}
    </div>
  );
}
