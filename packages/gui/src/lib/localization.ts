import type { GuiRouteDetail, RouteInfo } from './types';

export type LangCellStatus = 'ok' | 'stale' | 'missing';

export interface LocalizationSummary {
  language: string;
  translated: number;
  missing: number;
  stale: number;
  /** Whole-percent share of base-language routes that have a version in this language. */
  pct: number;
}

export interface LangCell {
  status: LangCellStatus;
  /** Last-updated date of this language's version; null when missing or unknown. */
  updatedAt: string | null;
}

export interface LocalizationRow {
  routePath: string;
  name: string;
  /** null when the route only exists in a compared language, not the baseline. */
  base: { updatedAt: string | null } | null;
  /** One cell per compared language, keyed by language code. */
  cells: Record<string, LangCell>;
}

export interface LocalizationMatrix {
  rows: LocalizationRow[];
  summaries: LocalizationSummary[];
}

type BaseRoute = Pick<GuiRouteDetail, 'routePath' | 'name' | 'updatedAt'>;

function parseDate(value: string | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? null : ms;
}

/** Comma-separated language codes → trimmed, deduped (case-insensitive) list without the base language. */
export function parseLangList(input: string, baseLanguage?: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of input.split(',')) {
    const lang = raw.trim();
    if (lang === '') continue;
    const key = lang.toLowerCase();
    if (key === baseLanguage?.toLowerCase() || seen.has(key)) continue;
    seen.add(key);
    out.push(lang);
  }
  return out;
}

/**
 * Route × language coverage grid. Rows are the union of route paths across the
 * base language and every compared language, sorted by path. A cell is
 * 'missing' when the route has no version in that language, 'stale' when both
 * update dates are known and the translation is strictly older than the base
 * version, otherwise 'ok'. Summaries count only base-language routes, so pct
 * reads as "how much of the baseline is translated".
 */
export function buildLocalizationMatrix(
  base: BaseRoute[],
  others: Array<{ language: string; routes: RouteInfo[] }>,
): LocalizationMatrix {
  const baseByPath = new Map(base.map((r) => [r.routePath, r]));
  const otherMaps = others.map((o) => ({
    language: o.language,
    byPath: new Map(o.routes.map((r) => [r.routePath, r])),
  }));

  const paths = new Set(baseByPath.keys());
  for (const o of otherMaps) for (const p of o.byPath.keys()) paths.add(p);

  const rows: LocalizationRow[] = [...paths].sort((a, b) => a.localeCompare(b)).map((routePath) => {
    const baseRoute = baseByPath.get(routePath);
    const baseMs = parseDate(baseRoute?.updatedAt);
    const cells: Record<string, LangCell> = {};
    let name = baseRoute?.name ?? '';
    for (const o of otherMaps) {
      const route = o.byPath.get(routePath);
      if (route === undefined) {
        cells[o.language] = { status: 'missing', updatedAt: null };
        continue;
      }
      if (name === '') name = route.name;
      const ms = parseDate(route.updatedAt);
      const stale = baseMs !== null && ms !== null && ms < baseMs;
      cells[o.language] = { status: stale ? 'stale' : 'ok', updatedAt: route.updatedAt };
    }
    return {
      routePath,
      name,
      base: baseRoute === undefined ? null : { updatedAt: baseRoute.updatedAt },
      cells,
    };
  });

  const summaries: LocalizationSummary[] = otherMaps.map(({ language }) => {
    let translated = 0;
    let missing = 0;
    let stale = 0;
    for (const row of rows) {
      if (row.base === null) continue; // coverage is measured against the baseline's routes
      const cell = row.cells[language];
      if (cell === undefined || cell.status === 'missing') {
        missing++;
      } else {
        translated++;
        if (cell.status === 'stale') stale++;
      }
    }
    const total = translated + missing;
    // An empty baseline has nothing left to translate — report full coverage.
    const pct = total === 0 ? 100 : Math.round((translated / total) * 100);
    return { language, translated, missing, stale, pct };
  });

  return { rows, summaries };
}
