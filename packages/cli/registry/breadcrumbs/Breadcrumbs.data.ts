import type { GetComponentServerProps } from '@sitecore-content-sdk/nextjs';
import type { BreadcrumbsData, Crumb } from './Breadcrumbs.types';

export const BREADCRUMBS_QUERY = `
query BreadcrumbsQuery($itemId: String!, $language: String!) {
  item(path: $itemId, language: $language) {
    name
    title: field(name: "NavigationTitle") { value }
    url { path }
    ancestors(hasLayout: true) {
      name
      title: field(name: "NavigationTitle") { value }
      url { path }
    }
  }
}
`;

export const EDGE_URL = 'https://edge-platform.sitecorecloud.io/v1/content/api/graphql/v1';

type EdgeBreadcrumbItem = {
  name: string;
  title: { value?: string } | null;
  url: { path?: string } | null;
};

function toCrumb(item: EdgeBreadcrumbItem): Crumb | null {
  const href = item.url?.path;
  if (!href) return null;
  return { label: item.title?.value?.trim() || item.name, href };
}

/**
 * Builds the breadcrumb trail (home first, current page last) from the current
 * item's ancestors on Experience Edge. Runs server-side (SSG/SSR) through the
 * Content SDK's component-level data fetching; the returned props reach the
 * component at render time.
 *
 * Requires the SITECORE_EDGE_CONTEXT_ID environment variable (server-side).
 * For a legacy Experience Edge setup, replace EDGE_URL with your edge endpoint
 * and send an sc_apikey header instead of the sitecore_contextid parameter.
 *
 * Never throws: any failure logs a warning and yields an empty trail, so
 * breadcrumbs can never break a page build.
 */
export const getComponentServerProps: GetComponentServerProps = async (
  _rendering,
  layoutData,
): Promise<BreadcrumbsData> => {
  const empty: BreadcrumbsData = { crumbs: [] };
  const { route, context } = layoutData.sitecore;
  const itemId = route?.itemId;
  const language = route?.itemLanguage ?? context.language;
  const contextId = process.env.SITECORE_EDGE_CONTEXT_ID;

  if (!contextId) {
    console.warn('Breadcrumbs: SITECORE_EDGE_CONTEXT_ID is not set.');
    return empty;
  }
  if (!itemId || !language) {
    console.warn('Breadcrumbs: missing itemId or language in layout data.');
    return empty;
  }

  try {
    const res = await fetch(`${EDGE_URL}?sitecore_contextid=${contextId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: BREADCRUMBS_QUERY, variables: { itemId, language } }),
    });
    if (!res.ok) {
      console.warn(`Breadcrumbs: Experience Edge responded ${res.status}.`);
      return empty;
    }
    const { data, errors } = await res.json();
    if (errors?.length || !data?.item) {
      console.warn('Breadcrumbs: no item returned from Experience Edge.', errors?.[0]?.message ?? '');
      return empty;
    }
    // Edge returns ancestors closest-parent-first; reverse for a root-first trail.
    const trail: EdgeBreadcrumbItem[] = [...(data.item.ancestors ?? [])].reverse();
    trail.push(data.item);
    return { crumbs: trail.map(toCrumb).filter((c): c is Crumb => c !== null) };
  } catch (err) {
    console.warn('Breadcrumbs: failed to fetch ancestors.', err);
    return empty;
  }
};
