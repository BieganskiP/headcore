# Sitecore Scaffold MVP 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a CLI that inspects a Sitecore Experience Edge route's layout data and scaffolds typed, Content SDK-ready Next.js components from it.

**Architecture:** npm-workspaces monorepo with `@sitecore-scaffold/core` (all logic: config, edge client, layout inspector, contract builder, codegen) and `sitecore-scaffold` (thin CLI wrapper). Codegen is pure functions producing strings from a `ComponentContract`. Types are inferred from layout-JSON value shape (Option A).

**Tech Stack:** TypeScript (ESM, NodeNext), npm workspaces, Vitest (tests), tsup (build), jiti (TS config loading), Node 20+ built-in `fetch`.

---

## File Structure

```txt
sitecore-scaffold/
  package.json                       workspaces root
  tsconfig.base.json
  vitest.config.ts
  packages/
    core/
      package.json
      tsconfig.json
      tsup.config.ts
      src/
        types.ts                     shared types: EdgeConfig, ScaffoldConfig, RenderingTree, ComponentContract, FieldContract
        config/load.ts               loadConfig() via jiti + validate + env resolution
        edge/client.ts               EdgeClient.getLayout()
        edge/query.ts                LAYOUT_QUERY string
        inspect/parse.ts             parseLayout() -> RenderingTree
        inspect/render-tree.ts       formatTree() -> printable string
        contract/infer.ts            inferField() value-shape -> FieldContract
        contract/build.ts            buildContract() RenderingTree node -> ComponentContract
        codegen/types-file.ts        renderTypesFile()
        codegen/component-file.ts    renderComponentFile()
        codegen/mock-file.ts         renderMockFile()
        codegen/index.ts             generateFiles() orchestrates the three
        index.ts                     public API barrel
      test/
        fixtures/about-us-layout.json
        config-load.test.ts
        edge-client.test.ts
        inspect-parse.test.ts
        render-tree.test.ts
        contract-infer.test.ts
        contract-build.test.ts
        codegen-types.test.ts
        codegen-component.test.ts
        codegen-mock.test.ts
    cli/
      package.json
      tsconfig.json
      tsup.config.ts
      src/
        index.ts                     bin entry: parseArgs + dispatch
        args.ts                      parseArgs()
        commands/inspect.ts          runInspect()
        commands/component.ts        runComponent()
      test/
        args.test.ts
        inspect-command.test.ts
        component-command.test.ts
```

---

## Task 1: Initialize workspace root

**Files:**
- Create: `package.json`
- Create: `tsconfig.base.json`
- Create: `vitest.config.ts`
- Create: `.gitignore`

- [ ] **Step 1: Create root `package.json`**

```json
{
  "name": "sitecore-scaffold-monorepo",
  "private": true,
  "type": "module",
  "workspaces": ["packages/*"],
  "scripts": {
    "build": "npm run build --workspaces --if-present",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "typescript": "^5.5.4",
    "vitest": "^2.0.5",
    "tsup": "^8.2.4",
    "@types/node": "^20.14.0"
  }
}
```

- [ ] **Step 2: Create `tsconfig.base.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "declaration": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

- [ ] **Step 3: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['packages/**/test/**/*.test.ts'],
  },
});
```

- [ ] **Step 4: Create `.gitignore`**

```txt
node_modules/
dist/
*.log
.env
.env.local
```

- [ ] **Step 5: Install and verify**

Run: `npm install`
Expected: completes without error; `node_modules/` created.

- [ ] **Step 6: Commit**

```bash
git init
git add package.json tsconfig.base.json vitest.config.ts .gitignore package-lock.json
git commit -m "chore: initialize npm workspaces monorepo"
```

---

## Task 2: Core package scaffolding + shared types

**Files:**
- Create: `packages/core/package.json`
- Create: `packages/core/tsconfig.json`
- Create: `packages/core/tsup.config.ts`
- Create: `packages/core/src/types.ts`

- [ ] **Step 1: Create `packages/core/package.json`**

```json
{
  "name": "@sitecore-scaffold/core",
  "version": "0.0.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": { ".": { "types": "./dist/index.d.ts", "default": "./dist/index.js" } },
  "scripts": { "build": "tsup" },
  "dependencies": { "jiti": "^1.21.6" }
}
```

- [ ] **Step 2: Create `packages/core/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "outDir": "dist", "rootDir": "src" },
  "include": ["src"]
}
```

- [ ] **Step 3: Create `packages/core/tsup.config.ts`**

```ts
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
});
```

- [ ] **Step 4: Create `packages/core/src/types.ts`**

```ts
export interface EdgeConfig {
  endpoint: string;
  apiKey: string;
  site: string;
  defaultLanguage: string;
}

export interface ScaffoldConfig {
  edge: EdgeConfig;
  componentPath: string;
  componentPropsImport: string;
  sitecorePackage: string;
  useDatasourceCheck: boolean;
  generateMocks: boolean;
  fieldTypeOverrides: Record<string, string>;
}

/** A single field's raw value as returned in layout JSON. */
export type RawFieldValue = unknown;

export interface RenderingNode {
  componentName: string;
  dataSource?: string;
  fields: Record<string, RawFieldValue>;
  params: Record<string, string>;
  placeholders: Record<string, RenderingNode[]>;
}

export interface RenderingTree {
  route: string;
  placeholders: Record<string, RenderingNode[]>;
}

export type FieldRenderer = 'Text' | 'RichText' | 'Image' | 'Link' | 'raw';

export interface FieldContract {
  name: string;
  tsType: string;
  optional: boolean;
  renderer: FieldRenderer;
  sitecoreImport: string | null;
}

export interface ComponentContract {
  name: string;
  fields: FieldContract[];
  params: string[];
  placeholders: string[];
}

export interface GeneratedFile {
  path: string;
  contents: string;
}
```

- [ ] **Step 5: Verify it typechecks**

Run: `npx tsc -p packages/core/tsconfig.json --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add packages/core
git commit -m "feat(core): scaffold package and shared types"
```

---

## Task 3: Field-shape inference

