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
