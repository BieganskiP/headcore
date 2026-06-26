// Copy to sitecore-scaffold.config.ts and fill in. Secrets come from env vars.
export default {
  edge: {
    endpoint: process.env.SITECORE_EDGE_URL!,   // e.g. https://edge.sitecorecloud.io/api/graphql/v1
    apiKey: process.env.SITECORE_EDGE_TOKEN!,    // never hardcode; read from env only
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
