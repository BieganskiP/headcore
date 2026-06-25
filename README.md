# sitecore-scaffold

Inspect Sitecore Experience Edge route layout data and scaffold typed,
Content SDK-ready Next.js components from it.

## Setup

1. Copy `sitecore-scaffold.config.example.ts` to `sitecore-scaffold.config.ts`.
2. Set env vars: `SITECORE_EDGE_URL`, `SITECORE_EDGE_TOKEN`.
3. Set `edge.site` and `edge.defaultLanguage` in the config.

## Commands

    sitecore-scaffold inspect <route>
    sitecore-scaffold page <route> [--lang <lang>] [--dry-run] [--force]
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
