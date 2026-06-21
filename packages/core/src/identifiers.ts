// Sitecore field and param names are display names that often contain spaces or
// other characters that are not valid TypeScript identifiers (e.g. "Button Link").
// These helpers make generated code safe regardless of the source name.

const IDENTIFIER_RE = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

export function isValidIdentifier(name: string): boolean {
  return IDENTIFIER_RE.test(name);
}

/** A property key for a type/object literal: bare if a valid identifier, else quoted. */
export function propertyKey(name: string): string {
  return isValidIdentifier(name) ? name : `'${name.replace(/'/g, "\\'")}'`;
}

/** A member-access expression: dot notation if valid, else bracket notation. */
export function accessExpr(base: string, name: string): string {
  return isValidIdentifier(name) ? `${base}.${name}` : `${base}['${name.replace(/'/g, "\\'")}']`;
}

/** An optional-chained access: `base?.name` or `base?.['name']`. */
export function optionalAccess(base: string, name: string): string {
  return isValidIdentifier(name) ? `${base}?.${name}` : `${base}?.['${name.replace(/'/g, "\\'")}']`;
}

/** A valid PascalCase type-name fragment derived from an arbitrary display name. */
export function toTypeName(name: string): string {
  const parts = name.split(/[^A-Za-z0-9]+/).filter(Boolean);
  const pascal = parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join('');
  if (!pascal) return '_';
  return /^[0-9]/.test(pascal) ? `_${pascal}` : pascal;
}

/** A kebab-case data-attribute name from a camelCase or spaced display name. */
export function toKebabAttr(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}
