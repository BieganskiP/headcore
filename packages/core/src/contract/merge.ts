import type { ComponentContract, FieldContract, FieldRenderer, RenderingNode } from '../types.js';
import { buildContract } from './build.js';

export interface MergeResult {
  contract: ComponentContract;
  warnings: string[];
}

const SPECIFICITY: Record<FieldRenderer, number> = {
  raw: 0,
  Text: 1,
  RichText: 2,
  Image: 2,
  Link: 2,
  Cards: 2,
};

/** Merge the FieldContracts inferred for one field name across instances. */
function mergeField(
  componentName: string,
  fieldName: string,
  variants: FieldContract[],
  warnings: string[],
): FieldContract {
  const maxSpec = Math.max(...variants.map((v) => SPECIFICITY[v.renderer]));
  const candidates = variants.filter((v) => SPECIFICITY[v.renderer] === maxSpec);
  const distinctRenderers = [...new Set(candidates.map((v) => v.renderer))];

  let merged: FieldContract;
  if (maxSpec === 0) {
    // All instances are bare raw Field<string>.
    merged = { ...variants[0] };
  } else if (distinctRenderers.length > 1) {
    // Hard conflict, e.g. Image vs Link for the same field.
    warnings.push(
      `${componentName}.${fieldName}: conflicting types across instances (${distinctRenderers.join(' vs ')}) — emitted Field<string>`,
    );
    merged = { name: fieldName, tsType: 'Field<string>', optional: false, renderer: 'raw', sitecoreImport: null };
  } else {
    merged = { ...candidates[0] };
    if (merged.renderer === 'Cards') {
      merged = { ...merged, itemFields: mergeItemFields(componentName, fieldName, candidates, warnings) };
    }
  }

  // Optional if missing from any instance, or empty on any instance that had it.
  if (variants.some((v) => v.optional)) merged.optional = true;
  return merged;
}

/** Recursively merge the inner itemFields of Cards instances. */
function mergeItemFields(
  componentName: string,
  fieldName: string,
  cardsVariants: FieldContract[],
  warnings: string[],
): FieldContract[] {
  const byName = new Map<string, FieldContract[]>();
  const order: string[] = [];
  for (const v of cardsVariants) {
    for (const item of v.itemFields ?? []) {
      if (!byName.has(item.name)) { byName.set(item.name, []); order.push(item.name); }
      byName.get(item.name)!.push(item);
    }
  }
  return order.map((n) => {
    const merged = mergeField(`${componentName}.${fieldName}`, n, byName.get(n)!, warnings);
    if (byName.get(n)!.length < cardsVariants.length) merged.optional = true;
    return merged;
  });
}

function unionKeys(lists: string[][]): string[] {
  const seen = new Set<string>();
  for (const list of lists) for (const k of list) seen.add(k);
  return [...seen];
}

/** Merge all instances of one component type into a single contract. */
export function mergeContracts(
  nodes: RenderingNode[],
  overrides: Record<string, string>,
): MergeResult {
  if (nodes.length === 0) throw new Error('mergeContracts: nodes must not be empty');
  const name = nodes[0].componentName;
  const contracts = nodes.map((n) => buildContract(n, overrides));
  const warnings: string[] = [];

  const byField = new Map<string, FieldContract[]>();
  const order: string[] = [];
  for (const c of contracts) {
    for (const f of c.fields) {
      if (!byField.has(f.name)) { byField.set(f.name, []); order.push(f.name); }
      byField.get(f.name)!.push(f);
    }
  }

  const total = contracts.length;
  const fields = order.map((fname) => {
    const variants = byField.get(fname)!;
    const merged = mergeField(name, fname, variants, warnings);
    if (variants.length < total) merged.optional = true;
    return merged;
  });

  return {
    contract: {
      name,
      fields,
      params: unionKeys(contracts.map((c) => c.params)),
      placeholders: unionKeys(contracts.map((c) => c.placeholders)),
    },
    warnings,
  };
}
