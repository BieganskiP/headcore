import { Fragment, useMemo, useState } from 'react';
import type { GuiState } from '../lib/types';
import type { View } from '../lib/router';
import { datasourceMap } from '../lib/datasources';
import { downloadCsv } from '../lib/export';
import { Badge } from '../components/Badge';

const CONTROL = 'rounded border border-slate-300 px-2 py-1 text-sm focus-visible:ring-2 focus-visible:ring-sky-400 disabled:opacity-50 dark:border-slate-700';

export function DatasourcesView({ state, ds, navigate }: { state: GuiState; ds?: string; navigate: (v: View) => void }) {
  const infos = useMemo(() => datasourceMap(state.routes), [state.routes]);
  const [filter, setFilter] = useState('');
  const [sharedOnly, setSharedOnly] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(ds !== undefined ? [ds] : []));

  const sharedCount = useMemo(() => infos.filter((d) => d.shared).length, [infos]);

  const visible = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    return infos.filter((d) =>
      (!sharedOnly || d.shared)
      && (needle === ''
        || d.id.toLowerCase().includes(needle)
        || d.components.some((c) => c.toLowerCase().includes(needle))),
    );
  }, [infos, sharedOnly, filter]);

  const toggle = (id: string): void => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const exportCsv = (): void => {
    downloadCsv(
      `datasources-${state.site}-${state.language}.csv`,
      ['id', 'components', 'routes', 'usages'],
      visible.map((d) => [d.id, d.components.join(', '), d.routePaths.join(', '), String(d.usages.length)]),
    );
  };

  if (infos.length === 0) {
    return (
      <div className="max-w-4xl">
        <h1 className="mb-4 text-xl font-semibold">Datasources</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No datasources found — every rendering on this site inlines its content into the page layout
          instead of referencing a separate content item.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl">
      <div className="mb-1 flex items-baseline gap-3">
        <h1 className="text-xl font-semibold">Datasources</h1>
        <span className="text-sm text-slate-500 dark:text-slate-400">
          {infos.length} datasource{infos.length === 1 ? '' : 's'} · {sharedCount} shared
        </span>
      </div>
      <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
        Content items referenced by renderings. A shared datasource appears on more than one page —
        editing one of these affects several pages at once.
      </p>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400">
          <input
            type="checkbox"
            checked={sharedOnly}
            onChange={(e) => setSharedOnly(e.target.checked)}
            className="accent-sky-500 focus-visible:ring-2 focus-visible:ring-sky-400"
          />
          shared only
        </label>
        <span className="ml-auto flex items-center gap-2">
          <button type="button" className={CONTROL} onClick={exportCsv} title="Download the current table as CSV" disabled={visible.length === 0}>
            CSV
          </button>
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter by id or component…"
            aria-label="Filter datasources"
            className="w-64 rounded border border-slate-300 bg-transparent px-2 py-1 text-sm dark:border-slate-700"
          />
        </span>
      </div>

      {visible.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">Nothing matches the current filter.</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
              <th scope="col" className="w-8 py-2 pr-2"><span className="sr-only">Usages</span></th>
              <th scope="col" className="py-2 pr-4">Datasource</th>
              <th scope="col" className="py-2 pr-4">Components</th>
              <th scope="col" className="py-2">Routes</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((d) => {
              const open = expanded.has(d.id);
              return (
                <Fragment key={d.id}>
                  <tr
                    onClick={() => toggle(d.id)}
                    className="cursor-pointer border-b border-slate-100 align-top hover:bg-slate-50 dark:border-slate-900 dark:hover:bg-slate-900/50"
                  >
                    <td className="py-1.5 pr-2">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); toggle(d.id); }}
                        aria-expanded={open}
                        title={open ? 'Hide usages' : `Show ${d.usages.length} usage${d.usages.length === 1 ? '' : 's'}`}
                        className="rounded px-1 text-xs text-slate-400 hover:text-sky-600 focus-visible:ring-2 focus-visible:ring-sky-400 dark:text-slate-500 dark:hover:text-sky-400"
                      >
                        <span aria-hidden="true">{open ? '▾' : '▸'}</span>
                      </button>
                    </td>
                    <td className="py-1.5 pr-4"><code className="break-all">{d.id}</code></td>
                    <td className="py-1.5 pr-4">
                      {d.components.map((c, i) => (
                        <Fragment key={c}>
                          {i > 0 && ', '}
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); navigate({ view: 'components', component: c }); }}
                            title={`Show usage of ${c}`}
                            className="font-medium text-sky-600 hover:underline focus-visible:ring-2 focus-visible:ring-sky-400 dark:text-sky-400"
                          >
                            {c}
                          </button>
                        </Fragment>
                      ))}
                    </td>
                    <td className="py-1.5">
                      <Badge tone={d.shared ? 'amber' : 'slate'}>
                        {d.routePaths.length} route{d.routePaths.length === 1 ? '' : 's'}
                      </Badge>
                    </td>
                  </tr>
                  {open && (
                    <tr className="border-b border-slate-100 dark:border-slate-900">
                      <td className="py-1.5 pr-2" />
                      <td colSpan={3} className="py-1.5 pr-4">
                        <ul className="space-y-1">
                          {d.usages.map((u) => (
                            <li key={`${u.routePath}|${u.path}`} className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() => navigate({ view: 'inspector', route: u.routePath })}
                                title={`Inspect ${u.routePath}`}
                                className="text-sky-600 hover:underline focus-visible:ring-2 focus-visible:ring-sky-400 dark:text-sky-400"
                              >
                                <code>{u.routePath}</code>
                              </button>
                              <Badge tone="slate">{u.path}</Badge>
                              <span className="text-slate-500 dark:text-slate-400">{u.componentName}</span>
                            </li>
                          ))}
                        </ul>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
