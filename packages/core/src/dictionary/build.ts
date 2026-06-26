import type { DictionaryEntry } from '../edge/client.js';

export interface DictionaryBuildResult {
  /** Unique dictionary keys, sorted alphabetically for stable diffs. */
  keys: string[];
  warnings: string[];
}

export function buildDictionary(entries: DictionaryEntry[]): DictionaryBuildResult {
  const keys = [...new Set(entries.map((e) => e.key))].sort((a, b) => a.localeCompare(b));
  const warnings: string[] = [];
  if (keys.length === 0) {
    warnings.push('no dictionary entries found for this site/language');
  }
  return { keys, warnings };
}
