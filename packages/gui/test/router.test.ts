import { describe, it, expect } from 'vitest';
import { parseHash, toHash, type View } from '../src/lib/router';

describe('parseHash', () => {
  it('defaults to overview', () => {
    expect(parseHash('')).toEqual({ view: 'overview' });
    expect(parseHash('#/')).toEqual({ view: 'overview' });
    expect(parseHash('#/nonsense')).toEqual({ view: 'overview' });
  });

  it('parses plain views', () => {
    expect(parseHash('#/routes')).toEqual({ view: 'routes' });
    expect(parseHash('#/components')).toEqual({ view: 'components' });
    expect(parseHash('#/graph')).toEqual({ view: 'graph' });
    expect(parseHash('#/matrix')).toEqual({ view: 'matrix' });
    expect(parseHash('#/datasources')).toEqual({ view: 'datasources' });
    expect(parseHash('#/links')).toEqual({ view: 'links' });
    expect(parseHash('#/localization')).toEqual({ view: 'localization' });
    expect(parseHash('#/content')).toEqual({ view: 'content' });
    expect(parseHash('#/history')).toEqual({ view: 'history' });
    expect(parseHash('#/docs')).toEqual({ view: 'docs' });
    expect(parseHash('#/audit')).toEqual({ view: 'audit' });
    expect(parseHash('#/inspector')).toEqual({ view: 'inspector' });
    expect(parseHash('#/dictionary')).toEqual({ view: 'dictionary' });
  });

  it('parses the new view params', () => {
    expect(parseHash('#/datasources?ds=%7BGUID-1%7D')).toEqual({ view: 'datasources', ds: '{GUID-1}' });
    expect(parseHash('#/localization?langs=da%2Cde')).toEqual({ view: 'localization', langs: 'da,de' });
    expect(parseHash('#/content?q=hello%20world')).toEqual({ view: 'content', q: 'hello world' });
    expect(parseHash('#/datasources?ds=')).toEqual({ view: 'datasources' });
    expect(parseHash('#/localization?langs=')).toEqual({ view: 'localization' });
    expect(parseHash('#/content?q=')).toEqual({ view: 'content' });
  });

  it('parses the dictionary filter query', () => {
    expect(parseHash('#/dictionary?q=nav%2Fhome')).toEqual({ view: 'dictionary', q: 'nav/home' });
  });

  it('parses the routes freshness filter, rejecting unknown buckets', () => {
    expect(parseHash('#/routes?fresh=older')).toEqual({ view: 'routes', fresh: 'older' });
    expect(parseHash('#/routes?fresh=bogus')).toEqual({ view: 'routes' });
    expect(parseHash('#/routes?fresh=')).toEqual({ view: 'routes' });
  });

  it('parses the component subpage path, decoding the name', () => {
    expect(parseHash('#/components/Hero')).toEqual({ view: 'components', component: 'Hero' });
    expect(parseHash('#/components/My%20Hero')).toEqual({ view: 'components', component: 'My Hero' });
  });

  it('parses query params, decoding the route', () => {
    expect(parseHash('#/inspector?route=%2Fabout%2Fteam')).toEqual({ view: 'inspector', route: '/about/team' });
  });

  it('keeps the legacy component query form working', () => {
    expect(parseHash('#/components?component=Hero')).toEqual({ view: 'components', component: 'Hero' });
  });

  it('treats empty params as absent', () => {
    expect(parseHash('#/components?component=')).toEqual({ view: 'components' });
    expect(parseHash('#/components/')).toEqual({ view: 'components' });
    expect(parseHash('#/inspector?route=')).toEqual({ view: 'inspector' });
    expect(parseHash('#/dictionary?q=')).toEqual({ view: 'dictionary' });
  });

  it('keeps everything after the first ? as query', () => {
    expect(parseHash('#/inspector?route=%2Fa%3Fb')).toEqual({ view: 'inspector', route: '/a?b' });
  });
});

describe('toHash', () => {
  it('round-trips every view', () => {
    const views: View[] = [
      { view: 'overview' },
      { view: 'routes' },
      { view: 'routes', fresh: 'week' },
      { view: 'components' },
      { view: 'components', component: 'Hero' },
      { view: 'graph' },
      { view: 'matrix' },
      { view: 'datasources' },
      { view: 'datasources', ds: '{GUID-1}' },
      { view: 'links' },
      { view: 'localization' },
      { view: 'localization', langs: 'da,de' },
      { view: 'content' },
      { view: 'content', q: 'hello world' },
      { view: 'history' },
      { view: 'docs' },
      { view: 'audit' },
      { view: 'inspector' },
      { view: 'inspector', route: '/about/team' },
      { view: 'dictionary' },
      { view: 'dictionary', q: 'nav/home' },
    ];
    for (const v of views) expect(parseHash(toHash(v))).toEqual(v);
  });
});
