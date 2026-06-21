1# Sitecore Scaffold — MVP 1 Design

**Date:** 2026-06-21
**Scope:** MVP 1 only (Edge-based inspector + scaffold)
**Status:** Approved design, pending spec review

## Goal

A CLI-first, deterministic, Sitecore-data-aware tool that inspects real headless
Sitecore layout data from Experience Edge and scaffolds typed, Content SDK-ready
Next.js components from it.

MVP 1 delivers the smallest useful slice:

1. Load connection + generation config.
2. Connect to Experience Edge and fetch a route's layout data.
3. Print the rendering/placeholder tree for a route.
4. Scaffold one component (`.tsx` + `.types.ts` + `.mock.json`) from a selected
   rendering, with TypeScript types inferred from the layout JSON.

Out of scope for MVP 1: Authoring/Management API, template-metadata-driven types,
GraphQL codegen, server/client component detection, local serialization, component
map updates, and AI assistance. These belong to MVP 2 / MVP 3.

## Decisions (from brainstorming)

- **Scope:** MVP 1 only.
- **Test data:** A live Experience Edge endpoint is available; capture one real
  layout fixture early, then run most tests offline against it.
- **Repo structure:** npm-workspaces monorepo, `core` + `cli` packages now, so the
  future VS Code extension reuses `core`.
- **Toolchain:** TypeScript, npm workspaces, Vitest (tests), tsup/esbuild (build).
- **Config source:** Own config file only — `sitecore-scaffold.config.ts`, with
  secrets referenced via environment variables. No auto-reading of the host
  project's `.env.local` in MVP 1.
- **Codegen approach:** Option A — pure functions producing strings from a
  `ComponentContract` data structure, snapshot-tested. `ts-morph`/AST is deferred
  to a later MVP where file-merging is needed.

## Architecture & package layout

```txt
sitecore-scaffold/                 (npm workspaces root)
  package.json                     workspaces: ["packages/*"]
  tsconfig.base.json
  packages/
    core/        @sitecore-scaffold/core    — all logic, no CLI deps
      src/
        config/        load + validate sitecore-scaffold.config.ts, resolve env
        edge/          Edge GraphQL client (layout query)
        inspect/       parse layout JSON -> RenderingTree
        contract/      RenderingTree -> ComponentContract (+ shape-based inference)
        codegen/       ComponentContract -> { tsx, types, mock } strings (Option A)
        index.ts       public API the CLI (and later VS Code ext) call
    cli/         sitecore-scaffold              — thin wrapper (bin)
      src/
        index.ts       arg parsing, command dispatch, terminal rendering
        commands/      inspect.ts, component.ts
```

**Dependency rule:** `cli` depends on `core`; `core` depends on nothing
CLI-specific. All real logic lives in `core` as pure-ish functions so the future
VS Code extension imports the same API. The CLI only parses args, calls core, and
prints.

## Data flow

```txt
config.ts + env  --->  EdgeClient.getLayout({site, routePath, language})
                          |  GraphQL: layout(site,routePath,language){ item { rendered } }
                          v
                   raw Layout JSON  --->  inspect: walk sitecore.route.placeholders
                          |                       -> RenderingTree (placeholders, renderings,
                          |                          dataSource, fields, params, nested placeholders)
                          v
                   `inspect` command prints the tree
                          |
   user picks a rendering v
                   contract: RenderingTree node -> ComponentContract
                          |   (infer field TS types from JSON value SHAPE)
                          v
                   codegen -> Hero.tsx / Hero.types.ts / Hero.mock.json
```

### Edge query

Experience Edge GraphQL `layout` query returns the full Layout Service JSON:

```graphql
query GetLayout($site: String!, $routePath: String!, $language: String!) {
  layout(site: $site, routePath: $routePath, language: $language) {
    item { rendered }
  }
}
```

`rendered` is `{ sitecore: { context, route: { placeholders: { ... } } } }`. The
inspector walks `rendered.sitecore.route.placeholders`; each rendering carries
`componentName`, `dataSource`, `fields`, `params`, and nested `placeholders`.

### Type inference (MVP-1 accuracy boundary)

Edge layout JSON provides field **values**, not Sitecore template **field-type
names**. MVP 1 infers TypeScript types from value shape:

- `"..."` -> `Field<string>`
- `{ href, text, ... }` -> `LinkField`
- `{ src, alt, width, height }` -> `ImageField`
- `true`/`false` -> `Field<boolean>`; number -> `Field<number>`
- array -> element-shape inference (e.g. `ItemReference[]`)
- empty/null/ambiguous -> best guess plus a `// TODO: verify type` comment

