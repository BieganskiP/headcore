import { describe, it, expect } from 'vitest';
import { buildLocalizationMatrix, parseLangList } from '../src/lib/localization';

const route = (routePath: string, updatedAt: string | null = null, name = routePath) => ({ routePath, name, updatedAt });

describe('buildLocalizationMatrix', () => {
  it('rows cover the union of route paths, sorted', () => {
    const { rows } = buildLocalizationMatrix(
      [route('/b'), route('/a')],
      [{ language: 'da', routes: [route('/a'), route('/z-only-da', null, 'Danish only')] }],
    );
    expect(rows.map((r) => r.routePath)).toEqual(['/a', '/b', '/z-only-da']);
  });

  it('a route existing only in another language gets a null base cell but still shows', () => {
    const { rows } = buildLocalizationMatrix(
      [route('/a')],
      [{ language: 'da', routes: [route('/only-da', '2026-07-01', 'Danish only')] }],
    );
    const extra = rows.find((r) => r.routePath === '/only-da');
    expect(extra).toBeDefined();
    expect(extra?.base).toBeNull();
    expect(extra?.name).toBe('Danish only');
    expect(extra?.cells).toEqual({ da: { status: 'ok', updatedAt: '2026-07-01' } });
  });

  it('marks routes missing in a compared language', () => {
    const { rows } = buildLocalizationMatrix(
      [route('/a'), route('/b')],
      [{ language: 'da', routes: [route('/a')] }],
    );
    expect(rows.find((r) => r.routePath === '/b')?.cells).toEqual({ da: { status: 'missing', updatedAt: null } });
  });

  it('stale only when both dates exist and the translation is strictly older', () => {
    const { rows } = buildLocalizationMatrix(
      [route('/older', '2026-07-10'), route('/equal', '2026-07-10'), route('/newer', '2026-07-10')],
      [{
        language: 'da',
        routes: [route('/older', '2026-07-01'), route('/equal', '2026-07-10'), route('/newer', '2026-07-15')],
      }],
    );
    const status = (p: string) => rows.find((r) => r.routePath === p)?.cells.da?.status;
    expect(status('/older')).toBe('stale');
    expect(status('/equal')).toBe('ok');
    expect(status('/newer')).toBe('ok');
    expect(rows.find((r) => r.routePath === '/older')?.cells.da?.updatedAt).toBe('2026-07-01');
  });

  it('null dates on either side are never stale', () => {
    const { rows } = buildLocalizationMatrix(
      [route('/no-base-date', null), route('/no-other-date', '2026-07-10')],
      [{ language: 'da', routes: [route('/no-base-date', '2020-01-01'), route('/no-other-date', null)] }],
    );
    expect(rows.find((r) => r.routePath === '/no-base-date')?.cells.da?.status).toBe('ok');
    expect(rows.find((r) => r.routePath === '/no-other-date')?.cells.da?.status).toBe('ok');
  });

  it('summaries count only base routes and round pct', () => {
    const { summaries } = buildLocalizationMatrix(
      [route('/a', '2026-07-10'), route('/b'), route('/c')],
      [{
        language: 'da',
        // /a translated but stale, /b translated, /c missing; /only-da is outside the baseline.
        routes: [route('/a', '2026-07-01'), route('/b'), route('/only-da')],
      }],
    );
    expect(summaries).toEqual([{ language: 'da', translated: 2, missing: 1, stale: 1, pct: 67 }]);
  });

  it('summaries follow the order of the compared languages', () => {
    const { summaries } = buildLocalizationMatrix(
      [route('/a')],
      [
        { language: 'da', routes: [route('/a')] },
        { language: 'de', routes: [] },
      ],
    );
    expect(summaries.map((s) => s.language)).toEqual(['da', 'de']);
    expect(summaries[1]).toEqual({ language: 'de', translated: 0, missing: 1, stale: 0, pct: 0 });
  });

  it('handles empty others: base rows with empty cells, no summaries', () => {
    const result = buildLocalizationMatrix([route('/a', '2026-07-10')], []);
    expect(result.rows).toEqual([
      { routePath: '/a', name: '/a', base: { updatedAt: '2026-07-10' }, cells: {} },
    ]);
    expect(result.summaries).toEqual([]);
  });

  it('handles an empty baseline', () => {
    const { rows, summaries } = buildLocalizationMatrix([], [{ language: 'da', routes: [route('/only-da')] }]);
    expect(rows.map((r) => r.routePath)).toEqual(['/only-da']);
    // Nothing in the baseline to translate — vacuously fully covered.
    expect(summaries).toEqual([{ language: 'da', translated: 0, missing: 0, stale: 0, pct: 100 }]);
  });
});

describe('parseLangList', () => {
  it('trims, drops empties, dedupes case-insensitively, and excludes the base language', () => {
    expect(parseLangList(' da, de ,DA,, en ', 'en')).toEqual(['da', 'de']);
  });

  it('returns [] for blank input', () => {
    expect(parseLangList('   ', 'en')).toEqual([]);
  });
});
