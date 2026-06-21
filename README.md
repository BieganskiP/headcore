# sitecore-scaffold

Inspect Sitecore Experience Edge route layout data and scaffold typed,
Content SDK-ready Next.js components from it.

## Setup

1. Copy `sitecore-scaffold.config.example.ts` to `sitecore-scaffold.config.ts`.
2. Set env vars: `SITECORE_EDGE_URL`, `SITECORE_EDGE_TOKEN`.
3. Set `edge.site` and `edge.defaultLanguage` in the config.

## Commands

    sitecore-scaffold inspect <route>
    sitecore-scaffold component <Name> --route <route> [--lang <lang>] [--dry-run] [--force]

`inspect` prints the rendering/placeholder tree for a route.
`component` scaffolds `<Name>.tsx`, `<Name>.types.ts`, `<Name>.mock.json`, and
(when `styling: 'css'`) `<Name>.module.css`.

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

## Type inference (MVP 1)

Types are inferred from layout JSON value shape (string -> `Field<string>`,
`{src,...}` -> `ImageField`, `{href,...}` -> `LinkField`, etc.). Template-metadata
driven types require the Authoring API (MVP 2).
