import { useMemo, useState } from 'react';
import type { GuiState } from '../lib/types';
import type { View } from '../lib/router';
import { buildSearchIndex, searchEntries, type SearchEntry } from '../lib/search';
import { Badge } from './Badge';

const KIND_TONE = { route: 'slate', component: 'green', dictionary: 'amber' } as const;

/** Modal search over routes, components, and dictionary keys. Mounted only while open. */
export function CommandPalette({ state, onClose, navigate }: {
  state: GuiState;
  onClose: () => void;
  navigate: (v: View) => void;
}) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const index = useMemo(() => buildSearchIndex(state), [state]);
  const results = useMemo(() => searchEntries(index, query), [index, query]);

  // The "search content" row is appended after the results whenever there is a query.
  const hasContentRow = query.trim() !== '';
  const total = results.length + (hasContentRow ? 1 : 0);

  const pick = (entry: SearchEntry): void => {
    navigate(entry.view);
    onClose();
  };

  const pickContent = (): void => {
    navigate({ view: 'content', q: query.trim() });
    onClose();
  };

  // Escape lives on the dialog (not the input) so it also works when focus
  // has moved into the results list.
  const onKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, total - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter') {
      if (results[active]) pick(results[active]);
      else if (hasContentRow && active === results.length) pickContent();
    }
  };

  const clamped = Math.min(active, Math.max(0, total - 1));

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/40 pt-24 backdrop-blur-[2px]"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search routes, components, and dictionary"
        className="animate-enter w-full max-w-lg overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/10 dark:border-slate-700 dark:bg-slate-950"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
      >
        <input
          autoFocus
          value={query}
          onChange={(e) => { setQuery(e.target.value); setActive(0); }}
          onKeyDown={onKeyDown}
          placeholder="Search routes, components, dictionary…"
          aria-label="Search"
          role="combobox"
          aria-expanded={total > 0}
          aria-controls="palette-results"
          aria-activedescendant={total > 0 ? `palette-opt-${clamped}` : undefined}
          className="w-full border-b border-slate-200 bg-transparent px-4 py-3 text-sm outline-none dark:border-slate-800"
        />
        <ul id="palette-results" role="listbox" aria-label="Results" className="max-h-80 overflow-y-auto">
          {results.map((r, i) => (
            <li key={`${r.kind}:${r.label}`} role="option" aria-selected={i === clamped} id={`palette-opt-${i}`}>
              <button
                type="button"
                className={`flex w-full items-center gap-2 px-4 py-2 text-left text-sm ${
                  i === clamped ? 'bg-sky-100 dark:bg-sky-900/40' : ''
                }`}
                onMouseEnter={() => setActive(i)}
                onClick={() => pick(r)}
              >
                <Badge tone={KIND_TONE[r.kind]}>{r.kind}</Badge>
                <code className="shrink-0 font-medium">{r.label}</code>
                <span className="truncate text-slate-500 dark:text-slate-400">{r.detail}</span>
              </button>
            </li>
          ))}
          {hasContentRow && (
            <li role="option" aria-selected={clamped === results.length} id={`palette-opt-${results.length}`}>
              <button
                type="button"
                className={`flex w-full items-center gap-2 px-4 py-2 text-left text-sm ${
                  clamped === results.length ? 'bg-sky-100 dark:bg-sky-900/40' : ''
                }`}
                onMouseEnter={() => setActive(results.length)}
                onClick={pickContent}
              >
                <Badge tone="slate">content</Badge>
                <span className="truncate">Search content for “{query.trim()}”</span>
              </button>
            </li>
          )}
          {query.trim() !== '' && results.length === 0 && (
            <li className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">No matches for “{query.trim()}”.</li>
          )}
        </ul>
        <div className="border-t border-slate-200 px-4 py-2 text-xs text-slate-400 dark:border-slate-800 dark:text-slate-500">
          ↑↓ navigate · Enter open · Esc close
        </div>
      </div>
    </div>
  );
}
