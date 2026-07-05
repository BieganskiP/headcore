# sitecore-scaffold

Inspect Sitecore Experience Edge route layout data and scaffold typed,
Content SDK-ready Next.js components from it.

## Install

```sh
npm install -g sitecore-scaffold
# or run without installing:
npx sitecore-scaffold inspect <route>
```

## Setup

1. Create a `sitecore-scaffold.config.ts` in your project root.
2. Set env vars: `SITECORE_EDGE_URL`, `SITECORE_EDGE_TOKEN`.
3. Set `edge.site` and `edge.defaultLanguage` in the config.

## Commands

```sh
sitecore-scaffold inspect <route>
sitecore-scaffold page <route> [--lang <lang>] [--dry-run] [--force]
sitecore-scaffold dictionary [--lang <lang>] [--dry-run] [--force]
sitecore-scaffold component <Name> --route <route> [--lang <lang>] [--variants <A,B,C>] [--dry-run] [--force]
```

- `inspect` prints the rendering/placeholder tree for a route.
- `component` scaffolds `<Name>.tsx`, `<Name>.types.ts`, `<Name>.mock.json`, and
  (when `styling: 'css'`) `<Name>.module.css`.
- `page` scaffolds **every** component on a route in one pass, deduping component
  types and merging inferred field shapes across all instances.
- `dictionary` fetches the site dictionary from Experience Edge and generates
  type-safe translations (`dictionary-keys.ts` + a `useTypedT()` hook).

See the [project README](https://github.com/BieganskiP/sitecore-scaffold#readme)
for full documentation on styling, placeholders, rendering variants, and type
inference.

## License

MIT © Patryk Biegański
