import { useMemo, useState } from 'react';
import type { GuiState } from '../lib/types';
import type { View } from '../lib/router';
import { auditRoutes, AUDIT_KINDS, type AuditKind } from '../lib/audit';
import { Badge } from '../components/Badge';

const KIND_TONE: Record<AuditKind, 'amber' | 'red' | 'slate'> = {
  'empty-field': 'amber',
  'missing-alt': 'red',
  'no-datasource': 'slate',
  'no-title': 'amber',
  'no-description': 'amber',
  'duplicate-title': 'amber',
};

export function AuditView({ state, navigate }: { state: GuiState; navigate: (v: View) => void }) {
  const [kinds, setKinds] = useState<Set<AuditKind>>(new Set());
  const [filter, setFilter] = useState('');

  const findings = useMemo(() => auditRoutes(state.routes), [state.routes]);
  const counts = useMemo(() => {
    const map = new Map<AuditKind, number>();
    for (const f of findings) map.set(f.kind, (map.get(f.kind) ?? 0) + 1);
    return map;
  }, [findings]);

  const visible = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    return findings.filter((f) =>
      (kinds.size === 0 || kinds.has(f.kind))
      && (needle === ''
        || f.routePath.toLowerCase().includes(needle)
        || f.componentName.toLowerCase().includes(needle)
        || f.detail.toLowerCase().includes(needle)),
    );
  }, [findings, kinds, filter]);

  const toggleKind = (kind: AuditKind): void => {
    setKinds((prev) => {
      const next = new Set(prev);
      if (next.has(kind)) next.delete(kind);
      else next.add(kind);
      return next;
    });
  };

  return (
    <div className="max-w-5xl">
      <div className="mb-1 flex items-baseline gap-3">
        <h1 className="text-xl font-semibold">Audit</h1>
        <span className="text-sm text-slate-500 dark:text-slate-400">
          {findings.length === 0
            ? `no findings across ${state.routes.length} routes`
            : `${visible.length} of ${findings.length} finding${findings.length === 1 ? '' : 's'} across ${state.routes.length} routes`}
        </span>
      </div>
      <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
        Content-quality heuristics over the layout data: empty field values, images without alt text,
        renderings with no datasource or content at all, and page-level SEO checks (titles and
        meta descriptions) on routes that expose route fields.
      </p>

      {findings.length === 0 ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
          All clean — nothing flagged on {state.site} ({state.language}).
        </p>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {AUDIT_KINDS.map(({ kind, label }) => {
              const count = counts.get(kind) ?? 0;
              const active = kinds.size === 0 || kinds.has(kind);
              return (
                <button
                  key={kind}
                  type="button"
                  // A selected chip stays clickable even at count 0 (a refresh can
                  // zero it out) — otherwise the filter could never be cleared.
                  disabled={count === 0 && !kinds.has(kind)}
                  onClick={() => toggleKind(kind)}
                  aria-pressed={kinds.has(kind)}
                  title={kinds.has(kind) ? `Stop filtering by "${label}"` : `Show only "${label}" findings`}
                  className={`rounded-full border px-3 py-1 text-sm focus-visible:ring-2 focus-visible:ring-sky-400 disabled:opacity-40 ${
                    kinds.has(kind)
                      ? 'border-sky-400 bg-sky-100 text-sky-800 dark:border-sky-600 dark:bg-sky-900/50 dark:text-sky-300'
                      : 'border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-400'
                  } ${active ? '' : 'opacity-60'}`}
                >
                  {label}: {count}
                </button>
              );
            })}
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter by route, component, detail…"
              aria-label="Filter findings"
              className="ml-auto w-64 rounded border border-slate-300 bg-transparent px-2 py-1 text-sm dark:border-slate-700"
            />
          </div>

          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <th scope="col" className="py-2 pr-4">Route</th>
                <th scope="col" className="py-2 pr-4">Component</th>
                <th scope="col" className="py-2 pr-4">Where</th>
                <th scope="col" className="py-2">Finding</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((f, i) => (
                <tr key={`${f.routePath}|${f.path}|${f.kind}|${f.detail}|${i}`} className="border-b border-slate-100 align-top hover:bg-slate-50 dark:border-slate-900 dark:hover:bg-slate-900/50">
                  <td className="py-1.5 pr-4">
                    <button
                      type="button"
                      onClick={() => navigate({ view: 'inspector', route: f.routePath })}
                      title={`Inspect ${f.routePath}`}
                      className="text-sky-600 hover:underline focus-visible:ring-2 focus-visible:ring-sky-400 dark:text-sky-400"
                    >
                      <code>{f.routePath}</code>
                    </button>
                  </td>
                  <td className="py-1.5 pr-4">
                    {f.componentName === '(page)' ? (
                      // Page-level SEO findings have no registry component to link to.
                      <span className="font-medium text-slate-500 dark:text-slate-400">{f.componentName}</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => navigate({ view: 'components', component: f.componentName })}
                        title={`Show usage of ${f.componentName}`}
                        className="font-medium text-sky-600 hover:underline focus-visible:ring-2 focus-visible:ring-sky-400 dark:text-sky-400"
                      >
                        {f.componentName}
                      </button>
                    )}
                  </td>
                  <td className="py-1.5 pr-4">
                    {f.path === '' ? (
                      <span className="text-slate-400 dark:text-slate-600">—</span>
                    ) : (
                      <Badge tone="slate">{f.path}</Badge>
                    )}
                  </td>
                  <td className="py-1.5">
                    <span className="mr-2"><Badge tone={KIND_TONE[f.kind]}>{f.kind}</Badge></span>
                    {f.detail}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
