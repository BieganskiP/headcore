export interface SitecoreField {
  name: string;
  /** Sitecore field type label, e.g. "Single-Line Text", "Image", "General Link". */
  type: string;
}

export interface SitecoreTemplate {
  name: string;
  fields: SitecoreField[];
}

export interface SitecoreRendering {
  /** The component name the rendering maps to (must match the React component). */
  componentName: string;
  /** Rendering kind, e.g. "JSON Rendering". */
  type: string;
}

export interface SitecorePlaceholder {
  key: string;
  /** True for dynamic-key placeholders (suffix pattern); false for a static key. */
  dynamic: boolean;
  /** Allowed rendering names, or ["*"] for any. */
  allowedRenderings: string[];
}

export interface SitecoreContract {
  template: SitecoreTemplate;
  rendering: SitecoreRendering;
  placeholders: SitecorePlaceholder[];
  /** Rendering parameter names. */
  params: string[];
}

export interface ComponentManifest {
  name: string;
  description: string;
  /** Source files (relative to the component folder) that `add` copies in. */
  files: string[];
  /** npm packages the component needs at runtime. */
  dependencies: string[];
  /** Other headcore components this one depends on (reserved; not yet resolved). */
  registryDependencies: string[];
  sitecore: SitecoreContract;
}

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`Invalid manifest: ${msg}`);
}

function asStringArray(value: unknown, field: string): string[] {
  assert(Array.isArray(value) && value.every((v) => typeof v === 'string'), `"${field}" must be a string array`);
  return value as string[];
}

/** Validate and normalize a parsed manifest object (e.g. from JSON.parse). */
export function parseManifest(raw: unknown): ComponentManifest {
  assert(raw && typeof raw === 'object', 'manifest must be an object');
  const m = raw as Record<string, unknown>;

  assert(typeof m.name === 'string' && m.name.length > 0, '"name" is required');
  assert(typeof m.description === 'string', '"description" is required');
  const files = asStringArray(m.files, 'files');
  assert(files.length > 0, '"files" must list at least one file');
  const dependencies = m.dependencies === undefined ? [] : asStringArray(m.dependencies, 'dependencies');
  const registryDependencies =
    m.registryDependencies === undefined ? [] : asStringArray(m.registryDependencies, 'registryDependencies');

  assert(m.sitecore && typeof m.sitecore === 'object', '"sitecore" section is required');
  const sc = m.sitecore as Record<string, unknown>;

  assert(sc.template && typeof sc.template === 'object', '"sitecore.template" is required');
  const tpl = sc.template as Record<string, unknown>;
  assert(typeof tpl.name === 'string' && tpl.name.length > 0, '"sitecore.template.name" is required');
  assert(Array.isArray(tpl.fields), '"sitecore.template.fields" must be an array');
  const fields: SitecoreField[] = (tpl.fields as unknown[]).map((f, i) => {
    assert(f && typeof f === 'object', `template field #${i} must be an object`);
    const ff = f as Record<string, unknown>;
    assert(typeof ff.name === 'string', `template field #${i} needs a "name"`);
    assert(typeof ff.type === 'string', `template field #${i} needs a "type"`);
    return { name: ff.name, type: ff.type };
  });

  assert(sc.rendering && typeof sc.rendering === 'object', '"sitecore.rendering" is required');
  const rnd = sc.rendering as Record<string, unknown>;
  assert(typeof rnd.componentName === 'string', '"sitecore.rendering.componentName" is required');
  assert(typeof rnd.type === 'string', '"sitecore.rendering.type" is required');

  assert(Array.isArray(sc.placeholders), '"sitecore.placeholders" must be an array');
  const placeholders: SitecorePlaceholder[] = (sc.placeholders as unknown[]).map((p, i) => {
    assert(p && typeof p === 'object', `placeholder #${i} must be an object`);
    const pp = p as Record<string, unknown>;
    assert(typeof pp.key === 'string', `placeholder #${i} needs a "key"`);
    return {
      key: pp.key,
      dynamic: Boolean(pp.dynamic),
      allowedRenderings: pp.allowedRenderings === undefined ? ['*'] : asStringArray(pp.allowedRenderings, `placeholder #${i} allowedRenderings`),
    };
  });

  const params = sc.params === undefined ? [] : asStringArray(sc.params, 'sitecore.params');

  return {
    name: m.name,
    description: m.description,
    files,
    dependencies,
    registryDependencies,
    sitecore: {
      template: { name: tpl.name, fields },
      rendering: { componentName: rnd.componentName, type: rnd.type },
      placeholders,
      params,
    },
  };
}
