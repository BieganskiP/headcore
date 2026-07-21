import { useMemo } from 'react';
import type { GuiState } from '../lib/types';
import type { View } from '../lib/router';
import { usageCounts, registryCoverage } from '../lib/analytics';
import { Badge } from '../components/Badge';

export function ComponentsView({ state, selected, navigate }: { state: GuiState; selected?: string; navigate: (v: View) => void }) {
  const usage = useMemo(() => usageCounts(state.routes, state.registry), [state.routes, state.registry]);
  const coverage = useMemo(() => registryCoverage(state.routes, state.registry), [state.routes, state.registry]);
  const usedNames = useMemo(() => new Set(coverage.used.map((e) => e.name)), [coverage]);
  const max = usage[0]?.count ?? 1;
  const detail = selected !== undefined ? usage.find((u) => u.name === selected) : undefined;

  return (
    <div className="max-w-4xl">
      <h1 className="mb-4 text-xl font-semibold">Components</h1>

      {selected !== undefined && detail === undefined && (
        <p className="mb-4 text-sm text-amber-700 dark:text-amber-400">
          No component named <code>{selected}</code> in the current data.
        </p>
      )}

      {detail && (
        <section className="mb-6 rounded-lg border border-sky-200 bg-sky-50 p-4 dark:border-sky-900 dark:bg-sky-950/40">
          <div className="mb-2 flex items-center gap-2">
            <h2 className="font-semibold">{detail.name}</h2>
            {detail.inRegistry && <Badge tone="green">registry</Badge>}
            <button
              type="button"
              aria-label={`Clear selection: ${detail.name}`}
              className="ml-auto text-sm text-slate-500 hover:underline focus-visible:ring-2 focus-visible:ring-sky-400 dark:text-slate-400"
              onClick={() => navigate({ view: 'components' })}
            >
              clear
            </button>
          </div>
          <p className="mb-2 text-sm text-slate-600 dark:text-slate-400">
            Used on {detail.count} route{detail.count === 1 ? '' : 's'}:
          </p>
          <ul className="text-sm">
            {detail.routes.map((r) => (
              <li key={r}>
                <button
                  type="button"
                  className="text-sky-600 hover:underline focus-visible:ring-2 focus-visible:ring-sky-400 dark:text-sky-400"
                  onClick={() => navigate({ view: 'inspector', route: r })}
                >
                  <code>{r}</code>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <table className="mb-8 w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
            <th scope="col" className="py-2 pr-4">Component</th>
            <th scope="col" className="w-24 py-2 pr-4">Routes</th>
            <th scope="col" className="py-2">Usage</th>
          </tr>
        </thead>
        <tbody>
          {usage.map((u) => (
            <tr key={u.name} className={`border-b border-slate-100 dark:border-slate-900 ${u.name === selected ? 'bg-sky-50 dark:bg-sky-950/40' : ''}`}>
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
              <td className="py-1.5 pr-4">{u.count}</td>
              <td className="py-1.5">
                <div aria-hidden="true" className="h-2 rounded bg-sky-500/80" style={{ width: `${(u.count / max) * 100}%` }} />
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
              <li key={entry.name} className="rounded border border-slate-200 p-3 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{entry.name}</span>
                  <Badge tone={used ? 'green' : 'amber'}>{used ? 'used' : 'unused'}</Badge>
                </div>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{entry.description}</p>
                {entry.placement && <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Placement: {entry.placement}</p>}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
