import type { RenderingNode, RenderingTree } from '../types.js';

interface RawRendering {
  componentName?: string;
  dataSource?: string;
  fields?: Record<string, unknown>;
  params?: Record<string, string>;
  placeholders?: Record<string, RawRendering[]>;
}

function normalizePlaceholders(
  ph: Record<string, RawRendering[]> | undefined,
): Record<string, RenderingNode[]> {
  const out: Record<string, RenderingNode[]> = {};
  for (const [key, renderings] of Object.entries(ph ?? {})) {
    out[key] = renderings.map(normalizeRendering);
  }
  return out;
}

function normalizeRendering(r: RawRendering): RenderingNode {
  return {
    componentName: r.componentName ?? 'Unknown',
    dataSource: r.dataSource,
    fields: r.fields ?? {},
    params: r.params ?? {},
    placeholders: normalizePlaceholders(r.placeholders),
  };
}

export function parseLayout(raw: unknown, route: string): RenderingTree {
  const root = raw as {
    sitecore?: {
      route?: {
        itemId?: unknown;
        fields?: Record<string, unknown>;
        placeholders?: Record<string, RawRendering[]>;
      } | null;
    };
  };
  const routeData = root?.sitecore?.route;
  if (!routeData) {
    throw new Error(`no route data in layout for ${route}`);
  }
  const itemId = typeof routeData.itemId === 'string' && routeData.itemId !== '' ? routeData.itemId : undefined;
  const fields = routeData.fields !== null && typeof routeData.fields === 'object' && !Array.isArray(routeData.fields)
    ? routeData.fields
    : undefined;
  return {
    route,
    ...(itemId !== undefined ? { itemId } : {}),
    ...(fields !== undefined ? { fields } : {}),
    placeholders: normalizePlaceholders(routeData.placeholders),
  };
}
