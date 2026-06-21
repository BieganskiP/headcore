import type { FieldContract } from '../types.js';

/** All field contracts, including inner fields of card items, at any depth. */
export function flattenFields(fields: FieldContract[]): FieldContract[] {
  const out: FieldContract[] = [];
  for (const f of fields) {
    out.push(f);
    if (f.itemFields) out.push(...flattenFields(f.itemFields));
  }
  return out;
}

/** Every 'Cards' field at any depth (top-level and nested inside item types). */
export function collectCardFields(fields: FieldContract[]): FieldContract[] {
  return flattenFields(fields).filter((f) => f.renderer === 'Cards');
}
