import { describe, it, expect } from 'vitest';
import { buildContentIndex, searchContent } from '../src/lib/contentSearch';
import type { GuiRouteDetail, GuiLayoutNode } from '../src/lib/types';

function node(componentName: string, over: Partial<GuiLayoutNode> = {}): GuiLayoutNode {
  return { componentName, fields: {}, placeholders: {}, ...over };
}

function route(routePath: string, layout: GuiRouteDetail['layout'], over: Partial<GuiRouteDetail> = {}): GuiRouteDetail {
  return { routePath, name: routePath, updatedAt: null, components: [], layout, ...over };
}

const GUID = '110d559f-dea5-46ea-6bfc-8ec5fbf701e2';

describe('buildContentIndex', () => {
  it('extracts text from { value } wrappers', () => {
    const index = buildContentIndex([route('/', {
      main: [node('Hero', { fields: { Title: { value: 'Hello world' } } })],
    })]);
    expect(index).toEqual([
      { routePath: '/', componentName: 'Hero', path: 'main[0]', field: 'Title', text: 'Hello world' },
    ]);
  });

  it('collects string leaves through nested arrays and objects', () => {
    const index = buildContentIndex([route('/', {
      main: [node('Nav', { fields: {
        Links: { value: [{ text: 'About us', href: '/about' }, { text: 'Careers' }] },
      } })],
    })]);
    expect(index).toHaveLength(1);
    expect(index[0].text).toBe('About us /about Careers');
  });

  it('strips HTML tags from rich-text strings and collapses whitespace', () => {
    const index = buildContentIndex([route('/', {
      main: [node('Rte', { fields: { Body: { value: '<p>Rich   <strong>text</strong>\nhere</p>' } } })],
    })]);
    expect(index[0].text).toBe('Rich text here');
  });

  it('keeps plain strings containing < or > alone untouched', () => {
    const index = buildContentIndex([route('/', {
      main: [node('T', { fields: { A: { value: '1 < 2' } } })],
    })]);
    expect(index[0].text).toBe('1 < 2');
  });

  it('skips GUID strings but keeps surrounding content', () => {
    const index = buildContentIndex([route('/', {
      main: [
        node('OnlyId', { fields: { Ref: { value: `{${GUID}}` }, Bare: { value: GUID } } }),
        node('Mixed', { fields: { Link: { value: { id: GUID, text: 'Read more' } } } }),
      ],
    })]);
    expect(index).toEqual([
      { routePath: '/', componentName: 'Mixed', path: 'main[1]', field: 'Link', text: 'Read more' },
    ]);
  });

  it('skips fields with no human text', () => {
    const index = buildContentIndex([route('/', {
      main: [node('X', { fields: { Empty: { value: '' }, Null: { value: null }, Num: { value: 3 } } })],
    })]);
    expect(index).toEqual([]);
  });

  it('indexes route-level routeFields as "(page)" with an empty path', () => {
    const index = buildContentIndex([route('/', {}, {
      routeFields: { pageTitle: { value: 'Landing' } },
    })]);
    expect(index).toEqual([
      { routePath: '/', componentName: '(page)', path: '', field: 'pageTitle', text: 'Landing' },
    ]);
  });

  it('builds "key[i] › key[j]" paths for nested placeholders', () => {
    const index = buildContentIndex([route('/', {
      main: [node('Tabs', { placeholders: {
        tabs: [node('Tab', { fields: { Label: { value: 'First' } } }), node('Tab', { fields: { Label: { value: 'Second' } } })],
      } })],
    })]);
    expect(index.map((r) => r.path)).toEqual(['main[0] › tabs[0]', 'main[0] › tabs[1]']);
  });
});

describe('searchContent', () => {
  const index = buildContentIndex([
    route('/b', { main: [node('Hero', { fields: { Title: { value: 'Hello world' } } })] }),
    route('/a', {
      main: [
        node('Hero', { fields: { Title: { value: 'Say hello twice' } } }),
        node('Tabs', { placeholders: { tabs: [node('Tab', { fields: { Label: { value: 'hello again' } } })] } }),
      ],
    }),
  ]);

  it('matches case-insensitively', () => {
    expect(searchContent(index, 'HELLO')).toHaveLength(3);
    expect(searchContent(index, 'wOrLd')[0].routePath).toBe('/b');
  });

  it('returns [] for empty or whitespace queries', () => {
    expect(searchContent(index, '')).toEqual([]);
    expect(searchContent(index, '   ')).toEqual([]);
  });

  it('orders by routePath then path and honors the limit', () => {
    const all = searchContent(index, 'hello');
    expect(all.map((m) => `${m.routePath} ${m.path}`)).toEqual([
      '/a main[0]',
      '/a main[1] › tabs[0]',
      '/b main[0]',
    ]);
    expect(searchContent(index, 'hello', 2)).toHaveLength(2);
  });

  it('returns the full text as excerpt when short, without ellipsis', () => {
    const [m] = searchContent(index, 'world');
    expect(m.excerpt).toBe('Hello world');
  });

  it('windows the excerpt to ~40 chars each side with ellipsis when truncated', () => {
    const text = `${'a'.repeat(60)} needle ${'b'.repeat(60)}`;
    const idx = buildContentIndex([route('/', { main: [node('X', { fields: { F: { value: text } } })] })]);
    const [m] = searchContent(idx, 'needle');
    const at = text.indexOf('needle');
    expect(m.excerpt).toBe(`…${text.slice(at - 40, at + 'needle'.length + 40)}…`);
  });

  it('omits only the leading ellipsis when the match is near the start', () => {
    const text = `needle ${'b'.repeat(80)}`;
    const idx = buildContentIndex([route('/', { main: [node('X', { fields: { F: { value: text } } })] })]);
    const [m] = searchContent(idx, 'needle');
    expect(m.excerpt.startsWith('needle')).toBe(true);
    expect(m.excerpt.endsWith('…')).toBe(true);
  });
});
