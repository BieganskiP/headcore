import type { GuiState } from './types';

export type ApiResult = { ok: true; state: GuiState } | { ok: false; errors: string[] };

export async function fetchState(): Promise<ApiResult> {
  const res = await fetch('/api/state');
  return (await res.json()) as ApiResult;
}

export async function refreshState(lang?: string): Promise<ApiResult> {
  const res = await fetch('/api/refresh', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(lang ? { lang } : {}),
  });
  return (await res.json()) as ApiResult;
}
