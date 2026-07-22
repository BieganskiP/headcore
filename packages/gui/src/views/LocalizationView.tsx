import { useEffect, useMemo, useRef, useState } from 'react';
import type { GuiState, RouteInfo } from '../lib/types';
import type { View } from '../lib/router';
import { fetchRoutesFor } from '../lib/api';
import { buildLocalizationMatrix, parseLangList, type LangCell, type LangCellStatus } from '../lib/localization';
import { downloadCsv } from '../lib/export';
import { Badge } from '../components/Badge';

const CONTROL = 'rounded border border-slate-300 px-2 py-1 text-sm focus-visible:ring-2 focus-visible:ring-sky-400 disabled:opacity-50 dark:border-slate-700';
const STORAGE_KEY = 'headcore-langs';

// localStorage can throw (private mode, quota); the language list is a nicety.
function readStoredLangs(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
}

function storeLangs(value: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // Not persisted — comparing still works.
  }
}

const TONE: Record<LangCellStatus, 'green' | 'amber' | 'red'> = { ok: 'green', stale: 'amber', missing: 'red' };

interface LangRoutes {
  language: string;
  routes: RouteInfo[];
}

export function LocalizationView({ state, langs, navigate }: { state: GuiState; langs?: string; navigate: (v: View) => void }) {
  const [input, setInput] = useState(() => {
    if (langs !== undefined && langs.trim() !== '') return langs;
    return readStoredLangs();
  });
  const [comparing, setComparing] = useState(false);
  const [failures, setFailures] = useState<string[]>([]);
  const [comparisons, setComparisons] = useState<LangRoutes[] | null>(null);

  const runCompare = async (raw: string): Promise<void> => {
    const languages = parseLangList(raw, state.language);
    if (languages.length === 0) {
      setComparisons(null);
      setFailures(raw.trim() === '' ? [] : [`Nothing to compare — ${state.language} is the baseline and cannot be compared with itself.`]);
      return;
    }
    setComparing(true);
    setFailures([]);
    const settled = await Promise.all(languages.map(async (lang) => {
      try {
        return { lang, result: await fetchRoutesFor(lang) };
      } catch (err) {
        return { lang, result: { ok: false as const, errors: [String(err)] } };
      }
    }));
    const ok: LangRoutes[] = [];
    const failed: string[] = [];
    for (const { lang, result } of settled) {
      if (result.ok) ok.push({ language: result.language, routes: result.routes });
      else failed.push(`${lang}: ${result.errors.join('; ')}`);
    }
    setComparisons(ok);
    setFailures(failed);
    setComparing(false);
  };

  // The langs value whose comparison is currently applied (or in flight);
  // compare() records it before navigating so the prop effect does not
  // re-fetch the comparison it just started.
  const appliedLangs = useRef<string | null>(null);

  const compare = (): void => {
    const languages = parseLangList(input, state.language);
    if (languages.length > 0) {
      storeLangs(languages.join(', '));
      appliedLangs.current = languages.join(',');
      navigate({ view: 'localization', langs: languages.join(',') });
    }
    void runCompare(input);
  };

  // Deep links (#/localization?langs=…) load their comparison on arrival, and
  // back/forward between two langs values re-runs it — App keeps this view
  // mounted across hash changes, so the prop must be watched, not just read.
  useEffect(() => {
    if (langs === undefined || langs.trim() === '') return;
    if (appliedLangs.current === langs) return;
    appliedLangs.current = langs;
    setInput(langs);
    void runCompare(langs);
    // runCompare is stable in behavior (state setters + fetch); langs is the trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [langs]);

  const matrix = useMemo(
    () => (comparisons !== null && comparisons.length > 0 ? buildLocalizationMatrix(state.routes, comparisons) : null),
    [state.routes, comparisons],
  );

  const exportCsv = (): void => {
    if (matrix === null || comparisons === null) return;
    const langNames = comparisons.map((c) => c.language);
    downloadCsv(
      `localization-${state.site}-${state.language}-vs-${langNames.join('-')}.csv`,
      ['route', `${state.language} updated`, ...langNames.flatMap((l) => [l, `${l} updated`])],
      matrix.rows.map((row) => [
        row.routePath,
        row.base === null ? 'missing' : row.base.updatedAt ?? '',
        ...langNames.flatMap((l): string[] => {
          const cell: LangCell | undefined = row.cells[l];
          return cell === undefined ? ['missing', ''] : [cell.status, cell.updatedAt ?? ''];
        }),
      ]),
    );
  };

  return (
    <div className="max-w-5xl">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold">Localization</h1>
        {matrix !== null && (
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {matrix.rows.length} route{matrix.rows.length === 1 ? '' : 's'} · baseline {state.language}
          </span>
        )}
        <span className="ml-auto flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') compare(); }}
            placeholder="da, de"
            aria-label="Languages to compare, comma-separated"
            className="w-40 rounded border border-slate-300 bg-transparent px-2 py-1 text-sm dark:border-slate-700"
          />
          <button type="button" className={CONTROL} disabled={comparing} onClick={compare}>
            {comparing ? 'Comparing…' : 'Compare'}
          </button>
          <button type="button" className={CONTROL} onClick={exportCsv} title="Download the coverage matrix as CSV" disabled={matrix === null}>
            CSV
          </button>
        </span>
      </div>

      {failures.length > 0 && (
        <p className="mb-4 text-sm text-amber-700 dark:text-amber-400">
          {failures.map((f) => <span key={f} className="block">{f}</span>)}
        </p>
      )}

      {matrix === null || comparisons === null ? (
        <p className="max-w-2xl text-sm text-slate-500 dark:text-slate-400">
          Enter comma-separated language codes (e.g. <code>da, de</code>) and press Compare to see which routes
          have translations. The currently loaded language (<strong>{state.language}</strong>) is the baseline —
          every route is checked for a version in each compared language.
        </p>
      ) : (
        <>
          <div className="mb-2 flex flex-wrap gap-2">
            {matrix.summaries.map((s) => (
              <Badge
                key={s.language}
                tone={s.missing === 0 && s.stale === 0 ? 'green' : s.translated === 0 ? 'red' : 'amber'}
              >
                {s.language}: {s.translated}/{s.translated + s.missing} translated{s.stale > 0 && `, ${s.stale} stale`} ({s.pct}%)
              </Badge>
            ))}
          </div>
          <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
            stale = translation older than the {state.language} version · missing = no version of the route in that language
          </p>

          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <th scope="col" className="py-2 pr-4">Route</th>
                <th scope="col" className="py-2 pr-4">{state.language} (base)</th>
                {comparisons.map((c) => (
                  <th key={c.language} scope="col" className="py-2 pr-4">{c.language}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrix.rows.map((row) => (
                <tr key={row.routePath} className="border-b border-slate-100 align-top hover:bg-slate-50 dark:border-slate-900 dark:hover:bg-slate-900/50">
                  <td className="py-1.5 pr-4">
                    <button
                      type="button"
                      onClick={() => navigate({ view: 'inspector', route: row.routePath })}
                      title={`Inspect ${row.routePath}`}
                      className="text-sky-600 hover:underline focus-visible:ring-2 focus-visible:ring-sky-400 dark:text-sky-400"
                    >
                      <code>{row.routePath}</code>
                    </button>
                  </td>
                  <td className="py-1.5 pr-4 font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400">
                    {row.base === null
                      ? <span title={`${row.routePath} has no ${state.language} version`}><Badge tone="slate">not in {state.language}</Badge></span>
                      : row.base.updatedAt ?? '—'}
                  </td>
                  {comparisons.map((c) => {
                    const cell: LangCell | undefined = row.cells[c.language];
                    const status: LangCellStatus = cell?.status ?? 'missing';
                    const title = status === 'missing'
                      ? `No ${c.language} version of ${row.routePath}`
                      : `Updated ${cell?.updatedAt ?? 'unknown'}`;
                    return (
                      <td key={c.language} className="whitespace-nowrap py-1.5 pr-4">
                        <span title={title}><Badge tone={TONE[status]}>{status}</Badge></span>
                        {cell?.updatedAt != null && (
                          <span className="ml-2 font-mono text-xs tabular-nums text-slate-400 dark:text-slate-500">{cell.updatedAt}</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
