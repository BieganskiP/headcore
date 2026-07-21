import { useState } from 'react';
import type { GuiState } from '../lib/types';

export function Header({ state, busy, warnings, onRefresh }: {
  state: GuiState | null;
  busy: boolean;
  warnings: string[];
  onRefresh: (lang?: string) => void;
}) {
  const [lang, setLang] = useState('');

  return (
    <header className="flex items-center gap-3 border-b border-slate-200 px-6 py-3 dark:border-slate-800">
      <div className="min-w-0 flex-1 truncate text-sm text-slate-500 dark:text-slate-400">
        {state ? (
          <>
            <span className="font-semibold text-slate-900 dark:text-slate-100">{state.site}</span>
            {' · '}{state.language}{' · fetched '}{new Date(state.fetchedAt).toLocaleTimeString()}
          </>
        ) : (
          'not connected'
        )}
        {warnings.length > 0 && state && (
          <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-300" title={warnings.join('\n')}>
            {warnings.length} warning{warnings.length === 1 ? '' : 's'}
          </span>
        )}
      </div>
      <input
        value={lang}
        onChange={(e) => setLang(e.target.value)}
        placeholder={state?.language ?? 'lang'}
        className="w-16 rounded border border-slate-300 bg-transparent px-2 py-1 text-sm dark:border-slate-700"
        aria-label="Language"
      />
      <button
        onClick={() => onRefresh(lang.trim() || undefined)}
        disabled={busy}
        className="rounded bg-sky-600 px-3 py-1 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
      >
        {busy ? 'Refreshing…' : 'Refresh'}
      </button>
    </header>
  );
}
