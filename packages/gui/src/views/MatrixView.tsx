import { useMemo, useState } from 'react';
import type { GuiState } from '../lib/types';
import type { View } from '../lib/router';
import { usageCounts } from '../lib/analytics';

/**
 * Routes × components grid: one glance answers "which pages use X" and
 * "what does this page depend on". Dots link to the Inspector.
 */
export function MatrixView({ state, navigate }: { state: GuiState; navigate: (v: View) => void }) {
  const [filter, setFilter] = useState('');

  const usage = useMemo(() => usageCounts(state.routes, state.registry), [state.routes, state.registry]);

  const routes = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    const matched = needle
      ? state.routes.filter((r) => r.routePath.toLowerCase().includes(needle) || r.name.toLowerCase().includes(needle))
      : state.routes;
    return [...matched]
      .filter((r) => r.components.length > 0)
      .sort((a, b) => a.routePath.localeCompare(b.routePath));
  }, [state.routes, filter]);

  const routeSets = useMemo(() => new Map(routes.map((r) => [r.routePath, new Set(r.components)])), [routes]);

  if (usage.length === 0) {
    return (
      <div className="max-w-4xl">
        <h1 className="mb-4 text-xl font-semibold">Matrix</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">No components on any route yet.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <h1 className="text-xl font-semibold">Matrix</h1>
        <span className="text-sm text-slate-500 dark:text-slate-400">
          {routes.length} routes × {usage.length} components
        </span>
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter routes…"
          aria-label="Filter routes"
          className="ml-auto w-64 rounded border border-slate-300 bg-transparent px-2 py-1 text-sm dark:border-slate-700"
        />
      </div>
      <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
        A dot means the component renders on that route (routes without components are hidden).
        Click a dot to inspect the route; click a column to open the component.
      </p>

      <div className="max-h-[calc(100vh-16rem)] overflow-auto rounded-xl border border-slate-200 dark:border-slate-800">
        <table className="border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              <th scope="col" className="sticky left-0 top-0 z-20 border-b border-r border-slate-200 bg-white px-3 py-2 text-left align-bottom text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
                Route
              </th>
              {usage.map((u) => (
                <th key={u.name} scope="col" className="sticky top-0 z-10 border-b border-slate-200 bg-white px-1 pb-2 pt-3 align-bottom dark:border-slate-800 dark:bg-slate-950">
                  <button
                    type="button"
                    onClick={() => navigate({ view: 'components', component: u.name })}
                    title={`${u.name} — on ${u.count} route${u.count === 1 ? '' : 's'}`}
                    className="mx-auto block max-h-40 truncate text-xs font-medium text-slate-600 [writing-mode:vertical-rl] rotate-180 hover:text-sky-600 focus-visible:ring-2 focus-visible:ring-sky-400 dark:text-slate-400 dark:hover:text-sky-400"
                  >
                    {u.name}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {routes.map((r) => {
              const set = routeSets.get(r.routePath);
              return (
                <tr key={r.routePath} className="group">
                  <th scope="row" className="sticky left-0 z-10 max-w-72 border-b border-r border-slate-100 bg-white px-3 py-1 text-left font-normal group-hover:bg-slate-50 dark:border-slate-900 dark:bg-slate-950 dark:group-hover:bg-slate-900">
                    <button
                      type="button"
                      onClick={() => navigate({ view: 'inspector', route: r.routePath })}
                      title={`Inspect ${r.routePath}`}
                      className="block max-w-full truncate text-sky-600 hover:underline focus-visible:ring-2 focus-visible:ring-sky-400 dark:text-sky-400"
                    >
                      <code>{r.routePath}</code>
                    </button>
                  </th>
                  {usage.map((u) => (
                    <td key={u.name} className="border-b border-slate-100 px-1 py-1 text-center group-hover:bg-slate-50 dark:border-slate-900 dark:group-hover:bg-slate-900">
                      {set?.has(u.name) ? (
                        <button
                          type="button"
                          onClick={() => navigate({ view: 'inspector', route: r.routePath })}
                          title={`${u.name} on ${r.routePath} — inspect`}
                          aria-label={`${u.name} on ${r.routePath} — inspect route`}
                          className="mx-auto block h-4 w-4 rounded-full text-sky-500 hover:text-sky-700 focus-visible:ring-2 focus-visible:ring-sky-400 dark:hover:text-sky-300"
                        >
                          ●
                        </button>
                      ) : null}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
