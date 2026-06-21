// Copy to sitecore-scaffold.config.ts and fill in. Secrets come from env vars.
export default {
  edge: {
    endpoint: process.env.SITECORE_EDGE_URL!,   // e.g. https://edge.sitecorecloud.io/api/graphql/v1
    apiKey: process.env.SITECORE_EDGE_TOKEN!,    // never hardcode; read from env only
    site: 'my-site',
    defaultLanguage: 'en',
  },
  componentPath: 'src/components',
  componentPropsImport: '@/lib/component-props',
  sitecorePackage: '@sitecore-content-sdk/nextjs',
  useDatasourceCheck: true,
  generateMocks: true,
  fieldTypeOverrides: {},
};