**Files:**
- Create: `packages/core/src/contract/infer.ts`
- Test: `packages/core/test/contract-infer.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { inferField } from '../src/contract/infer.js';

describe('inferField', () => {
  it('infers string field', () => {
    const r = inferField('heading', { value: 'Hello' }, {});
    expect(r).toMatchObject({ name: 'heading', tsType: 'Field<string>', optional: false, renderer: 'Text' });
  });

  it('infers image field', () => {
    const r = inferField('image', { value: { src: 'x.jpg', alt: 'a', width: 10, height: 5 } }, {});
    expect(r).toMatchObject({ tsType: 'ImageField', renderer: 'Image', sitecoreImport: 'Image' });
  });

  it('infers link field', () => {
    const r = inferField('ctaLink', { value: { href: '/x', text: 'go' } }, {});
    expect(r).toMatchObject({ tsType: 'LinkField', renderer: 'Link', sitecoreImport: 'Link' });
  });

  it('infers boolean and number', () => {
    expect(inferField('on', { value: true }, {}).tsType).toBe('Field<boolean>');
    expect(inferField('n', { value: 3 }, {}).tsType).toBe('Field<number>');
  });

  it('infers array as ItemReference[]', () => {
    expect(inferField('cards', { value: [{ id: '1' }] }, {}).tsType).toBe('ItemReference[]');
  });

  it('marks null/absent value optional with TODO renderer raw', () => {
    const r = inferField('maybe', { value: null }, {});
    expect(r.optional).toBe(true);
    expect(r.renderer).toBe('raw');
  });

  it('applies fieldTypeOverrides by field name', () => {
    const r = inferField('promo', { value: 'x' }, { promo: 'LinkField' });
    expect(r.tsType).toBe('LinkField');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run packages/core/test/contract-infer.test.ts`
Expected: FAIL — cannot find module `../src/contract/infer.js`.

- [ ] **Step 3: Write minimal implementation**

```ts
import type { FieldContract, RawFieldValue } from '../types.js';

function unwrap(raw: RawFieldValue): unknown {
  if (raw && typeof raw === 'object' && 'value' in (raw as Record<string, unknown>)) {
    return (raw as Record<string, unknown>).value;
  }
  return raw;
}

export function inferField(
  name: string,
  raw: RawFieldValue,
  overrides: Record<string, string>,
): FieldContract {
  const value = unwrap(raw);

  if (name in overrides) {
    return { name, tsType: overrides[name], optional: false, renderer: 'raw', sitecoreImport: null };
  }

  if (value === null || value === undefined || value === '') {
    return { name, tsType: 'Field<string>', optional: true, renderer: 'raw', sitecoreImport: null };
  }
  if (typeof value === 'string') {
    return { name, tsType: 'Field<string>', optional: false, renderer: 'Text', sitecoreImport: 'Text' };
  }
  if (typeof value === 'boolean') {
    return { name, tsType: 'Field<boolean>', optional: false, renderer: 'raw', sitecoreImport: null };
  }
  if (typeof value === 'number') {
    return { name, tsType: 'Field<number>', optional: false, renderer: 'raw', sitecoreImport: null };
  }
  if (Array.isArray(value)) {
    return { name, tsType: 'ItemReference[]', optional: false, renderer: 'raw', sitecoreImport: null };
  }
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    if ('src' in obj) {
      return { name, tsType: 'ImageField', optional: false, renderer: 'Image', sitecoreImport: 'Image' };
    }
    if ('href' in obj) {
      return { name, tsType: 'LinkField', optional: false, renderer: 'Link', sitecoreImport: 'Link' };
    }
  }
  return { name, tsType: 'Field<string>', optional: true, renderer: 'raw', sitecoreImport: null };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run packages/core/test/contract-infer.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/contract/infer.ts packages/core/test/contract-infer.test.ts
git commit -m "feat(core): field-shape type inference"
```

---

## Task 4: Layout fixture + parser

**Files:**
- Create: `packages/core/test/fixtures/about-us-layout.json`
- Create: `packages/core/src/inspect/parse.ts`
- Test: `packages/core/test/inspect-parse.test.ts`

- [ ] **Step 1: Create the fixture** (captured-shape Edge `rendered` payload)

`packages/core/test/fixtures/about-us-layout.json`:

```json
{
  "sitecore": {
    "context": { "pageState": "normal", "language": "en" },
    "route": {
      "name": "about-us",
      "placeholders": {
        "headless-main": [
          {
            "uid": "u1",
            "componentName": "Hero",
            "dataSource": "/sitecore/content/Data/Hero/About Hero",
            "params": { "variant": "dark", "backgroundColor": "#000" },
            "fields": {
              "heading": { "value": "About Us" },
              "description": { "value": "<p>Rich</p>" },
              "image": { "value": { "src": "/-/media/a.jpg", "alt": "a", "width": 100, "height": 50 } },
              "ctaLink": { "value": { "href": "/contact", "text": "Contact" } }
            }
          },
          {
            "uid": "u2",
            "componentName": "PromoCards",
            "dataSource": "/sitecore/content/Data/Promos/About Promos",
            "params": {},
            "fields": { "title": { "value": "Promos" }, "cards": { "value": [{ "id": "1" }] } },
            "placeholders": {
              "cards": [
                { "uid": "u3", "componentName": "Card", "params": {}, "fields": { "label": { "value": "C1" } } }
              ]
            }
          }
        ]
      }
    }
  }
}
```

- [ ] **Step 2: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseLayout } from '../src/inspect/parse.js';

const raw = JSON.parse(
  readFileSync(fileURLToPath(new URL('./fixtures/about-us-layout.json', import.meta.url)), 'utf8'),
);

