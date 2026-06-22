# Generated-Output Compile Check Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a test that compiles representative generated output (with stubbed Sitecore modules) so codegen bugs that produce non-compiling TypeScript — like the duplicate `TerminalsItem` — are caught automatically.

**Architecture:** A test-only helper (`typecheckComponents`) feeds generated `.tsx`/`.types.ts` plus an on-disk shim `.d.ts` into a single in-memory `ts.Program` (custom `CompilerHost` serves the virtual generated files; the default host serves the real `lib.d.ts` and the shim). It returns formatted `getPreEmitDiagnostics`. A test file runs representative contracts through the existing codegen and asserts zero diagnostics.

**Tech Stack:** TypeScript compiler API (`typescript`, already a root devDependency), Vitest, npm workspaces. ESM (NodeNext) — `.js` import extensions in `src`; test files import `typescript` as a namespace.

---

## File Structure

- `packages/core/test/helpers/sitecore-shim.d.ts` *(new)* — ambient stubs for `@sitecore-content-sdk/nextjs`, `lib/component-props`, and a permissive global `JSX` namespace. Data only, no logic.
- `packages/core/test/helpers/typecheck.ts` *(new)* — `typecheckComponents(components): string[]`. One responsibility: compile given generated files in memory, return diagnostics. Knows nothing about contracts/inference.
- `packages/core/test/codegen-compile.test.ts` *(new)* — assembles representative `ComponentContract`s, generates files via existing `renderTypesFile`/`renderComponentFile`, calls the helper, asserts `[]`.

No `src/` files change.

---

### Task 1: Compile-check helper + shim (happy path)

**Files:**
- Create: `packages/core/test/helpers/sitecore-shim.d.ts`
- Create: `packages/core/test/helpers/typecheck.ts`
- Test: `packages/core/test/codegen-compile.test.ts`

- [ ] **Step 1: Write the failing test (kitchen-sink scenario)**

Create `packages/core/test/codegen-compile.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { renderTypesFile } from '../src/codegen/types-file.js';
import { renderComponentFile } from '../src/codegen/component-file.js';
import type { ComponentContract, GeneratedFile } from '../src/types.js';
import { typecheckComponents } from './helpers/typecheck.js';

const PROPS_IMPORT = 'lib/component-props';
const SDK = '@sitecore-content-sdk/nextjs';

function filesFor(
  contract: ComponentContract,
  opts: { useDatasourceCheck?: boolean; variants?: string[] } = {},
): GeneratedFile[] {
  return [
    {
      path: `${contract.name}/${contract.name}.types.ts`,
      contents: renderTypesFile(contract, PROPS_IMPORT),
    },
    {
      path: `${contract.name}/${contract.name}.tsx`,
      contents: renderComponentFile(contract, {
        propsImport: PROPS_IMPORT,
        sitecorePackage: SDK,
        useDatasourceCheck: opts.useDatasourceCheck ?? true,
        styling: 'none',
        variants: opts.variants,
      }),
    },
  ];
}

const kitchenSink: ComponentContract = {
  name: 'Hero',
  fields: [
    { name: 'heading', tsType: 'Field<string>', optional: false, renderer: 'Text', sitecoreImport: 'Text' },
    { name: 'description', tsType: 'Field<string>', optional: true, renderer: 'RichText', sitecoreImport: 'RichText' },
    { name: 'image', tsType: 'ImageField', optional: true, renderer: 'Image', sitecoreImport: 'Image' },
    { name: 'ctaLink', tsType: 'LinkField', optional: true, renderer: 'Link', sitecoreImport: 'Link' },
  ],
  params: ['variant'],
  placeholders: ['hero-body'],
};

describe('generated output compiles', () => {
  it('compiles a kitchen-sink component (all renderers + params + placeholder)', () => {
    const diagnostics = typecheckComponents([{ dir: 'Hero', files: filesFor(kitchenSink) }]);
    expect(diagnostics).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- codegen-compile`
Expected: FAIL — cannot find module `./helpers/typecheck.js`.

