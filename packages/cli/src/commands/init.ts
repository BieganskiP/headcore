import { existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export interface InitInput {
  dryRun: boolean;
  force: boolean;
  /** Directory to write the config into. Defaults to process.cwd(). */
  cwd?: string;
}

export interface InitResult {
  /** Absolute path of the config file. */
  path: string;
  /** False on --dry-run, true when the file was written. */
  written: boolean;
}

const CONFIG_FILENAME = 'headcore.config.ts';

/** Keep in sync with headcore.config.example.ts at the repo root. */
// A named const (not an anonymous `export default {}`) so the generated file
// passes the `import/no-anonymous-default-export` rule in Next.js ESLint setups.
const CONFIG_TEMPLATE = `// headcore config. Secrets come from env vars (.env.local and .env next to
// this file are loaded automatically; shell env wins).
const headcoreConfig = {
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
  styling: 'css', // 'css' (CSS Modules) | 'tailwind' | 'none' — for introspect-generated components
  fieldTypeOverrides: {},
  i18nPath: 'src/lib/i18n', // where dictionary-keys.ts and use-typed-t.ts are written
  i18nPackage: 'next-localization', // provides useI18n() for the typed t wrapper
  // Storybook story generation ("bring your own Storybook" — headcore emits
  // <Name>.stories.tsx + mocks; enabling this implies mock emission):
  // storybook: {
  //   enabled: true,
  //   titlePrefix: 'Sitecore', // stories appear as "Sitecore/<Name>" ('' for bare names)
  //   decoratorPath: '.storybook/sitecore-decorator.tsx', // shared decorator, written once and never overwritten
  // },
};

export default headcoreConfig;
`;

export function runInit(input: InitInput): InitResult {
  const cwd = input.cwd ?? process.cwd();
  const path = join(cwd, CONFIG_FILENAME);

  if (input.dryRun) {
    return { path, written: false };
  }
  if (!input.force && existsSync(path)) {
    throw new Error(`${path} already exists. Use --force to overwrite or --dry-run to preview.`);
  }
  writeFileSync(path, CONFIG_TEMPLATE, 'utf8');
  return { path, written: true };
}
