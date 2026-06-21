import type { FieldContract, RawFieldValue } from '../types.js';
import { toTypeName } from '../identifiers.js';

function unwrap(raw: RawFieldValue): unknown {
  if (raw && typeof raw === 'object' && 'value' in (raw as Record<string, unknown>)) {
    return (raw as Record<string, unknown>).value;
  }
  return raw;
}

/** An item-reference element: a referenced item carrying its own `fields` bag. */
function isItemReference(v: unknown): v is { fields: Record<string, unknown> } {
  return (
    !!v &&
    typeof v === 'object' &&
    !Array.isArray(v) &&
    'fields' in (v as Record<string, unknown>) &&
    typeof (v as Record<string, unknown>).fields === 'object' &&
    (v as Record<string, unknown>).fields !== null
  );
}

export function inferField(
  name: string,
  raw: RawFieldValue,
  overrides: Record<string, string>,
): FieldContract {
  const value = unwrap(raw);

  if (name in overrides) {
    return { name, tsType: overrides[name], optional: false, renderer: 'raw', sitecoreImport: null };
  }

  if (value === null || value === undefined || value === '') {
    return { name, tsType: 'Field<string>', optional: true, renderer: 'raw', sitecoreImport: null };
  }
  if (typeof value === 'string') {
    if (/<[a-z][\s\S]*>/i.test(value)) {
      return { name, tsType: 'Field<string>', optional: false, renderer: 'RichText', sitecoreImport: 'RichText' };
    }
    return { name, tsType: 'Field<string>', optional: false, renderer: 'Text', sitecoreImport: 'Text' };
  }
  if (typeof value === 'boolean') {
    return { name, tsType: 'Field<boolean>', optional: false, renderer: 'raw', sitecoreImport: null };
  }
  if (typeof value === 'number') {
    return { name, tsType: 'Field<number>', optional: false, renderer: 'raw', sitecoreImport: null };
  }
  if (Array.isArray(value)) {
    const first = value[0];
    if (isItemReference(first)) {
      const itemTypeName = `${toTypeName(name)}Item`;
      const itemFields = Object.entries(first.fields).map(([k, v]) => inferField(k, v, overrides));
      return {
        name,
        tsType: `${itemTypeName}[]`,
        optional: false,
        renderer: 'Cards',
        sitecoreImport: null,
        itemTypeName,
        itemFields,
      };
    }
    return { name, tsType: 'ItemReference[]', optional: false, renderer: 'raw', sitecoreImport: null };
  }
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    if ('src' in obj) {
      return { name, tsType: 'ImageField', optional: false, renderer: 'Image', sitecoreImport: 'Image' };
    }
    if ('href' in obj) {
      return { name, tsType: 'LinkField', optional: false, renderer: 'Link', sitecoreImport: 'Link' };
    }
  }
  return { name, tsType: 'Field<string>', optional: true, renderer: 'raw', sitecoreImport: null };
}
