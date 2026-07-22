import type { DictionaryEntry } from './types';

export interface CompareRow {
  key: string;
  /** Value in the currently loaded language; undefined = key missing there. */
  base?: string;
  /** Value in the comparison language; undefined = key missing there. */
  other?: string;
}

export interface DictionaryComparison {
  rows: CompareRow[];
  missingInBase: number;
  missingInOther: number;
}

/** Union of keys across both languages, sorted, with per-side values and missing counts. */
export function compareDictionaries(base: DictionaryEntry[], other: DictionaryEntry[]): DictionaryComparison {
  const baseMap = new Map(base.map((e) => [e.key, e.value]));
  const otherMap = new Map(other.map((e) => [e.key, e.value]));
  const keys = [...new Set([...baseMap.keys(), ...otherMap.keys()])].sort((a, b) => a.localeCompare(b));
  const rows = keys.map((key) => ({
    key,
    ...(baseMap.has(key) ? { base: baseMap.get(key) } : {}),
    ...(otherMap.has(key) ? { other: otherMap.get(key) } : {}),
  }));
  return {
    rows,
    missingInBase: rows.filter((r) => r.base === undefined).length,
    missingInOther: rows.filter((r) => r.other === undefined).length,
  };
}
