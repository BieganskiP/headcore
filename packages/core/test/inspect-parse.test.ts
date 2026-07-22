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

  it('captures the route itemId and route-level fields when present', () => {
    const tree = parseLayout({
      sitecore: {
        route: {
          itemId: '11111111-2222-3333-4444-555555555555',
          fields: { pageTitle: { value: 'About us' }, metaDescription: { value: 'Who we are' } },
          placeholders: {},
        },
      },
    }, '/about-us');
    expect(tree.itemId).toBe('11111111-2222-3333-4444-555555555555');
    expect(tree.fields).toEqual({ pageTitle: { value: 'About us' }, metaDescription: { value: 'Who we are' } });
  });

  it('omits itemId and fields when absent or malformed', () => {
    const tree = parseLayout({ sitecore: { route: { itemId: 42, fields: null, placeholders: {} } } }, '/x');
    expect(tree).not.toHaveProperty('itemId');
    expect(tree).not.toHaveProperty('fields');
  });

  it('keeps working on the fixture without route-level extras', () => {
    const tree = parseLayout(raw, '/about-us');
    expect(tree.placeholders['headless-main'].length).toBeGreaterThan(0);
  });
});
