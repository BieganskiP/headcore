import type { RawFieldValue, RenderingNode } from '../types.js';
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
  /** Partial-failure notes (e.g. dictionary query failed). */
  errors?: string[];
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
    ...(errors.length > 0 ? { errors } : {}),
  };
}
