import { describe, it, expect } from 'vitest';
import { collectRenderings } from '../src/inspect/collect.js';
import type { RenderingTree } from '../src/types.js';

const tree: RenderingTree = {
  route: '/x',
  placeholders: {
    'headless-main': [
      {
        componentName: 'Hero', params: {}, fields: {},
        placeholders: {
          inner: [{ componentName: 'Card', params: {}, fields: {}, placeholders: {} }],
        },
      },
      { componentName: 'Card', params: {}, fields: {}, placeholders: {} },
    ],
  },
};

describe('collectRenderings', () => {
  it('returns every rendering depth-first, including nested ones', () => {
    const names = collectRenderings(tree).map((n) => n.componentName);
    expect(names).toEqual(['Hero', 'Card', 'Card']);
  });

  it('returns an empty array when there are no placeholders', () => {
    expect(collectRenderings({ route: '/x', placeholders: {} })).toEqual([]);
  });
});
