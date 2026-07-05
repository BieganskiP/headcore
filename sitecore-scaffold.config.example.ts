// Copy to sitecore-scaffold.config.ts and fill in. Secrets come from env vars
// (.env.local and .env next to this file are loaded automatically; shell env wins).
export default {
  edge: {
    // Modern XM Cloud (Content SDK) auth — the Edge Context ID:
    contextId: process.env.SITECORE_EDGE_CONTEXT_ID, // or reuse NEXT_PUBLIC_SITECORE_EDGE_CONTEXT_ID from your Content SDK project
    // …or legacy Experience Edge auth (remove contextId above if you use these):
    // endpoint: process.env.SITECORE_EDGE_URL, // e.g. https://edge.sitecorecloud.io/api/graphql/v1
    // apiKey: process.env.SITECORE_EDGE_TOKEN,
    site: 'my-site',
    defaultLanguage: 'en',
  },
  componentPath: 'src/components/sitecore',
  componentFolder: true, // place each component's files in its own <Name>/ folder
  componentPropsImport: 'lib/component-props', // Sitecore Content SDK starter convention
  sitecorePackage: '@sitecore-content-sdk/nextjs',
  useDatasourceCheck: true,
  generateMocks: true,
  styling: 'css', // 'css' (CSS Modules) | 'tailwind' | 'none'
  fieldTypeOverrides: {},
  i18nPath: 'src/lib/i18n', // where dictionary-keys.ts and use-typed-t.ts are written
  i18nPackage: 'next-localization', // provides useI18n() for the typed t wrapper
};
