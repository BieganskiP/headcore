import type { GuiRouteDetail, GuiLayoutNode } from './types';

export type AuditKind = 'empty-field' | 'missing-alt' | 'no-datasource' | 'no-title' | 'no-description' | 'duplicate-title';

export interface AuditFinding {
  routePath: string;
  /** Placeholder path of the rendering, e.g. "main[0] › inner[1]". */
  path: string;
  componentName: string;
  kind: AuditKind;
  detail: string;
}

export const AUDIT_KINDS: Array<{ kind: AuditKind; label: string }> = [
  { kind: 'empty-field', label: 'Empty field' },
  { kind: 'missing-alt', label: 'Image without alt' },
  { kind: 'no-datasource', label: 'No datasource or content' },
  { kind: 'no-title', label: 'No page title' },
  { kind: 'no-description', label: 'No meta description' },
  { kind: 'duplicate-title', label: 'Duplicate title' },
];

const TITLE_FIELD = /^(page|meta|og|browser)?[ _-]?title$/i;
const DESCRIPTION_FIELD = /^(page|meta|og)?[ _-]?description$/i;

/** First non-empty unwrapped string among the fields whose name matches. */
function firstStringField(fields: Record<string, unknown>, matcher: RegExp): string | undefined {
  for (const [name, raw] of Object.entries(fields)) {
    if (!matcher.test(name)) continue;
    const value = unwrap(raw);
    if (typeof value === 'string' && value.trim() !== '') return value;
  }
  return undefined;
}

function unwrap(value: unknown): unknown {
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    const rec = value as Record<string, unknown>;
    const keys = Object.keys(rec);
    if (keys.length === 1 && keys[0] === 'value') return rec.value;
  }
  return value;
}

function isImageValue(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v) && typeof (v as Record<string, unknown>).src === 'string';
}

/**
 * Content-quality heuristics over the layout data:
 * - empty-field: a field whose (unwrapped) value is '' or null;
 * - missing-alt: an image value with a non-empty src and no alt text;
 * - no-datasource: a rendering with no datasource, no fields, and no placeholders;
 * - no-title / no-description / duplicate-title: page-level SEO checks over routeFields.
 */
export function auditRoutes(routes: GuiRouteDetail[]): AuditFinding[] {
  const findings: AuditFinding[] = [];
  const titles: Array<{ routePath: string; title: string }> = [];

  const inspect = (node: GuiLayoutNode, routePath: string, path: string): void => {
    for (const [name, raw] of Object.entries(node.fields)) {
      const value = unwrap(raw);
      if (value === '' || value === null) {
        findings.push({ routePath, path, componentName: node.componentName, kind: 'empty-field', detail: `field "${name}" is empty` });
      } else if (isImageValue(value) && (value.src as string) !== '') {
        const alt = value.alt;
        if (alt === undefined || alt === null || alt === '') {
          findings.push({ routePath, path, componentName: node.componentName, kind: 'missing-alt', detail: `image field "${name}" has no alt text` });
        }
      }
    }
    if (node.dataSource === undefined && Object.keys(node.fields).length === 0 && Object.keys(node.placeholders).length === 0) {
      findings.push({ routePath, path, componentName: node.componentName, kind: 'no-datasource', detail: 'no datasource, fields, or child placeholders' });
    }
  };

  for (const route of routes) {
    // SEO checks run only when routeFields is present: sites whose layout carries
    // no route fields at all must not drown every page in no-title/no-description.
    if (route.routeFields !== undefined) {
      const title = firstStringField(route.routeFields, TITLE_FIELD);
      if (title === undefined) {
        findings.push({ routePath: route.routePath, path: '', componentName: '(page)', kind: 'no-title', detail: 'no title-ish route field with a value' });
      } else {
        titles.push({ routePath: route.routePath, title });
      }
      if (firstStringField(route.routeFields, DESCRIPTION_FIELD) === undefined) {
        findings.push({ routePath: route.routePath, path: '', componentName: '(page)', kind: 'no-description', detail: 'no description-ish route field with a value' });
      }
    }
    const walk = (placeholders: Record<string, GuiLayoutNode[]>, prefix: string): void => {
      for (const [key, nodes] of Object.entries(placeholders)) {
        nodes.forEach((n, i) => {
          const path = `${prefix}${key}[${i}]`;
          inspect(n, route.routePath, path);
          walk(n.placeholders, `${path} › `);
        });
      }
    };
    walk(route.layout, '');
  }

  const byNormalizedTitle = new Map<string, Array<{ routePath: string; title: string }>>();
  for (const entry of titles) {
    const key = entry.title.trim().toLowerCase();
    const group = byNormalizedTitle.get(key);
    if (group !== undefined) group.push(entry);
    else byNormalizedTitle.set(key, [entry]);
  }
  for (const group of byNormalizedTitle.values()) {
    if (group.length < 2) continue;
    for (const entry of group) {
      findings.push({ routePath: entry.routePath, path: '', componentName: '(page)', kind: 'duplicate-title', detail: `title "${entry.title.trim()}" is shared by ${group.length} routes` });
    }
  }

  // Stable sort: page-level findings (path '') lead each route's group.
  return findings.sort((a, b) => a.routePath.localeCompare(b.routePath) || a.path.localeCompare(b.path));
}