describe('parseLayout', () => {
  it('builds a tree with route name and placeholders', () => {
    const tree = parseLayout(raw, '/about-us');
    expect(tree.route).toBe('/about-us');
    expect(Object.keys(tree.placeholders)).toEqual(['headless-main']);
  });

  it('captures rendering name, datasource, fields, params', () => {
    const hero = parseLayout(raw, '/about-us').placeholders['headless-main'][0];
    expect(hero.componentName).toBe('Hero');
    expect(hero.dataSource).toContain('About Hero');
    expect(Object.keys(hero.fields)).toContain('heading');
    expect(hero.params.variant).toBe('dark');
  });

  it('captures nested placeholders', () => {
    const promo = parseLayout(raw, '/about-us').placeholders['headless-main'][1];
    expect(promo.placeholders.cards[0].componentName).toBe('Card');
  });

  it('throws on missing route', () => {
    expect(() => parseLayout({ sitecore: { route: null } }, '/x')).toThrow(/no route/i);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run packages/core/test/inspect-parse.test.ts`
Expected: FAIL — cannot find module `../src/inspect/parse.js`.

- [ ] **Step 4: Write minimal implementation**

```ts
import type { RenderingNode, RenderingTree } from '../types.js';

interface RawRendering {
  componentName?: string;
  dataSource?: string;
  fields?: Record<string, unknown>;
  params?: Record<string, string>;
  placeholders?: Record<string, RawRendering[]>;
}

function normalizePlaceholders(
  ph: Record<string, RawRendering[]> | undefined,
): Record<string, RenderingNode[]> {
  const out: Record<string, RenderingNode[]> = {};
  for (const [key, renderings] of Object.entries(ph ?? {})) {
    out[key] = renderings.map(normalizeRendering);
  }
  return out;
}

function normalizeRendering(r: RawRendering): RenderingNode {
  return {
    componentName: r.componentName ?? 'Unknown',
    dataSource: r.dataSource,
    fields: r.fields ?? {},
    params: r.params ?? {},
    placeholders: normalizePlaceholders(r.placeholders),
  };
}

export function parseLayout(raw: unknown, route: string): RenderingTree {
  const root = raw as { sitecore?: { route?: { placeholders?: Record<string, RawRendering[]> } | null } };
  const routeData = root?.sitecore?.route;
  if (!routeData) {
    throw new Error(`no route data in layout for ${route}`);
  }
  return { route, placeholders: normalizePlaceholders(routeData.placeholders) };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run packages/core/test/inspect-parse.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/inspect/parse.ts packages/core/test/inspect-parse.test.ts packages/core/test/fixtures/about-us-layout.json
git commit -m "feat(core): layout JSON parser + fixture"
```

---

## Task 5: Tree formatter

**Files:**
- Create: `packages/core/src/inspect/render-tree.ts`
- Test: `packages/core/test/render-tree.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseLayout } from '../src/inspect/parse.js';
import { formatTree } from '../src/inspect/render-tree.js';

const raw = JSON.parse(
  readFileSync(fileURLToPath(new URL('./fixtures/about-us-layout.json', import.meta.url)), 'utf8'),
);

describe('formatTree', () => {
  it('renders route, placeholder, renderings, datasource, fields, params', () => {
    const out = formatTree(parseLayout(raw, '/about-us'));
    expect(out).toContain('Route: /about-us');
    expect(out).toContain('Placeholder: headless-main');
    expect(out).toContain('Hero');
    expect(out).toContain('datasource:');
    expect(out).toContain('heading');
    expect(out).toContain('variant');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run packages/core/test/render-tree.test.ts`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Write minimal implementation**

```ts
import type { RenderingNode, RenderingTree } from '../types.js';

function renderNode(node: RenderingNode, lines: string[], indent: string): void {
  lines.push(`${indent}- ${node.componentName}`);
  if (node.dataSource) lines.push(`${indent}  datasource: ${node.dataSource}`);
  const fieldNames = Object.keys(node.fields);
  if (fieldNames.length) {
    lines.push(`${indent}  fields:`);
    for (const f of fieldNames) lines.push(`${indent}    ${f}`);
  }
  const paramNames = Object.keys(node.params);
  if (paramNames.length) {
    lines.push(`${indent}  params:`);
    for (const p of paramNames) lines.push(`${indent}    ${p}`);
  }
  for (const [key, children] of Object.entries(node.placeholders)) {
    lines.push(`${indent}  placeholder: ${key}`);
    for (const child of children) renderNode(child, lines, `${indent}    `);
  }
}

export function formatTree(tree: RenderingTree): string {
  const lines: string[] = [`Route: ${tree.route}`, ''];
  for (const [key, renderings] of Object.entries(tree.placeholders)) {
    lines.push(`Placeholder: ${key}`);
    for (const node of renderings) renderNode(node, lines, '');
    lines.push('');
  }
  return lines.join('\n');
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run packages/core/test/render-tree.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/inspect/render-tree.ts packages/core/test/render-tree.test.ts
git commit -m "feat(core): rendering tree formatter"
```

---

## Task 6: Contract builder

**Files:**
- Create: `packages/core/src/contract/build.ts`
- Test: `packages/core/test/contract-build.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { buildContract } from '../src/contract/build.js';
import type { RenderingNode } from '../src/types.js';

const hero: RenderingNode = {
  componentName: 'Hero',
  dataSource: '/Data/Hero',
  fields: {
    heading: { value: 'About' },
    image: { value: { src: 'a.jpg', alt: 'a', width: 1, height: 1 } },
  },
  params: { variant: 'dark', backgroundColor: '#000' },
  placeholders: { cards: [] },
};

describe('buildContract', () => {
  it('maps name, fields, params, placeholders', () => {
    const c = buildContract(hero, {});
    expect(c.name).toBe('Hero');
    expect(c.fields.map((f) => f.name)).toEqual(['heading', 'image']);
    expect(c.fields[1].tsType).toBe('ImageField');
    expect(c.params).toEqual(['variant', 'backgroundColor']);
    expect(c.placeholders).toEqual(['cards']);
  });

  it('passes overrides through to inference', () => {
    const c = buildContract(hero, { heading: 'LinkField' });
    expect(c.fields[0].tsType).toBe('LinkField');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run packages/core/test/contract-build.test.ts`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Write minimal implementation**

```ts
import type { ComponentContract, RenderingNode } from '../types.js';
import { inferField } from './infer.js';

export function buildContract(
  node: RenderingNode,
  overrides: Record<string, string>,
): ComponentContract {
  return {
    name: node.componentName,
    fields: Object.entries(node.fields).map(([name, raw]) => inferField(name, raw, overrides)),
    params: Object.keys(node.params),
    placeholders: Object.keys(node.placeholders),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run packages/core/test/contract-build.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/contract/build.ts packages/core/test/contract-build.test.ts
git commit -m "feat(core): component contract builder"
```

---

## Task 7: Codegen — types file

**Files:**
- Create: `packages/core/src/codegen/types-file.ts`
- Test: `packages/core/test/codegen-types.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { renderTypesFile } from '../src/codegen/types-file.js';
import type { ComponentContract } from '../src/types.js';

const contract: ComponentContract = {
  name: 'Hero',
  fields: [
    { name: 'heading', tsType: 'Field<string>', optional: false, renderer: 'Text', sitecoreImport: 'Text' },
    { name: 'image', tsType: 'ImageField', optional: true, renderer: 'Image', sitecoreImport: 'Image' },
  ],
  params: ['variant'],
  placeholders: [],
};

describe('renderTypesFile', () => {
  it('emits Fields, Params and Props types', () => {
    const out = renderTypesFile(contract, '@/lib/component-props');
    expect(out).toContain('type HeroFields = {');
    expect(out).toContain('heading: Field<string>;');
    expect(out).toContain('image?: ImageField;');
    expect(out).toContain('type HeroParams = {');
    expect(out).toContain('variant?: string;');
    expect(out).toContain('type HeroProps = ComponentProps & {');
    expect(out).toContain("import { ComponentProps } from '@/lib/component-props';");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run packages/core/test/codegen-types.test.ts`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Write minimal implementation**

```ts
import type { ComponentContract } from '../types.js';

export function renderTypesFile(c: ComponentContract, propsImport: string): string {
  const fieldLines = c.fields
    .map((f) => `  ${f.name}${f.optional ? '?' : ''}: ${f.tsType};`)
    .join('\n');
  const paramLines = c.params.map((p) => `  ${p}?: string;`).join('\n');

  return `import { Field, ImageField, LinkField } from '@sitecore-content-sdk/nextjs';
import { ComponentProps } from '${propsImport}';

type ${c.name}Fields = {
${fieldLines}
};

type ${c.name}Params = {
${paramLines}
};

type ${c.name}Props = ComponentProps & {
  fields: ${c.name}Fields;
  params?: ${c.name}Params;
};

export type { ${c.name}Fields, ${c.name}Params, ${c.name}Props };
`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run packages/core/test/codegen-types.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/codegen/types-file.ts packages/core/test/codegen-types.test.ts
git commit -m "feat(core): codegen types file"
```

---

## Task 8: Codegen — component file

**Files:**
- Create: `packages/core/src/codegen/component-file.ts`
- Test: `packages/core/test/codegen-component.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { renderComponentFile } from '../src/codegen/component-file.js';
import type { ComponentContract } from '../src/types.js';

const contract: ComponentContract = {
  name: 'Hero',
  fields: [
    { name: 'heading', tsType: 'Field<string>', optional: false, renderer: 'Text', sitecoreImport: 'Text' },
    { name: 'description', tsType: 'Field<string>', optional: true, renderer: 'RichText', sitecoreImport: 'RichText' },
    { name: 'image', tsType: 'ImageField', optional: true, renderer: 'Image', sitecoreImport: 'Image' },
    { name: 'ctaLink', tsType: 'LinkField', optional: true, renderer: 'Link', sitecoreImport: 'Link' },
  ],
  params: ['variant'],
  placeholders: [],
};

describe('renderComponentFile', () => {
  it('imports only used renderers and wraps in withDatasourceCheck when enabled', () => {
    const out = renderComponentFile(contract, {
      propsImport: '@/lib/component-props',
      sitecorePackage: '@sitecore-content-sdk/nextjs',
      useDatasourceCheck: true,
    });
    expect(out).toContain('Text');
    expect(out).toContain('RichText');
    expect(out).toContain('Image as SitecoreImage');
    expect(out).toContain('Link as SitecoreLink');
    expect(out).toContain('withDatasourceCheck');
    expect(out).toContain('<Text tag="h1" field={fields.heading} />');
    expect(out).toContain('{fields.image && <SitecoreImage field={fields.image} />}');
    expect(out).toContain('export default withDatasourceCheck()<HeroProps>(Hero);');
  });

  it('exports plainly when datasource check disabled', () => {
    const out = renderComponentFile(contract, {
      propsImport: '@/lib/component-props',
      sitecorePackage: '@sitecore-content-sdk/nextjs',
      useDatasourceCheck: false,
    });
    expect(out).toContain('export default Hero;');
    expect(out).not.toContain('withDatasourceCheck');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run packages/core/test/codegen-component.test.ts`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Write minimal implementation**

```ts
import type { ComponentContract, FieldContract } from '../types.js';

interface ComponentOptions {
  propsImport: string;
  sitecorePackage: string;
  useDatasourceCheck: boolean;
}

const IMPORT_ALIAS: Record<string, string> = {
  Image: 'Image as SitecoreImage',
  Link: 'Link as SitecoreLink',
};

function rendererJsx(f: FieldContract, first: boolean): string {
  const guard = (jsx: string) => (f.optional ? `      {fields.${f.name} && ${jsx}}` : `      ${jsx}`);
  switch (f.renderer) {
    case 'Text':
      return guard(`<Text tag="${first ? 'h1' : 'span'}" field={fields.${f.name}} />`);
    case 'RichText':
      return guard(`<RichText field={fields.${f.name}} />`);
    case 'Image':
      return guard(`<SitecoreImage field={fields.${f.name}} />`);
    case 'Link':
      return guard(`<SitecoreLink field={fields.${f.name}} />`);
    default:
      return `      {/* TODO: render field "${f.name}" (${f.tsType}) */}`;
  }
}

export function renderComponentFile(c: ComponentContract, opts: ComponentOptions): string {
  const renderers = new Set<string>();
  for (const f of c.fields) if (f.sitecoreImport) renderers.add(f.sitecoreImport);
  const importNames = [...renderers].map((r) => IMPORT_ALIAS[r] ?? r);
  if (opts.useDatasourceCheck) importNames.push('withDatasourceCheck');

  const imports = `import {
${importNames.map((n) => `  ${n},`).join('\n')}
} from '${opts.sitecorePackage}';

import { ${c.name}Props } from './${c.name}.types';`;

  let firstText = true;
  const body = c.fields
    .map((f) => {
      const isFirst = f.renderer === 'Text' && firstText;
      if (isFirst) firstText = false;
      return rendererJsx(f, isFirst);
    })
    .join('\n');

  const component = `const ${c.name} = ({ fields, params }: ${c.name}Props) => {
  return (
    <section data-variant={params?.variant}>
${body}
    </section>
  );
};`;

  const exportLine = opts.useDatasourceCheck
    ? `export default withDatasourceCheck()<${c.name}Props>(${c.name});`
    : `export default ${c.name};`;

  return `${imports}\n\n${component}\n\n${exportLine}\n`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run packages/core/test/codegen-component.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/codegen/component-file.ts packages/core/test/codegen-component.test.ts
git commit -m "feat(core): codegen component file"
```

---

## Task 9: Codegen — mock file + orchestrator

**Files:**
- Create: `packages/core/src/codegen/mock-file.ts`
- Create: `packages/core/src/codegen/index.ts`
- Test: `packages/core/test/codegen-mock.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { renderMockFile } from '../src/codegen/mock-file.js';
import { generateFiles } from '../src/codegen/index.js';
import type { ComponentContract, RenderingNode } from '../src/types.js';

const node: RenderingNode = {
  componentName: 'Hero',
  dataSource: '/Data/Hero',
  fields: { heading: { value: 'About' } },
  params: { variant: 'dark' },
  placeholders: {},
};

const contract: ComponentContract = {
  name: 'Hero',
  fields: [{ name: 'heading', tsType: 'Field<string>', optional: false, renderer: 'Text', sitecoreImport: 'Text' }],
  params: ['variant'],
  placeholders: [],
};

describe('renderMockFile', () => {
  it('serializes the rendering fields and params as JSON', () => {
    const out = renderMockFile(node);
    const parsed = JSON.parse(out);
    expect(parsed.fields.heading.value).toBe('About');
    expect(parsed.params.variant).toBe('dark');
  });
});

describe('generateFiles', () => {
  it('produces three files at componentPath when mocks enabled', () => {
    const files = generateFiles(contract, node, {
      componentPath: 'src/components',
      componentPropsImport: '@/lib/component-props',
      sitecorePackage: '@sitecore-content-sdk/nextjs',
      useDatasourceCheck: true,
      generateMocks: true,
      fieldTypeOverrides: {},
    });
    const paths = files.map((f) => f.path).sort();
    expect(paths).toEqual([
      'src/components/Hero.mock.json',
      'src/components/Hero.tsx',
      'src/components/Hero.types.ts',
    ]);
  });

  it('omits mock file when mocks disabled', () => {
    const files = generateFiles(contract, node, {
      componentPath: 'src/components',
      componentPropsImport: '@/lib/component-props',
      sitecorePackage: '@sitecore-content-sdk/nextjs',
      useDatasourceCheck: true,
      generateMocks: false,
      fieldTypeOverrides: {},
    });
    expect(files.map((f) => f.path)).not.toContain('src/components/Hero.mock.json');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run packages/core/test/codegen-mock.test.ts`
Expected: FAIL — cannot find modules.

- [ ] **Step 3: Write `mock-file.ts`**

```ts
import type { RenderingNode } from '../types.js';

export function renderMockFile(node: RenderingNode): string {
  return JSON.stringify({ fields: node.fields, params: node.params }, null, 2) + '\n';
}
```

- [ ] **Step 4: Write `index.ts` orchestrator**

```ts
import type { ComponentContract, GeneratedFile, RenderingNode, ScaffoldConfig } from '../types.js';
import { renderTypesFile } from './types-file.js';
import { renderComponentFile } from './component-file.js';
import { renderMockFile } from './mock-file.js';

type CodegenConfig = Omit<ScaffoldConfig, 'edge'>;

export function generateFiles(
  contract: ComponentContract,
  node: RenderingNode,
  config: CodegenConfig,
): GeneratedFile[] {
  const base = `${config.componentPath}/${contract.name}`;
  const files: GeneratedFile[] = [
    { path: `${base}.types.ts`, contents: renderTypesFile(contract, config.componentPropsImport) },
    {
      path: `${base}.tsx`,
      contents: renderComponentFile(contract, {
        propsImport: config.componentPropsImport,
        sitecorePackage: config.sitecorePackage,
        useDatasourceCheck: config.useDatasourceCheck,
      }),
    },
  ];
  if (config.generateMocks) {
    files.push({ path: `${base}.mock.json`, contents: renderMockFile(node) });
  }
  return files;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run packages/core/test/codegen-mock.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/codegen/mock-file.ts packages/core/src/codegen/index.ts packages/core/test/codegen-mock.test.ts
git commit -m "feat(core): codegen mock file + orchestrator"
```

---

## Task 10: Config loader

**Files:**
- Create: `packages/core/src/config/load.ts`
- Test: `packages/core/test/config-load.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadConfig } from '../src/config/load.js';

function writeConfig(dir: string, body: string): string {
  const p = join(dir, 'sitecore-scaffold.config.ts');
  writeFileSync(p, body, 'utf8');
  return p;
}

describe('loadConfig', () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'scaffold-'));
    process.env.SITECORE_EDGE_URL = 'https://edge.example/api/graphql/v1';
    process.env.SITECORE_EDGE_TOKEN = 'secret-token';
  });

  it('loads a valid config with env resolution', async () => {
    const p = writeConfig(dir, `export default {
      edge: { endpoint: process.env.SITECORE_EDGE_URL, apiKey: process.env.SITECORE_EDGE_TOKEN, site: 'my-site', defaultLanguage: 'en' },
      componentPath: 'src/components',
      componentPropsImport: '@/lib/component-props',
      sitecorePackage: '@sitecore-content-sdk/nextjs',
      useDatasourceCheck: true,
      generateMocks: true,
      fieldTypeOverrides: {},
    };`);
    const cfg = await loadConfig(p);
    expect(cfg.edge.endpoint).toBe('https://edge.example/api/graphql/v1');
    expect(cfg.edge.apiKey).toBe('secret-token');
    expect(cfg.componentPath).toBe('src/components');
  });

  it('throws a clear error when edge.endpoint is missing', async () => {
    const p = writeConfig(dir, `export default {
      edge: { apiKey: 'x', site: 's', defaultLanguage: 'en' },
      componentPath: 'src/components', componentPropsImport: '@/lib/component-props',
      sitecorePackage: '@sitecore-content-sdk/nextjs', useDatasourceCheck: true, generateMocks: true, fieldTypeOverrides: {},
    };`);
    await expect(loadConfig(p)).rejects.toThrow(/edge\.endpoint/);
  });

  it('throws when config file does not exist', async () => {
    await expect(loadConfig(join(dir, 'missing.config.ts'))).rejects.toThrow(/not found/i);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run packages/core/test/config-load.test.ts`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Write minimal implementation**

```ts
import { existsSync } from 'node:fs';
import { createJiti } from 'jiti';
import type { ScaffoldConfig } from '../types.js';

const REQUIRED_STRING_FIELDS: Array<keyof ScaffoldConfig> = [
  'componentPath',
  'componentPropsImport',
  'sitecorePackage',
];

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

export async function loadConfig(path: string): Promise<ScaffoldConfig> {
  if (!existsSync(path)) {
    throw new Error(`Config file not found: ${path}`);
  }
  const jiti = createJiti(import.meta.url, { interopDefault: true });
  const loaded = (await jiti.import(path, { default: true })) as Partial<ScaffoldConfig>;

  assert(loaded && typeof loaded === 'object', 'Config must export a default object');
  assert(loaded.edge, 'Config is missing "edge" section');
  assert(loaded.edge.endpoint, 'Config is missing "edge.endpoint" (check SITECORE_EDGE_URL env var)');
  assert(loaded.edge.apiKey, 'Config is missing "edge.apiKey" (check SITECORE_EDGE_TOKEN env var)');
  assert(loaded.edge.site, 'Config is missing "edge.site"');
  assert(loaded.edge.defaultLanguage, 'Config is missing "edge.defaultLanguage"');
  for (const field of REQUIRED_STRING_FIELDS) {
    assert(loaded[field], `Config is missing "${field}"`);
  }

  return {
    edge: loaded.edge,
    componentPath: loaded.componentPath!,
    componentPropsImport: loaded.componentPropsImport!,
    sitecorePackage: loaded.sitecorePackage!,
    useDatasourceCheck: loaded.useDatasourceCheck ?? true,
    generateMocks: loaded.generateMocks ?? true,
    fieldTypeOverrides: loaded.fieldTypeOverrides ?? {},
  } as ScaffoldConfig;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run packages/core/test/config-load.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/config/load.ts packages/core/test/config-load.test.ts
git commit -m "feat(core): config loader with validation"
```

---

## Task 11: Edge client

**Files:**
- Create: `packages/core/src/edge/query.ts`
- Create: `packages/core/src/edge/client.ts`
- Test: `packages/core/test/edge-client.test.ts`

- [ ] **Step 1: Write the failing test** (injects a fake `fetch`)

```ts
import { describe, it, expect, vi } from 'vitest';
import { EdgeClient } from '../src/edge/client.js';

const config = {
  endpoint: 'https://edge.example/api/graphql/v1',
  apiKey: 'secret-token',
  site: 'my-site',
  defaultLanguage: 'en',
};

describe('EdgeClient.getLayout', () => {
  it('posts the layout query and returns rendered JSON', async () => {
    const rendered = { sitecore: { route: { placeholders: {} } } };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { layout: { item: { rendered } } } }),
    });
    const client = new EdgeClient(config, fetchMock as unknown as typeof fetch);
    const result = await client.getLayout('/about-us', 'en');
    expect(result).toEqual(rendered);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(config.endpoint);
    expect((init.headers as Record<string, string>).sc_apikey).toBe('secret-token');
    expect(JSON.parse(init.body as string).variables).toMatchObject({ site: 'my-site', routePath: '/about-us', language: 'en' });
  });

  it('throws masking the key on HTTP error', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 401, text: async () => 'unauthorized' });
    const client = new EdgeClient(config, fetchMock as unknown as typeof fetch);
    await expect(client.getLayout('/x', 'en')).rejects.toThrow(/401/);
    await expect(client.getLayout('/x', 'en')).rejects.not.toThrow(/secret-token/);
  });

  it('throws on GraphQL errors array', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ errors: [{ message: 'bad query' }] }),
    });
    const client = new EdgeClient(config, fetchMock as unknown as typeof fetch);
    await expect(client.getLayout('/x', 'en')).rejects.toThrow(/bad query/);
  });

  it('throws a clear error when route layout is null', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { layout: { item: null } } }),
    });
    const client = new EdgeClient(config, fetchMock as unknown as typeof fetch);
    await expect(client.getLayout('/missing', 'en')).rejects.toThrow(/no route/i);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run packages/core/test/edge-client.test.ts`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Write `query.ts`**

```ts
export const LAYOUT_QUERY = `query GetLayout($site: String!, $routePath: String!, $language: String!) {
  layout(site: $site, routePath: $routePath, language: $language) {
    item { rendered }
  }
}`;
```

- [ ] **Step 4: Write `client.ts`**

```ts
import type { EdgeConfig } from '../types.js';
import { LAYOUT_QUERY } from './query.js';

interface LayoutResponse {
  data?: { layout?: { item?: { rendered?: unknown } | null } };
  errors?: Array<{ message: string }>;
}

export class EdgeClient {
  constructor(
    private readonly config: EdgeConfig,
    private readonly fetchFn: typeof fetch = fetch,
  ) {}

  async getLayout(routePath: string, language: string): Promise<unknown> {
    const res = await this.fetchFn(this.config.endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json', sc_apikey: this.config.apiKey },
      body: JSON.stringify({
        query: LAYOUT_QUERY,
        variables: { site: this.config.site, routePath, language },
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Edge request failed: HTTP ${res.status} ${text}`.trim());
    }

    const json = (await res.json()) as LayoutResponse;
    if (json.errors?.length) {
      throw new Error(`Edge GraphQL error: ${json.errors.map((e) => e.message).join('; ')}`);
    }

    const rendered = json.data?.layout?.item?.rendered;
    if (!rendered) {
      throw new Error(`no route found at "${routePath}" for site "${this.config.site}" / lang "${language}"`);
    }
    return rendered;
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run packages/core/test/edge-client.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/edge/query.ts packages/core/src/edge/client.ts packages/core/test/edge-client.test.ts
git commit -m "feat(core): Experience Edge layout client"
```

---

## Task 12: Core public API barrel

**Files:**
- Create: `packages/core/src/index.ts`

- [ ] **Step 1: Write the barrel**

```ts
export * from './types.js';
export { loadConfig } from './config/load.js';
export { EdgeClient } from './edge/client.js';
export { LAYOUT_QUERY } from './edge/query.js';
export { parseLayout } from './inspect/parse.js';
export { formatTree } from './inspect/render-tree.js';
export { inferField } from './contract/infer.js';
export { buildContract } from './contract/build.js';
export { generateFiles } from './codegen/index.js';
export { renderTypesFile } from './codegen/types-file.js';
export { renderComponentFile } from './codegen/component-file.js';
export { renderMockFile } from './codegen/mock-file.js';
```

- [ ] **Step 2: Build the package to verify the barrel resolves**

Run: `npm run build -w @sitecore-scaffold/core`
Expected: `dist/index.js` and `dist/index.d.ts` produced; no errors.

- [ ] **Step 3: Run the whole core suite**

Run: `npx vitest run packages/core`
Expected: PASS (all tests across tasks 3–11).

- [ ] **Step 4: Commit**

```bash
git add packages/core/src/index.ts
git commit -m "feat(core): public API barrel"
```

---

## Task 13: CLI package scaffolding + arg parser

**Files:**
- Create: `packages/cli/package.json`
- Create: `packages/cli/tsconfig.json`
- Create: `packages/cli/tsup.config.ts`
- Create: `packages/cli/src/args.ts`
- Test: `packages/cli/test/args.test.ts`

- [ ] **Step 1: Create `packages/cli/package.json`**

```json
{
  "name": "sitecore-scaffold",
  "version": "0.0.0",
  "type": "module",
  "bin": { "sitecore-scaffold": "./dist/index.js" },
  "scripts": { "build": "tsup" },
  "dependencies": { "@sitecore-scaffold/core": "*" }
}
```

- [ ] **Step 2: Create `packages/cli/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "outDir": "dist", "rootDir": "src" },
  "include": ["src"]
}
```

- [ ] **Step 3: Create `packages/cli/tsup.config.ts`**

```ts
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  clean: true,
  banner: { js: '#!/usr/bin/env node' },
});
```

- [ ] **Step 4: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { parseArgs } from '../src/args.js';

describe('parseArgs', () => {
  it('parses inspect command with route', () => {
    expect(parseArgs(['inspect', '/about-us'])).toEqual({
      command: 'inspect', name: undefined, route: '/about-us',
      lang: undefined, dryRun: false, force: false,
    });
  });

  it('parses component command with name and flags', () => {
    expect(parseArgs(['component', 'Hero', '--route', '/about-us', '--lang', 'da', '--dry-run', '--force'])).toEqual({
      command: 'component', name: 'Hero', route: '/about-us', lang: 'da', dryRun: true, force: true,
    });
  });

  it('throws on unknown command', () => {
    expect(() => parseArgs(['frobnicate'])).toThrow(/unknown command/i);
  });

  it('throws when no command given', () => {
    expect(() => parseArgs([])).toThrow(/usage/i);
  });
});
```

- [ ] **Step 5: Run test to verify it fails**

Run: `npx vitest run packages/cli/test/args.test.ts`
Expected: FAIL — cannot find module.

- [ ] **Step 6: Write `args.ts`**

```ts
export interface ParsedArgs {
  command: 'inspect' | 'component';
  name: string | undefined;
  route: string | undefined;
  lang: string | undefined;
  dryRun: boolean;
  force: boolean;
}

const USAGE = `usage:
  sitecore-scaffold inspect <route>
  sitecore-scaffold component <Name> --route <route> [--lang <lang>] [--dry-run] [--force]`;

export function parseArgs(argv: string[]): ParsedArgs {
  if (argv.length === 0) throw new Error(USAGE);
  const [command, ...rest] = argv;
  if (command !== 'inspect' && command !== 'component') {
    throw new Error(`unknown command "${command}"\n${USAGE}`);
  }

  const positionals: string[] = [];
  let route: string | undefined;
  let lang: string | undefined;
  let dryRun = false;
  let force = false;

  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i];
    if (arg === '--route') route = rest[++i];
    else if (arg === '--lang') lang = rest[++i];
    else if (arg === '--dry-run') dryRun = true;
    else if (arg === '--force') force = true;
    else positionals.push(arg);
  }

  if (command === 'inspect') {
    return { command, name: undefined, route: positionals[0], lang, dryRun, force };
  }
  return { command, name: positionals[0], route, lang, dryRun, force };
}
```

- [ ] **Step 7: Run test to verify it passes**

Run: `npx vitest run packages/cli/test/args.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 8: Install workspace link and commit**

Run: `npm install`
Expected: `sitecore-scaffold` links `@sitecore-scaffold/core`.

```bash
git add packages/cli/package.json packages/cli/tsconfig.json packages/cli/tsup.config.ts packages/cli/src/args.ts packages/cli/test/args.test.ts package-lock.json
git commit -m "feat(cli): package scaffold + arg parser"
```

---

## Task 14: Inspect command

**Files:**
- Create: `packages/cli/src/commands/inspect.ts`
- Test: `packages/cli/test/inspect-command.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { runInspect } from '../src/commands/inspect.js';

const rendered = JSON.parse(
  readFileSync(fileURLToPath(new URL('../../core/test/fixtures/about-us-layout.json', import.meta.url)), 'utf8'),
);

const config = {
  edge: { endpoint: 'https://e', apiKey: 'k', site: 's', defaultLanguage: 'en' },
  componentPath: 'src/components', componentPropsImport: '@/lib/component-props',
  sitecorePackage: '@sitecore-content-sdk/nextjs', useDatasourceCheck: true, generateMocks: true, fieldTypeOverrides: {},
};

describe('runInspect', () => {
  it('returns a formatted tree string for the route', async () => {
    const deps = {
      loadConfig: vi.fn().mockResolvedValue(config),
      getLayout: vi.fn().mockResolvedValue(rendered),
    };
    const out = await runInspect({ route: '/about-us', lang: undefined }, deps);
    expect(out).toContain('Route: /about-us');
    expect(out).toContain('Hero');
    expect(deps.getLayout).toHaveBeenCalledWith('/about-us', 'en');
  });

  it('throws when route flag missing', async () => {
    const deps = { loadConfig: vi.fn().mockResolvedValue(config), getLayout: vi.fn() };
    await expect(runInspect({ route: undefined, lang: undefined }, deps)).rejects.toThrow(/route/i);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run packages/cli/test/inspect-command.test.ts`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Write `inspect.ts`**

```ts
import { loadConfig as defaultLoadConfig, EdgeClient, parseLayout, formatTree } from '@sitecore-scaffold/core';

export interface InspectDeps {
  loadConfig: typeof defaultLoadConfig;
  getLayout: (route: string, lang: string) => Promise<unknown>;
}

export interface InspectInput {
  route: string | undefined;
  lang: string | undefined;
}

const CONFIG_PATH = `${process.cwd()}/sitecore-scaffold.config.ts`;

export async function runInspect(input: InspectInput, deps?: Partial<InspectDeps>): Promise<string> {
  if (!input.route) throw new Error('inspect requires a <route> argument');

  const loadConfig = deps?.loadConfig ?? defaultLoadConfig;
  const config = await loadConfig(CONFIG_PATH);
  const lang = input.lang ?? config.edge.defaultLanguage;

  const getLayout = deps?.getLayout ?? ((route: string, l: string) => new EdgeClient(config.edge).getLayout(route, l));
  const rendered = await getLayout(input.route, lang);

  return formatTree(parseLayout(rendered, input.route));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run packages/cli/test/inspect-command.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/commands/inspect.ts packages/cli/test/inspect-command.test.ts
git commit -m "feat(cli): inspect command"
```

---

## Task 15: Component command

**Files:**
- Create: `packages/cli/src/commands/component.ts`
- Test: `packages/cli/test/component-command.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, vi } from 'vitest';
import { readFileSync, mkdtempSync, existsSync, readFileSync as rf } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runComponent } from '../src/commands/component.js';

const rendered = JSON.parse(
  readFileSync(fileURLToPath(new URL('../../core/test/fixtures/about-us-layout.json', import.meta.url)), 'utf8'),
);

function makeConfig(componentPath: string) {
  return {
    edge: { endpoint: 'https://e', apiKey: 'k', site: 's', defaultLanguage: 'en' },
    componentPath, componentPropsImport: '@/lib/component-props',
    sitecorePackage: '@sitecore-content-sdk/nextjs', useDatasourceCheck: true, generateMocks: true, fieldTypeOverrides: {},
  };
}

describe('runComponent', () => {
  it('writes three files for a found rendering', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'scaffold-cmp-'));
    const config = makeConfig(join(dir, 'components'));
    const result = await runComponent(
      { name: 'Hero', route: '/about-us', lang: undefined, dryRun: false, force: false },
      { loadConfig: vi.fn().mockResolvedValue(config), getLayout: vi.fn().mockResolvedValue(rendered) },
    );
    expect(result.written.length).toBe(3);
    expect(existsSync(join(dir, 'components', 'Hero.tsx'))).toBe(true);
    expect(rf(join(dir, 'components', 'Hero.types.ts'), 'utf8')).toContain('HeroProps');
  });

  it('errors listing available names when rendering not found', async () => {
    const config = makeConfig('/tmp/never');
    await expect(
      runComponent(
        { name: 'Nope', route: '/about-us', lang: undefined, dryRun: false, force: false },
        { loadConfig: vi.fn().mockResolvedValue(config), getLayout: vi.fn().mockResolvedValue(rendered) },
      ),
    ).rejects.toThrow(/Hero, PromoCards/);
  });

  it('dry-run returns files without writing', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'scaffold-dry-'));
    const config = makeConfig(join(dir, 'components'));
    const result = await runComponent(
      { name: 'Hero', route: '/about-us', lang: undefined, dryRun: true, force: false },
      { loadConfig: vi.fn().mockResolvedValue(config), getLayout: vi.fn().mockResolvedValue(rendered) },
    );
    expect(result.written.length).toBe(0);
    expect(result.preview.length).toBe(3);
    expect(existsSync(join(dir, 'components', 'Hero.tsx'))).toBe(false);
  });

  it('refuses to overwrite without force', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'scaffold-force-'));
    const config = makeConfig(join(dir, 'components'));
    const deps = { loadConfig: vi.fn().mockResolvedValue(config), getLayout: vi.fn().mockResolvedValue(rendered) };
    const input = { name: 'Hero', route: '/about-us', lang: undefined, dryRun: false, force: false };
    await runComponent(input, deps);
    await expect(runComponent(input, deps)).rejects.toThrow(/--force/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run packages/cli/test/component-command.test.ts`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Write `component.ts`**

```ts
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';
import {
  loadConfig as defaultLoadConfig,
  EdgeClient,
  parseLayout,
  buildContract,
  generateFiles,
  type RenderingNode,
  type GeneratedFile,
} from '@sitecore-scaffold/core';
import type { InspectDeps } from './inspect.js';

export interface ComponentInput {
  name: string | undefined;
  route: string | undefined;
  lang: string | undefined;
  dryRun: boolean;
  force: boolean;
}

export interface ComponentResult {
  written: GeneratedFile[];
  preview: GeneratedFile[];
}

const CONFIG_PATH = `${process.cwd()}/sitecore-scaffold.config.ts`;

function collectRenderings(placeholders: Record<string, RenderingNode[]>, acc: RenderingNode[]): void {
  for (const renderings of Object.values(placeholders)) {
    for (const node of renderings) {
      acc.push(node);
      collectRenderings(node.placeholders, acc);
    }
  }
}

export async function runComponent(input: ComponentInput, deps?: Partial<InspectDeps>): Promise<ComponentResult> {
  if (!input.name) throw new Error('component requires a <Name> argument');
  if (!input.route) throw new Error('component requires --route <route>');

  const loadConfig = deps?.loadConfig ?? defaultLoadConfig;
  const config = await loadConfig(CONFIG_PATH);
  const lang = input.lang ?? config.edge.defaultLanguage;

  const getLayout = deps?.getLayout ?? ((route: string, l: string) => new EdgeClient(config.edge).getLayout(route, l));
  const rendered = await getLayout(input.route, lang);
  const tree = parseLayout(rendered, input.route);

  const all: RenderingNode[] = [];
  collectRenderings(tree.placeholders, all);
  const matches = all.filter((n) => n.componentName === input.name);
  if (matches.length === 0) {
    const names = [...new Set(all.map((n) => n.componentName))].join(', ');
    throw new Error(`rendering "${input.name}" not found on ${input.route}. Available: ${names}`);
  }
  const node = matches[0];

  const contract = buildContract(node, config.fieldTypeOverrides);
  const files = generateFiles(contract, node, {
    componentPath: config.componentPath,
    componentPropsImport: config.componentPropsImport,
    sitecorePackage: config.sitecorePackage,
    useDatasourceCheck: config.useDatasourceCheck,
    generateMocks: config.generateMocks,
    fieldTypeOverrides: config.fieldTypeOverrides,
  });

  if (input.dryRun) return { written: [], preview: files };

  if (!input.force) {
    const clash = files.find((f) => existsSync(f.path));
    if (clash) throw new Error(`${clash.path} already exists. Use --force to overwrite or --dry-run to preview.`);
  }

  for (const file of files) {
    mkdirSync(dirname(file.path), { recursive: true });
    writeFileSync(file.path, file.contents, 'utf8');
  }
  return { written: files, preview: files };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run packages/cli/test/component-command.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/commands/component.ts packages/cli/test/component-command.test.ts
git commit -m "feat(cli): component scaffold command"
```

---

## Task 16: CLI entry point + wiring

**Files:**
- Create: `packages/cli/src/index.ts`

- [ ] **Step 1: Write `index.ts`**

```ts
import { parseArgs } from './args.js';
import { runInspect } from './commands/inspect.js';
import { runComponent } from './commands/component.js';

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (args.command === 'inspect') {
    const out = await runInspect({ route: args.route, lang: args.lang });
    process.stdout.write(out + '\n');
    return;
  }

  const result = await runComponent({
    name: args.name, route: args.route, lang: args.lang, dryRun: args.dryRun, force: args.force,
  });

  if (args.dryRun) {
    for (const f of result.preview) {
      process.stdout.write(`\n--- ${f.path} ---\n${f.contents}`);
    }
  } else {
    process.stdout.write(`Generated ${result.written.length} file(s):\n`);
    for (const f of result.written) process.stdout.write(`  ${f.path}\n`);
  }
}

main().catch((err: unknown) => {
  process.stderr.write(`Error: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exitCode = 1;
});
```

- [ ] **Step 2: Build both packages**

Run: `npm run build`
Expected: `packages/core/dist` and `packages/cli/dist` produced; no errors.

- [ ] **Step 3: Smoke-test the built CLI usage output**

Run: `node packages/cli/dist/index.js 2>&1 || true`
Expected: prints `Error: usage:` block (no command given).

- [ ] **Step 4: Commit**

```bash
git add packages/cli/src/index.ts
git commit -m "feat(cli): entry point wiring"
```

---

## Task 17: README + example config + full verification

**Files:**
- Create: `README.md`
- Create: `sitecore-scaffold.config.example.ts`

- [ ] **Step 1: Write `sitecore-scaffold.config.example.ts`**

```ts
// Copy to sitecore-scaffold.config.ts and fill in. Secrets come from env vars.
export default {
  edge: {
    endpoint: process.env.SITECORE_EDGE_URL!,   // e.g. https://edge.sitecorecloud.io/api/graphql/v1
    apiKey: process.env.SITECORE_EDGE_TOKEN!,    // never hardcode; read from env only
    site: 'my-site',
    defaultLanguage: 'en',
  },
  componentPath: 'src/components',
  componentPropsImport: '@/lib/component-props',
  sitecorePackage: '@sitecore-content-sdk/nextjs',
  useDatasourceCheck: true,
  generateMocks: true,
  fieldTypeOverrides: {},
};
```

- [ ] **Step 2: Write `README.md`**

```markdown
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
```

- [ ] **Step 3: Run the full test suite**

Run: `npm test`
Expected: PASS — all core and cli tests green.

- [ ] **Step 4: Full build**

Run: `npm run build`
Expected: both packages build clean.

- [ ] **Step 5: Commit**

```bash
git add README.md sitecore-scaffold.config.example.ts
git commit -m "docs: README and example config"
```

---

## Verification Checklist

- [ ] `npm test` passes (core + cli).
- [ ] `npm run build` produces `dist/` for both packages.
- [ ] `node packages/cli/dist/index.js inspect /about-us` against the live Edge endpoint prints a real tree (manual, requires configured `sitecore-scaffold.config.ts` + env vars).
- [ ] `node packages/cli/dist/index.js component <Name> --route <route> --dry-run` previews three files.
