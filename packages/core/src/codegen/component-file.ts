import type { ComponentContract, FieldContract } from '../types.js';
import { accessExpr, optionalAccess, toKebabAttr } from '../identifiers.js';

interface ComponentOptions {
  propsImport: string;
  sitecorePackage: string;
  useDatasourceCheck: boolean;
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

/** Renders a `.map()` of basic cards for a 'Cards' field, rendering each inner field. */
function renderCards(f: FieldContract, indent: string): string {
  const inner = (f.itemFields ?? [])
    .map((inf) => {
      const accessor = accessExpr('item.fields', inf.name);
      const el = fieldElement(inf, accessor, false);
      if (!el) return `${indent}      {/* TODO: render "${inf.name}" (${inf.tsType}) */}`;
      return inf.optional ? `${indent}      {${accessor} && ${el}}` : `${indent}      ${el}`;
    })
    .join('\n');

  return `${indent}{${accessExpr('fields', f.name)}?.map((item: ${f.itemTypeName}) => (
${indent}  <article className="card" key={item.id}>
${inner}
${indent}  </article>
${indent}))}`;
}

export function renderComponentFile(c: ComponentContract, opts: ComponentOptions): string {
  const renderers = new Set<string>();
  for (const f of c.fields) {
    if (f.sitecoreImport) renderers.add(f.sitecoreImport);
    for (const inf of f.itemFields ?? []) if (inf.sitecoreImport) renderers.add(inf.sitecoreImport);
  }
  const importNames = [...renderers].map((r) => IMPORT_ALIAS[r] ?? r);
  if (opts.useDatasourceCheck) importNames.push('withDatasourceCheck');

  const sdkImportLine = importNames.length > 0
    ? `import {\n${importNames.map((n) => `  ${n},`).join('\n')}\n} from '${opts.sitecorePackage}';\n\n`
    : '';

  const itemTypeNames = c.fields
    .filter((f) => f.renderer === 'Cards')
    .map((f) => f.itemTypeName as string);
  const typeImports = [`${c.name}Props`, ...itemTypeNames];
  const imports = `${sdkImportLine}import { ${typeImports.join(', ')} } from './${c.name}.types';`;

  let firstText = true;
  const body = c.fields
    .map((f) => {
      if (f.renderer === 'Cards') return renderCards(f, '      ');
      const accessor = accessExpr('fields', f.name);
      const isFirst = f.renderer === 'Text' && firstText;
      if (isFirst) firstText = false;
      const el = fieldElement(f, accessor, isFirst);
      if (!el) return `      {/* TODO: render field "${f.name}" (${f.tsType}) */}`;
      return f.optional ? `      {${accessor} && ${el}}` : `      ${el}`;
    })
    .join('\n');

  const hasParams = c.params.length > 0;
  const sectionAttrs = hasParams
    ? ' ' + c.params.map((p) => `data-${toKebabAttr(p)}={${optionalAccess('params', p)}}`).join(' ')
    : '';
  const propsArg = hasParams ? '{ fields, params }' : '{ fields }';

  const component = `const ${c.name} = (${propsArg}: ${c.name}Props) => {
  return (
    <section${sectionAttrs}>
${body}
    </section>
  );
};`;

  const exportLine = opts.useDatasourceCheck
    ? `export default withDatasourceCheck()<${c.name}Props>(${c.name});`
    : `export default ${c.name};`;

  return `${imports}\n\n${component}\n\n${exportLine}\n`;
}
