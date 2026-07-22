import type { GuiState } from './types';

export type ApiResult =
  | { ok: true; state: GuiState }
  | { ok: false; loading?: boolean; errors: string[] };

async function parseApiResponse(res: Response): Promise<ApiResult> {
  if (!(res.headers.get('content-type') ?? '').includes('application/json')) {
    return { ok: false, errors: [`HTTP ${res.status} — is the headcore gui server running?`] };
  }
  return (await res.json()) as ApiResult;
}

export async function fetchState(): Promise<ApiResult> {
  return parseApiResponse(await fetch('/api/state'));
}

export async function refreshState(lang?: string): Promise<ApiResult> {
  return parseApiResponse(await fetch('/api/refresh', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(lang ? { lang } : {}),
  }));
}
