import type { GuiLinksConfig, RawFieldValue, RenderingNode } from '../types.js';
import type { ComponentManifest, SitecorePlaceholder } from '../registry/manifest.js';
import type { DictionaryEntry } from '../edge/client.js';

export interface GuiLayoutNode {
  componentName: string;
  dataSource?: string;
  /** Raw field values as returned in layout JSON — the GUI renders them on demand. */
  fields: Record<string, RawFieldValue>;
  placeholders: Record<string, GuiLayoutNode[]>;
}

export interface GuiRouteDetail {
  routePath: string;
  name: string;
  updatedAt: string | null;
  /** Sitecore item id of the route, when the layout payload carries one. */
  itemId?: string;
  /** Route-level (page) fields, e.g. page title / meta description. */
  routeFields?: Record<string, RawFieldValue>;
  /** Unique component names on the page, depth-first. */
  components: string[];
  /** Mirrors RenderingTree.placeholders: top-level placeholder key → nodes. */
  layout: Record<string, GuiLayoutNode[]>;
}

export interface GuiRegistryEntry {
  /** Manifest name (registry id, e.g. "Tabs"). */
  name: string;
  /** sitecore.rendering.componentName — the key matched against page components. */
  componentName: string;
  description: string;
  placement?: string;
  /** Placeholders the component exposes, from the manifest. */
  placeholders: SitecorePlaceholder[];
}

export interface GuiState {
  site: string;
  language: string;
  /** ISO timestamp of the successful fetch. */
  fetchedAt: string;
  routes: GuiRouteDetail[];
  registry: GuiRegistryEntry[];
  dictionary: DictionaryEntry[];
  /** Deep-link settings from the config's `gui` section, when present. */
  links?: GuiLinksConfig;
  /** Partial-failure notes (e.g. dictionary query failed). */
  errors?: string[];
}

export interface GuiSnapshotMeta {
  id: string;
  fetchedAt: string;
  site: string;
  language: string;
  /** Route count in the snapshot. */
  routes: number;
  /** Total renderings across all routes, nested included. */
  renderings: number;
  /** Distinct component names across all routes. */
  components: number;
  dictionaryEntries: number;
}

/** Summary metrics for a stored snapshot — what history lists and trend charts consume. */
export function snapshotMeta(state: GuiState, id: string): GuiSnapshotMeta {
  let renderings = 0;
  const walk = (nodes: GuiLayoutNode[]): void => {
    for (const n of nodes) {
      renderings++;
      for (const children of Object.values(n.placeholders)) walk(children);
    }
  };
  for (const route of state.routes) {
    for (const top of Object.values(route.layout)) walk(top);
  }
  return {
    id,
    fetchedAt: state.fetchedAt,
    site: state.site,
    language: state.language,
    routes: state.routes.length,
    renderings,
    components: new Set(state.routes.flatMap((r) => r.components)).size,
    dictionaryEntries: state.dictionary.length,
  };
}

/** Trim a parsed layout to what the GUI needs: names, dataSource, fields (params are dropped). */
export function trimPlaceholders(
  placeholders: Record<string, RenderingNode[]>,
): Record<string, GuiLayoutNode[]> {
  const out: Record<string, GuiLayoutNode[]> = {};
  for (const [key, nodes] of Object.entries(placeholders)) {
    out[key] = nodes.map((n) => ({
      componentName: n.componentName,
      ...(n.dataSource !== undefined ? { dataSource: n.dataSource } : {}),
      fields: n.fields,
      placeholders: trimPlaceholders(n.placeholders),
    }));
  }
  return out;
}

export function manifestToRegistryEntry(m: ComponentManifest): GuiRegistryEntry {
  return {
    name: m.name,
    componentName: m.sitecore.rendering.componentName,
    description: m.description,
    ...(m.sitecore.placement !== undefined ? { placement: m.sitecore.placement } : {}),
    placeholders: m.sitecore.placeholders,
  };
}

export interface GuiStateSources {
  site: string;
  language: string;
  routes: () => Promise<GuiRouteDetail[]>;
  dictionary: () => Promise<DictionaryEntry[]>;
  registry: GuiRegistryEntry[];
  /** Deep-link settings surfaced to the GUI as state.links. */
  links?: GuiLinksConfig;
  /** Injectable clock for tests. */
  now?: () => Date;
}

/**
 * Assemble the dashboard state. A routes failure propagates (there is no
 * useful state without routes); a dictionary failure degrades to no entries
 * plus an errors entry.
 */
export async function assembleGuiState(src: GuiStateSources): Promise<GuiState> {
  const routes = await src.routes();
  const errors: string[] = [];
  let dictionary: DictionaryEntry[] = [];
  try {
    dictionary = await src.dictionary();
  } catch (err) {
    errors.push(`dictionary: ${err instanceof Error ? err.message : String(err)}`);
  }
  return {
    site: src.site,
    language: src.language,
    fetchedAt: (src.now?.() ?? new Date()).toISOString(),
    routes,
    registry: src.registry,
    dictionary,
    ...(src.links !== undefined ? { links: src.links } : {}),
    ...(errors.length > 0 ? { errors } : {}),
  };
}
