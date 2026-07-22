import { describe, it, expect } from 'vitest';
import { datasourceMap } from '../src/lib/datasources';
import type { GuiRouteDetail, GuiLayoutNode } from '../src/lib/types';

function node(componentName: string, over: Partial<GuiLayoutNode> = {}): GuiLayoutNode {
  return { componentName, fields: {}, placeholders: {}, ...over };
}

function route(routePath: string, layout: GuiRouteDetail['layout']): GuiRouteDetail {
  return { routePath, name: routePath, updatedAt: null, components: [], layout };
}

describe('datasourceMap', () => {
  it('groups usages of the same datasource across routes and marks it shared', () => {
    const infos = datasourceMap([
      route('/b', { main: [node('Promo', { dataSource: '{DS}' })] }),
      route('/a', { main: [node('Hero', { dataSource: '{DS}' })] }),
    ]);
    expect(infos).toEqual([{
      id: '{DS}',
      components: ['Hero', 'Promo'],
      routePaths: ['/a', '/b'],
      usages: [
        { routePath: '/a', path: 'main[0]', componentName: 'Hero' },
        { routePath: '/b', path: 'main[0]', componentName: 'Promo' },
      ],
      shared: true,
    }]);
  });

  it('walks nested placeholders using the audit path notation', () => {
    const infos = datasourceMap([route('/', {
      main: [node('Tabs', {
        dataSource: '{TABS}',
        placeholders: { tabs: [node('Tab'), node('Tab', { dataSource: '{TAB}' })] },
      })],
    })]);
    const tab = infos.find((d) => d.id === '{TAB}');
    expect(tab?.usages).toEqual([{ routePath: '/', path: 'main[0] › tabs[1]', componentName: 'Tab' }]);
  });

  it('skips nodes without a dataSource (including empty string)', () => {
    const infos = datasourceMap([route('/', {
      main: [node('Inline'), node('Blank', { dataSource: '' }), node('Real', { dataSource: '{X}' })],
    })]);
    expect(infos.map((d) => d.id)).toEqual(['{X}']);
  });

  it('keeps shared false for repeated use on a single route and dedupes components', () => {
    const infos = datasourceMap([route('/', {
      main: [node('Card', { dataSource: '{X}' }), node('Card', { dataSource: '{X}' })],
    })]);
    expect(infos).toEqual([{
      id: '{X}',
      components: ['Card'],
      routePaths: ['/'],
      usages: [
        { routePath: '/', path: 'main[0]', componentName: 'Card' },
        { routePath: '/', path: 'main[1]', componentName: 'Card' },
      ],
      shared: false,
    }]);
  });

  it('sorts by route reach, then usage count, then id', () => {
    const infos = datasourceMap([
      route('/a', {
        main: [
          node('X', { dataSource: '{B-ONCE}' }),
          node('X', { dataSource: '{A-ONCE}' }),
          node('X', { dataSource: '{TWICE}' }),
          node('X', { dataSource: '{TWICE}' }),
          node('X', { dataSource: '{WIDE}' }),
        ],
      }),
      route('/b', { main: [node('X', { dataSource: '{WIDE}' })] }),
    ]);
    expect(infos.map((d) => d.id)).toEqual(['{WIDE}', '{TWICE}', '{A-ONCE}', '{B-ONCE}']);
  });

  it('sorts usages by route path then placeholder path', () => {
    const infos = datasourceMap([
      route('/b', { footer: [node('N', { dataSource: '{X}' })], main: [node('N', { dataSource: '{X}' })] }),
      route('/a', { main: [node('N', { dataSource: '{X}' })] }),
    ]);
    expect(infos[0]?.usages.map((u) => `${u.routePath} ${u.path}`)).toEqual([
      '/a main[0]',
      '/b footer[0]',
      '/b main[0]',
    ]);
  });

  it('returns an empty list when no rendering has a datasource', () => {
    expect(datasourceMap([route('/', { main: [node('Inline', { fields: { T: { value: 'x' } } })] })])).toEqual([]);
  });
});
