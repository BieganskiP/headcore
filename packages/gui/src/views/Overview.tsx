import type { GuiState } from '../lib/types';
import type { View } from '../lib/router';
import { usageCounts, registryCoverage, freshness } from '../lib/analytics';

function StatCard({ label, value, hint, onClick }: { label: string; value: string | number; hint?: string; onClick?: () => void }) {
  const body = (
    <>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm font-medium text-slate-600 dark:text-slate-400">{label}</div>
      {hint && <div className="mt-1 text-xs text-slate-400 dark:text-slate-500">{hint}</div>}
    </>
  );
  const base = 'rounded-lg border border-slate-200 p-4 text-left dark:border-slate-800';
  if (!onClick) return <div className={base}>{body}</div>;
  return (
    <button
      onClick={onClick}
      className={`${base} hover:border-sky-400 focus-visible:ring-2 focus-visible:ring-sky-400 dark:hover:border-sky-600`}
    >
      {body}
    </button>
  );
}

const BUCKET_LABELS: Array<{ key: 'week' | 'month' | 'quarter' | 'older' | 'unknown'; label: string; tone: string }> = [
  { key: 'week', label: '≤ 7d', tone: 'bg-emerald-500' },
  { key: 'month', label: '≤ 30d', tone: 'bg-sky-500' },
  { key: 'quarter', label: '≤ 90d', tone: 'bg-amber-500' },
  { key: 'older', label: '> 90d', tone: 'bg-red-500' },
  { key: 'unknown', label: 'unknown', tone: 'bg-slate-400' },
];

export function Overview({ state, navigate }: { state: GuiState; navigate: (v: View) => void }) {
  const usage = usageCounts(state.routes, state.registry);
  const coverage = registryCoverage(state.routes, state.registry);
  const buckets = freshness(state.routes, new Date());
  const emptyRoutes = state.routes.filter((r) => r.components.length === 0);
  const total = state.routes.length || 1;

  return (
    <div className="max-w-4xl">
      <h1 className="mb-4 text-xl font-semibold">Overview</h1>

      <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Routes" value={state.routes.length} onClick={() => navigate({ view: 'routes' })} />
        <StatCard label="Components in use" value={usage.length} onClick={() => navigate({ view: 'components' })} />
        <StatCard
          label="Registry coverage"
          value={`${coverage.used.length}/${state.registry.length}`}
          hint="headcore components used on this site"
          onClick={() => navigate({ view: 'components' })}
        />
        <StatCard label="Dictionary entries" value={state.dictionaryCount} />
      </div>

      <section className="mb-8">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Freshness (last updated)
        </h2>
        <div className="flex h-3 w-full overflow-hidden rounded">
          {BUCKET_LABELS.map(({ key, tone }) =>
            buckets[key] > 0 ? (
              <div key={key} className={tone} style={{ width: `${(buckets[key] / total) * 100}%` }} title={`${key}: ${buckets[key]}`} />
            ) : null,
          )}
        </div>
        <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400">
          {BUCKET_LABELS.map(({ key, label, tone }) => (
            <span key={key} className="flex items-center gap-1">
              <span className={`inline-block h-2 w-2 rounded-sm ${tone}`} />
              {label}: {buckets[key]}
            </span>
          ))}
        </div>
      </section>

      {emptyRoutes.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Routes without components ({emptyRoutes.length})
          </h2>
          <ul className="text-sm">
            {emptyRoutes.slice(0, 20).map((r) => (
              <li key={r.routePath}>
                <button className="text-sky-600 hover:underline focus-visible:ring-2 focus-visible:ring-sky-400 dark:text-sky-400" onClick={() => navigate({ view: 'inspector', route: r.routePath })}>
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
