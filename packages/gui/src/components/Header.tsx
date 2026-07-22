import { useState } from 'react';
import type { GuiState } from '../lib/types';
import { downloadJson } from '../lib/export';
import { useTheme, nextTheme, type Theme } from '../lib/theme';

const THEME_LABEL: Record<Theme, string> = { system: 'Auto', light: 'Light', dark: 'Dark' };
const THEME_ICON: Record<Theme, string> = { system: '◐', light: '☀', dark: '☾' };

export function Header({ state, busy, warnings, onRefresh, onOpenSearch }: {
  state: GuiState | null;
  busy: boolean;
  warnings: string[];
  onRefresh: (lang?: string) => void;
  onOpenSearch: () => void;
}) {
  const [lang, setLang] = useState('');
  const [theme, setTheme] = useTheme();

  return (
    <header className="flex items-center gap-2.5 border-b border-slate-200 px-6 py-3 dark:border-slate-800">
      <div className="min-w-0 flex-1 truncate font-mono text-[13px] text-slate-500 dark:text-slate-400">
        {state ? (
          <>
            <span className="font-semibold text-slate-900 dark:text-slate-100">{state.site}</span>
            <span className="mx-1.5 text-slate-300 dark:text-slate-600">/</span>
            <span className="text-sky-600 dark:text-sky-400">{state.language}</span>
            <span className="mx-1.5 text-slate-300 dark:text-slate-600">/</span>
            fetched {new Date(state.fetchedAt).toLocaleTimeString()}
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
      {state && (
        <button
          type="button"
          onClick={() => downloadJson(`headcore-${state.site}-${state.language}.json`, state)}
          className={UTILITY_BUTTON}
          title="Download the full dashboard state as JSON"
        >
          Export
        </button>
      )}
      <button
        type="button"
        onClick={() => setTheme(nextTheme(theme))}
        className={UTILITY_BUTTON}
        title={`Theme: ${THEME_LABEL[theme]} — click to switch`}
        aria-label={`Theme: ${THEME_LABEL[theme]}. Switch to ${THEME_LABEL[nextTheme(theme)]}`}
      >
        <span aria-hidden="true">{THEME_ICON[theme]}</span> {THEME_LABEL[theme]}
      </button>
      {state && (
        <button
          type="button"
          onClick={onOpenSearch}
          className={`flex items-center gap-2 ${UTILITY_BUTTON}`}
          title="Search routes, components, and dictionary"
        >
          Search…
          <kbd className="rounded border border-slate-200 bg-slate-100 px-1 font-mono text-[10px] text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">Ctrl K</kbd>
        </button>
      )}
      <input
        value={lang}
        onChange={(e) => setLang(e.target.value)}
        placeholder={state?.language ?? 'lang'}
        className="w-16 rounded-md border border-slate-300 bg-transparent px-2 py-1 font-mono text-sm dark:border-slate-700"
        aria-label="Language"
      />
      <button
        onClick={() => onRefresh(lang.trim() || undefined)}
        disabled={busy}
        className="rounded-md bg-sky-600 px-3 py-1 text-sm font-medium text-white shadow-sm hover:bg-sky-500 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-sky-400"
      >
        {busy ? 'Refreshing…' : 'Refresh'}
      </button>
    </header>
  );
}

const UTILITY_BUTTON = 'rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-500 hover:border-sky-400 hover:text-slate-700 focus-visible:ring-2 focus-visible:ring-sky-400 dark:border-slate-700 dark:text-slate-400 dark:hover:text-slate-200';
