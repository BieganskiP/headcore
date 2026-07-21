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
  });

  it('parses query params, decoding the route', () => {
    expect(parseHash('#/components?component=Hero')).toEqual({ view: 'components', component: 'Hero' });
    expect(parseHash('#/inspector?route=%2Fabout%2Fteam')).toEqual({ view: 'inspector', route: '/about/team' });
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
    ];
    for (const v of views) expect(parseHash(toHash(v))).toEqual(v);
  });
});
