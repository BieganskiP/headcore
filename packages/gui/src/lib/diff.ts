import type { GuiState } from './types';

export interface StateDiff {
  /** Route paths present now but not before. */
  routesAdded: string[];
  /** Route paths present before but gone now. */
  routesRemoved: string[];
  /** Routes present in both whose updatedAt or component list changed. */
  routesChanged: string[];
  /** Component names that appeared on / disappeared from the site. */
  componentsAdded: string[];
  componentsRemoved: string[];
  /** Dictionary keys added / removed. */
  dictionaryAdded: string[];
  dictionaryRemoved: string[];
}

export function isEmptyDiff(d: StateDiff): boolean {
  return Object.values(d).every((list) => list.length === 0);
}

/**
 * What changed between two fetches. Returns null when the states are not
 * comparable (different site or language).
 */
export function diffStates(prev: GuiState, next: GuiState): StateDiff | null {
  if (prev.site !== next.site || prev.language !== next.language) return null;

  const prevRoutes = new Map(prev.routes.map((r) => [r.routePath, r]));
  const nextRoutes = new Map(next.routes.map((r) => [r.routePath, r]));

  const routesAdded = [...nextRoutes.keys()].filter((p) => !prevRoutes.has(p)).sort((a, b) => a.localeCompare(b));
  const routesRemoved = [...prevRoutes.keys()].filter((p) => !nextRoutes.has(p)).sort((a, b) => a.localeCompare(b));
  const routesChanged = [...nextRoutes.entries()]
    .filter(([path, r]) => {
      const old = prevRoutes.get(path);
      if (!old) return false;
      return old.updatedAt !== r.updatedAt || old.components.join('\n') !== r.components.join('\n');
    })
    .map(([path]) => path)
    .sort((a, b) => a.localeCompare(b));

  const prevComponents = new Set(prev.routes.flatMap((r) => r.components));
  const nextComponents = new Set(next.routes.flatMap((r) => r.components));
  const componentsAdded = [...nextComponents].filter((c) => !prevComponents.has(c)).sort((a, b) => a.localeCompare(b));
  const componentsRemoved = [...prevComponents].filter((c) => !nextComponents.has(c)).sort((a, b) => a.localeCompare(b));

  const prevKeys = new Set(prev.dictionary.map((d) => d.key));
  const nextKeys = new Set(next.dictionary.map((d) => d.key));
  const dictionaryAdded = [...nextKeys].filter((k) => !prevKeys.has(k)).sort((a, b) => a.localeCompare(b));
  const dictionaryRemoved = [...prevKeys].filter((k) => !nextKeys.has(k)).sort((a, b) => a.localeCompare(b));

  return { routesAdded, routesRemoved, routesChanged, componentsAdded, componentsRemoved, dictionaryAdded, dictionaryRemoved };
}
