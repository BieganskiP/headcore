export interface EdgeConfig {
  /** XM Cloud Edge Context ID (modern auth). Mutually exclusive with endpoint/apiKey. */
  contextId?: string;
  /** GraphQL endpoint URL (legacy Experience Edge auth). */
  endpoint?: string;
  /** sc_apikey value (legacy Experience Edge auth). */
  apiKey?: string;
  site: string;
  defaultLanguage: string;
}

export type StylingMode = 'css' | 'tailwind' | 'none';

export interface ScaffoldConfig {
  edge: EdgeConfig;
  componentPath: string;
  /** When true, each component's files go in their own `<componentPath>/<Name>/` folder. */
  componentFolder: boolean;
  componentPropsImport: string;
  sitecorePackage: string;
  useDatasourceCheck: boolean;
  generateMocks: boolean;
  /** Styling strategy for generated components. Defaults to 'css' (CSS Modules). */
  styling: StylingMode;
  fieldTypeOverrides: Record<string, string>;
  /** Output directory for generated i18n artifacts (dictionary keys + typed t wrapper). */
  i18nPath: string;
  /** Package that provides `useI18n` for the generated typed t wrapper. */
  i18nPackage: string;
}

/** A single field's raw value as returned in layout JSON. */
export type RawFieldValue = unknown;

export interface RenderingNode {
  componentName: string;
  dataSource?: string;
  fields: Record<string, RawFieldValue>;
  params: Record<string, string>;
  placeholders: Record<string, RenderingNode[]>;
}

export interface RenderingTree {
  route: string;
  placeholders: Record<string, RenderingNode[]>;
}

export type FieldRenderer = 'Text' | 'RichText' | 'Image' | 'Link' | 'Cards' | 'raw';

export interface FieldContract {
  name: string;
  tsType: string;
  optional: boolean;
  renderer: FieldRenderer;
  sitecoreImport: string | null;
  /** For 'Cards' fields: the generated item interface name, e.g. 'TabsItem'. */
  itemTypeName?: string;
  /** For 'Cards' fields: contracts for each inner field of a referenced item. */
  itemFields?: FieldContract[];
}

export interface ComponentContract {
  name: string;
  fields: FieldContract[];
  params: string[];
  placeholders: string[];
}

export interface GeneratedFile {
  path: string;
  contents: string;
}
