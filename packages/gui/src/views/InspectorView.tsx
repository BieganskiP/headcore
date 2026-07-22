import { useEffect, useMemo, useState } from 'react';
import type { GuiState, GuiLayoutNode } from '../lib/types';
import type { View } from '../lib/router';
import { editUrl, liveUrl } from '../lib/deepLinks';
import { Badge } from '../components/Badge';
import { FieldsTable } from '../components/FieldsTable';

function LayoutNode({ node, navigate, fieldsOpen }: { node: GuiLayoutNode; navigate: (v: View) => void; fieldsOpen?: boolean }) {
  const fieldCount = Object.keys(node.fields).length;
  return (
    <li className="mt-1">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="font-medium text-sky-600 hover:underline focus-visible:ring-2 focus-visible:ring-sky-400 dark:text-sky-400"
          onClick={() => navigate({ view: 'components', component: node.componentName })}
          title={`Show usage of ${node.componentName}`}
        >
          {node.componentName}
        </button>
        {node.dataSource && (
          <code className="text-xs text-slate-400 dark:text-slate-500" title="dataSource">{node.dataSource}</code>
        )}
      </div>
      {fieldCount > 0 && (
        <details className="mt-0.5" open={fieldsOpen}>
          <summary className="cursor-pointer text-xs text-slate-500 focus-visible:ring-2 focus-visible:ring-sky-400 dark:text-slate-400">
            {fieldCount} field{fieldCount === 1 ? '' : 's'}: {Object.keys(node.fields).join(', ')}
          </summary>
          <div className="ml-4 mt-1">
            <FieldsTable fields={node.fields} />
          </div>
        </details>
      )}
      <PlaceholderList placeholders={node.placeholders} navigate={navigate} fieldsOpen={fieldsOpen} />
    </li>
  );
}

function PlaceholderList({ placeholders, navigate, fieldsOpen }: { placeholders: Record<string, GuiLayoutNode[]>; navigate: (v: View) => void; fieldsOpen?: boolean }) {
  const entries = Object.entries(placeholders);
  if (entries.length === 0) return null;
  return (
    <ul className="ml-4 border-l border-slate-200 pl-4 dark:border-slate-800">
      {entries.map(([key, nodes]) => (
        <li key={key} className="mt-1">
          <Badge tone="slate">{key}</Badge>
          <ul className="mt-1">{nodes.map((n, i) => <LayoutNode key={`${n.componentName}-${i}`} node={n} navigate={navigate} fieldsOpen={fieldsOpen} />)}</ul>
        </li>
      ))}
    </ul>
  );
}

const NAV_BUTTON = 'rounded border border-slate-300 px-2 py-1 text-sm focus-visible:ring-2 focus-visible:ring-sky-400 disabled:opacity-40 dark:border-slate-700';
const EXT_LINK = 'font-mono text-xs text-sky-600 hover:underline focus-visible:ring-2 focus-visible:ring-sky-400 dark:text-sky-400';

export function InspectorView({ state, route, navigate }: { state: GuiState; route?: string; navigate: (v: View) => void }) {
  const selected = route !== undefined ? state.routes.find((r) => r.routePath === route) : undefined;
  const linkCtx = { links: state.links, site: state.site, language: state.language };
  const editHref = selected !== undefined ? editUrl(linkCtx, selected) : null;
  const liveHref = selected !== undefined ? liveUrl(linkCtx, selected.routePath) : null;

  const sortedRoutes = useMemo(
    () => [...state.routes].sort((a, b) => a.routePath.localeCompare(b.routePath)),
    [state.routes],
  );
  const idx = selected !== undefined ? sortedRoutes.findIndex((r) => r.routePath === selected.routePath) : -1;

  // null = user-driven default (collapsed); tick remounts the tree so a second
  // click of the same button still resets any <details> the user toggled since.
  const [fields, setFields] = useState<{ open: boolean; tick: number } | null>(null);
  useEffect(() => { setFields(null); }, [route]);

  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'failed'>('idle');
  const copyLayout = async (): Promise<void> => {
    if (selected === undefined) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(selected.layout, null, 2));
      setCopyStatus('copied');
    } catch {
      setCopyStatus('failed');
    }
    window.setTimeout(() => setCopyStatus('idle'), 1500);
  };

  return (
    <div className="max-w-4xl">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold">Inspector</h1>
        <select
          value={selected?.routePath ?? ''}
          onChange={(e) => navigate({ view: 'inspector', route: e.target.value || undefined })}
          aria-label="Select route to inspect"
          className="rounded border border-slate-300 bg-transparent px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-950"
        >
          <option value="">Pick a route…</option>
          {sortedRoutes.map((r) => (
            <option key={r.routePath} value={r.routePath}>{r.routePath}</option>
          ))}
        </select>
        {selected !== undefined && (
          <>
            <button
              type="button"
              className={NAV_BUTTON}
              disabled={idx <= 0}
              onClick={() => navigate({ view: 'inspector', route: sortedRoutes[idx - 1].routePath })}
              title="Previous route (alphabetical)"
              aria-label="Previous route"
            >
              ‹
            </button>
            <button
              type="button"
              className={NAV_BUTTON}
              disabled={idx === -1 || idx >= sortedRoutes.length - 1}
              onClick={() => navigate({ view: 'inspector', route: sortedRoutes[idx + 1].routePath })}
              title="Next route (alphabetical)"
              aria-label="Next route"
            >
              ›
            </button>
            <span className="ml-auto flex gap-2">
              <button type="button" className={NAV_BUTTON} onClick={() => setFields((f) => ({ open: true, tick: (f?.tick ?? 0) + 1 }))}>
                Expand fields
              </button>
              <button type="button" className={NAV_BUTTON} onClick={() => setFields((f) => ({ open: false, tick: (f?.tick ?? 0) + 1 }))}>
                Collapse fields
              </button>
              <button type="button" className={NAV_BUTTON} onClick={() => void copyLayout()} title="Copy this route's layout as pretty-printed JSON">
                {copyStatus === 'idle' ? 'Copy JSON' : copyStatus === 'copied' ? 'Copied ✓' : 'Copy failed'}
              </button>
            </span>
          </>
        )}
      </div>

      {route !== undefined && selected === undefined && (
        <p className="text-sm text-amber-700 dark:text-amber-400">
          No route <code>{route}</code> in the current data — it may not exist in this language.
        </p>
      )}

      {selected && (
        <>
          <div className="mb-4 flex flex-wrap items-baseline gap-x-3 text-sm text-slate-500 dark:text-slate-400">
            <span>
              <span className="font-medium text-slate-900 dark:text-slate-100">{selected.name}</span>
              {' · '}<code>{selected.routePath}</code>
              {selected.updatedAt && <> · updated {selected.updatedAt}</>}
              {' · '}{selected.components.length} component{selected.components.length === 1 ? '' : 's'}
            </span>
            {editHref !== null && (
              <a href={editHref} target="_blank" rel="noreferrer" title="Open in editor" className={EXT_LINK}>
                editor ↗
              </a>
            )}
            {liveHref !== null && (
              <a href={liveHref} target="_blank" rel="noreferrer" title="Open live page" className={EXT_LINK}>
                live ↗
              </a>
            )}
          </div>
          {Object.keys(selected.layout).length === 0
            ? <p className="text-sm text-slate-500 dark:text-slate-400">No layout data for this route.</p>
            : (
              <div key={fields?.tick ?? 0}>
                <PlaceholderList placeholders={selected.layout} navigate={navigate} fieldsOpen={fields?.open} />
              </div>
            )}
        </>
      )}
    </div>
  );
}
