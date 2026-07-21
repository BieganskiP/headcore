import type { RenderingNode } from '../types.js';
import type { ComponentManifest } from '../registry/manifest.js';

export interface GuiLayoutNode {
  componentName: string;
  dataSource?: string;
  /** Field names only — values are dropped to keep the payload lean. */
  fieldNames: string[];
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
}

export interface GuiState {
  site: string;
  language: string;
  /** ISO timestamp of the successful fetch. */
  fetchedAt: string;
  routes: GuiRouteDetail[];
  registry: GuiRegistryEntry[];
  dictionaryCount: number;
  /** Partial-failure notes (e.g. dictionary query failed). */
  errors?: string[];
}

/** Trim a parsed layout to structure only: names, dataSource, field names. */
export function trimPlaceholders(
  placeholders: Record<string, RenderingNode[]>,
): Record<string, GuiLayoutNode[]> {
  const out: Record<string, GuiLayoutNode[]> = {};
  for (const [key, nodes] of Object.entries(placeholders)) {
    out[key] = nodes.map((n) => ({
      componentName: n.componentName,
      ...(n.dataSource !== undefined ? { dataSource: n.dataSource } : {}),
      fieldNames: Object.keys(n.fields),
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
  };
}

export interface GuiStateSources {
  site: string;
  language: string;
  routes: () => Promise<GuiRouteDetail[]>;
  dictionaryCount: () => Promise<number>;
  registry: GuiRegistryEntry[];
  /** Injectable clock for tests. */
  now?: () => Date;
}

/**
 * Assemble the dashboard state. A routes failure propagates (there is no
 * useful state without routes); a dictionary failure degrades to count 0
 * plus an errors entry.
 */
export async function assembleGuiState(src: GuiStateSources): Promise<GuiState> {
  const routes = await src.routes();
  const errors: string[] = [];
  let dictionaryCount = 0;
  try {
    dictionaryCount = await src.dictionaryCount();
  } catch (err) {
    errors.push(`dictionary: ${err instanceof Error ? err.message : String(err)}`);
  }
  return {
    site: src.site,
    language: src.language,
    fetchedAt: (src.now?.() ?? new Date()).toISOString(),
    routes,
    registry: src.registry,
    dictionaryCount,
    ...(errors.length > 0 ? { errors } : {}),
  };
}
