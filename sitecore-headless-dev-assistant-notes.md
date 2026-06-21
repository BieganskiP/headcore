# Sitecore Headless Dev Assistant — Product Notes

## Core idea

Create a developer tool for frontend developers working with modern headless Sitecore and Next.js.

The tool should help developers understand what data Sitecore returns and scaffold Content SDK-ready components based on real Sitecore renderings, datasources, templates, layout data, and fields.

The strongest product angle is not just:

> Generate Sitecore components.

A better positioning is:

> Generate typed, Content SDK-ready Next.js components from actual Sitecore renderings, templates, datasources, and page layout data.

---

## Problem

Modern headless Sitecore with Next.js is powerful, but it has its own niche and learning curve.

Frontend developers often struggle with:

- understanding the shape of `fields`
- understanding `params`
- understanding `rendering`
- knowing what datasource data will return
- knowing what placeholders exist
- knowing how Content SDK maps components
- knowing when a component should be server/client
- weak or incomplete Content SDK documentation
- too much manual inspection of Layout Service / GraphQL responses
- scaffolding components without knowing the actual data contract

Existing scaffolding is often name/template-driven, but not data-aware.

---

## Main opportunity

Build a tool that fetches real Sitecore data into the developer environment and uses it to scaffold useful frontend code.

Instead of asking the user to manually know the props shape, the tool should inspect Sitecore and generate:

- component `.tsx` file
- TypeScript field types
- rendering params types
- datasource types
- placeholder structure
- GraphQL query file, if needed
- mock JSON for local development
- README/usage notes for the component
- optional component map update

---

## Recommended architecture

Do not build this only as a VS Code extension.

Build it as a core CLI/package first, then wrap it with a VS Code extension.

```txt
packages/
  sitecore-scaffold-core/
    - project analyzer
    - Sitecore config reader
    - Experience Edge GraphQL client
    - Authoring API client
    - local serialization parser
    - field type mapper
    - code generator
    - AST file writer

  sitecore-scaffold-cli/
    - npx sitecore-scaffold inspect /about-us
    - npx sitecore-scaffold component Hero

  vscode-extension/
    - command palette UI
    - rendering tree view
    - quick pick component generator
    - secret storage for tokens
```

This makes the project usable in:

- VS Code
- Cursor
- WebStorm
- terminal
- CI
- custom project scripts

---

## Data-fetching modes

### 1. Experience Edge / Delivery mode

Best for reading published content and layout data.

Can be used to fetch:

- route layout data
- renderings used on a page
- placeholders
- datasource IDs
- actual field values returned at runtime
- component names
- nested rendering structure

Good for fast scaffolding based on real page output.

Limitations:

- usually only works with published data
- may not expose full template metadata
- may not reveal complete field definitions
- may not know all rendering params
- custom resolvers can change the returned shape

---

### 2. Authoring / Management API mode

Best for accurate metadata.

Can be used to fetch:

- rendering item configuration
- datasource template
- template fields
- field types
- rendering parameters template
- item metadata
- site structure
- media references
- content tree data

This is the more powerful mode, but it requires authentication.

Use this for generating better TypeScript types and more accurate components.

---

### 3. Local serialization mode

Optional fallback mode.

Can read serialized Sitecore items from the repository if the project uses serialization.

Useful for:

- local template inspection
- rendering item inspection
- offline work
- avoiding API authentication during development
- comparing Sitecore metadata with local files

---

## MVP scope

### MVP 1 — Edge-based inspector and scaffold

Focus on a narrow but useful first version.

Features:

- read `.env.local`
- read `sitecore.config.ts`
- connect to Experience Edge
- fetch layout data for a route
- show renderings/placeholders tree
- allow selecting one rendering
- generate component based on returned JSON fields
- generate safe TypeScript types
- generate a basic Content SDK component
- generate mock JSON

Example command:

```bash
npx sitecore-scaffold inspect /about-us
npx sitecore-scaffold component Hero --route /about-us
```

VS Code command:

```txt
Sitecore: Inspect Route
Sitecore: Scaffold Component from Current Route
```

---

### MVP 2 — Authoring API support

Add authenticated metadata lookup.

Features:

- Sitecore login/token setup
- fetch rendering item
- fetch datasource template
- fetch template fields
- fetch rendering params template
- generate stronger TypeScript types
- better field-type mapping
- warn if datasource/template is missing
- support unpublished/dev items

---

### MVP 3 — Advanced codegen

Features:

- generate `.graphql` files
- integrate GraphQL Code Generator
- support App Router server/client component map
- detect `use client` requirements
- support placeholders
- support local serialization
- support custom scaffolding templates
- allow project-specific code style config
- optionally AI-assist markup generation

---

## VS Code extension features

Useful commands:

```txt
Sitecore: Connect Project
Sitecore: Inspect Route
Sitecore: Inspect Rendering
Sitecore: Scaffold Component from Rendering
Sitecore: Scaffold Component from Datasource
Sitecore: Generate Types
Sitecore: Generate Mock Data
Sitecore: Refresh Component Map
```

Possible UI:

```txt
/about-us
└── headless-main
    ├── Hero
    │   ├── datasource: /Data/Hero/About Hero
    │   ├── template: Hero
    │   ├── fields: heading, description, image, ctaLink
    │   └── params: variant, backgroundColor
    └── PromoCards
        ├── datasource: /Data/Promos/About Promos
        ├── fields: title, cards
        └── placeholder: cards
```