- [ ] **Step 3: Create the shim**

Create `packages/core/test/helpers/sitecore-shim.d.ts`:

```ts
// Ambient stubs so generated output can be type-checked without the real
// Sitecore SDK or the project's lib/component-props. Permissive about component
// props (any returns) to avoid JSX false-positives; field/item types are real so
// duplicate-identifier and member-access bugs are still caught.
declare module '@sitecore-content-sdk/nextjs' {
  export type Field<T = string> = { value?: T; editable?: string };
  export type ImageField = { value?: { src?: string; alt?: string; width?: number; height?: number } };
  export type LinkField = { value?: { href?: string; text?: string; target?: string } };
  export const Text: (props: { field?: { value?: string | number }; tag?: string; className?: string }) => any;
  export const RichText: (props: { field?: Field<string>; className?: string }) => any;
  export const Image: (props: { field?: ImageField; className?: string }) => any;
  export const Link: (props: { field?: LinkField; className?: string }) => any;
  export const Placeholder: (props: { name: string; rendering: unknown }) => any;
  export function withDatasourceCheck(): <P>(Component: (props: P) => any) => (props: P) => any;
}

declare module 'lib/component-props' {
  export type ComponentProps = { rendering?: unknown; params?: { [k: string]: string | undefined } };
}

declare namespace JSX {
  interface Element {}
  interface IntrinsicElements {
    [elem: string]: any;
  }
}
```

- [ ] **Step 4: Create the helper**

Create `packages/core/test/helpers/typecheck.ts`:

```ts
import * as ts from 'typescript';
import { fileURLToPath } from 'node:url';
import type { GeneratedFile } from '../../src/types.js';

export interface CompileComponent {
  /** A unique virtual subfolder for this component's files (use the component name). */
  dir: string;
  files: GeneratedFile[];
}

const norm = (p: string): string => p.replace(/\\/g, '/');

// A virtual root under cwd so the TS host treats paths as absolute on all OSes.
const VROOT = `${norm(process.cwd())}/__virtual_typecheck__`;
const SHIM = fileURLToPath(new URL('./sitecore-shim.d.ts', import.meta.url));

/**
 * Type-checks the given generated components in a single in-memory program.
 * Returns formatted diagnostics ("file(line,col): message"); empty means clean.
 * Only .tsx and .types.ts files are compiled (mock JSON / CSS are ignored).
 */
export function typecheckComponents(components: CompileComponent[]): string[] {
  const virtual = new Map<string, string>();
  const roots: string[] = [SHIM];

  for (const c of components) {
    const compiled = c.files.filter((f) => f.path.endsWith('.tsx') || f.path.endsWith('.types.ts'));
    if (compiled.length === 0) {
      throw new Error(`component "${c.dir}" has no .tsx/.types.ts files to type-check`);
    }
    for (const f of compiled) {
      const base = f.path.split(/[\\/]/).pop() as string;
      const vpath = `${VROOT}/${c.dir}/${base}`;
      virtual.set(vpath, f.contents);
      roots.push(vpath);
    }
  }

  const options: ts.CompilerOptions = {
    jsx: ts.JsxEmit.Preserve,
    strict: true,
    noEmit: true,
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    skipLibCheck: true,
  };

  const host = ts.createCompilerHost(options);
  const baseGetSourceFile = host.getSourceFile.bind(host);
  const baseFileExists = host.fileExists.bind(host);
  const baseReadFile = host.readFile.bind(host);

  host.getSourceFile = (fileName, languageVersion, onError, shouldCreate) => {
    const v = virtual.get(norm(fileName));
    if (v !== undefined) {
      const kind = fileName.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
      return ts.createSourceFile(fileName, v, languageVersion, true, kind);
    }
    return baseGetSourceFile(fileName, languageVersion, onError, shouldCreate);
  };
  host.fileExists = (fileName) => virtual.has(norm(fileName)) || baseFileExists(fileName);
  host.readFile = (fileName) => virtual.get(norm(fileName)) ?? baseReadFile(fileName);

  const program = ts.createProgram({ rootNames: roots, options, host });
  return ts.getPreEmitDiagnostics(program).map((d) => {
    const msg = ts.flattenDiagnosticMessageText(d.messageText, '\n');
    if (d.file && d.start !== undefined) {
      const { line, character } = d.file.getLineAndCharacterOfPosition(d.start);
      return `${norm(d.file.fileName)}(${line + 1},${character + 1}): ${msg}`;
    }
    return msg;
  });
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- codegen-compile`
Expected: PASS (1 test). If diagnostics come back non-empty, the message prints the exact `file(line,col): message` — read it; do not weaken the shim to force a pass without understanding the error. The shim is meant to be permissive on props only.

