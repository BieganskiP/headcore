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