The template-type -> TS mapping table from the product notes requires the
Authoring API and lands in MVP 2.

## Codegen (Option A)

Pure functions: `ComponentContract -> string`. Three independently snapshot-tested
generators.

```ts
type FieldContract = {
  name: string;            // e.g. "heading"
  tsType: string;          // e.g. "Field<string>", "ImageField"
  optional: boolean;       // true if value was null/absent in layout
  renderer: 'Text' | 'RichText' | 'Image' | 'Link' | 'raw';
  sitecoreImport: string | null;  // which Content SDK import the renderer needs
};

type ComponentContract = {
  name: string;            // "Hero"
  fields: FieldContract[];
  params: string[];        // param keys seen in rendering.params
  placeholders: string[];  // nested placeholder keys (rendered as comments in MVP 1)
};
```

Outputs:

- **`<Name>.types.ts`** — `<Name>Fields`, `<Name>Params`, `<Name>Props`.
- **`<Name>.tsx`** — imports only the Content SDK renderers actually used; renders
  each field with its mapped renderer; optional fields guarded with `&&`; wrapped in
  `withDatasourceCheck()` when `useDatasourceCheck` is true; params spread onto the
  root element as data-attributes as a starting point.
- **`<Name>.mock.json`** — the actual datasource field values pulled from the layout,
  so local dev has real-shaped data.

**Config knobs honored in MVP 1:** `componentPath`, `componentPropsImport`,
`sitecorePackage`, `useDatasourceCheck`, `generateMocks`, `fieldTypeOverrides`.
Knobs accepted/validated but deferred: `styling`, `framework`, `updateComponentMap`
(flagged in config comments).

## CLI commands & config

```bash
sitecore-scaffold inspect <route>                    # print rendering/placeholder tree
sitecore-scaffold component <Name> --route <route>   # scaffold files for one rendering
```

- `component` runs the same inspect pipeline, finds the rendering whose
  `componentName` matches `<Name>` (errors with the list of available names if not
  found or ambiguous), builds the contract, and writes files to `componentPath`.
- Flags: `--route` (required for `component`), `--lang` (override default
  language), `--dry-run` (print files instead of writing), `--force` (overwrite
  existing). Refuse to overwrite without `--force`.
- Arg parsing via a small parser (no heavy CLI framework).

Config file `sitecore-scaffold.config.ts`, loaded with a TS-aware loader (jiti) so
no build step is needed. Secrets via env reference only:

```ts
export default {
  edge: {
    endpoint: process.env.SITECORE_EDGE_URL!,   // e.g. https://edge.sitecorecloud.io/api/graphql/v1
    apiKey:   process.env.SITECORE_EDGE_TOKEN!,  // auth header; read from env only
    site:     'my-site',
    defaultLanguage: 'en',
  },
  componentPath: 'src/components',
  componentPropsImport: '@/lib/component-props',
  sitecorePackage: '@sitecore-content-sdk/nextjs',
  useDatasourceCheck: true,
  generateMocks: true,
  fieldTypeOverrides: { 'Promo Link': 'LinkField' },
};
```

The API key is read from env at runtime only — never written into generated files
and never logged.

## Error handling

Fail with clear, actionable messages; no raw stack dumps:

- Missing/invalid config or unresolved env var -> name the missing key and env var.
- Edge HTTP/GraphQL errors (401, network, GraphQL `errors[]`) -> surface status +
  message; mask the API key.
- Route not found / empty layout -> "no route at `<route>` for site `<site>` /
  lang `<lang>`".
- Component name not found -> list available `componentName`s on that route.
- File exists without `--force` -> instruct to use `--force` or `--dry-run`.

## Testing (Vitest)

- **Unit:** shape-inference (each field shape -> contract), config loader/validation,
  tree parser — driven by small captured layout-JSON fixtures.
- **Snapshot:** each codegen function (tsx/types/mock) against the `Hero` contract
  plus edge cases (optional fields, no datasource, nested placeholder).
- **Integration (mocked Edge):** `inspect` and `component` end-to-end with a stubbed
  `EdgeClient` over a real captured layout fixture; assert tree output and written
  files.

Capture one real layout fixture from the live endpoint early; the rest of the suite
runs offline against fixtures.

## Security

- API key/token read from environment variables only.
- Never write tokens into generated files; never log them (mask in error output).
- No Sitecore data sent to any external/AI service in MVP 1.
