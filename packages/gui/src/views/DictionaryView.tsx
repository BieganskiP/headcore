import { useMemo, useState } from 'react';
import type { GuiState } from '../lib/types';

export function DictionaryView({ state }: { state: GuiState }) {
  const [filter, setFilter] = useState('');

  const sorted = useMemo(
    () => [...state.dictionary].sort((a, b) => a.key.localeCompare(b.key)),
    [state.dictionary],
  );

  const filtered = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    return needle
      ? sorted.filter((e) => e.key.toLowerCase().includes(needle) || e.value.toLowerCase().includes(needle))
      : sorted;
  }, [sorted, filter]);

  return (
    <div className="max-w-4xl">
      <div className="mb-4 flex items-center gap-3">
        <h1 className="text-xl font-semibold">Dictionary</h1>
        <span className="text-sm text-slate-500 dark:text-slate-400">
          {filtered.length} of {state.dictionary.length} ({state.language})
        </span>
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter by key or phrase…"
          aria-label="Filter dictionary entries"
          className="ml-auto w-64 rounded border border-slate-300 bg-transparent px-2 py-1 text-sm dark:border-slate-700"
        />
      </div>

      {state.dictionary.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No dictionary entries for this site/language. Use the language box in the header to switch languages.
        </p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
              <th scope="col" className="w-1/3 py-2 pr-4">Key</th>
              <th scope="col" className="py-2">Phrase</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((entry) => (
              <tr key={entry.key} className="border-b border-slate-100 align-top dark:border-slate-900">
                <td className="py-1.5 pr-4"><code className="break-all">{entry.key}</code></td>
                <td className="whitespace-pre-wrap py-1.5">{entry.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
