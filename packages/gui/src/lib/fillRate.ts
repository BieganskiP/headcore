import type { GuiRouteDetail, GuiLayoutNode } from './types';

export interface FieldFillRate {
  field: string;
  filled: number;
  total: number;
  pct: number;
  /** Route/path of every instance where the field is empty or missing. */
  emptyOn: Array<{ routePath: string; path: string }>;
}

function unwrap(value: unknown): unknown {
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    const rec = value as Record<string, unknown>;
    const keys = Object.keys(rec);
    if (keys.length === 1 && keys[0] === 'value') return rec.value;
  }
  return value;
}

/** True when the (unwrapped) field value carries content: non-empty primitive, image src, link href, or array. */
export function isFilled(raw: unknown): boolean {
  const value = unwrap(raw);
  if (value === undefined || value === null || value === '') return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') {
    const rec = value as Record<string, unknown>;
    if (typeof rec.src === 'string') return rec.src !== '';
    if (typeof rec.href === 'string') return rec.href !== '';
  }
  return true;
}

/**
 * Fill rate per field over every rendering of componentName, all routes.
 * The field universe is the union across instances: an instance missing the
 * field counts as unfilled. Sorted worst-filled first, then by field name.
 */
export function fieldFillRates(routes: GuiRouteDetail[], componentName: string): FieldFillRate[] {
  const instances: Array<{ routePath: string; path: string; fields: Record<string, unknown> }> = [];

  for (const route of [...routes].sort((a, b) => a.routePath.localeCompare(b.routePath))) {
    const walk = (placeholders: Record<string, GuiLayoutNode[]>, prefix: string): void => {
      for (const [key, nodes] of Object.entries(placeholders)) {
        nodes.forEach((n, i) => {
          const path = `${prefix}${key}[${i}]`;
          if (n.componentName === componentName) instances.push({ routePath: route.routePath, path, fields: n.fields });
          walk(n.placeholders, `${path} › `);
        });
      }
    };
    walk(route.layout, '');
  }

  const total = instances.length;
  if (total === 0) return [];

  const fieldNames = new Set<string>();
  for (const inst of instances) for (const name of Object.keys(inst.fields)) fieldNames.add(name);

  return [...fieldNames]
    .map((field) => {
      const emptyOn: Array<{ routePath: string; path: string }> = [];
      let filled = 0;
      for (const inst of instances) {
        if (field in inst.fields && isFilled(inst.fields[field])) filled++;
        else emptyOn.push({ routePath: inst.routePath, path: inst.path });
      }
      return { field, filled, total, pct: Math.round((filled / total) * 100), emptyOn };
    })
    .sort((a, b) => a.pct - b.pct || a.field.localeCompare(b.field));
}
