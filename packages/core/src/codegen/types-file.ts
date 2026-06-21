import type { ComponentContract } from '../types.js';

const SITECORE_TYPES_ORDER = ['Field', 'ImageField', 'LinkField'] as const;

function collectSitecoreTypeImports(c: ComponentContract): string[] {
  const tsTypes = c.fields.map((f) => f.tsType);
  const needed: string[] = [];
  if (tsTypes.some((t) => t.includes('Field<'))) needed.push('Field');
  if (tsTypes.some((t) => t === 'ImageField')) needed.push('ImageField');
  if (tsTypes.some((t) => t === 'LinkField')) needed.push('LinkField');
  // Return in canonical order
  return SITECORE_TYPES_ORDER.filter((name) => needed.includes(name));
}

export function renderTypesFile(c: ComponentContract, propsImport: string): string {
  const fieldLines = c.fields
    .map((f) => `  ${f.name}${f.optional ? '?' : ''}: ${f.tsType};`)
    .join('\n');
  const paramLines = c.params.map((p) => `  ${p}?: string;`).join('\n');

  const sitecoreTypes = collectSitecoreTypeImports(c);
  const sdkImportLine = sitecoreTypes.length > 0
    ? `import { ${sitecoreTypes.join(', ')} } from '@sitecore-content-sdk/nextjs';\n`
    : '';

  return `${sdkImportLine}import { ComponentProps } from '${propsImport}';

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

export type { ${c.name}Fields, ${c.name}Params, ${c.name}Props };
`;
}
