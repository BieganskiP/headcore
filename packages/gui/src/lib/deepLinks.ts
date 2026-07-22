import type { GuiLinksConfig, GuiRouteDetail } from './types';

export interface DeepLinkContext {
  links?: GuiLinksConfig;
  site: string;
  language: string;
}

/** Editor deep link from links.editUrlTemplate; null when the template or the route's itemId is missing. */
export function editUrl(ctx: DeepLinkContext, route: Pick<GuiRouteDetail, 'itemId' | 'routePath'>): string | null {
  const template = ctx.links?.editUrlTemplate;
  if (template === undefined || route.itemId === undefined) return null;
  const values: Record<string, string> = {
    itemId: route.itemId,
    lang: ctx.language,
    site: ctx.site,
    routePath: route.routePath,
  };
  return template.replace(/\{(itemId|lang|site|routePath)\}/g, (_, key: string) => encodeURIComponent(values[key]));
}

/** Live-site URL from links.siteBaseUrl; null without a base. routePath always starts with '/'. */
export function liveUrl(ctx: DeepLinkContext, routePath: string): string | null {
  const base = ctx.links?.siteBaseUrl;
  if (base === undefined) return null;
  return base.replace(/\/+$/, '') + (routePath.startsWith('/') ? routePath : `/${routePath}`);
}
