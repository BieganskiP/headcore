# sitecore-scaffold

Inspect Sitecore Experience Edge route layout data and scaffold typed,
Content SDK-ready Next.js components from it.

> **Disclaimer:** This tool was built with the help of AI. As such, it may
> contain bugs or rough edges. That said, it has been reviewed, tested, and
> verified by a human before release. Please report anything that looks off via
> the [issue tracker](https://github.com/BieganskiP/sitecore-scaffold/issues).

## Setup

1. Copy `sitecore-scaffold.config.example.ts` to `sitecore-scaffold.config.ts`.
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

    sitecore-scaffold inspect <route>
    sitecore-scaffold page <route> [--lang <lang>] [--dry-run] [--force]
    sitecore-scaffold dictionary [--lang <lang>] [--dry-run] [--force]
    sitecore-scaffold routes [--lang <lang>] [--filter <substring>] [--sort path|updated] [--json] [--out <file>]
    sitecore-scaffold component <Name> --route <route> [--lang <lang>] [--variants <A,B,C>] [--dry-run] [--force]

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
Zero matches is not an error: you get `0 routes (lang: xx)` (or `[]`) and exit
code 0.
Pass `--out <file>` to save the JSON export to a file instead of printing it (`--json` is implied); the file is written UTF-8 without a BOM, parent directories are created, and an existing file is overwritten.

## Output location

- `componentPath` — base directory for generated components (default
  `src/components/sitecore`).
- `componentFolder` — when `true` (default), each component's files go in their
  own `<componentPath>/<Name>/` folder; when `false`, they are written flat into
  `componentPath`.

## Styling

The `styling` config option controls component styles:

- `css` (default) — generate a `<Name>.module.css` (CSS Modules) and reference
  classes via `className={styles.root}` / `styles.card`.
- `tailwind` — emit Tailwind utility classes inline; no CSS file.
- `none` — plain class names, no stylesheet.

## Placeholders

Nested placeholders on a rendering are scaffolded as
`<Placeholder name="<key>" rendering={rendering} />` (the component receives the
`rendering` prop automatically).

## Rendering variants

Pass `--variants` to scaffold one module that exports several Content SDK
variants of the same component:

    sitecore-scaffold component GridModule --route /x --variants ThreeCard,FourCard,FiveCard

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
