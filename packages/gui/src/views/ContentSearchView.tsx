import { useMemo, useState } from 'react';
import type { GuiState } from '../lib/types';
import type { View } from '../lib/router';
import { buildContentIndex, searchContent, type ContentMatch } from '../lib/contentSearch';
import { Badge } from '../components/Badge';

const LIMIT = 50;

function Highlighted({ text, needle }: { text: string; needle: string }) {
  const at = needle === '' ? -1 : text.toLowerCase().indexOf(needle.toLowerCase());
  if (at === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, at)}
      <mark className="rounded bg-amber-200 px-0.5 text-inherit dark:bg-amber-500/40">{text.slice(at, at + needle.length)}</mark>
      {text.slice(at + needle.length)}
    </>
  );
}

export function ContentSearchView({ state, q, navigate }: { state: GuiState; q?: string; navigate: (v: View) => void }) {
  const [query, setQuery] = useState(q ?? '');
  const needle = query.trim();

  const index = useMemo(() => buildContentIndex(state.routes), [state.routes]);
  const all = useMemo(() => searchContent(index, query, Number.POSITIVE_INFINITY), [index, query]);
  const shown = useMemo(() => all.slice(0, LIMIT), [all]);

  const grouped = useMemo(() => {
    const map = new Map<string, ContentMatch[]>();
    for (const m of shown) {
      const list = map.get(m.routePath) ?? [];
      list.push(m);
      map.set(m.routePath, list);
    }
    return [...map.entries()];
  }, [shown]);

  const routeCount = useMemo(() => new Set(all.map((m) => m.routePath)).size, [all]);

  return (
    <div className="max-w-5xl">
      <div className="mb-1 flex items-baseline gap-3">
        <h1 className="text-xl font-semibold">Content search</h1>
        {needle !== '' && (
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {all.length} match{all.length === 1 ? '' : 'es'} on {routeCount} route{routeCount === 1 ? '' : 's'}
          </span>
        )}
      </div>
      <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
        Full-text search over every field value on every route — headings, rich text, links, image alt text.
      </p>

      <input
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search all field values…"
        aria-label="Search content"
        className="mb-6 w-full max-w-xl rounded border border-slate-300 bg-transparent px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-sky-400 dark:border-slate-700"
      />

      {needle === '' ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Type a word or sentence to find where it is used on {state.site} ({state.language}).
        </p>
      ) : all.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">No content matches “{needle}”.</p>
      ) : (
        <>
          {grouped.map(([routePath, hits]) => (
            <section key={routePath} className="mb-6">
              <button
                type="button"
                onClick={() => navigate({ view: 'inspector', route: routePath })}
                title={`Inspect ${routePath}`}
                className="mb-1 text-sky-600 hover:underline focus-visible:ring-2 focus-visible:ring-sky-400 dark:text-sky-400"
              >
                <code className="text-sm font-semibold">{routePath}</code>
              </button>
              <ul className="divide-y divide-slate-100 dark:divide-slate-900">
                {hits.map((m, i) => (
                  <li key={`${m.path}|${m.field}|${i}`} className="flex flex-wrap items-baseline gap-x-2 gap-y-1 py-2">
                    <Badge tone={m.componentName === '(page)' ? 'slate' : 'green'}>{m.componentName}</Badge>
                    <span className="text-sm font-medium">{m.field}</span>
                    {m.path !== '' && (
                      <span className="font-mono text-xs text-slate-400 dark:text-slate-500">{m.path}</span>
                    )}
                    <span className="w-full text-sm text-slate-600 dark:text-slate-300">
                      <Highlighted text={m.excerpt} needle={needle} />
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
          {all.length > LIMIT && (
            <p className="text-sm text-amber-700 dark:text-amber-400">
              Showing the first {LIMIT} of {all.length} matches — refine the query to see the rest.
            </p>
          )}
        </>
      )}
    </div>
  );
}
