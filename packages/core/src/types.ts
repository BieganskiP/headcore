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

export interface StorybookConfig {
  /** Emit a `<Name>.stories.tsx` next to each component (implies mock emission). */
  enabled: boolean;
  /** Story title prefix: stories appear as `<titlePrefix>/<Name>` ('' for bare names). */
  titlePrefix: string;
  /** Project-relative path of the shared Storybook decorator file (written once, never overwritten). */
  decoratorPath: string;
  /**
   * Package the story's `Meta`/`StoryObj` type imports come from. Must be the
   * project's Storybook framework package (importing the bare renderer trips
   * eslint `storybook/no-renderer-packages`).
   */
  framework: string;
}

export interface GuiLinksConfig {
  /**
   * URL template for "open in editor" deep links in the GUI. Supports
   * {itemId}, {lang}, {site}, and {routePath} placeholders.
   */
  editUrlTemplate?: string;
  /** Live site base URL; the GUI appends a route's path for open-page links. */
  siteBaseUrl?: string;
}

export interface HeadcoreConfig {
  edge: EdgeConfig;
  /** Optional GUI deep-link settings (headcore gui). */
  gui?: GuiLinksConfig;
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
  /** Storybook story generation. Optional in user config; loadConfig always fills defaults. */
  storybook?: StorybookConfig;
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
  /** Sitecore item id of the route, when the layout payload carries one. */
  itemId?: string;
  /** Route-level (page) fields from the layout payload, e.g. page title / meta description. */
  fields?: Record<string, RawFieldValue>;
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
