import type { IncomingMessage, ServerResponse } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, resolve, sep } from 'node:path';
import type { GuiState } from 'headcore-core';

export interface GuiCache {
  state: GuiState | null;
  /** Errors from the last failed fetch while no state exists yet. */
  errors: string[];
}

export type GuiRefresh = (lang?: string) => Promise<GuiState>;
type Handler = (req: IncomingMessage, res: ServerResponse) => void;

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.map': 'application/json',
  '.woff2': 'font/woff2',
};

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

const MAX_BODY_BYTES = 1_000_000;

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  let size = 0;
  // Stream is in default (binary) mode, so chunks are always Buffers.
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > MAX_BODY_BYTES) throw new Error('body too large');
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks).toString('utf8');
}

async function serveStatic(pathname: string, res: ServerResponse, distDir: string): Promise<void> {
  const root = resolve(distDir);
  const target = resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
  if (target !== root && !target.startsWith(root + sep)) {
    sendJson(res, 403, { ok: false, errors: ['forbidden'] });
    return;
  }
  try {
    const contents = await readFile(target);
    res.writeHead(200, { 'content-type': MIME[extname(target)] ?? 'application/octet-stream' });
    res.end(contents);
  } catch {
    try {
      // SPA fallback: unknown non-API paths get the app shell.
      const index = await readFile(join(root, 'index.html'));
      res.writeHead(200, { 'content-type': MIME['.html'] });
      res.end(index);
    } catch {
      sendJson(res, 404, { ok: false, errors: ['gui assets missing — reinstall headcore'] });
    }
  }
}

export function createGuiHandler(cache: GuiCache, refresh: GuiRefresh, distDir: string): Handler {
  async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const url = new URL(req.url ?? '/', 'http://localhost');
    let pathname: string;
    try {
      pathname = decodeURIComponent(url.pathname);
    } catch {
      sendJson(res, 400, { ok: false, errors: ['malformed URL'] });
      return;
    }

    if (pathname === '/api/state' && req.method === 'GET') {
      if (cache.state) sendJson(res, 200, { ok: true, state: cache.state });
      else sendJson(res, 200, { ok: false, errors: cache.errors });
      return;
    }

    if (pathname === '/api/refresh' && req.method === 'POST') {
      let lang: string | undefined;
      try {
        const body = await readBody(req);
        if (body) lang = (JSON.parse(body) as { lang?: string }).lang;
      } catch {
        sendJson(res, 400, { ok: false, errors: ['invalid request body'] });
        return;
      }
      try {
        const next = await refresh(lang);
        cache.state = next;
        cache.errors = [];
        sendJson(res, 200, { ok: true, state: next });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (!cache.state) cache.errors = [message];
        sendJson(res, 200, { ok: false, errors: [message] });
      }
      return;
    }

    if (pathname.startsWith('/api/')) {
      sendJson(res, 404, { ok: false, errors: [`unknown endpoint ${pathname}`] });
      return;
    }

    await serveStatic(pathname, res, distDir);
  }

  return (req, res) => {
    void handle(req, res).catch(() => {
      if (!res.headersSent) sendJson(res, 500, { ok: false, errors: ['internal error'] });
      else res.end();
    });
  };
}
