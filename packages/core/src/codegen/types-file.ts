import type { ComponentContract, FieldContract } from '../types.js';
import { propertyKey } from '../identifiers.js';
import { collectCardFields, flattenFields } from './fields.js';

const SITECORE_TYPES_ORDER = ['Field', 'ImageField', 'LinkField'] as const;

function collectSitecoreTypeImports(c: ComponentContract): string[] {
  const tsTypes = flattenFields(c.fields).map((f) => f.tsType);
  const needed: string[] = [];
  if (tsTypes.some((t) => t.includes('Field<'))) needed.push('Field');
  if (tsTypes.some((t) => t === 'ImageField')) needed.push('ImageField');
  if (tsTypes.some((t) => t === 'LinkField')) needed.push('LinkField');
  return SITECORE_TYPES_ORDER.filter((name) => needed.includes(name));
}

/** Renders a typed item interface for a 'Cards' field, e.g. `type TabsItem = {...}`. */
function renderItemType(f: FieldContract): string {
  const innerLines = (f.itemFields ?? [])
    .map((inner) => `    ${propertyKey(inner.name)}${inner.optional ? '?' : ''}: ${inner.tsType};`)
    .join('\n');
  return `type ${f.itemTypeName} = {
  id: string;
  url: string;
  name: string;
  displayName: string;
  fields: {
${innerLines}
  };
};`;
}

export function renderTypesFile(c: ComponentContract, propsImport: string): string {
  const fieldLines = c.fields
    .map((f) => `  ${propertyKey(f.name)}${f.optional ? '?' : ''}: ${f.tsType};`)
    .join('\n');
  const paramLines = c.params.map((p) => `  ${propertyKey(p)}?: string;`).join('\n');

  const sitecoreTypes = collectSitecoreTypeImports(c);
  const sdkImportLine = sitecoreTypes.length > 0
    ? `import { ${sitecoreTypes.join(', ')} } from '@sitecore-content-sdk/nextjs';\n`
    : '';

  // Non-item-reference arrays fall back to a generic ItemReference type; emit its
  // definition only when used (the SDK exports no such type).
  const usesItemReference = flattenFields(c.fields).some((f) => f.tsType.includes('ItemReference'));
  const itemReferenceDef = usesItemReference
    ? `\ntype ItemReference = {
  id: string;
  url: string;
  name: string;
  displayName: string;
  fields: Record<string, unknown>;
};\n`
    : '';

  // Typed item interfaces for every 'Cards' field, including nested ones.
  const cardFields = collectCardFields(c.fields);
  const itemTypeDefs = cardFields.map((f) => `\n${renderItemType(f)}\n`).join('');

  // Item types are referenced by the generated component, so export them too.
  const itemTypeNames = cardFields.map((f) => f.itemTypeName as string);
  const exportNames = [`${c.name}Fields`, `${c.name}Params`, `${c.name}Props`, ...itemTypeNames];

  return `${sdkImportLine}import { ComponentProps } from '${propsImport}';
${itemReferenceDef}${itemTypeDefs}
type ${c.name}Fields = {
${fieldLines}
};

type ${c.name}Params = {
${paramLines}
};

type ${c.name}Props = ComponentProps & {
  fields: ${c.name}Fields;
  params?: ${c.name}Params;
};

export type { ${exportNames.join(', ')} };
`;
}
