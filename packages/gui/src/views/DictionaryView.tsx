import { useMemo, useState } from 'react';
import type { GuiState, DictionaryEntry } from '../lib/types';
import { fetchDictionaryFor } from '../lib/api';
import { compareDictionaries } from '../lib/dictionaryCompare';
import { downloadCsv } from '../lib/export';
import { Badge } from '../components/Badge';

const CONTROL = 'rounded border border-slate-300 px-2 py-1 text-sm focus-visible:ring-2 focus-visible:ring-sky-400 disabled:opacity-50 dark:border-slate-700';

interface Comparison {
  language: string;
  entries: DictionaryEntry[];
}

export function DictionaryView({ state, initialFilter }: { state: GuiState; initialFilter?: string }) {
  const [filter, setFilter] = useState(initialFilter ?? '');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [compareLang, setCompareLang] = useState('');
  const [comparison, setComparison] = useState<Comparison | null>(null);
  const [comparing, setComparing] = useState(false);
  const [compareError, setCompareError] = useState<string | null>(null);

  const copyKey = async (key: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(key);
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 1500);
    } catch {
      // Clipboard unavailable (e.g. permissions) — the key is selectable text anyway.
    }
  };

  const startCompare = async (): Promise<void> => {
    const lang = compareLang.trim();
    if (lang === '' || lang === state.language) {
      setCompareError(lang === '' ? 'Enter a language to compare with.' : 'Pick a language other than the current one.');
      return;
    }
    setComparing(true);
    setCompareError(null);
    try {
      const result = await fetchDictionaryFor(lang);
      if (result.ok) setComparison({ language: result.language, entries: result.entries });
      else setCompareError(result.errors.join('; '));
    } catch (err) {
      setCompareError(String(err));
    } finally {
      setComparing(false);
    }
  };

  const compared = useMemo(
    () => (comparison !== null ? compareDictionaries(state.dictionary, comparison.entries) : null),
    [state.dictionary, comparison],
  );

  const sorted = useMemo(
    () => [...state.dictionary].sort((a, b) => a.key.localeCompare(b.key)),
    [state.dictionary],
  );

  const needle = filter.trim().toLowerCase();
  const filteredPlain = useMemo(
    () => (needle
      ? sorted.filter((e) => e.key.toLowerCase().includes(needle) || e.value.toLowerCase().includes(needle))
      : sorted),
    [sorted, needle],
  );
  const filteredCompared = useMemo(
    () => (compared === null ? [] : needle
      ? compared.rows.filter((r) =>
          r.key.toLowerCase().includes(needle)
          || (r.base ?? '').toLowerCase().includes(needle)
          || (r.other ?? '').toLowerCase().includes(needle))
      : compared.rows),
    [compared, needle],
  );

  const total = compared !== null ? compared.rows.length : state.dictionary.length;
  const shown = compared !== null ? filteredCompared.length : filteredPlain.length;

  const exportCsv = (): void => {
    if (compared !== null && comparison !== null) {
      downloadCsv(
        `dictionary-${state.site}-${state.language}-vs-${comparison.language}.csv`,
        ['key', state.language, comparison.language],
        filteredCompared.map((r) => [r.key, r.base ?? '', r.other ?? '']),
      );
    } else {
      downloadCsv(
        `dictionary-${state.site}-${state.language}.csv`,
        ['key', 'value'],
        filteredPlain.map((e) => [e.key, e.value]),
      );
    }
  };

  const missingCell = (
    <span className="text-xs"><Badge tone="amber">missing</Badge></span>
  );

  return (
    <div className="max-w-5xl">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold">Dictionary</h1>
        <span className="text-sm text-slate-500 dark:text-slate-400">
          {shown} of {total} ({state.language}{comparison !== null && <> vs {comparison.language}</>})
        </span>
        {comparison !== null && (
          <button
            type="button"
            onClick={() => { setComparison(null); setCompareError(null); }}
            title="Stop comparing"
            className="flex items-center gap-1 rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-800 hover:bg-sky-200 focus-visible:ring-2 focus-visible:ring-sky-400 dark:bg-sky-900/50 dark:text-sky-300 dark:hover:bg-sky-900"
          >
            vs {comparison.language} <span aria-hidden="true">✕</span>
          </button>
        )}
        <span className="ml-auto flex items-center gap-2">
          <input
            value={compareLang}
            onChange={(e) => setCompareLang(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') void startCompare(); }}
            placeholder="lang"
            aria-label="Language to compare with"
            className="w-16 rounded border border-slate-300 bg-transparent px-2 py-1 text-sm dark:border-slate-700"
          />
          <button type="button" className={CONTROL} disabled={comparing} onClick={() => void startCompare()}>
            {comparing ? 'Comparing…' : 'Compare'}
          </button>
          <button type="button" className={CONTROL} onClick={exportCsv} title="Download the current table as CSV" disabled={shown === 0}>
            CSV
          </button>
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter by key or phrase…"
            aria-label="Filter dictionary entries"
            className="w-64 rounded border border-slate-300 bg-transparent px-2 py-1 text-sm dark:border-slate-700"
          />
        </span>
      </div>

      {compareError !== null && (
        <p className="mb-4 text-sm text-amber-700 dark:text-amber-400">{compareError}</p>
      )}
      {compared !== null && comparison !== null && (
        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
          {compared.missingInOther} key{compared.missingInOther === 1 ? '' : 's'} missing in <strong>{comparison.language}</strong>,{' '}
          {compared.missingInBase} missing in <strong>{state.language}</strong>.
        </p>
      )}

      {state.dictionary.length === 0 && comparison === null ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No dictionary entries for this site/language. Use the language box in the header to switch languages.
        </p>
      ) : compared !== null && comparison !== null ? (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
              <th scope="col" className="w-1/3 py-2 pr-4">Key</th>
              <th scope="col" className="py-2 pr-4">{state.language}</th>
              <th scope="col" className="py-2">{comparison.language}</th>
            </tr>
          </thead>
          <tbody>
            {filteredCompared.map((row) => (
              <tr key={row.key} className="border-b border-slate-100 align-top hover:bg-slate-50 dark:border-slate-900 dark:hover:bg-slate-900/50">
                <td className="py-1.5 pr-4"><code className="break-all">{row.key}</code></td>
                <td className="whitespace-pre-wrap py-1.5 pr-4">{row.base === undefined ? missingCell : row.base}</td>
                <td className="whitespace-pre-wrap py-1.5">{row.other === undefined ? missingCell : row.other}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
              <th scope="col" className="w-1/3 py-2 pr-4">Key</th>
              <th scope="col" className="py-2">Phrase</th>
            </tr>
          </thead>
          <tbody>
            {filteredPlain.map((entry) => (
              <tr key={entry.key} className="group border-b border-slate-100 align-top hover:bg-slate-50 dark:border-slate-900 dark:hover:bg-slate-900/50">
                <td className="py-1.5 pr-4">
                  <code className="break-all">{entry.key}</code>
                  <button
                    type="button"
                    onClick={() => void copyKey(entry.key)}
                    title={`Copy "${entry.key}"`}
                    className={`ml-2 rounded px-1 text-xs text-slate-400 hover:text-sky-600 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-sky-400 group-hover:opacity-100 dark:text-slate-500 dark:hover:text-sky-400 ${copiedKey === entry.key ? 'opacity-100' : 'opacity-0'}`}
                  >
                    {copiedKey === entry.key ? '✓ copied' : 'copy'}
                  </button>
                </td>
                <td className="whitespace-pre-wrap py-1.5">{entry.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
