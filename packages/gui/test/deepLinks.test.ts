import { describe, it, expect } from 'vitest';
import { editUrl, liveUrl, type DeepLinkContext } from '../src/lib/deepLinks';

const ctx = (links?: DeepLinkContext['links']): DeepLinkContext => ({
  links,
  site: 'my-site',
  language: 'en',
});

describe('editUrl', () => {
  it('substitutes all placeholders', () => {
    const c = ctx({ editUrlTemplate: 'https://cm.example/edit?id={itemId}&sc_lang={lang}&sc_site={site}&path={routePath}' });
    expect(editUrl(c, { itemId: 'abc', routePath: '/about' }))
      .toBe('https://cm.example/edit?id=abc&sc_lang=en&sc_site=my-site&path=%2Fabout');
  });

  it('substitutes every occurrence of a placeholder', () => {
    const c = ctx({ editUrlTemplate: 'https://cm.example/{lang}/edit/{lang}?id={itemId}&id2={itemId}' });
    expect(editUrl(c, { itemId: 'x', routePath: '/' }))
      .toBe('https://cm.example/en/edit/en?id=x&id2=x');
  });

  it('URL-encodes substituted values', () => {
    const c = ctx({ editUrlTemplate: 'https://cm.example/edit?id={itemId}&path={routePath}' });
    expect(editUrl(c, { itemId: '{1F2A}', routePath: '/products/widgets' }))
      .toBe('https://cm.example/edit?id=%7B1F2A%7D&path=%2Fproducts%2Fwidgets');
  });

  it('returns null without an editUrlTemplate', () => {
    expect(editUrl(ctx(), { itemId: 'abc', routePath: '/' })).toBeNull();
    expect(editUrl(ctx({ siteBaseUrl: 'https://example.com' }), { itemId: 'abc', routePath: '/' })).toBeNull();
  });

  it('returns null without an itemId', () => {
    const c = ctx({ editUrlTemplate: 'https://cm.example/edit?id={itemId}' });
    expect(editUrl(c, { routePath: '/' })).toBeNull();
  });
});

describe('liveUrl', () => {
  it('joins a base without a trailing slash', () => {
    expect(liveUrl(ctx({ siteBaseUrl: 'https://example.com' }), '/about')).toBe('https://example.com/about');
  });

  it('joins a base with a trailing slash using exactly one slash', () => {
    expect(liveUrl(ctx({ siteBaseUrl: 'https://example.com/' }), '/about')).toBe('https://example.com/about');
  });

  it('returns null without a siteBaseUrl', () => {
    expect(liveUrl(ctx(), '/about')).toBeNull();
    expect(liveUrl(ctx({ editUrlTemplate: 'https://cm.example/{itemId}' }), '/about')).toBeNull();
  });
});
