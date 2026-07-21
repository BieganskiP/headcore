import { describe, it, expect, vi, afterEach } from 'vitest';
import { createServer, type Server } from 'node:http';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createGuiHandler, type GuiCache } from '../src/commands/gui.js';
import type { GuiState } from 'headcore-core';

function state(over: Partial<GuiState> = {}): GuiState {
  return {
    site: 's', language: 'en', fetchedAt: '2026-07-21T10:00:00.000Z',
    routes: [], registry: [], dictionaryCount: 0, ...over,
  };
}

const servers: Server[] = [];
const tmpDirs: string[] = [];

afterEach(() => {
  for (const s of servers.splice(0)) s.close();
  for (const d of tmpDirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

async function serve(handler: ReturnType<typeof createGuiHandler>): Promise<string> {
  const server = createServer(handler);
  servers.push(server);
  await new Promise<void>((res) => server.listen(0, '127.0.0.1', res));
  const address = server.address();
  if (address === null || typeof address === 'string') throw new Error('no port assigned');
  return `http://127.0.0.1:${address.port}`;
}

function distDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'gui-dist-'));
  tmpDirs.push(dir);
  writeFileSync(join(dir, 'index.html'), '<!doctype html><title>headcore</title>', 'utf8');
  mkdirSync(join(dir, 'assets'));
  writeFileSync(join(dir, 'assets', 'app.js'), 'console.log(1)', 'utf8');
  return dir;
}

describe('createGuiHandler /api', () => {
  it('serves the cached state', async () => {
    const cache: GuiCache = { state: state({ dictionaryCount: 7 }), errors: [] };
    const url = await serve(createGuiHandler(cache, vi.fn(), distDir()));
    const res = await fetch(`${url}/api/state`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, state: state({ dictionaryCount: 7 }) });
  });

  it('reports errors when no state has been fetched yet', async () => {
    const cache: GuiCache = { state: null, errors: ['HTTP 401'] };
    const url = await serve(createGuiHandler(cache, vi.fn(), distDir()));
    const body = await (await fetch(`${url}/api/state`)).json();
    expect(body).toEqual({ ok: false, errors: ['HTTP 401'] });
  });

  it('refresh success swaps the cache and passes lang through', async () => {
    const next = state({ language: 'da' });
    const refresh = vi.fn().mockResolvedValue(next);
    const cache: GuiCache = { state: state(), errors: [] };
    const url = await serve(createGuiHandler(cache, refresh, distDir()));

    const res = await fetch(`${url}/api/refresh`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ lang: 'da' }),
    });

    expect(refresh).toHaveBeenCalledWith('da');
    expect(await res.json()).toEqual({ ok: true, state: next });
    expect(cache.state).toEqual(next);
    const after = await (await fetch(`${url}/api/state`)).json();
    expect(after).toEqual({ ok: true, state: next });
  });

  it('refresh without a body refreshes the current language', async () => {
    const refresh = vi.fn().mockResolvedValue(state());
    const url = await serve(createGuiHandler({ state: null, errors: [] }, refresh, distDir()));
    const res = await fetch(`${url}/api/refresh`, { method: 'POST' });
    expect(res.status).toBe(200);
    expect(refresh).toHaveBeenCalledWith(undefined);
  });

  it('refresh failure keeps the previous state', async () => {
    const previous = state({ dictionaryCount: 7 });
    const refresh = vi.fn().mockRejectedValue(new Error('edge down'));
    const cache: GuiCache = { state: previous, errors: [] };
    const url = await serve(createGuiHandler(cache, refresh, distDir()));

    const body = await (await fetch(`${url}/api/refresh`, { method: 'POST' })).json();
    expect(body).toEqual({ ok: false, errors: ['edge down'] });
    expect(cache.state).toEqual(previous);
    const after = await (await fetch(`${url}/api/state`)).json();
    expect(after).toEqual({ ok: true, state: previous });
  });

  it('rejects an invalid JSON body with 400', async () => {
    const url = await serve(createGuiHandler({ state: null, errors: [] }, vi.fn(), distDir()));
    const res = await fetch(`${url}/api/refresh`, { method: 'POST', body: '{nope' });
    expect(res.status).toBe(400);
  });

  it('returns JSON 404 for unknown api endpoints', async () => {
    const url = await serve(createGuiHandler({ state: null, errors: [] }, vi.fn(), distDir()));
    const res = await fetch(`${url}/api/nope`);
    expect(res.status).toBe(404);
    expect((await res.json()).ok).toBe(false);
  });

  it('rejects a malformed percent-encoded path with 400', async () => {
    const url = await serve(createGuiHandler({ state: null, errors: [] }, vi.fn(), distDir()));
    const res = await fetch(`${url}/%`);
    expect(res.status).toBe(400);
  });

  it('rejects an oversized refresh body with 400', async () => {
    const url = await serve(createGuiHandler({ state: null, errors: [] }, vi.fn(), distDir()));
    const res = await fetch(`${url}/api/refresh`, { method: 'POST', body: 'x'.repeat(1_100_000) });
    expect(res.status).toBe(400);
  });
});

describe('createGuiHandler static serving', () => {
  it('serves index.html at /', async () => {
    const url = await serve(createGuiHandler({ state: null, errors: [] }, vi.fn(), distDir()));
    const res = await fetch(`${url}/`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('text/html; charset=utf-8');
    expect(await res.text()).toContain('headcore');
  });

  it('serves assets with their mime type', async () => {
    const url = await serve(createGuiHandler({ state: null, errors: [] }, vi.fn(), distDir()));
    const res = await fetch(`${url}/assets/app.js`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('text/javascript; charset=utf-8');
  });

  it('falls back to index.html for unknown non-api paths (SPA)', async () => {
    const url = await serve(createGuiHandler({ state: null, errors: [] }, vi.fn(), distDir()));
    const res = await fetch(`${url}/routes`);
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('headcore');
  });

  it('blocks path traversal outside the dist dir', async () => {
    const dir = distDir();
    writeFileSync(join(dir, '..', 'secret.txt'), 'top secret', 'utf8');
    const url = await serve(createGuiHandler({ state: null, errors: [] }, vi.fn(), dir));
    const res = await fetch(`${url}/..%2Fsecret.txt`);
    expect(res.status).toBe(403);
    rmSync(join(dir, '..', 'secret.txt'), { force: true });
  });

  it('returns JSON 404 when the dist dir is missing entirely', async () => {
    const url = await serve(createGuiHandler({ state: null, errors: [] }, vi.fn(), join(tmpdir(), 'does-not-exist-headcore')));
    const res = await fetch(`${url}/`);
    expect(res.status).toBe(404);
    expect((await res.json()).errors[0]).toMatch(/assets missing/);
  });
});
