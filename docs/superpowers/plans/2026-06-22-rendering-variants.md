# Rendering Variants Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `--variants A,B,C` CLI flag that scaffolds one component module exporting a shared inner `<Name>Variant` plus thin named-export wrappers (`Default` always first), matching the Sitecore Content SDK variant convention.

**Architecture:** Variant rendering is folded into the existing `renderComponentFile` — the shared import/type/body/styling logic is reused, then a branch emits either today's single default-export component (no variants) or the variant module (named exports). Variant-name normalization lives in core (`normalizeVariants`, depends on `toTypeName`) and is reused by the CLI. The flag threads `args → ComponentInput → generateFiles(…, variants) → renderComponentFile`.

**Tech Stack:** TypeScript ESM (NodeNext, `.js` import extensions), Vitest, npm workspaces (`@sitecore-scaffold/core`, `sitecore-scaffold` CLI).

---

## File Structure

- `packages/core/src/codegen/variants.ts` *(new)* — `normalizeVariants(raw: string[]): string[]`: sanitize each to a valid identifier, dedupe, ensure `Default` is first.
- `packages/core/src/index.ts` — export `normalizeVariants`.
- `packages/core/src/codegen/component-file.ts` — add `variants?` to `ComponentOptions`; branch into variant output.
- `packages/core/src/codegen/index.ts` — `generateFiles` gains optional 4th param `variants?: string[]`, forwarded to `renderComponentFile`.
- `packages/cli/src/args.ts` — parse `--variants <csv>` into `ParsedArgs.variants: string[]`.
- `packages/cli/src/commands/component.ts` — `ComponentInput.variants?`, normalize, pass to `generateFiles`.
- `packages/cli/src/index.ts` — wire `variants: args.variants` into `runComponent`.
- `README.md` — document `--variants`.
- Tests: `packages/core/test/codegen-variants.test.ts` *(new)*, `codegen-component.test.ts`, `codegen-mock.test.ts`, `packages/cli/test/args.test.ts`, `packages/cli/test/component-command.test.ts`.

---

### Task 1: `normalizeVariants` in core

**Files:**
- Create: `packages/core/src/codegen/variants.ts`
- Modify: `packages/core/src/index.ts`
- Test: `packages/core/test/codegen-variants.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/core/test/codegen-variants.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { normalizeVariants } from '../src/codegen/variants.js';

describe('normalizeVariants', () => {
  it('prepends Default when missing and preserves order', () => {
    expect(normalizeVariants(['ThreeCard', 'FourCard'])).toEqual(['Default', 'ThreeCard', 'FourCard']);
  });

  it('keeps Default first even when supplied elsewhere in the list', () => {
    expect(normalizeVariants(['ThreeCard', 'Default', 'FourCard'])).toEqual(['Default', 'ThreeCard', 'FourCard']);
  });

  it('sanitizes names to valid PascalCase identifiers', () => {
    expect(normalizeVariants(['with background', '2col'])).toEqual(['Default', 'WithBackground', '_2col']);
  });

  it('dedupes after sanitizing', () => {
    expect(normalizeVariants(['With Background', 'with-background'])).toEqual(['Default', 'WithBackground']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- codegen-variants`
Expected: FAIL — cannot find module `../src/codegen/variants.js`.

- [ ] **Step 3: Write minimal implementation**

Create `packages/core/src/codegen/variants.ts`:

```ts
import { toTypeName } from '../identifiers.js';

/**
 * Normalizes a raw `--variants` list into valid, unique export names with
 * `Default` guaranteed first. Names are sanitized to valid PascalCase
 * identifiers (Sitecore variant display names may contain spaces, etc.).
 */
export function normalizeVariants(raw: string[]): string[] {
  const cleaned = raw.map((v) => toTypeName(v.trim())).filter(Boolean);
  const deduped = [...new Set(cleaned)];
  const withoutDefault = deduped.filter((v) => v !== 'Default');
  return ['Default', ...withoutDefault];
}
```

- [ ] **Step 4: Export it from the core barrel**

In `packages/core/src/index.ts`, add after the `generateFiles` export line:

