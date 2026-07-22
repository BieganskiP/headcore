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
    expect(parseHash('#/inspector')).toEqual({ view: 'inspector' });
    expect(parseHash('#/dictionary')).toEqual({ view: 'dictionary' });
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
      { view: 'components' },
      { view: 'components', component: 'Hero' },
      { view: 'inspector' },
      { view: 'inspector', route: '/about/team' },
      { view: 'dictionary' },
    ];
    for (const v of views) expect(parseHash(toHash(v))).toEqual(v);
  });
});
