import { describe, it, expect } from 'vitest';
import { buildTrends, sparklinePath, snapshotDelta } from '../src/lib/history';
import type { GuiSnapshotMeta } from '../src/lib/types';

function meta(over: Partial<GuiSnapshotMeta> = {}): GuiSnapshotMeta {
  return {
    id: 'id-1',
    fetchedAt: '2026-07-22T10:00:00.000Z',
    site: 's',
    language: 'en',
    routes: 0,
    renderings: 0,
    components: 0,
    dictionaryEntries: 0,
    ...over,
  };
}

describe('buildTrends', () => {
  it('filters to the given site+language and sorts points oldest to newest', () => {
    const snapshots = [
      meta({ id: 'c', fetchedAt: '2026-07-22T12:00:00.000Z', routes: 7 }),
      meta({ id: 'other-site', site: 'other', routes: 99 }),
      meta({ id: 'a', fetchedAt: '2026-07-22T10:00:00.000Z', routes: 5 }),
      meta({ id: 'other-lang', language: 'da', routes: 99 }),
      meta({ id: 'b', fetchedAt: '2026-07-22T11:00:00.000Z', routes: 6 }),
    ];
    const routesSeries = buildTrends(snapshots, 's', 'en').find((t) => t.key === 'routes');
    expect(routesSeries?.points).toEqual([
      { fetchedAt: '2026-07-22T10:00:00.000Z', value: 5 },
      { fetchedAt: '2026-07-22T11:00:00.000Z', value: 6 },
      { fetchedAt: '2026-07-22T12:00:00.000Z', value: 7 },
    ]);
  });

  it('produces all four series with human labels and the matching metric values', () => {
    const snapshots = [meta({ routes: 1, renderings: 2, components: 3, dictionaryEntries: 4 })];
    const trends = buildTrends(snapshots, 's', 'en');
    expect(trends.map((t) => [t.key, t.label, t.points[0]?.value])).toEqual([
      ['routes', 'Routes', 1],
      ['renderings', 'Renderings', 2],
      ['components', 'Components', 3],
      ['dictionaryEntries', 'Dictionary entries', 4],
    ]);
  });

  it('returns empty series when nothing matches', () => {
    const trends = buildTrends([meta({ site: 'other' })], 's', 'en');
    expect(trends).toHaveLength(4);
    expect(trends.every((t) => t.points.length === 0)).toBe(true);
  });
});

const pt = (value: number, fetchedAt = ''): { fetchedAt: string; value: number } => ({ fetchedAt, value });

describe('sparklinePath', () => {
  it('spans the width with two points, min at the bottom and max at the top (inverted y)', () => {
    // 2px padding: min -> height - 2, max -> 2.
    expect(sparklinePath([pt(0), pt(10)], 100, 40)).toBe('M 0 38 L 100 2');
  });

  it('spaces points evenly on x and scales y linearly', () => {
    expect(sparklinePath([pt(0), pt(5), pt(10)], 100, 40)).toBe('M 0 38 L 50 20 L 100 2');
  });

  it('draws a horizontal midline for a constant series', () => {
    expect(sparklinePath([pt(4), pt(4), pt(4)], 100, 40)).toBe('M 0 20 L 50 20 L 100 20');
  });

  it('returns an empty string for fewer than 2 points', () => {
    expect(sparklinePath([], 100, 40)).toBe('');
    expect(sparklinePath([pt(3)], 100, 40)).toBe('');
  });
});

describe('snapshotDelta', () => {
  it('returns signed differences per metric', () => {
    const prev = meta({ routes: 5, renderings: 20, components: 8, dictionaryEntries: 30 });
    const next = meta({ routes: 7, renderings: 15, components: 8, dictionaryEntries: 31 });
    expect(snapshotDelta(prev, next)).toEqual({
      routes: 2,
      renderings: -5,
      components: 0,
      dictionaryEntries: 1,
    });
  });
});
