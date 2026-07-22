import type { GuiRouteDetail, GuiLayoutNode } from './types';

export interface ContentRecord {
  routePath: string;
  /** '(page)' for route-level fields. */
  componentName: string;
  /** Placeholder path of the rendering, e.g. "main[0] › inner[1]"; '' for route-level fields. */
  path: string;
  field: string;
  text: string;
}

export interface ContentMatch extends ContentRecord {
  excerpt: string;
}

const GUID_RE = /^\{?[0-9a-f-]{36}\}?$/i;
const EXCERPT_CONTEXT = 40;

function stripHtml(s: string): string {
  // Rich-text heuristic: only strings that look like markup get tag-stripped.
  return s.includes('<') && s.includes('>') ? s.replace(/<[^>]*>/g, ' ') : s;
}

/**
 * Human text of a raw layout field value: every string leaf (through { value }
 * wrappers, nested objects, and arrays), tags stripped, whitespace collapsed.
 * GUID strings are ids, not content — skipped. URLs are kept (searchable).
 */
export function extractText(value: unknown): string {
  const parts: string[] = [];
  const visit = (v: unknown): void => {
    if (typeof v === 'string') {
      if (v !== '' && !GUID_RE.test(v)) parts.push(stripHtml(v));
    } else if (Array.isArray(v)) {
      v.forEach(visit);
    } else if (v !== null && typeof v === 'object') {
      Object.values(v as Record<string, unknown>).forEach(visit);
    }
  };
  visit(value);
  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

/** One record per field with any human text, across all renderings and route-level fields. */
export function buildContentIndex(routes: GuiRouteDetail[]): ContentRecord[] {
  const records: ContentRecord[] = [];

  const add = (routePath: string, componentName: string, path: string, fields: Record<string, unknown>): void => {
    for (const [field, raw] of Object.entries(fields)) {
      const text = extractText(raw);
      if (text !== '') records.push({ routePath, componentName, path, field, text });
    }
  };

  for (const route of routes) {
    if (route.routeFields !== undefined) add(route.routePath, '(page)', '', route.routeFields);
    const walk = (placeholders: Record<string, GuiLayoutNode[]>, prefix: string): void => {
      for (const [key, nodes] of Object.entries(placeholders)) {
        nodes.forEach((n, i) => {
          const path = `${prefix}${key}[${i}]`;
          add(route.routePath, n.componentName, path, n.fields);
          walk(n.placeholders, `${path} › `);
        });
      }
    };
    walk(route.layout, '');
  }

  return records;
}

/**
 * Case-insensitive substring search; empty/whitespace query matches nothing.
 * Excerpts keep up to 40 chars of context either side of the first match,
 * with ellipsis where truncated. Ordered by route path, then placeholder path.
 */
export function searchContent(index: ContentRecord[], query: string, limit = 50): ContentMatch[] {
  const needle = query.trim().toLowerCase();
  if (needle === '') return [];

  const matches: ContentMatch[] = [];
  for (const rec of index) {
    const at = rec.text.toLowerCase().indexOf(needle);
    if (at === -1) continue;
    const start = Math.max(0, at - EXCERPT_CONTEXT);
    const end = Math.min(rec.text.length, at + needle.length + EXCERPT_CONTEXT);
    const excerpt = `${start > 0 ? '…' : ''}${rec.text.slice(start, end)}${end < rec.text.length ? '…' : ''}`;
    matches.push({ ...rec, excerpt });
  }

  return matches
    .sort((a, b) => a.routePath.localeCompare(b.routePath) || a.path.localeCompare(b.path))
    .slice(0, limit);
}
