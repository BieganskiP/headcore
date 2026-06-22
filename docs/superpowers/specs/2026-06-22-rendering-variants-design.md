# Rendering Variants — Design

Date: 2026-06-22
Status: Approved (pending spec review)

## Problem

Sitecore renderings frequently ship as one component with several **variants** —
the same datasource shape rendered differently (e.g. `GridModule` as 2/3/4/5-card
layouts; `CTATiles` as the default carousel vs `WithBackground`). The Content SDK
convention is:

- The component is registered **once** by name. All variants must be reachable as
  **named exports of that single module**, because the SXA rendering-variant name
  resolves to the matching named export (with `Default` as the fallback).
- The main variant is named **`Default`**.

The scaffold currently emits a single default-export component, with no way to
produce this multi-variant shape.

## Decisions (from brainstorming)

1. **Variant source: explicit CLI flag.** `--variants A,B,C`. No auto-detection from
   layout data (a single route only ever exposes the one variant in use).
2. **Output shape: one file, shared inner component + thin wrappers.** An inner
   `<Name>Variant` holds the inferred markup; each export is a thin wrapper passing
   its own variant name. (Matches the GridModule example.)
3. **`Default` is always present and first.** Prepended if the `--variants` list
   omits it. Main variant is the **named export `Default`** (not the module default
   export — both resolve in Content SDK; named `Default` is the chosen convention).
4. **Datasource check wraps each export** when `useDatasourceCheck` is enabled.
5. **Wrappers spread `{...props}`** so `params`/`rendering` (placeholders) flow
   through without per-variant prop juggling.

## Generated output

### `useDatasourceCheck: true`

```tsx
import { Text, withDatasourceCheck } from '@sitecore-content-sdk/nextjs';
import { GridModuleProps } from './GridModule.types';

const GridModuleVariant = ({ fields, variant }: GridModuleProps & { variant: string }) => {
  // TODO: branch on `variant` to change layout/markup per variant
  return (
    <section className={styles.root} data-variant={variant}>
      <Text tag="h1" field={fields.Title} />
      {/* …rest of the inferred body (fields, cards, placeholders)… */}
    </section>
  );
};

const renderDefault = (props: GridModuleProps) => <GridModuleVariant {...props} variant="Default" />;
export const Default = withDatasourceCheck()<GridModuleProps>(renderDefault);

const renderThreeCard = (props: GridModuleProps) => <GridModuleVariant {...props} variant="ThreeCard" />;
export const ThreeCard = withDatasourceCheck()<GridModuleProps>(renderThreeCard);
```

### `useDatasourceCheck: false`

```tsx
export const Default = (props: GridModuleProps) => <GridModuleVariant {...props} variant="Default" />;
export const ThreeCard = (props: GridModuleProps) => <GridModuleVariant {...props} variant="ThreeCard" />;
```

### Inner component
- Holds the exact body the single-component mode generates today (field rendering,
  typed card maps, placeholders), wrapped in the styled `<section>`.
- Signature is `<Name>Props & { variant: string }`, so it can destructure
  `fields`, `params`, `rendering` as needed.
- Carries `data-variant={variant}` on the `<section>` in addition to any
  `data-*` param attributes.
- A `// TODO: branch on \`variant\`…` comment marks the customization point.

## Unchanged across variants

- **Types** — `<Name>Props` and item types are shared; one `<Name>.types.ts`. This
  is also what lets a developer later extract a divergent variant into its own
  sibling file that imports props from `./<Name>.types` (no back-reference / cycle).
- **Mock** — one `<Name>.mock.json` (variants share the `fields` shape).
- **Styling** — one `<Name>.module.css`; inner component uses `styles.root` /
  `styles.card`.
- **Single-component mode** — when `--variants` is absent, output is byte-identical
  to today (default export). Guarded by existing tests.

## Expected developer lifecycle

Generate one file with shared inner → keep simple variants there → when a variant
diverges substantially, move it to a sibling `<Name><Variant>.tsx` that imports
props from `./<Name>.types` and re-export it from the main module. The dedicated
`.types.ts` keeps that extraction cycle-free.

## CLI / input handling

- `args.ts`: parse `--variants <csv>` into `string[]`.
- `commands/component.ts`:
  - split on comma, trim, drop empties;
  - sanitize each name to a valid PascalCase identifier via `toTypeName`;
  - dedupe (preserve first occurrence order);
  - ensure `Default` is present and first (prepend if missing);
  - pass the list to `generateFiles`.
- `generateFiles(contract, node, config, variants?)` — new optional 4th param;
  forwards `variants` to `renderComponentFile` options. Empty/undefined ⇒
  single-component mode.

## Implementation shape

Integrate into `renderComponentFile` rather than a separate function. Extract the
shared pieces — SDK import line, type imports, the rendered body, styling helper —
then branch at the end: single-component output vs variant output. Keeps imports /
types / styling logic in one place and guarantees the inner body matches what
single mode produces.

## Files touched

- `packages/core/src/codegen/component-file.ts` — variant branch + shared body extraction.
- `packages/core/src/codegen/index.ts` — `generateFiles` gains `variants?` param.
- `packages/cli/src/args.ts` — parse `--variants`.
- `packages/cli/src/commands/component.ts` — normalize list, ensure `Default`, thread through.
- `README.md` — document `--variants`.
- Tests: `codegen-component.test.ts`, `args.test.ts`, `component-command.test.ts`.

## Out of scope (YAGNI)

- Auto-detecting variants from layout `params`.
- Generating per-variant CSS classes, mocks, or distinct markup (the scaffold can't
  know how variants differ; the `variant` prop + TODO is the seam).
- Splitting variants into separate files at scaffold time.