- [ ] **Step 6: Commit**

```bash
git add packages/core/test/helpers/sitecore-shim.d.ts packages/core/test/helpers/typecheck.ts packages/core/test/codegen-compile.test.ts
git commit -m "test(codegen): compile-check generated output (helper + shim, happy path)"
```
End the commit message with this trailer on its own line:
Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>

---

### Task 2: Representative scenarios + regression guard

**Files:**
- Modify: `packages/core/test/codegen-compile.test.ts`

- [ ] **Step 1: Add the remaining scenarios**

In `packages/core/test/codegen-compile.test.ts`, add these contracts after `kitchenSink` (before the `describe`):

```ts
const nestedCards: ComponentContract = {
  name: 'NestedCards',
  fields: [
    {
      name: 'Tabs', tsType: 'TabsItem[]', optional: false, renderer: 'Cards', sitecoreImport: null,
      itemTypeName: 'TabsItem',
      itemFields: [
        { name: 'Tab Title', tsType: 'Field<string>', optional: false, renderer: 'Text', sitecoreImport: 'Text' },
        {
          name: 'Column Slider Items', tsType: 'ColumnSliderItemsItem[]', optional: false, renderer: 'Cards',
          sitecoreImport: null, itemTypeName: 'ColumnSliderItemsItem',
          itemFields: [
            { name: 'Slide Title', tsType: 'Field<string>', optional: false, renderer: 'Text', sitecoreImport: 'Text' },
          ],
        },
      ],
    },
  ],
  params: [],
  placeholders: [],
};

// The exact shape of the duplicate-item-type bug: "Terminals" appears top-level
// and nested inside "Offers", so both yield itemTypeName "TerminalsItem".
const duplicateItemType: ComponentContract = {
  name: 'ParkingFeeCalculator',
  fields: [
    {
      name: 'Terminals', tsType: 'TerminalsItem[]', optional: false, renderer: 'Cards', sitecoreImport: null,
      itemTypeName: 'TerminalsItem',
      itemFields: [
        { name: 'Name', tsType: 'Field<string>', optional: false, renderer: 'Text', sitecoreImport: 'Text' },
      ],
    },
    {
      name: 'Offers', tsType: 'OffersItem[]', optional: false, renderer: 'Cards', sitecoreImport: null,
      itemTypeName: 'OffersItem',
      itemFields: [
        {
          name: 'Terminals', tsType: 'TerminalsItem[]', optional: false, renderer: 'Cards', sitecoreImport: null,
          itemTypeName: 'TerminalsItem',
          itemFields: [
            { name: 'Name', tsType: 'Field<string>', optional: false, renderer: 'Text', sitecoreImport: 'Text' },
          ],
        },
      ],
    },
  ],
  params: [],
  placeholders: [],
};

const spacedNames: ComponentContract = {
  name: 'Promo',
  fields: [
    { name: 'Button Link', tsType: 'LinkField', optional: false, renderer: 'Link', sitecoreImport: 'Link' },
    { name: 'Right Box Title', tsType: 'Field<string>', optional: false, renderer: 'Text', sitecoreImport: 'Text' },
  ],
  params: ['Some Param'],
  placeholders: [],
};

const numberAsText: ComponentContract = {
  name: 'Stat',
  fields: [
    { name: 'count', tsType: 'Field<number>', optional: false, renderer: 'Text', sitecoreImport: 'Text' },
    { name: 'label', tsType: 'Field<string>', optional: false, renderer: 'Text', sitecoreImport: 'Text' },
  ],
  params: [],
  placeholders: [],
};

const variantModule: ComponentContract = {
  name: 'GridModule',
  fields: [
    { name: 'Title', tsType: 'Field<string>', optional: false, renderer: 'Text', sitecoreImport: 'Text' },
  ],
  params: [],
  placeholders: [],
};
```

