import type { GuiState } from './types';
import type { View } from './router';
import { usageCounts } from './analytics';

export interface SearchEntry {
  kind: 'route' | 'component' | 'dictionary';
  label: string;
  detail: string;
  view: View;
}

/** Everything the palette can jump to: routes, components (registry included), dictionary keys. */
export function buildSearchIndex(state: GuiState): SearchEntry[] {
  const entries: SearchEntry[] = [];
  for (const r of state.routes) {
    entries.push({ kind: 'route', label: r.routePath, detail: r.name, view: { view: 'inspector', route: r.routePath } });
  }
  const used = new Set<string>();
  for (const u of usageCounts(state.routes, state.registry)) {
    used.add(u.name);
    entries.push({
      kind: 'component',
      label: u.name,
      detail: `${u.count} route${u.count === 1 ? '' : 's'}`,
      view: { view: 'components', component: u.name },
    });
  }
  for (const e of state.registry) {
    if (!used.has(e.componentName)) {
      entries.push({
        kind: 'component',
        label: e.componentName,
        detail: 'in registry, unused',
        view: { view: 'components', component: e.componentName },
      });
    }
  }
  for (const d of state.dictionary) {
    entries.push({ kind: 'dictionary', label: d.key, detail: d.value, view: { view: 'dictionary', q: d.key } });
  }
  return entries;
}

/**
 * Case-insensitive match ranked label-prefix < label-substring < detail-substring,
 * ties broken by label. Empty query matches nothing.
 */
export function searchEntries(index: SearchEntry[], query: string, limit = 20): SearchEntry[] {
  const needle = query.trim().toLowerCase();
  if (needle === '') return [];
  const scored: Array<{ entry: SearchEntry; score: number }> = [];
  for (const entry of index) {
    const label = entry.label.toLowerCase();
    const score = label.startsWith(needle) ? 0
      : label.includes(needle) ? 1
      : entry.detail.toLowerCase().includes(needle) ? 2
      : -1;
    if (score >= 0) scored.push({ entry, score });
  }
  return scored
    .sort((a, b) => a.score - b.score || a.entry.label.localeCompare(b.entry.label))
    .slice(0, limit)
    .map((s) => s.entry);
}
