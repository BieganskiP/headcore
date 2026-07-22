# headcore

Inspect Sitecore Experience Edge route layout data and scaffold typed,
Content SDK-ready Next.js components from it.

> **Disclaimer:** This tool was built with the help of AI. As such, it may
> contain bugs or rough edges. That said, it has been reviewed, tested, and
> verified by a human before release. Please report anything that looks off via
> the [issue tracker](https://github.com/BieganskiP/headcore/issues).

## Two ways to work

- **Library** — add pre-built, copy-in components you own and edit:

  ```sh
  headcore list             # see available components
  headcore info <Name>      # component details + how to model its Sitecore side
  headcore add <Name>       # copy the component into your project + write SITECORE.md
  ```

  `add` rewrites imports to match your config, pulls in dependencies
  automatically (`add Tabs` also adds `Tab`), and honors `useDatasourceCheck`.
  Ships with **Tabs**, **Accordion**, and **Carousel** — accessible,
  placeholder-driven containers with unlimited author-managed items — plus
  their **Tab** / **AccordionItem** / **CarouselSlide** companions, and
  **Breadcrumbs**, a context-driven trail for shared page chrome (Edge
  ancestors query, JSON-LD).
  `list`/`info` need no config.

- **Introspect** — generate code from a live Sitecore/Experience Edge instance
  (see Commands below).

## Install

```sh
npm install -g headcore
# or run without installing:
npx headcore inspect <route>
```

## Setup

1. Run `headcore init` to create a starter `headcore.config.ts` in your
   project root (`--dry-run` previews, `--force` overwrites).
2. Configure auth (env vars are read from `.env.local`/`.env` next to the
   config file automatically; shell env takes precedence):
   - **XM Cloud (Content SDK):** set `SITECORE_EDGE_CONTEXT_ID` and use
     `edge.contextId`. The tool talks to
     `https://edge-platform.sitecorecloud.io/v1/content/api/graphql/v1`.
   - **Legacy Experience Edge:** set `SITECORE_EDGE_URL` and
     `SITECORE_EDGE_TOKEN` and use `edge.endpoint` + `edge.apiKey`.
   Exactly one auth mode must be configured.
3. Set `edge.site` and `edge.defaultLanguage` in the config.

## Commands

```sh
headcore init [--dry-run] [--force]
headcore inspect <route>
headcore page <route> [--lang <lang>] [--dry-run] [--force]
headcore dictionary [--lang <lang>] [--dry-run] [--force]
headcore routes [--lang <lang>] [--filter <substring>] [--sort path|updated] [--components] [--tree [--tree-all]] [--json] [--out <file>]
headcore gui [--lang <lang>] [--port <n>] [--no-open]
headcore component <Name> --route <route> [--lang <lang>] [--variants <A,B,C>] [--dry-run] [--force]
```

- `inspect` prints the rendering/placeholder tree for a route.
- `component` scaffolds `<Name>.tsx`, `<Name>.types.ts`, `<Name>.mock.json`, and
  (when `styling: 'css'`) `<Name>.module.css`.
- `page` scaffolds **every** component on a route in one pass, deduping component
  types and merging inferred field shapes across all instances.
- `dictionary` fetches the site dictionary from Experience Edge and generates
  type-safe translations (`dictionary-keys.ts` + a `useTypedT()` hook).
- `routes` lists every route the site exposes on Experience Edge — path, item
  name, last-updated date. `--components` also lists the unique component names
  used on each page; `--json`/`--out <file>` emit the listing for scripting;
  `--tree` renders the routes as a path hierarchy with per-branch page counts,
  auto-collapsing big groups of sibling pages (`--tree-all` expands them).

### GUI dashboard

```bash
headcore gui [--lang <lang>] [--port <n>] [--no-open]
```

Starts a local, read-only analytical dashboard for the configured site:
routes (tree + table), components with usage counts, registry coverage, and
per-field fill rates, per-component detail pages (every route and rendering
the component appears on, with datasource, field values, and placeholder
contents), a datasource explorer (which content items are shared across
pages), internal link analysis (broken links, orphan pages, click-depth
graph), a localization coverage matrix (route × language: translated /
missing / stale), full-text content search across all field values, a
per-route layout inspector, a dictionary browser with cross-language
comparison, a content audit (empty fields, images without alt, missing page
titles / meta descriptions, duplicate titles), and snapshot history with
trend sparklines and two-snapshot diffs. The browser opens immediately and
shows a loading indicator while the initial Experience Edge fetch runs in
the background; use the Refresh button (or the language box) to refetch.
Default port 4646 (auto-increments if busy), bound to 127.0.0.1 only.

Every distinct fetch is saved to `.headcore/history/` next to your config
(identical fetches are recorded once; the newest 100 snapshots are kept) and
powers the History view. Add `.headcore/` to your `.gitignore` if you do not
want snapshots committed.

Optional `gui` config section for deep links from the dashboard into editing:

```ts
// headcore.config.ts
gui: {
  // {itemId}, {lang}, {site}, {routePath} placeholders are substituted.
  editUrlTemplate: 'https://pages.sitecorecloud.io/?sc_itemid={itemId}&sc_lang={lang}&sc_site={site}',
  siteBaseUrl: 'https://www.example.com',
},
```

Tip: add a script to your project for quick access:

```json
"scripts": { "headcore:gui": "headcore gui" }
```

## Storybook

headcore can emit a CSF3 story next to each component it adds or generates —
enable it in `headcore.config.ts`:

```ts
storybook: {
  enabled: true,
  titlePrefix: 'Sitecore',                            // stories appear as "Sitecore/<Name>"
  decoratorPath: '.storybook/sitecore-decorator.tsx', // shared decorator, written once
  framework: '@storybook/nextjs',                     // your Storybook framework package (default)
},
```

headcore does **not** install Storybook — bring your own (the `@storybook/nextjs`
framework is recommended for Content SDK projects, and `resolveJsonModule` must be
on, as it is in the Content SDK starters). The story's `Meta`/`StoryObj` types are
imported from `framework` — set it to your framework package (e.g.
`@storybook/react-vite`); importing the bare `@storybook/react` renderer would trip
Storybook's `no-renderer-packages` lint rule. Enabling stories implies mock emission:
each story imports its component's `<Name>.mock.json` as args. Extra top-level keys
in a mock (e.g. Breadcrumbs' `crumbs`) are passed through as story args. The shared
decorator wraps stories in `SitecoreProvider` (never in editing mode) and takes a
component map so `<Placeholder>` children resolve — it's written only if missing,
so it's yours to adapt to your SDK version. A container's story imports its child
components as siblings (e.g. Carousel imports CarouselSlide), so generate the
children too — `add` resolves registry dependencies automatically, but a single
`component <Name>` run scaffolds only the named component.

See the [project README](https://github.com/BieganskiP/headcore#readme)
for full documentation on styling, placeholders, rendering variants, and type
inference.

## License

MIT © Patryk Biegański
