import { describe, it, expect } from 'vitest';
import { diffStates, isEmptyDiff } from '../src/lib/diff';
import type { GuiState, GuiRouteDetail } from '../src/lib/types';

function route(routePath: string, components: string[], updatedAt: string | null = null): GuiRouteDetail {
  return { routePath, name: routePath, updatedAt, components, layout: {} };
}

function state(over: Partial<GuiState> = {}): GuiState {
  return { site: 's', language: 'en', fetchedAt: '2026-07-22T10:00:00.000Z', routes: [], registry: [], dictionary: [], ...over };
}

describe('diffStates', () => {
  it('reports added, removed, and changed routes plus component and dictionary churn', () => {
    const prev = state({
      routes: [route('/', ['Hero'], '2026-07-01'), route('/old', ['Aside']), route('/changed', ['Hero'], '2026-07-01')],
      dictionary: [{ key: 'a', value: '1' }, { key: 'b', value: '2' }],
    });
    const next = state({
      fetchedAt: '2026-07-22T11:00:00.000Z',
      routes: [route('/', ['Hero'], '2026-07-01'), route('/new', ['Card']), route('/changed', ['Hero'], '2026-07-10')],
      dictionary: [{ key: 'a', value: '1' }, { key: 'c', value: '3' }],
    });

    expect(diffStates(prev, next)).toEqual({
      routesAdded: ['/new'],
      routesRemoved: ['/old'],
      routesChanged: ['/changed'],
      componentsAdded: ['Card'],
      componentsRemoved: ['Aside'],
      dictionaryAdded: ['c'],
      dictionaryRemoved: ['b'],
    });
  });

  it('flags a route as changed when only its component list differs', () => {
    const prev = state({ routes: [route('/', ['Hero'])] });
    const next = state({ routes: [route('/', ['Hero', 'Card'])] });
    expect(diffStates(prev, next)?.routesChanged).toEqual(['/']);
  });

  it('returns null for different sites or languages', () => {
    expect(diffStates(state(), state({ language: 'da' }))).toBeNull();
    expect(diffStates(state(), state({ site: 'other' }))).toBeNull();
  });

  it('isEmptyDiff detects a no-change diff', () => {
    const d = diffStates(state({ routes: [route('/', ['Hero'])] }), state({ routes: [route('/', ['Hero'])] }));
    expect(d).not.toBeNull();
    if (d) expect(isEmptyDiff(d)).toBe(true);
  });
});
