import { toTypeName } from '../identifiers.js';

/**
 * Normalizes a raw `--variants` list into valid, unique export names with
 * `Default` guaranteed first. Names are sanitized to valid PascalCase
 * identifiers (Sitecore variant display names may contain spaces, etc.).
 *
 * Always returns at least `['Default']` — callers that want single-component
 * mode must check `raw.length > 0` before calling.
 */
export function normalizeVariants(raw: string[]): string[] {
  const cleaned = raw.map((v) => toTypeName(v.trim())).filter(Boolean);
  const deduped = [...new Set(cleaned)];
  const withoutDefault = deduped.filter((v) => v !== 'Default');
  return ['Default', ...withoutDefault];
}
