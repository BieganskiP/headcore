import { useMemo, useState } from 'react';
import type { GuiState } from '../lib/types';
import type { View } from '../lib/router';
import { usageCounts, registryCoverage } from '../lib/analytics';
import { downloadCsv } from '../lib/export';
import { Badge } from '../components/Badge';
import { ComponentDetailView } from './ComponentDetailView';

export function ComponentsView({ state, selected, navigate }: { state: GuiState; selected?: string; navigate: (v: View) => void }) {
  const [filter, setFilter] = useState('');
  const usage = useMemo(() => usageCounts(state.routes, state.registry), [state.routes, state.registry]);
  const coverage = useMemo(() => registryCoverage(state.routes, state.registry), [state.routes, state.registry]);
  const usedNames = useMemo(() => new Set(coverage.used.map((e) => e.name)), [coverage]);

  const filtered = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    return needle ? usage.filter((u) => u.name.toLowerCase().includes(needle)) : usage;
  }, [usage, filter]);
  const max = usage[0]?.count ?? 1;

  if (selected !== undefined) {
    return <ComponentDetailView state={state} component={selected} navigate={navigate} />;
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-4 flex items-center gap-3">
        <h1 className="text-xl font-semibold">Components</h1>
        <span className="text-sm text-slate-500 dark:text-slate-400">{filtered.length} of {usage.length}</span>
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter by name…"
          aria-label="Filter components"
          className="ml-auto w-64 rounded border border-slate-300 bg-transparent px-2 py-1 text-sm dark:border-slate-700"
        />
        <button
          type="button"
          className="rounded border border-slate-300 px-2 py-1 text-sm focus-visible:ring-2 focus-visible:ring-sky-400 disabled:opacity-50 dark:border-slate-700"
          disabled={filtered.length === 0}
          title="Download the filtered usage table as CSV"
          onClick={() => downloadCsv(
            `components-${state.site}-${state.language}.csv`,
            ['component', 'routes', 'in_registry', 'route_paths'],
            filtered.map((u) => [u.name, String(u.count), u.inRegistry ? 'yes' : 'no', u.routes.join('; ')]),
          )}
        >
          CSV
        </button>
      </div>

      <table className="mb-8 w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
            <th scope="col" className="py-2 pr-4">Component</th>
            <th scope="col" className="w-24 py-2 pr-4">Routes</th>
            <th scope="col" className="py-2">Usage</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((u) => (
            <tr key={u.name} className="border-b border-slate-100 hover:bg-slate-50 dark:border-slate-900 dark:hover:bg-slate-900/50">
              <td className="py-1.5 pr-4">
                <button
                  type="button"
                  className="font-medium text-sky-600 hover:underline focus-visible:ring-2 focus-visible:ring-sky-400 dark:text-sky-400"
                  onClick={() => navigate({ view: 'components', component: u.name })}
                >
                  {u.name}
                </button>
                {u.inRegistry && <span className="ml-2"><Badge tone="green">registry</Badge></span>}
              </td>
              <td className="py-1.5 pr-4 font-mono text-xs tabular-nums">{u.count}</td>
              <td className="py-1.5">
                <div aria-hidden="true" className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800/60">
                  <div className="h-2 rounded-full bg-gradient-to-r from-sky-500 to-sky-400" style={{ width: `${(u.count / max) * 100}%` }} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Registry ({coverage.used.length} used / {state.registry.length} total)
        </h2>
        <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {state.registry.map((entry) => {
            const used = usedNames.has(entry.name);
            return (
              <li key={entry.name} className="rounded-xl border border-slate-200 bg-white/60 p-3 dark:border-slate-800 dark:bg-slate-900/40">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="font-medium text-sky-600 hover:underline focus-visible:ring-2 focus-visible:ring-sky-400 dark:text-sky-400"
                    onClick={() => navigate({ view: 'components', component: entry.componentName })}
                  >
                    {entry.name}
                  </button>
                  <Badge tone={used ? 'green' : 'amber'}>{used ? 'used' : 'unused'}</Badge>
                </div>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{entry.description}</p>
                {entry.placement && <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Placement: {entry.placement}</p>}
                {entry.placeholders.length > 0 && (
                  <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                    Placeholders: {entry.placeholders.map((p) => p.key).join(', ')}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
