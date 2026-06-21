import type { ComponentContract, FieldContract } from '../types.js';

interface ComponentOptions {
  propsImport: string;
  sitecorePackage: string;
  useDatasourceCheck: boolean;
}

const IMPORT_ALIAS: Record<string, string> = {
  Image: 'Image as SitecoreImage',
  Link: 'Link as SitecoreLink',
};

function camelToKebab(name: string): string {
  return name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

function rendererJsx(f: FieldContract, first: boolean): string {
  const guard = (jsx: string) => (f.optional ? `      {fields.${f.name} && ${jsx}}` : `      ${jsx}`);
  switch (f.renderer) {
    case 'Text':
      return guard(`<Text tag="${first ? 'h1' : 'span'}" field={fields.${f.name}} />`);
    case 'RichText':
      return guard(`<RichText field={fields.${f.name}} />`);
    case 'Image':
      return guard(`<SitecoreImage field={fields.${f.name}} />`);
    case 'Link':
      return guard(`<SitecoreLink field={fields.${f.name}} />`);
    default:
      return `      {/* TODO: render field "${f.name}" (${f.tsType}) */}`;
  }
}

export function renderComponentFile(c: ComponentContract, opts: ComponentOptions): string {
  const renderers = new Set<string>();
  for (const f of c.fields) if (f.sitecoreImport) renderers.add(f.sitecoreImport);
  const importNames = [...renderers].map((r) => IMPORT_ALIAS[r] ?? r);
  if (opts.useDatasourceCheck) importNames.push('withDatasourceCheck');

  const sdkImportLine = importNames.length > 0
    ? `import {\n${importNames.map((n) => `  ${n},`).join('\n')}\n} from '${opts.sitecorePackage}';\n\n`
    : '';

  const imports = `${sdkImportLine}import { ${c.name}Props } from './${c.name}.types';`;

  let firstText = true;
  const body = c.fields
    .map((f) => {
      const isFirst = f.renderer === 'Text' && firstText;
      if (isFirst) firstText = false;
      return rendererJsx(f, isFirst);
    })
    .join('\n');

  const sectionAttrs = c.params.length > 0
    ? ' ' + c.params.map((p) => `data-${camelToKebab(p)}={params?.${p}}`).join(' ')
    : '';

  const component = `const ${c.name} = ({ fields, params }: ${c.name}Props) => {
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
