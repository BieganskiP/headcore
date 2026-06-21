export interface EdgeConfig {
  endpoint: string;
  apiKey: string;
  site: string;
  defaultLanguage: string;
}

export type StylingMode = 'css' | 'tailwind' | 'none';

export interface ScaffoldConfig {
  edge: EdgeConfig;
  componentPath: string;
  componentPropsImport: string;
  sitecorePackage: string;
  useDatasourceCheck: boolean;
  generateMocks: boolean;
  /** Styling strategy for generated components. Defaults to 'css' (CSS Modules). */
  styling: StylingMode;
  fieldTypeOverrides: Record<string, string>;
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
