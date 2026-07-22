import { describe, it, expect } from 'vitest';
import { extractLinks, analyzeLinks, linkEdges, classifyHref, normalizeRoutePath } from '../src/lib/links';
import type { GuiRouteDetail, GuiLayoutNode } from '../src/lib/types';

function node(componentName: string, over: Partial<GuiLayoutNode> = {}): GuiLayoutNode {
  return { componentName, fields: {}, placeholders: {}, ...over };
}

function route(routePath: string, layout: GuiRouteDetail['layout'] = {}, over: Partial<GuiRouteDetail> = {}): GuiRouteDetail {
  return { routePath, name: routePath, updatedAt: null, components: [], layout, ...over };
}

/** A page whose only content is a rich-text Body linking to each href. */
function page(routePath: string, ...hrefs: string[]): GuiRouteDetail {
  const html = hrefs.map((h) => `<a href="${h}">x</a>`).join('');
  return route(routePath, { main: [node('Rich', { fields: { Body: { value: html } } })] });
}

describe('extractLinks', () => {
  it('regexes hrefs out of rich text — double quotes, single quotes, multiple per string', () => {
    const routes = [route('/', {
      main: [node('Rich', { fields: { Body: { value: '<p><a href="/a">A</a> and <a href=\'/b\'>B</a> and <A HREF="https://x.com">X</A></p>' } } })],
    })];
    const links = extractLinks(routes);
    expect(links.map((l) => l.href)).toEqual(['/a', '/b', 'https://x.com']);
    expect(links[0]).toEqual({
      from: '/', href: '/a', kind: 'internal', target: '/a', componentName: 'Rich', path: 'main[0]', field: 'Body',
    });
  });

  it('takes .href from link-field objects, with and without the { value } wrapper', () => {
    const routes = [route('/', {
      main: [node('Cta', { fields: {
        Wrapped: { value: { href: '/about', text: 'About' } },
        Bare: { href: '/contact' },
        List: { value: [{ href: '/one' }, { href: '/two' }] },
      } })],
    })];
    expect(extractLinks(routes).map((l) => [l.field, l.href])).toEqual([
      ['Wrapped', '/about'],
      ['Bare', '/contact'],
      ['List', '/one'],
      ['List', '/two'],
    ]);
  });

  it('extracts from routeFields with componentName "(page)" and empty path', () => {
    const routes = [route('/', {}, { routeFields: { CanonicalLink: { value: { href: '/home' } } } })];
    expect(extractLinks(routes)).toEqual([
      { from: '/', href: '/home', kind: 'internal', target: '/home', componentName: '(page)', path: '', field: 'CanonicalLink' },
    ]);
  });

  it('records placeholder paths of nested renderings', () => {
    const routes = [route('/', {
      main: [node('Tabs', { placeholders: { tabs: [node('Tab', { fields: { Link: { href: '/deep' } } })] } })],
    })];
    expect(extractLinks(routes)[0].path).toBe('main[0] › tabs[0]');
  });
});

describe('classifyHref', () => {
  it.each([
    ['/-/media/img.ashx', 'media'],
    ['/sitecore/content/thing', 'media'],
    ['mailto:a@b.com', 'special'],
    ['tel:+48123', 'special'],
    ['#section', 'special'],
    ['javascript:void(0)', 'special'],
    ['', 'special'],
    ['relative/path', 'special'],
    ['https://x.com/a', 'external'],
    ['http://x.com', 'external'],
    ['//cdn.x.com/a.js', 'external'],
    ['/about', 'internal'],
  ] as const)('%s → %s', (href, kind) => {
    expect(classifyHref(href)).toBe(kind);
  });

  it('sets target only for internal links', () => {
    const links = extractLinks([page('/', '/About', 'https://x.com', '/-/media/a.jpg', 'mailto:a@b')]);
    expect(links.map((l) => l.target)).toEqual(['/about', null, null, null]);
  });
});

describe('normalizeRoutePath', () => {
  it.each([
    ['/About/?utm=1#frag', '/about'],
    ['/a%20b', '/a b'],
    ['/products/', '/products'],
    ['/', '/'],
    ['/?q=1', '/'],
  ])('%s → %s', (href, expected) => {
    expect(normalizeRoutePath(href)).toBe(expected);
  });
});

describe('analyzeLinks', () => {
  it('flags internal links whose normalized target is not a known route', () => {
    const { broken } = analyzeLinks([page('/', '/About?x=1', '/missing'), route('/about')]);
    expect(broken.map((l) => l.href)).toEqual(['/missing']);
  });

  it('orphans: excludes "/", self-links do not rescue, broken links do not count as inbound', () => {
    const { orphans } = analyzeLinks([
      page('/', '/a'),
      route('/a'),
      page('/self', '/self'),
      page('/b', '/nowhere'),
      route('/nowhere-else'),
    ]);
    // '/' never an orphan; '/a' has inbound; '/self' only self-links; '/b' unlinked; '/nowhere-else' unlinked ('/nowhere' is broken).
    expect(orphans).toEqual(['/b', '/nowhere-else', '/self']);
  });

  it('counts inbound (all resolved, incl. self) and outbound (working links only)', () => {
    const a = analyzeLinks([page('/', '/a', '/a', '/missing'), page('/a', '/a', '/')]);
    expect(a.outbound.get('/')).toBe(2); // broken '/missing' not counted
    expect(a.outbound.get('/a')).toBe(2);
    expect(a.inbound.get('/a')).toBe(3); // two from '/', one self
    expect(a.inbound.get('/')).toBe(1);
  });

  it('computes BFS click depths from "/", leaving unreachable routes absent', () => {
    const { depths } = analyzeLinks([
      page('/', '/a'),
      page('/a', '/a/b', '/'),
      route('/a/b'),
      route('/island'),
    ]);
    expect(depths.get('/')).toBe(0);
    expect(depths.get('/a')).toBe(1);
    expect(depths.get('/a/b')).toBe(2);
    expect(depths.has('/island')).toBe(false);
  });

  it('has an empty depth map when there is no home route', () => {
    expect(analyzeLinks([page('/a', '/b'), route('/b')]).depths.size).toBe(0);
  });

  it('resolves via normalization (case, trailing slash, query)', () => {
    const a = analyzeLinks([page('/', '/About/?ref=nav'), route('/about')]);
    expect(a.broken).toEqual([]);
    expect(a.inbound.get('/about')).toBe(1);
    expect(a.depths.get('/about')).toBe(1);
  });
});

describe('linkEdges', () => {
  it('dedupes resolved internal links into counted edges, skipping self and broken links', () => {
    const edges = linkEdges([page('/', '/a', '/a', '/', '/missing'), route('/a')]);
    expect(edges).toEqual([{ from: '/', to: '/a', count: 2 }]);
  });
});