```ts
export { normalizeVariants } from './codegen/variants.js';
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- codegen-variants`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/codegen/variants.ts packages/core/src/index.ts packages/core/test/codegen-variants.test.ts
git commit -m "feat(codegen): normalizeVariants helper (Default-first, sanitized, deduped)"
```

---

### Task 2: Variant output in `renderComponentFile`

**Files:**
- Modify: `packages/core/src/codegen/component-file.ts`
- Test: `packages/core/test/codegen-component.test.ts`

- [ ] **Step 1: Write the failing tests**

In `packages/core/test/codegen-component.test.ts`, add before the final closing `});` of the `describe('renderComponentFile', ...)` block:

```ts
  const variantContract: ComponentContract = {
    name: 'GridModule',
    fields: [
      { name: 'Title', tsType: 'Field<string>', optional: false, renderer: 'Text', sitecoreImport: 'Text' },
    ],
    params: [],
    placeholders: [],
  };

  it('emits a shared inner component and named export wrappers in variant mode', () => {
    const out = renderComponentFile(variantContract, {
      propsImport: 'lib/component-props',
      sitecorePackage: '@sitecore-content-sdk/nextjs',
      useDatasourceCheck: true,
      styling: 'none',
      variants: ['Default', 'ThreeCard'],
    });
    expect(out).toContain('const GridModuleVariant = ({ fields, variant }: GridModuleProps & { variant: string }) => {');
    expect(out).toContain('<section data-variant={variant}>');
    expect(out).toContain('<Text tag="h1" field={fields.Title} />');
    expect(out).toContain('const renderDefault = (props: GridModuleProps) => <GridModuleVariant {...props} variant="Default" />;');
    expect(out).toContain('export const Default = withDatasourceCheck()<GridModuleProps>(renderDefault);');
    expect(out).toContain('export const ThreeCard = withDatasourceCheck()<GridModuleProps>(renderThreeCard);');
    expect(out).not.toContain('export default');
  });

  it('emits plain variant exports when datasource check is disabled', () => {
    const out = renderComponentFile(variantContract, {
      propsImport: 'lib/component-props',
      sitecorePackage: '@sitecore-content-sdk/nextjs',
      useDatasourceCheck: false,
      styling: 'none',
      variants: ['Default', 'ThreeCard'],
    });
    expect(out).toContain('export const Default = (props: GridModuleProps) => <GridModuleVariant {...props} variant="Default" />;');
    expect(out).toContain('export const ThreeCard = (props: GridModuleProps) => <GridModuleVariant {...props} variant="ThreeCard" />;');
    expect(out).not.toContain('withDatasourceCheck');
  });

  it('renders a single default-export component when no variants are given', () => {
    const out = renderComponentFile(variantContract, {
      propsImport: 'lib/component-props',
      sitecorePackage: '@sitecore-content-sdk/nextjs',
      useDatasourceCheck: true,
      styling: 'none',
    });
    expect(out).toContain('export default withDatasourceCheck()<GridModuleProps>(GridModule);');
    expect(out).not.toContain('Variant');
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- codegen-component`
Expected: FAIL — variant assertions not met (no `GridModuleVariant`, etc.). The "no variants" test should already PASS.

- [ ] **Step 3: Add `variants` to `ComponentOptions`**

In `packages/core/src/codegen/component-file.ts`, update the interface:

```ts
interface ComponentOptions {
  propsImport: string;
  sitecorePackage: string;
  useDatasourceCheck: boolean;
  styling: StylingMode;
  variants?: string[];
}
```

- [ ] **Step 4: Insert the variant branch**

In `renderComponentFile`, immediately after the `const sectionAttrs = …;` block and before `const destructured = ['fields'];`, insert:

```ts
  const variants = opts.variants ?? [];
  if (variants.length > 0) {
    const innerDestructured = ['fields'];
    if (hasParams) innerDestructured.push('params');
    if (hasPlaceholders) innerDestructured.push('rendering');
    innerDestructured.push('variant');
    const innerPropsArg = `{ ${innerDestructured.join(', ')} }`;

    const innerComponent = `const ${c.name}Variant = (${innerPropsArg}: ${c.name}Props & { variant: string }) => {
  // TODO: branch on \`variant\` to change layout/markup per variant
  return (
    <section${style.root} data-variant={variant}${sectionAttrs}>
${body}
    </section>
  );
};`;

    const wrappers = variants
      .map((v) => {
        if (opts.useDatasourceCheck) {
          return `const render${v} = (props: ${c.name}Props) => <${c.name}Variant {...props} variant="${v}" />;
export const ${v} = withDatasourceCheck()<${c.name}Props>(render${v});`;
        }
        return `export const ${v} = (props: ${c.name}Props) => <${c.name}Variant {...props} variant="${v}" />;`;
      })
      .join('\n\n');

    return `${imports}\n\n${innerComponent}\n\n${wrappers}\n`;
  }
```

Note: `body`, `style`, `sectionAttrs`, `hasParams`, `hasPlaceholders`, and `imports` are all already computed above this point and are reused unchanged — the inner component's markup is byte-for-byte the single-mode `<section>` body plus a leading `data-variant`.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- codegen-component`
Expected: PASS (all, including the three new tests).

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/codegen/component-file.ts packages/core/test/codegen-component.test.ts
git commit -m "feat(codegen): emit variant module (shared inner + named exports) in renderComponentFile"
```

---

### Task 3: `generateFiles` forwards variants

**Files:**
- Modify: `packages/core/src/codegen/index.ts`
- Test: `packages/core/test/codegen-mock.test.ts`

- [ ] **Step 1: Write the failing test**

In `packages/core/test/codegen-mock.test.ts`, inside the `describe('generateFiles', …)` block, add:

```ts
  it('forwards variants to the component file', () => {
    const files = generateFiles(
      contract,
      node,
      {
        componentPath: 'src/components',
        componentFolder: false,
        componentPropsImport: 'lib/component-props',
        sitecorePackage: '@sitecore-content-sdk/nextjs',
        useDatasourceCheck: true,
        generateMocks: false,
        styling: 'none',
        fieldTypeOverrides: {},
      },
      ['Default', 'ThreeCard'],
    );
    const tsx = files.find((f) => f.path === 'src/components/Hero.tsx');
    expect(tsx?.contents).toContain('const HeroVariant = (');
    expect(tsx?.contents).toContain('export const ThreeCard =');
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- codegen-mock`
Expected: FAIL — `generateFiles` ignores the 4th arg, so no `HeroVariant`.

- [ ] **Step 3: Add the param and forward it**

In `packages/core/src/codegen/index.ts`, change the signature and the `renderComponentFile` call:

```ts
export function generateFiles(
  contract: ComponentContract,
  node: RenderingNode,
  config: CodegenConfig,
  variants?: string[],
): GeneratedFile[] {
```

and within the `.tsx` file entry:

```ts
      contents: renderComponentFile(contract, {
        propsImport: config.componentPropsImport,
        sitecorePackage: config.sitecorePackage,
        useDatasourceCheck: config.useDatasourceCheck,
        styling: config.styling,
        variants,
      }),
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- codegen-mock`
Expected: PASS (all).

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/codegen/index.ts packages/core/test/codegen-mock.test.ts
git commit -m "feat(codegen): generateFiles forwards optional variants to component file"
```

---

### Task 4: Parse `--variants` in the CLI args

**Files:**
- Modify: `packages/cli/src/args.ts`
- Test: `packages/cli/test/args.test.ts`

- [ ] **Step 1: Update existing tests and add new ones**

In `packages/cli/test/args.test.ts`, add `variants: []` to the two existing `.toEqual` expectations:

```ts
  it('parses inspect command with route', () => {
    expect(parseArgs(['inspect', '/about-us'])).toEqual({
      command: 'inspect', name: undefined, route: '/about-us',
      lang: undefined, dryRun: false, force: false, variants: [],
    });
  });

  it('parses component command with name and flags', () => {
    expect(parseArgs(['component', 'Hero', '--route', '/about-us', '--lang', 'da', '--dry-run', '--force'])).toEqual({
      command: 'component', name: 'Hero', route: '/about-us', lang: 'da', dryRun: true, force: true, variants: [],
    });
  });
```

Then add two new tests inside the `describe`:

```ts
  it('parses a comma-separated --variants list, trimming whitespace', () => {
    const parsed = parseArgs(['component', 'GridModule', '--route', '/x', '--variants', 'ThreeCard, FourCard']);
    expect(parsed.variants).toEqual(['ThreeCard', 'FourCard']);
  });

  it('defaults variants to an empty array when the flag is absent', () => {
    expect(parseArgs(['component', 'GridModule', '--route', '/x']).variants).toEqual([]);
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- args`
Expected: FAIL — `variants` is not on the returned object (existing `.toEqual` now mismatch; new tests read `undefined`).

- [ ] **Step 3: Implement parsing**

In `packages/cli/src/args.ts`:

Add `variants: string[];` to the `ParsedArgs` interface:

```ts
export interface ParsedArgs {
  command: 'inspect' | 'component';
  name: string | undefined;
  route: string | undefined;
  lang: string | undefined;
  dryRun: boolean;
  force: boolean;
  variants: string[];
}
```

Update `USAGE`:

```ts
const USAGE = `usage:
  sitecore-scaffold inspect <route>
  sitecore-scaffold component <Name> --route <route> [--lang <lang>] [--variants <A,B,C>] [--dry-run] [--force]`;
```

Add the local and the parse branch:

```ts
  let dryRun = false;
  let force = false;
  let variants: string[] = [];

  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i];
    if (arg === '--route') route = rest[++i];
    else if (arg === '--lang') lang = rest[++i];
    else if (arg === '--variants') variants = (rest[++i] ?? '').split(',').map((s) => s.trim()).filter(Boolean);
    else if (arg === '--dry-run') dryRun = true;
    else if (arg === '--force') force = true;
    else positionals.push(arg);
  }
```

Add `variants` to both return statements:

```ts
  if (command === 'inspect') {
    return { command, name: undefined, route: positionals[0], lang, dryRun, force, variants };
  }
  return { command, name: positionals[0], route, lang, dryRun, force, variants };
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- args`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/args.ts packages/cli/test/args.test.ts
git commit -m "feat(cli): parse --variants flag"
```

---

### Task 5: Thread variants through the component command

**Files:**
- Modify: `packages/cli/src/commands/component.ts`
- Modify: `packages/cli/src/index.ts`
- Test: `packages/cli/test/component-command.test.ts`

- [ ] **Step 1: Write the failing test**

In `packages/cli/test/component-command.test.ts`, add inside the `describe('runComponent', …)` block:

```ts
  it('generates a variant module with named exports including a prepended Default', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'scaffold-var-'));
    const config = makeConfig(join(dir, 'components'));
    const result = await runComponent(
      { name: 'Hero', route: '/about-us', lang: undefined, dryRun: true, force: false, variants: ['ThreeCard'] },
      { loadConfig: vi.fn().mockResolvedValue(config), getLayout: vi.fn().mockResolvedValue(rendered) },
    );
    const tsx = result.preview.find((f) => f.path.endsWith('Hero.tsx'))!.contents;
    expect(tsx).toContain('const HeroVariant = (');
    expect(tsx).toContain('export const Default =');
    expect(tsx).toContain('export const ThreeCard =');
    expect(tsx).not.toContain('export default');
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- component-command`
Expected: FAIL — `variants` is not accepted/used; output is the single-component default export.

- [ ] **Step 3: Accept and normalize variants in the command**

In `packages/cli/src/commands/component.ts`:

Add `normalizeVariants` to the core import:

```ts
import {
  loadConfig as defaultLoadConfig,
  EdgeClient,
  parseLayout,
  buildContract,
  generateFiles,
  normalizeVariants,
  type RenderingNode,
  type GeneratedFile,
} from '@sitecore-scaffold/core';
```

Add `variants` to `ComponentInput`:

```ts
export interface ComponentInput {
  name: string | undefined;
  route: string | undefined;
  lang: string | undefined;
  dryRun: boolean;
  force: boolean;
  variants?: string[];
}
```

Replace the `generateFiles(...)` call with a normalized-variants version:

```ts
  const contract = buildContract(node, config.fieldTypeOverrides);
  const variants =
    input.variants && input.variants.length > 0 ? normalizeVariants(input.variants) : undefined;
  const files = generateFiles(
    contract,
    node,
    {
      componentPath: config.componentPath,
      componentFolder: config.componentFolder,
      componentPropsImport: config.componentPropsImport,
      sitecorePackage: config.sitecorePackage,
      useDatasourceCheck: config.useDatasourceCheck,
      generateMocks: config.generateMocks,
      styling: config.styling,
      fieldTypeOverrides: config.fieldTypeOverrides,
    },
    variants,
  );
```

- [ ] **Step 4: Wire the flag from the entrypoint**

In `packages/cli/src/index.ts`, pass `variants` into `runComponent`:

```ts
  const result = await runComponent({
    name: args.name, route: args.route, lang: args.lang, dryRun: args.dryRun, force: args.force, variants: args.variants,
  });
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- component-command`
Expected: PASS (all, including the new variant test).

- [ ] **Step 6: Commit**

```bash
git add packages/cli/src/commands/component.ts packages/cli/src/index.ts packages/cli/test/component-command.test.ts
git commit -m "feat(cli): scaffold variant modules via --variants"
```

---

### Task 6: Document `--variants` and verify the whole suite

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add a Variants section to the README**

In `README.md`, after the `## Placeholders` section, add:

```markdown
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
```

- [ ] **Step 2: Update the Commands usage line**

In `README.md`, update the `component` usage line under `## Commands` to include the flag:

```
    sitecore-scaffold component <Name> --route <route> [--lang <lang>] [--variants <A,B,C>] [--dry-run] [--force]
```

- [ ] **Step 3: Run the full suite and build**

Run: `npm test`
Expected: PASS — all test files (existing + new).

Run: `npm run build`
Expected: Build success, no type errors.

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: document --variants flag"
```

---

## Self-Review Notes

- **Spec coverage:** CLI flag (Task 4) · `Default` first + sanitize + dedupe (Task 1) · shared inner + thin wrappers + `data-variant` + `{...props}` spread (Task 2) · per-export `withDatasourceCheck` and plain-arrow fallback (Task 2) · `generateFiles` plumbing (Task 3) · CLI threading (Task 5) · shared types/mock/css unchanged (untouched files) · single-mode byte-identical (Task 2 third test) · README (Task 6). All spec points map to a task.
- **Type consistency:** `normalizeVariants(string[]): string[]`, `ComponentOptions.variants?: string[]`, `generateFiles(…, variants?: string[])`, `ComponentInput.variants?: string[]`, `ParsedArgs.variants: string[]` — names and signatures consistent across tasks.
- **No placeholders:** every code step contains complete code; the only literal `TODO` is intentional generated-output content inside the inner component.
```
