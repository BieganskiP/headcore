import { describe, it, expect } from 'vitest';
import { fieldFillRates, isFilled } from '../src/lib/fillRate';
import type { GuiRouteDetail, GuiLayoutNode } from '../src/lib/types';

function node(componentName: string, over: Partial<GuiLayoutNode> = {}): GuiLayoutNode {
  return { componentName, fields: {}, placeholders: {}, ...over };
}

function route(routePath: string, layout: GuiRouteDetail['layout']): GuiRouteDetail {
  return { routePath, name: routePath, updatedAt: null, components: [], layout };
}

describe('isFilled', () => {
  it('unwraps { value } wrappers and treats empty primitives as unfilled', () => {
    expect(isFilled({ value: 'hi' })).toBe(true);
    expect(isFilled('raw')).toBe(true);
    expect(isFilled({ value: '' })).toBe(false);
    expect(isFilled({ value: null })).toBe(false);
    expect(isFilled(undefined)).toBe(false);
    expect(isFilled({ value: 0 })).toBe(true);
    expect(isFilled({ value: false })).toBe(true);
  });

  it('requires src for images, href for links, length for arrays', () => {
    expect(isFilled({ value: { src: '/a.jpg', alt: '' } })).toBe(true);
    expect(isFilled({ value: { src: '' } })).toBe(false);
    expect(isFilled({ value: { href: '/x', text: 'go' } })).toBe(true);
    expect(isFilled({ value: { href: '', text: 'go' } })).toBe(false);
    expect(isFilled({ value: [] })).toBe(false);
    expect(isFilled({ value: [{ id: 1 }] })).toBe(true);
    expect(isFilled([])).toBe(false);
  });
});

describe('fieldFillRates', () => {
  it('returns [] when the component has zero instances', () => {
    expect(fieldFillRates([], 'Hero')).toEqual([]);
    expect(fieldFillRates([route('/', { main: [node('Other', { fields: { T: { value: 'x' } } })] })], 'Hero')).toEqual([]);
  });

  it('takes the union of field names and counts missing fields as unfilled', () => {
    const routes = [
      route('/a', { main: [node('Hero', { fields: { Title: { value: 'A' }, Subtitle: { value: '' } } })] }),
      route('/b', { main: [node('Hero', { fields: { Title: { value: 'B' } } })] }),
    ];
    expect(fieldFillRates(routes, 'Hero')).toEqual([
      {
        field: 'Subtitle',
        filled: 0,
        total: 2,
        pct: 0,
        emptyOn: [
          { routePath: '/a', path: 'main[0]' },
          { routePath: '/b', path: 'main[0]' },
        ],
      },
      { field: 'Title', filled: 2, total: 2, pct: 100, emptyOn: [] },
    ]);
  });

  it('walks nested placeholders and reports audit-style paths for empty instances', () => {
    const routes = [
      route('/', {
        main: [
          node('Tabs', {
            placeholders: {
              tabs: [
                node('Hero', { fields: { Title: { value: '' } } }),
                node('Hero', { fields: { Title: { value: 'x' } } }),
              ],
            },
          }),
        ],
      }),
    ];
    expect(fieldFillRates(routes, 'Hero')).toEqual([
      { field: 'Title', filled: 1, total: 2, pct: 50, emptyOn: [{ routePath: '/', path: 'main[0] › tabs[0]' }] },
    ]);
  });

  it('applies image/array emptiness rules per instance', () => {
    const routes = [
      route('/', {
        main: [
          node('Hero', { fields: { Img: { value: { src: '' } }, Tags: { value: [] } } }),
          node('Hero', { fields: { Img: { value: { src: '/a.jpg' } }, Tags: { value: ['a'] } } }),
        ],
      }),
    ];
    expect(fieldFillRates(routes, 'Hero').map((r) => ({ field: r.field, filled: r.filled }))).toEqual([
      { field: 'Img', filled: 1 },
      { field: 'Tags', filled: 1 },
    ]);
  });

  it('rounds pct and sorts by pct ascending, then field name', () => {
    const inst = (title: string, extra: string) =>
      node('Hero', { fields: { Title: { value: title }, Beta: { value: extra }, Alpha: { value: extra } } });
    const routes = [route('/', { main: [inst('a', ''), inst('b', 'x'), inst('c', 'y')] })];
    expect(fieldFillRates(routes, 'Hero').map((r) => ({ field: r.field, pct: r.pct }))).toEqual([
      { field: 'Alpha', pct: 67 },
      { field: 'Beta', pct: 67 },
      { field: 'Title', pct: 100 },
    ]);
  });
});