---

## Generated component example

```tsx
import {
  Field,
  ImageField,
  LinkField,
  Text,
  Image as SitecoreImage,
  Link as SitecoreLink,
  RichText,
  withDatasourceCheck,
} from '@sitecore-content-sdk/nextjs';

import { ComponentProps } from '@/lib/component-props';

type HeroFields = {
  heading: Field<string>;
  description?: Field<string>;
  image?: ImageField;
  ctaLink?: LinkField;
};

type HeroParams = {
  variant?: string;
  backgroundColor?: string;
};

type HeroProps = ComponentProps & {
  fields: HeroFields;
  params?: HeroParams;
};

const Hero = ({ fields, params }: HeroProps) => {
  return (
    <section data-variant={params?.variant}>
      {fields.image && <SitecoreImage field={fields.image} />}
      <Text tag="h1" field={fields.heading} />
      {fields.description && <RichText field={fields.description} />}
      {fields.ctaLink && <SitecoreLink field={fields.ctaLink} />}
    </section>
  );
};

export default withDatasourceCheck()<HeroProps>(Hero);
```

---

## Field type mapping

Initial mapping idea:

```ts
const sitecoreFieldToTs = {
  'Single-Line Text': 'Field<string>',
  'Multi-Line Text': 'Field<string>',
  'Rich Text': 'Field<string>',
  Image: 'ImageField',
  'General Link': 'LinkField',
  Checkbox: 'Field<boolean>',
  Date: 'Field<string>',
  Integer: 'Field<number>',
  Number: 'Field<number>',
  Multilist: 'ItemReference[]',
  Droplink: 'ItemReference',
  Droptree: 'ItemReference',
};
```

The mapping should be configurable because Sitecore projects often use custom field conventions.

---

## Important Sitecore edge cases

The tool must be careful because rendering data can come from many places:

- `rendering.fields`
- `rendering.params`
- `rendering.dataSource`
- route/context item
- component-level GraphQL
- integrated GraphQL
- custom content resolvers
- placeholder children
- SXA variants
- BYOC / FEaaS components
- personalization
- multisite/language/version context

Do not try to generate perfect production UI.

Generate a correct, typed, editable starting point.

---

## Server vs client components

For modern Next.js App Router projects, the tool should detect whether a component should be server-side or client-side.

Reasons to generate a client component:

- uses React state
- uses browser APIs
- uses event handlers
- uses interactive UI
- imports client-only libraries

Otherwise, default to server component where possible.

The tool should also understand that some Content SDK projects may have separate component maps for server and client components.

---

## AI usage

AI should be optional and secondary.

The deterministic tool should generate the data contract:

- types
- imports
- field renderers
- params
- placeholder structure
- GraphQL operation
- mock data

AI can help improve:

- JSX layout
- Tailwind classes
- accessibility
- naming
- README text
- component examples

The data contract should come from Sitecore, not from AI guessing.

---

## Security considerations

For the VS Code extension:

- store tokens in VS Code SecretStorage
- never commit tokens to files
- never write access tokens into generated components
- support `.env.local`
- support environment-based config
- allow clearing credentials
- avoid sending Sitecore data to AI unless the user explicitly enables it

---

## Configuration idea

Example config file:

```ts
// sitecore-scaffold.config.ts
export default {
  componentPath: 'src/components',
  componentPropsImport: '@/lib/component-props',
  styling: 'tailwind',
  framework: 'nextjs-app-router',
  sitecorePackage: '@sitecore-content-sdk/nextjs',
  useDatasourceCheck: true,
  generateMocks: true,
  updateComponentMap: true,
  fieldTypeOverrides: {
    'Promo Link': 'LinkField',
  },
};
```

---

## Strong product positioning

Possible names:

- Sitecore Headless Dev Assistant
- Sitecore Component Scout
- Sitecore Scaffold Pro
- Sitecore Lens
- Sitecore Inspector
- Sitecore Content SDK Assistant

Possible tagline:

> Inspect Sitecore renderings and generate typed Next.js Content SDK components from real content data.

---

## Key value for frontend developers

This tool should help frontend devs answer:

- What props does this component receive?
- What fields exist on this datasource?
- What type is this field?
- What params are configured?
- What placeholder children can appear here?
- Is this rendering correctly mapped?
- What does the Layout Service return?
- Why is my component getting empty fields?
- What component file should I create?
- What imports do I need from Content SDK?

---

## Best first prototype

Build a CLI that does this:

```bash
npx sitecore-scaffold inspect /some-page
```

Expected output:

```txt
Route: /some-page

Placeholder: headless-main
- Hero
  datasource: /Data/Hero/Home Hero
  fields:
    heading: Text
    description: Rich Text
    image: Image
    ctaLink: General Link
  params:
    variant
    backgroundColor

- PromoCards
  datasource: /Data/Promos/Home Promos
  fields:
    title: Text
    cards: Multilist
```

Then add:

```bash
npx sitecore-scaffold component Hero --route /some-page
```

Generated files:

```txt
src/components/Hero.tsx
src/components/Hero.types.ts
src/components/Hero.mock.json
```

---

## Final recommendation

This is a realistic and valuable tool.

The best version should be:

- deterministic first
- Sitecore-data-aware
- CLI-first
- VS Code extension second
- AI-assisted only as an optional layer

The biggest unique value is not scaffolding files.

The biggest value is bridging the gap between Sitecore data/model/renderings and frontend Next.js code.
