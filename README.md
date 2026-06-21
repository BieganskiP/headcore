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
`component` scaffolds `<Name>.tsx`, `<Name>.types.ts`, and `<Name>.mock.json`.

## Type inference (MVP 1)

Types are inferred from layout JSON value shape (string -> `Field<string>`,
`{src,...}` -> `ImageField`, `{href,...}` -> `LinkField`, etc.). Template-metadata
driven types require the Authoring API (MVP 2).
