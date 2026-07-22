import type { FreshKey } from './analytics';

/** Display metadata for freshness buckets, shared by Overview and Routes. */
export const FRESH_META: Array<{ key: FreshKey; label: string; tone: string }> = [
  { key: 'week', label: '≤ 7d', tone: 'bg-emerald-500' },
  { key: 'month', label: '≤ 30d', tone: 'bg-sky-500' },
  { key: 'quarter', label: '≤ 90d', tone: 'bg-amber-500' },
  { key: 'older', label: '> 90d', tone: 'bg-red-500' },
  { key: 'unknown', label: 'unknown', tone: 'bg-slate-400' },
];
