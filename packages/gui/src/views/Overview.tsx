import type { ReactNode } from 'react';
import type { GuiState } from '../lib/types';
import type { View } from '../lib/router';
import { usageCounts, registryCoverage, freshness, routeComplexity } from '../lib/analytics';
import { diffStates, isEmptyDiff, type StateDiff } from '../lib/diff';
import { FRESH_META } from '../lib/freshnessMeta';

function StatCard({ label, value, hint, onClick }: { label: string; value: string | number; hint?: string; onClick?: () => void }) {
  const body = (
    <>
      <div className="font-mono text-2xl font-semibold tabular-nums tracking-tight">{value}</div>
      <div className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">{label}</div>
      {hint && <div className="mt-1 text-xs text-slate-400 dark:text-slate-500">{hint}</div>}
    </>
  );
  const base = 'rounded-xl border border-slate-200 bg-white/60 p-4 text-left dark:border-slate-800 dark:bg-slate-900/40';
  if (!onClick) return <div className={base}>{body}</div>;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${base} hover:-translate-y-0.5 hover:border-sky-400 hover:shadow-md hover:shadow-sky-500/5 focus-visible:ring-2 focus-visible:ring-sky-400 dark:hover:border-sky-600`}
    >
      {body}
    </button>
  );
}

function DiffList({ label, items, render }: { label: string; items: string[]; render: (item: string) => ReactNode }) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-wrap items-baseline gap-1.5 text-sm">
      <span className="font-medium text-slate-600 dark:text-slate-400">{label}:</span>
      {items.slice(0, 15).map(render)}
      {items.length > 15 && <span className="text-slate-400 dark:text-slate-500">…and {items.length - 15} more</span>}
    </div>
  );
}

function ChangesSection({ diff, prev, state, navigate }: { diff: StateDiff; prev: GuiState; state: GuiState; navigate: (v: View) => void }) {
  const at = (iso: string): string => new Date(iso).toLocaleTimeString();
  const routeLink = (extra: string) => function RouteItem(path: string) {
    return (
      <button key={`${extra}${path}`} type="button" className="text-sky-600 hover:underline focus-visible:ring-2 focus-visible:ring-sky-400 dark:text-sky-400" onClick={() => navigate({ view: 'inspector', route: path })}>
        <code>{path}</code>
      </button>
    );
  };
  return (
    <section className="mb-8 rounded-lg border border-sky-200 bg-sky-50/50 p-4 dark:border-sky-900 dark:bg-sky-950/30">
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        Changes since {at(prev.fetchedAt)} (now {at(state.fetchedAt)})
      </h2>
      {isEmptyDiff(diff) ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">No changes between the two fetches.</p>
      ) : (
        <div className="space-y-1.5">
          <DiffList label={`Routes added (${diff.routesAdded.length})`} items={diff.routesAdded} render={routeLink('add:')} />
          <DiffList label={`Routes removed (${diff.routesRemoved.length})`} items={diff.routesRemoved} render={(p) => <code key={`rm:${p}`} className="text-slate-500 line-through dark:text-slate-400">{p}</code>} />
          <DiffList label={`Routes changed (${diff.routesChanged.length})`} items={diff.routesChanged} render={routeLink('chg:')} />
          <DiffList
            label={`Components appeared (${diff.componentsAdded.length})`}
            items={diff.componentsAdded}
            render={(c) => (
              <button key={`ca:${c}`} type="button" className="text-sky-600 hover:underline focus-visible:ring-2 focus-visible:ring-sky-400 dark:text-sky-400" onClick={() => navigate({ view: 'components', component: c })}>
                {c}
              </button>
            )}
          />
          <DiffList label={`Components disappeared (${diff.componentsRemoved.length})`} items={diff.componentsRemoved} render={(c) => <span key={`cr:${c}`} className="text-slate-500 line-through dark:text-slate-400">{c}</span>} />
          {(diff.dictionaryAdded.length > 0 || diff.dictionaryRemoved.length > 0) && (
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Dictionary: {diff.dictionaryAdded.length > 0 && <>+{diff.dictionaryAdded.length} key{diff.dictionaryAdded.length === 1 ? '' : 's'}</>}
              {diff.dictionaryAdded.length > 0 && diff.dictionaryRemoved.length > 0 && ', '}
              {diff.dictionaryRemoved.length > 0 && <>−{diff.dictionaryRemoved.length} key{diff.dictionaryRemoved.length === 1 ? '' : 's'}</>}
            </p>
          )}
        </div>
      )}
    </section>
  );
}

export function Overview({ state, prev, navigate }: { state: GuiState; prev: GuiState | null; navigate: (v: View) => void }) {
  const usage = usageCounts(state.routes, state.registry);
  const coverage = registryCoverage(state.routes, state.registry);
  const buckets = freshness(state.routes, new Date());
  const emptyRoutes = state.routes.filter((r) => r.components.length === 0);
  const total = state.routes.length || 1;
  const complexity = routeComplexity(state.routes);
  const renderings = complexity.reduce((acc, c) => acc + c.renderings, 0);
  const heaviest = complexity.filter((c) => c.renderings > 0).slice(0, 5);
  const diff = prev !== null ? diffStates(prev, state) : null;

  return (
    <div className="max-w-4xl">
      <h1 className="mb-4 text-xl font-semibold">Overview</h1>

      {diff !== null && prev !== null && (
        <ChangesSection diff={diff} prev={prev} state={state} navigate={navigate} />
      )}

      <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <StatCard label="Routes" value={state.routes.length} onClick={() => navigate({ view: 'routes' })} />
        <StatCard label="Components in use" value={usage.length} onClick={() => navigate({ view: 'components' })} />
        <StatCard
          label="Renderings"
          value={renderings}
          hint="component instances across all routes"
          onClick={() => navigate({ view: 'graph' })}
        />
        <StatCard
          label="Registry coverage"
          value={`${coverage.used.length}/${state.registry.length}`}
          hint="headcore components used on this site"
          onClick={() => navigate({ view: 'components' })}
        />
        <StatCard label="Dictionary entries" value={state.dictionary.length} onClick={() => navigate({ view: 'dictionary' })} />
      </div>

      <section className="mb-8">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Freshness (last updated)
        </h2>
        <div className="flex h-2.5 w-full gap-0.5">
          {FRESH_META.map(({ key, tone }) =>
            buckets[key] > 0 ? (
              <div key={key} className={`${tone} rounded-full`} style={{ width: `${(buckets[key] / total) * 100}%` }} title={`${key}: ${buckets[key]}`} />
            ) : null,
          )}
        </div>
        <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400">
          {FRESH_META.map(({ key, label, tone }) => (
            <button
              key={key}
              type="button"
              disabled={buckets[key] === 0}
              onClick={() => navigate({ view: 'routes', fresh: key })}
              title={buckets[key] === 0 ? undefined : `Show the ${buckets[key]} route${buckets[key] === 1 ? '' : 's'} updated ${label}`}
              className="flex items-center gap-1 rounded px-1 py-0.5 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-sky-400 disabled:opacity-50 dark:hover:bg-slate-800"
            >
              <span className={`inline-block h-2 w-2 rounded-sm ${tone}`} />
              {label}: {buckets[key]}
            </button>
          ))}
        </div>
      </section>

      {heaviest.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Heaviest routes
          </h2>
          <ul className="text-sm">
            {heaviest.map((c) => (
              <li key={c.route.routePath} className="flex items-baseline gap-2 py-0.5">
                <button
                  type="button"
                  className="text-sky-600 hover:underline focus-visible:ring-2 focus-visible:ring-sky-400 dark:text-sky-400"
                  onClick={() => navigate({ view: 'inspector', route: c.route.routePath })}
                >
                  <code>{c.route.routePath}</code>
                </button>
                <span className="text-slate-500 dark:text-slate-400">
                  {c.renderings} rendering{c.renderings === 1 ? '' : 's'} · depth {c.maxDepth}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {emptyRoutes.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Routes without components ({emptyRoutes.length})
          </h2>
          <ul className="text-sm">
            {emptyRoutes.slice(0, 20).map((r) => (
              <li key={r.routePath}>
                <button type="button" className="text-sky-600 hover:underline focus-visible:ring-2 focus-visible:ring-sky-400 dark:text-sky-400" onClick={() => navigate({ view: 'inspector', route: r.routePath })}>
                  {r.routePath}
                </button>
              </li>
            ))}
            {emptyRoutes.length > 20 && (
              <li className="text-slate-400 dark:text-slate-500">…and {emptyRoutes.length - 20} more (see Routes)</li>
            )}
          </ul>
        </section>
      )}

      {coverage.unused.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Unused registry components
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {coverage.unused.map((e) => e.name).join(', ')} — available via <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">headcore add</code>.
          </p>
        </section>
      )}
    </div>
  );
}
