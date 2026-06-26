export const LAYOUT_QUERY = `query GetLayout($site: String!, $routePath: String!, $language: String!) {
  layout(site: $site, routePath: $routePath, language: $language) {
    item { rendered }
  }
}`;

export const DICTIONARY_QUERY = `query GetDictionary($site: String!, $language: String!, $after: String) {
  site {
    siteInfo(site: $site) {
      dictionary(language: $language, first: 1000, after: $after) {
        results { key value }
        pageInfo { endCursor hasNext }
      }
    }
  }
}`;