Then add these tests inside the `describe('generated output compiles', ...)` block:

```ts
  it('compiles nested card maps', () => {
    expect(typecheckComponents([{ dir: 'NestedCards', files: filesFor(nestedCards) }])).toEqual([]);
  });

  it('compiles a component whose item type recurs at multiple depths (no duplicate identifiers)', () => {
    expect(
      typecheckComponents([{ dir: 'ParkingFeeCalculator', files: filesFor(duplicateItemType) }]),
    ).toEqual([]);
  });

  it('compiles field and param names containing spaces', () => {
    expect(typecheckComponents([{ dir: 'Promo', files: filesFor(spacedNames) }])).toEqual([]);
  });

  it('compiles a numeric field rendered via <Text>', () => {
    expect(typecheckComponents([{ dir: 'Stat', files: filesFor(numberAsText) }])).toEqual([]);
  });

  it('compiles a variant module', () => {
    expect(
      typecheckComponents([{ dir: 'GridModule', files: filesFor(variantModule, { variants: ['Default', 'ThreeCard'] }) }]),
    ).toEqual([]);
  });
```

- [ ] **Step 2: Run to verify all scenarios pass**

Run: `npm test -- codegen-compile`
Expected: PASS (6 tests). All scenarios compile on the current (fixed) codebase.

- [ ] **Step 3: Prove the guard has teeth (manual, not committed)**

Temporarily reintroduce the duplicate-type bug to confirm the test catches it:

In `packages/core/src/codegen/types-file.ts`, change the line
`const cardFields = collectCardTypes(c.fields);`
back to
`const cardFields = collectCardFields(c.fields);`
(and add `collectCardFields` to the import from `./fields.js` for the moment).

Run: `npm test -- codegen-compile`
Expected: FAIL — the "recurs at multiple depths" test reports a diagnostic containing `Duplicate identifier 'TerminalsItem'`.

Then restore the file exactly:

```bash
git checkout packages/core/src/codegen/types-file.ts
```

Run: `npm test -- codegen-compile`
Expected: PASS (6 tests) again. (Confirm `git status` shows no change to `src/`.)

- [ ] **Step 4: Run the full suite and commit**

Run: `npm test`
Expected: all tests pass (existing + the 6 compile tests).

```bash
git add packages/core/test/codegen-compile.test.ts
git commit -m "test(codegen): compile-check nested cards, dup item types, spaced names, number-as-Text, variants"
```
End the commit message with this trailer on its own line:
Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>

---

## Self-Review Notes

- **Spec coverage:** in-memory compiler API helper (Task 1) · shim with permissive props + real field/item types + global JSX (Task 1, Step 3) · `jsx: preserve`/`strict`/`noEmit`/`Bundler`/`skipLibCheck` (Task 1, Step 4) · default host serves real lib + shim, virtual host serves generated files (Task 1, Step 4) · throws when a component has no `.tsx`/`.types.ts` (Task 1, Step 4) · all six representative scenarios (Task 2) · self-verifying teeth check (Task 2, Step 3) · no src/inference/CLI changes (only test files created/modified). All spec points map to a task.
- **Type consistency:** `typecheckComponents(components: CompileComponent[]): string[]`, `CompileComponent { dir; files }`, `filesFor(contract, opts)` returning `GeneratedFile[]` — consistent across both tasks. Component `dir`s are unique (`Hero`, `NestedCards`, `ParkingFeeCalculator`, `Promo`, `Stat`, `GridModule`).
- **No placeholders:** every step contains complete code or exact commands; the only `TODO` strings referenced are intentional generated-output content, not plan gaps.
