# headcore

**headcore** is a component kit for headless Sitecore + Next.js (Content SDK). It
gives you two ways to build:

- **Library** — copy in pre-built, accessible components you own and edit
  (shadcn-style), each shipped with instructions for modeling its Sitecore side.
- **Introspect** — inspect a live Experience Edge instance and scaffold typed,
  Content SDK-ready components from its layout data.

> **Disclaimer:** This tool was built with the help of AI. As such, it may
> contain bugs or rough edges. That said, it has been reviewed, tested, and
> verified by a human before release. Please report anything that looks off via
> the [issue tracker](https://github.com/BieganskiP/headcore/issues).

## Library (copy-in components)

```sh
headcore list             # see available components
headcore info <Name>      # component details + how to model its Sitecore side
headcore add <Name>       # copy the component into your project + write SITECORE.md
```

`list` and `info` need no config. `add` reads your `headcore.config.ts` (see
[Setup](#setup)) and, for each component:

- copies its source files into `componentPath` (honoring `componentFolder`);
- rewrites the `@sitecore-content-sdk/nextjs` and `lib/component-props` imports to
  match your `sitecorePackage` and `componentPropsImport`;
- pulls in any components it depends on automatically — e.g. `add Tabs` also adds
  `Tab`;
- includes the `withDatasourceCheck` guard on datasourced components by default,
  and strips it when your config sets `useDatasourceCheck: false` (mirroring the
  introspect codegen);
- writes a `SITECORE.md` describing the template, rendering, placeholders, and
  parameters to create in Sitecore.

Use `--dry-run` to preview the files that would be written, and `--force` to
overwrite existing files.

### Available components

- **Tabs** — an accessible, placeholder-driven tabbed container. Authors add any
  number of `Tab` components into its placeholder in the Page Editor; there is no
  fixed tab count. Full WAI-ARIA keyboard support (arrow keys, Home/End, roving
  tabindex) and, in the Sitecore editor, all panels are revealed at once so every
  tab's content is editable. Depends on `Tab` (added automatically).
- **Tab** — a single tab within `Tabs`. Supplies the tab's `title` and exposes its
  own content placeholder for arbitrary renderings. Guarded with
  `withDatasourceCheck` so a tab without a datasource is flagged in the editor.
- **Accordion** — an accessible, placeholder-driven accordion. Authors add any
  number of `AccordionItem` components into its placeholder; panels start collapsed
  and the `AllowMultiple` rendering parameter (Checkbox) controls whether several
  panels can stay open at once. Full keyboard support (arrow keys, Home/End) and,
  in the Sitecore editor, all panels are revealed at once. Depends on
  `AccordionItem` (added automatically).
- **AccordionItem** — a single section within `Accordion`. Supplies the section's
  `title` and exposes its own content placeholder for arbitrary renderings. Guarded
  with `withDatasourceCheck`.
- **Carousel** — an accessible, placeholder-driven carousel / media gallery.
  Authors add any number of `CarouselSlide` components into its placeholder; one
  slide shows at a time with previous/next controls and dot indicators, wrapping
  around at the ends. No autoplay. In the Sitecore editor, all slides are
  revealed stacked so each is editable. Depends on `CarouselSlide` (added
  automatically).
- **CarouselSlide** — a single slide within `Carousel`. Supplies the slide's
  `title` (used as its accessible name) and exposes its own content placeholder
  for arbitrary renderings. Guarded with `withDatasourceCheck`.
- **Breadcrumbs** — a context-driven breadcrumb trail. Add it once to a shared
  placeholder (an XM Cloud Pages partial design, or the page template's standard
  values) and it derives the trail from the current page's ancestors via an
  Experience Edge query fetched server-side (`getComponentServerProps`, Pages
  Router). Home first; current page unlinked with `aria-current`; emits
  schema.org BreadcrumbList JSON-LD; renders nothing on the home page. Needs
  `SITECORE_EDGE_CONTEXT_ID` in the app's server-side environment.

## Install

```sh
npm install -g headcore
# or run without installing:
npx headcore list
```

## Setup

Required for `add` and all introspect commands (`list`/`info` do not need it):

1. Run `npx headcore init` to create a starter `headcore.config.ts` in your
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

## Introspect commands

    headcore inspect <route>
    headcore page <route> [--lang <lang>] [--dry-run] [--force]
    headcore dictionary [--lang <lang>] [--dry-run] [--force]
    headcore routes [--lang <lang>] [--filter <substring>] [--sort path|updated] [--components] [--tree [--tree-all]] [--json] [--out <file>]
    headcore component <Name> --route <route> [--lang <lang>] [--variants <A,B,C>] [--dry-run] [--force]

`inspect` prints the rendering/placeholder tree for a route.
`component` scaffolds `<Name>.tsx`, `<Name>.types.ts`, `<Name>.mock.json`, and
(when `styling: 'css'`) `<Name>.module.css`.

`page` scaffolds **every** component on a route in one pass. It dedupes
component types and merges inferred field shapes across all instances (a field
missing or empty on some instances becomes optional; the most specific renderer
wins; hard type conflicts fall back to `Field<string>` with a warning). Files
that already exist are skipped unless `--force` is passed. `--variants` is not
supported here — scaffold the page, then re-run `component <Name> --variants …`
for a component you want to split.

`dictionary` fetches the site dictionary from Experience Edge and generates
type-safe translations into `<i18nPath>` (default `src/lib/i18n`):

- `dictionary-keys.ts` — a `dictionaryKeys` const map and a `DictionaryKey` type.
  This file is **always overwritten** so it tracks the live dictionary; re-run the
  command whenever entries are added or removed.
- `use-typed-t.ts` — a `useTypedT()` hook wrapping `useI18n().t` (from the
  `i18nPackage`, default `next-localization`) with keys constrained to
  `DictionaryKey`. This file is **scaffolded once** and skipped if it exists
  (pass `--force` to regenerate it).

Use it at call sites as:

    const t = useTypedT();
    t(dictionaryKeys['Nav.Login']); // autocompleted; unknown keys are type errors

`routes` lists every route the site exposes on Experience Edge — route path,
item name, and last-updated date — so you can discover new pages without asking
a Sitecore dev for URLs. `--filter <substring>` narrows by path
(case-insensitive), `--sort updated` puts the newest pages first (default is by
path), and `--json` emits `[{ routePath, name, updatedAt }]` for scripting.
`--components` additionally lists the unique component names used on each page,
indented under the route row (or as a `components` array in JSON). The rendered
layout is fetched inside the same paginated routes query, so it stays a handful
of requests rather than one per page — but each page of results is heavier, so
expect the command to take longer on large sites.
`--tree` renders the routes as a path hierarchy instead of a flat table — each
branch shows how many pages live under it, and groups of more than 10 sibling
"details" pages collapse to the first 5 plus a `… +N more` line so large sites
stay scannable (pass `--tree-all` to expand everything). `--filter` still
applies; `--tree` cannot be combined with `--json`, `--out`, or `--components`.

    /  Home
    ├── about  About Us
    └── news  News  (52)
        ├── airport-expansion  Airport Expansion
        ├── new-lounge  New Lounge
        ├── summer-schedule  Summer Schedule
        ├── winter-schedule  Winter Schedule
        ├── year-in-review  Year in Review
        └── … +47 more (use --tree-all)

Zero matches is not an error: you get `0 routes (lang: xx)` (or `[]`) and exit
code 0.
Pass `--out <file>` to save the JSON export to a file instead of printing it
(`--json` is implied); the file is written UTF-8 without a BOM, parent
directories are created, and an existing file is overwritten.

## GUI dashboard

```sh
headcore gui
```

Opens a local, read-only analytical dashboard for the configured site in your
browser: what pages exist and how fresh they are, which components are used
where (and which registry components are not), how components nest, which
datasources are shared across pages, broken internal links and orphan pages,
localization coverage per language, full-text search across all field values,
a per-route layout inspector, a dictionary browser, a content/SEO audit, and
snapshot history with trends over time.

Everything is fetched from Experience Edge and stays on your machine — nothing
is written to Sitecore. Full documentation is built into the dashboard (Docs
in the sidebar).

## Output location

- `componentPath` — base directory for generated and copied-in components
  (default `src/components/sitecore`).
- `componentFolder` — when `true` (default), each component's files go in their
  own `<componentPath>/<Name>/` folder; when `false`, they are written flat into
  `componentPath`.

## Styling

The `styling` config option controls **introspect-generated** component styles:

- `css` (default) — generate a `<Name>.module.css` (CSS Modules) and reference
  classes via `className={styles.root}` / `styles.card`.
- `tailwind` — emit Tailwind utility classes inline; no CSS file.
- `none` — plain class names, no stylesheet.

(Copy-in Library components ship with inline Tailwind utility classes; the
`styling` option does not transform them.)

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

## Placeholders

Nested placeholders on a rendering are scaffolded as
`<Placeholder name="<key>" rendering={rendering} />` (the component receives the
`rendering` prop automatically).

## Rendering variants

Pass `--variants` to scaffold one module that exports several Content SDK
variants of the same component:

    headcore component GridModule --route /x --variants ThreeCard,FourCard,FiveCard

- `Default` is always generated first (prepended if your list omits it); it is the
  main variant.
- Names are sanitized to valid PascalCase identifiers and de-duplicated.
- The file holds a shared inner `<Name>Variant` with the inferred markup; each
  export is a thin wrapper passing its `variant` name (and `data-variant` is set on
  the root element). Branch on `variant` inside the inner component to diverge.
- When a variant grows substantially different, move it to a sibling
  `<Name><Variant>.tsx` that imports props from `./<Name>.types`, and re-export it
  from the main module.

Without `--variants`, a single default-export component is generated as before.

## Type inference (MVP 1)

Types are inferred from layout JSON value shape (string -> `Field<string>`,
`{src,...}` -> `ImageField`, `{href,...}` -> `LinkField`, etc.). Template-metadata
driven types require the Authoring API (MVP 2).
