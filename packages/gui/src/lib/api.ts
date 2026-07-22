import type { GuiState, DictionaryEntry, RouteInfo, GuiSnapshotMeta } from './types';

export type ApiResult =
  | { ok: true; state: GuiState }
  | { ok: false; loading?: boolean; errors: string[] };

export type DictionaryResult =
  | { ok: true; language: string; entries: DictionaryEntry[] }
  | { ok: false; errors: string[] };

export type RoutesResult =
  | { ok: true; language: string; routes: RouteInfo[] }
  | { ok: false; errors: string[] };

export type HistoryListResult =
  | { ok: true; snapshots: GuiSnapshotMeta[] }
  | { ok: false; errors: string[] };

export type SnapshotResult =
  | { ok: true; state: GuiState }
  | { ok: false; errors: string[] };

async function parseApiResponse(res: Response): Promise<ApiResult> {
  if (!(res.headers.get('content-type') ?? '').includes('application/json')) {
    return { ok: false, errors: [`HTTP ${res.status} — is the headcore gui server running?`] };
  }
  return (await res.json()) as ApiResult;
}

export async function fetchState(): Promise<ApiResult> {
  return parseApiResponse(await fetch('/api/state'));
}

async function parseJson<T>(res: Response): Promise<T | { ok: false; errors: string[] }> {
  if (!(res.headers.get('content-type') ?? '').includes('application/json')) {
    return { ok: false, errors: [`HTTP ${res.status} — is the headcore gui server running?`] };
  }
  return (await res.json()) as T;
}

export async function fetchDictionaryFor(lang: string): Promise<DictionaryResult> {
  return parseJson<DictionaryResult>(await fetch(`/api/dictionary?lang=${encodeURIComponent(lang)}`));
}

export async function fetchRoutesFor(lang: string): Promise<RoutesResult> {
  return parseJson<RoutesResult>(await fetch(`/api/routes?lang=${encodeURIComponent(lang)}`));
}

export async function fetchHistoryList(): Promise<HistoryListResult> {
  return parseJson<HistoryListResult>(await fetch('/api/history'));
}

export async function fetchHistorySnapshot(id: string): Promise<SnapshotResult> {
  return parseJson<SnapshotResult>(await fetch(`/api/history/${encodeURIComponent(id)}`));
}

export async function refreshState(lang?: string): Promise<ApiResult> {
  return parseApiResponse(await fetch('/api/refresh', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(lang ? { lang } : {}),
  }));
}
