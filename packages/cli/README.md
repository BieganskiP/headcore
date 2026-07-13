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
headcore component <Name> --route <route> [--lang <lang>] [--variants <A,B,C>] [--dry-run] [--force]
```

- `inspect` prints the rendering/placeholder tree for a route.
- `component` scaffolds `<Name>.tsx`, `<Name>.types.ts`, `<Name>.mock.json`, and
  (when `styling: 'css'`) `<Name>.module.css`.
- `page` scaffolds **every** component on a route in one pass, deduping component
  types and merging inferred field shapes across all instances.
- `dictionary` fetches the site dictionary from Experience Edge and generates
  type-safe translations (`dictionary-keys.ts` + a `useTypedT()` hook).

## Storybook

headcore can emit a CSF3 story next to each component it adds or generates —
enable it in `headcore.config.ts`:

```ts
storybook: {
  enabled: true,
  titlePrefix: 'Sitecore',                            // stories appear as "Sitecore/<Name>"
  decoratorPath: '.storybook/sitecore-decorator.tsx', // shared decorator, written once
},
```

headcore does **not** install Storybook — bring your own (the `@storybook/nextjs`
framework is recommended for Content SDK projects, and `resolveJsonModule` must be
on, as it is in the Content SDK starters). Enabling stories implies mock emission:
each story imports its component's `<Name>.mock.json` as args. Extra top-level keys
in a mock (e.g. Breadcrumbs' `crumbs`) are passed through as story args. The shared
decorator wraps stories in `SitecoreProvider` (never in editing mode) and takes a
component map so `<Placeholder>` children resolve — it's written only if missing,
so it's yours to adapt to your SDK version.

See the [project README](https://github.com/BieganskiP/headcore#readme)
for full documentation on styling, placeholders, rendering variants, and type
inference.

## License

MIT © Patryk Biegański
