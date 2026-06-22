import type { ComponentContract, FieldContract, StylingMode } from '../types.js';
import { accessExpr, optionalAccess, toKebabAttr } from '../identifiers.js';
import { collectCardFields, flattenFields } from './fields.js';
import { createStyleHelper } from './styling.js';

interface ComponentOptions {
  propsImport: string;
  sitecorePackage: string;
  useDatasourceCheck: boolean;
  styling: StylingMode;
  /** Variant export names. MUST be valid PascalCase identifiers (use `normalizeVariants`); used verbatim as `export const <name>`. */
  variants?: string[];
}

const IMPORT_ALIAS: Record<string, string> = {
  Image: 'Image as SitecoreImage',
  Link: 'Link as SitecoreLink',
};

/** The JSX element for a single field, given the expression that accesses it. */
function fieldElement(f: FieldContract, accessor: string, firstText: boolean): string {
  switch (f.renderer) {
    case 'Text':
      return `<Text tag="${firstText ? 'h1' : 'span'}" field={${accessor}} />`;
    case 'RichText':
      return `<RichText field={${accessor}} />`;
    case 'Image':
      return `<SitecoreImage field={${accessor}} />`;
    case 'Link':
      return `<SitecoreLink field={${accessor}} />`;
    default:
      return '';
  }
}

/**
 * Renders a `.map()` of basic cards for a 'Cards' field, rendering each inner field.
 * Recurses for nested card fields, using a distinct loop variable per depth.
 */
function renderCards(
  f: FieldContract,
  indent: string,
  collectionAccessor: string,
  itemVar: string,
  cardClass: string,
): string {
  const childVar = `${itemVar}Item`;
  const inner = (f.itemFields ?? [])
    .map((inf) => {
      const accessor = accessExpr(`${itemVar}.fields`, inf.name);
      if (inf.renderer === 'Cards') {
        return renderCards(inf, `${indent}    `, accessor, childVar, cardClass);
      }
      const el = fieldElement(inf, accessor, false);
      if (!el) return `${indent}      {/* TODO: render "${inf.name}" (${inf.tsType}) */}`;
      return inf.optional ? `${indent}      {${accessor} && ${el}}` : `${indent}      ${el}`;
    })
    .join('\n');

  return `${indent}{${collectionAccessor}?.map((${itemVar}: ${f.itemTypeName}) => (
${indent}  <article${cardClass} key={${itemVar}.id}>
${inner}
${indent}  </article>
${indent}))}`;
}

export function renderComponentFile(c: ComponentContract, opts: ComponentOptions): string {
  const style = createStyleHelper(c.name, opts.styling);
  const hasParams = c.params.length > 0;
  const hasPlaceholders = c.placeholders.length > 0;

  const renderers = new Set<string>();
  for (const f of flattenFields(c.fields)) {
    if (f.sitecoreImport) renderers.add(f.sitecoreImport);
  }
  const importNames = [...renderers].map((r) => IMPORT_ALIAS[r] ?? r);
  if (hasPlaceholders) importNames.push('Placeholder');
  if (opts.useDatasourceCheck) importNames.push('withDatasourceCheck');

  const sdkImportLine = importNames.length > 0
    ? `import {\n${importNames.map((n) => `  ${n},`).join('\n')}\n} from '${opts.sitecorePackage}';\n\n`
    : '';

  const itemTypeNames = collectCardFields(c.fields).map((f) => f.itemTypeName as string);
  const typeImports = [`${c.name}Props`, ...itemTypeNames];
  const imports = `${sdkImportLine}${style.importLine}import { ${typeImports.join(', ')} } from './${c.name}.types';`;

  let firstText = true;
  const fieldBody = c.fields
    .map((f) => {
      if (f.renderer === 'Cards') return renderCards(f, '      ', accessExpr('fields', f.name), 'item', style.card);
      const accessor = accessExpr('fields', f.name);
      const isFirst = f.renderer === 'Text' && f.tsType === 'Field<string>' && firstText;
      if (isFirst) firstText = false;
      const el = fieldElement(f, accessor, isFirst);
      if (!el) return `      {/* TODO: render field "${f.name}" (${f.tsType}) */}`;
      return f.optional ? `      {${accessor} && ${el}}` : `      ${el}`;
    })
    .join('\n');

  const placeholderBody = c.placeholders
    .map((ph) => `      <Placeholder name="${ph}" rendering={rendering} />`)
    .join('\n');

  const body = [fieldBody, placeholderBody].filter(Boolean).join('\n');

  const sectionAttrs = hasParams
    ? ' ' + c.params.map((p) => `data-${toKebabAttr(p)}={${optionalAccess('params', p)}}`).join(' ')
    : '';

  const variants = opts.variants ?? [];
  if (variants.length > 0) {
    const innerDestructured = ['fields'];
    if (hasParams) innerDestructured.push('params');
    if (hasPlaceholders) innerDestructured.push('rendering');
    innerDestructured.push('variant');
    const innerPropsArg = `{ ${innerDestructured.join(', ')} }`;

    const innerComponent = `const ${c.name}Variant = (${innerPropsArg}: ${c.name}Props & { variant: string }) => {
  // TODO: branch on \`variant\` to change layout/markup per variant
  return (
    <section${style.root} data-variant={variant}${sectionAttrs}>
${body}
    </section>
  );
};`;

    const wrappers = variants
      .map((v) => {
        if (opts.useDatasourceCheck) {
          return `const render${v} = (props: ${c.name}Props) => <${c.name}Variant {...props} variant="${v}" />;
export const ${v} = withDatasourceCheck()<${c.name}Props>(render${v});`;
        }
        return `export const ${v} = (props: ${c.name}Props) => <${c.name}Variant {...props} variant="${v}" />;`;
      })
      .join('\n\n');

    return `${imports}\n\n${innerComponent}\n\n${wrappers}\n`;
  }

  const destructured = ['fields'];
  if (hasParams) destructured.push('params');
  if (hasPlaceholders) destructured.push('rendering');
  const propsArg = `{ ${destructured.join(', ')} }`;

  const component = `const ${c.name} = (${propsArg}: ${c.name}Props) => {
  return (
    <section${style.root}${sectionAttrs}>
${body}
    </section>
  );
};`;

  const exportLine = opts.useDatasourceCheck
    ? `export default withDatasourceCheck()<${c.name}Props>(${c.name});`
    : `export default ${c.name};`;

  return `${imports}\n\n${component}\n\n${exportLine}\n`;
}
