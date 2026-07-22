import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { GuiState, GuiSnapshotMeta } from '../lib/types';
import type { View } from '../lib/router';
import { fetchHistoryList, fetchHistorySnapshot } from '../lib/api';
import { diffStates, isEmptyDiff, type StateDiff } from '../lib/diff';
import { buildTrends, sparklinePath, snapshotDelta, type TrendKey } from '../lib/history';

const CONTROL = 'rounded border border-slate-300 px-2 py-1 text-sm focus-visible:ring-2 focus-visible:ring-sky-400 disabled:opacity-50 dark:border-slate-700';

const COLUMNS: Array<{ key: TrendKey; label: string }> = [
  { key: 'routes', label: 'Routes' },
  { key: 'renderings', label: 'Renderings' },
  { key: 'components', label: 'Components' },
  { key: 'dictionaryEntries', label: 'Dictionary' },
];

function Delta({ n }: { n: number }) {
  if (n === 0) return null;
  return (
    <span className={`ml-1 font-mono text-xs ${n > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
      {n > 0 ? `+${n}` : `−${-n}`}
    </span>
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

function SnapshotDiffSection({ diff, a, b, navigate }: { diff: StateDiff; a: GuiState; b: GuiState; navigate: (v: View) => void }) {
  const at = (iso: string): string => new Date(iso).toLocaleString();
  const routeLink = (prefix: string) => function RouteItem(path: string) {
    return (
      <button key={`${prefix}${path}`} type="button" className="text-sky-600 hover:underline focus-visible:ring-2 focus-visible:ring-sky-400 dark:text-sky-400" onClick={() => navigate({ view: 'inspector', route: path })}>
        <code>{path}</code>
      </button>
    );
  };
  return (
    <section className="mb-8 rounded-lg border border-sky-200 bg-sky-50/50 p-4 dark:border-sky-900 dark:bg-sky-950/30">
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        A ({at(a.fetchedAt)}) → B ({at(b.fetchedAt)})
      </h2>
      {isEmptyDiff(diff) ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">No changes between the two snapshots.</p>
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

interface ComparisonResult {
  a: GuiState;
  b: GuiState;
  diff: StateDiff | null;
}

export function HistoryView({ state, navigate }: { state: GuiState; navigate: (v: View) => void }) {
  const [snapshots, setSnapshots] = useState<GuiSnapshotMeta[] | null>(null);
  const [loadErrors, setLoadErrors] = useState<string[] | null>(null);
  const [selA, setSelA] = useState<string | null>(null);
  const [selB, setSelB] = useState<string | null>(null);
  const [comparing, setComparing] = useState(false);
  const [compareError, setCompareError] = useState<string | null>(null);
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);

  useEffect(() => {
    let active = true;
    setSnapshots(null);
    setLoadErrors(null);
    setComparison(null);
    setCompareError(null);
    void (async () => {
      try {
        const result = await fetchHistoryList();
        if (!active) return;
        if (result.ok) {
          setSnapshots(result.snapshots);
          const matched = result.snapshots
            .filter((s) => s.site === state.site && s.language === state.language)
            .sort((x, y) => y.fetchedAt.localeCompare(x.fetchedAt));
          // Default to comparing the two most recent snapshots: A = older, B = newer.
          setSelB(matched.length > 0 ? matched[0].id : null);
          setSelA(matched.length > 1 ? matched[1].id : null);
        } else {
          setLoadErrors(result.errors);
        }
      } catch (err) {
        if (active) setLoadErrors([String(err)]);
      }
    })();
    return () => { active = false; };
    // fetchedAt: a header Refresh just persisted a new snapshot — reload the list.
  }, [state.site, state.language, state.fetchedAt]);

  const matching = useMemo(
    () => (snapshots ?? [])
      .filter((s) => s.site === state.site && s.language === state.language)
      .sort((a, b) => b.fetchedAt.localeCompare(a.fetchedAt)),
    [snapshots, state.site, state.language],
  );
  const otherCount = snapshots !== null ? snapshots.length - matching.length : 0;

  const trends = useMemo(
    () => (snapshots !== null ? buildTrends(snapshots, state.site, state.language) : []),
    [snapshots, state.site, state.language],
  );

  const runCompare = async (): Promise<void> => {
    if (selA === null || selB === null) return;
    setComparing(true);
    setCompareError(null);
    setComparison(null);
    try {
      const [ra, rb] = await Promise.all([fetchHistorySnapshot(selA), fetchHistorySnapshot(selB)]);
      if (!ra.ok || !rb.ok) {
        const errors = [...(ra.ok ? [] : ra.errors), ...(rb.ok ? [] : rb.errors)];
        setCompareError(`Could not load snapshot: ${errors.join('; ')}. It may have been pruned from .headcore/history — reload this view to refresh the list.`);
        return;
      }
      setComparison({ a: ra.state, b: rb.state, diff: diffStates(ra.state, rb.state) });
    } catch (err) {
      setCompareError(String(err));
    } finally {
      setComparing(false);
    }
  };

  if (loadErrors !== null) {
    return (
      <div className="max-w-5xl">
        <h1 className="mb-4 text-xl font-semibold">History</h1>
        <p className="text-sm text-amber-700 dark:text-amber-400">{loadErrors.join('; ')}</p>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Snapshots are saved to <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">.headcore/history</code> next to your headcore config on every refresh.
        </p>
      </div>
    );
  }

  if (snapshots === null) {
    return (
      <div className="max-w-5xl">
        <h1 className="mb-4 text-xl font-semibold">History</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Loading history…</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold">History</h1>
        <span className="text-sm text-slate-500 dark:text-slate-400">
          {matching.length} snapshot{matching.length === 1 ? '' : 's'} ({state.site} / {state.language})
        </span>
        <span className="ml-auto">
          <button
            type="button"
            className={CONTROL}
            disabled={comparing || selA === null || selB === null || selA === selB}
            onClick={() => void runCompare()}
            title="Diff the two snapshots picked in the A and B columns"
          >
            {comparing ? 'Comparing…' : 'Compare A → B'}
          </button>
        </span>
      </div>

      {otherCount > 0 && (
        <p className="mb-4 text-xs text-slate-400 dark:text-slate-500">
          {otherCount} snapshot{otherCount === 1 ? '' : 's'} for other sites or languages not shown.
        </p>
      )}

      {matching.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No snapshots for this site and language yet. Snapshots are saved to{' '}
          <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">.headcore/history</code> next to your headcore config on every refresh.
        </p>
      ) : (
        <>
          {matching.length < 2 ? (
            <p className="mb-8 text-sm text-slate-500 dark:text-slate-400">Trends appear after a few distinct fetches.</p>
          ) : (
            <div className="mb-8 grid grid-cols-2 gap-3 xl:grid-cols-4">
              {trends.map((t) => {
                const values = t.points.map((p) => p.value);
                const latest = values[values.length - 1];
                return (
                  <div key={t.key} className="rounded-xl border border-slate-200 bg-white/60 p-4 dark:border-slate-800 dark:bg-slate-900/40">
                    <div className="font-mono text-2xl font-semibold tabular-nums tracking-tight">{latest}</div>
                    <div className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">{t.label}</div>
                    <div className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                      min {Math.min(...values)} · max {Math.max(...values)}
                    </div>
                    <svg width={180} height={40} className="mt-2" role="img" aria-label={`${t.label} over time`}>
                      <path d={sparklinePath(t.points, 180, 40)} fill="none" strokeWidth={1.5} className="stroke-sky-500" />
                    </svg>
                  </div>
                );
              })}
            </div>
          )}

          {compareError !== null && (
            <p className="mb-4 text-sm text-amber-700 dark:text-amber-400">{compareError}</p>
          )}
          {comparison !== null && (
            comparison.diff === null ? (
              <p className="mb-4 text-sm text-amber-700 dark:text-amber-400">
                The two snapshots cover different sites or languages, so they are not comparable.
              </p>
            ) : (
              <SnapshotDiffSection diff={comparison.diff} a={comparison.a} b={comparison.b} navigate={navigate} />
            )
          )}

          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <th scope="col" className="py-2 pr-4">Fetched</th>
                {COLUMNS.map((c) => (
                  <th key={c.key} scope="col" className="py-2 pr-4">{c.label}</th>
                ))}
                <th scope="col" className="py-2 pr-2 text-center">A</th>
                <th scope="col" className="py-2 text-center">B</th>
              </tr>
            </thead>
            <tbody>
              {matching.map((s, i) => {
                // Deltas compare against the next row, which is the previous (older) fetch.
                const older = i + 1 < matching.length ? matching[i + 1] : null;
                const delta = older !== null ? snapshotDelta(older, s) : null;
                const when = new Date(s.fetchedAt).toLocaleString();
                return (
                  <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50 dark:border-slate-900 dark:hover:bg-slate-900/50">
                    <td className="whitespace-nowrap py-1.5 pr-4">{when}</td>
                    {COLUMNS.map((c) => (
                      <td key={c.key} className="py-1.5 pr-4 tabular-nums">
                        {s[c.key]}
                        {delta !== null && <Delta n={delta[c.key]} />}
                      </td>
                    ))}
                    <td className="py-1.5 pr-2 text-center">
                      <input
                        type="radio"
                        name="history-compare-a"
                        checked={selA === s.id}
                        onChange={() => setSelA(s.id)}
                        aria-label={`Compare side A: snapshot from ${when}`}
                        className="accent-sky-500 focus-visible:ring-2 focus-visible:ring-sky-400"
                      />
                    </td>
                    <td className="py-1.5 text-center">
                      <input
                        type="radio"
                        name="history-compare-b"
                        checked={selB === s.id}
                        onChange={() => setSelB(s.id)}
                        aria-label={`Compare side B: snapshot from ${when}`}
                        className="accent-sky-500 focus-visible:ring-2 focus-visible:ring-sky-400"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      )}

      <p className="mt-6 text-xs text-slate-400 dark:text-slate-500">
        Snapshots are saved to <code>.headcore/history</code> on every refresh; identical fetches are recorded once.
        The newest snapshot usually matches what you are viewing now — the current in-memory state itself is not part of history.
      </p>
    </div>
  );
}
