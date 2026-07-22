import type { GuiSnapshotMeta } from './types';

export interface TrendPoint {
  fetchedAt: string;
  value: number;
}

export type TrendKey = 'routes' | 'renderings' | 'components' | 'dictionaryEntries';

export interface TrendSeries {
  key: TrendKey;
  label: string;
  points: TrendPoint[];
}

export const TREND_META: Array<{ key: TrendKey; label: string }> = [
  { key: 'routes', label: 'Routes' },
  { key: 'renderings', label: 'Renderings' },
  { key: 'components', label: 'Components' },
  { key: 'dictionaryEntries', label: 'Dictionary entries' },
];

/** One series per metric over the snapshots matching site+language, oldest first. */
export function buildTrends(snapshots: GuiSnapshotMeta[], site: string, language: string): TrendSeries[] {
  const matching = snapshots
    .filter((s) => s.site === site && s.language === language)
    .sort((a, b) => a.fetchedAt.localeCompare(b.fetchedAt));
  return TREND_META.map(({ key, label }) => ({
    key,
    label,
    points: matching.map((s) => ({ fetchedAt: s.fetchedAt, value: s[key] })),
  }));
}

const PAD = 2;

const round = (n: number): number => Math.round(n * 100) / 100;

/**
 * Polyline path for an SVG sparkline: x evenly spaced, y scaled to the value
 * range with PAD px of headroom top and bottom (inverted — SVG y grows down).
 */
export function sparklinePath(points: TrendPoint[], width: number, height: number): string {
  if (points.length < 2) return '';
  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const step = width / (points.length - 1);
  const y = (v: number): number =>
    min === max ? height / 2 : PAD + (1 - (v - min) / (max - min)) * (height - PAD * 2);
  return points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${round(i * step)} ${round(y(p.value))}`)
    .join(' ');
}

/** Per-metric change from prev to next, for +/- table cells. */
export function snapshotDelta(prev: GuiSnapshotMeta, next: GuiSnapshotMeta): Record<TrendKey, number> {
  return {
    routes: next.routes - prev.routes,
    renderings: next.renderings - prev.renderings,
    components: next.components - prev.components,
    dictionaryEntries: next.dictionaryEntries - prev.dictionaryEntries,
  };
}
