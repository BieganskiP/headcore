import { describe, it, expect } from 'vitest';
import { auditRoutes } from '../src/lib/audit';
import type { GuiRouteDetail, GuiLayoutNode } from '../src/lib/types';

function node(componentName: string, over: Partial<GuiLayoutNode> = {}): GuiLayoutNode {
  return { componentName, fields: {}, placeholders: {}, ...over };
}

function route(routePath: string, layout: GuiRouteDetail['layout']): GuiRouteDetail {
  return { routePath, name: routePath, updatedAt: null, components: [], layout };
}

function seoRoute(routePath: string, routeFields: Record<string, unknown>): GuiRouteDetail {
  return { ...route(routePath, {}), routeFields };
}

describe('auditRoutes', () => {
  it('flags empty fields, unwrapping { value } wrappers', () => {
    const findings = auditRoutes([route('/', {
      main: [node('Hero', { dataSource: '{X}', fields: { Title: { value: '' }, Sub: { value: null }, Ok: { value: 'hi' } } })],
    })]);
    expect(findings).toEqual([
      { routePath: '/', path: 'main[0]', componentName: 'Hero', kind: 'empty-field', detail: 'field "Title" is empty' },
      { routePath: '/', path: 'main[0]', componentName: 'Hero', kind: 'empty-field', detail: 'field "Sub" is empty' },
    ]);
  });

  it('flags images with a src but no alt text', () => {
    const fields = {
      Good: { value: { src: '/a.jpg', alt: 'A' } },
      Bad: { value: { src: '/b.jpg', alt: '' } },
      NoAlt: { value: { src: '/c.jpg' } },
      NoSrc: { value: { src: '' } },
    };
    const findings = auditRoutes([route('/', { main: [node('Hero', { dataSource: '{X}', fields })] })]);
    expect(findings.map((f) => f.detail)).toEqual([
      'image field "Bad" has no alt text',
      'image field "NoAlt" has no alt text',
    ]);
  });

  it('flags renderings with no datasource, fields, or placeholders — but not containers', () => {
    const findings = auditRoutes([route('/', {
      main: [
        node('Empty'),
        node('Tabs', { placeholders: { tabs: [node('Bare')] } }),
        node('WithData', { dataSource: '{X}' }),
      ],
    })]);
    expect(findings).toEqual([
      { routePath: '/', path: 'main[0]', componentName: 'Empty', kind: 'no-datasource', detail: 'no datasource, fields, or child placeholders' },
      { routePath: '/', path: 'main[1] › tabs[0]', componentName: 'Bare', kind: 'no-datasource', detail: 'no datasource, fields, or child placeholders' },
    ]);
  });

  it('sorts findings by route then placeholder path', () => {
    const findings = auditRoutes([
      route('/b', { main: [node('X')] }),
      route('/a', { main: [node('Y')] }),
    ]);
    expect(findings.map((f) => f.routePath)).toEqual(['/a', '/b']);
  });

  it('returns nothing for clean routes', () => {
    expect(auditRoutes([route('/', { main: [node('Hero', { dataSource: '{X}', fields: { T: { value: 'ok' } } })] })])).toEqual([]);
  });
});

describe('auditRoutes SEO checks', () => {
  it('skips SEO checks entirely when routeFields is undefined', () => {
    expect(auditRoutes([route('/', {})])).toEqual([]);
  });

  it.each(['pageTitle', 'MetaTitle', 'og_title', 'Title'])('accepts "%s" as a title-ish field', (name) => {
    const findings = auditRoutes([seoRoute('/', { [name]: { value: 'Home' }, description: { value: 'd' } })]);
    expect(findings).toEqual([]);
  });

  it('unwraps { value } and accepts plain string route fields', () => {
    expect(auditRoutes([seoRoute('/', { title: 'Home', metaDescription: 'd' })])).toEqual([]);
  });

  it('flags no-title when the only title-ish value is an empty string', () => {
    const findings = auditRoutes([seoRoute('/', { title: { value: '' }, metaDescription: { value: 'd' } })]);
    expect(findings).toEqual([
      { routePath: '/', path: '', componentName: '(page)', kind: 'no-title', detail: 'no title-ish route field with a value' },
    ]);
  });

  it('does not treat non-matching names like subtitle as a page title', () => {
    const findings = auditRoutes([seoRoute('/', { subtitle: { value: 'x' }, metaDescription: { value: 'd' } })]);
    expect(findings.map((f) => f.kind)).toEqual(['no-title']);
  });

  it('flags no-description when no description-ish field has a value', () => {
    const findings = auditRoutes([seoRoute('/', { pageTitle: { value: 'Home' }, ogDescription: { value: '' } })]);
    expect(findings).toEqual([
      { routePath: '/', path: '', componentName: '(page)', kind: 'no-description', detail: 'no description-ish route field with a value' },
    ]);
  });

  it('flags duplicate titles per route, normalizing case and whitespace', () => {
    const findings = auditRoutes([
      seoRoute('/a', { title: { value: ' Home ' }, metaDescription: { value: 'd' } }),
      seoRoute('/b', { title: { value: 'home' }, metaDescription: { value: 'd' } }),
      seoRoute('/c', { title: { value: 'Other' }, metaDescription: { value: 'd' } }),
    ]);
    expect(findings).toEqual([
      { routePath: '/a', path: '', componentName: '(page)', kind: 'duplicate-title', detail: 'title "Home" is shared by 2 routes' },
      { routePath: '/b', path: '', componentName: '(page)', kind: 'duplicate-title', detail: 'title "home" is shared by 2 routes' },
    ]);
  });

  it('reports the full group size in the duplicate-title detail', () => {
    const findings = auditRoutes([
      seoRoute('/a', { title: { value: 'X' }, metaDescription: { value: 'd' } }),
      seoRoute('/b', { title: { value: 'X' }, metaDescription: { value: 'd' } }),
      seoRoute('/c', { title: { value: 'X' }, metaDescription: { value: 'd' } }),
    ]);
    expect(findings.map((f) => f.detail)).toEqual(Array(3).fill('title "X" is shared by 3 routes'));
  });

  it('sorts page-level findings before layout findings within each route', () => {
    const broken: GuiRouteDetail = { ...route('/b', { main: [node('Hero', { dataSource: '{X}', fields: { T: { value: '' } } })] }), routeFields: { title: { value: 'B' } } };
    const findings = auditRoutes([broken, seoRoute('/a', { metaDescription: { value: 'd' } })]);
    expect(findings.map((f) => [f.routePath, f.path, f.kind])).toEqual([
      ['/a', '', 'no-title'],
      ['/b', '', 'no-description'],
      ['/b', 'main[0]', 'empty-field'],
    ]);
  });
});
