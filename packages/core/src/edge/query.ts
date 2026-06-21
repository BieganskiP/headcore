export const LAYOUT_QUERY = `query GetLayout($site: String!, $routePath: String!, $language: String!) {
  layout(site: $site, routePath: $routePath, language: $language) {
    item { rendered }
  }
}`;
