import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, resolve, sep } from 'node:path';
import { spawn } from 'node:child_process';
import {
  loadConfig as defaultLoadConfig,
  EdgeClient,
  assembleGuiState,
  manifestToRegistryEntry,
  type GuiState,
  type HeadcoreConfig,
} from 'headcore-core';
import { resolveCliConfigPath } from '../config-path.js';
import { defaultGuiDistDir } from '../gui-dist-path.js';
import { listComponents } from '../registry.js';

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

export const DEFAULT_PORT = 4646;
const PORT_ATTEMPTS = 10;

function listenOnce(server: Server, port: number): Promise<boolean> {
  return new Promise((resolvePromise, rejectPromise) => {
    const onError = (err: NodeJS.ErrnoException): void => {
      server.removeListener('listening', onListening);
      if (err.code === 'EADDRINUSE') resolvePromise(false);
      else rejectPromise(err);
    };
    const onListening = (): void => {
      server.removeListener('error', onError);
      resolvePromise(true);
    };
    server.once('error', onError);
    server.once('listening', onListening);
    server.listen(port, '127.0.0.1');
  });
}

/** Bind to basePort or the next free port after it (up to 10 attempts). Returns the bound port. */
export async function listenWithRetry(server: Server, basePort: number): Promise<number> {
  for (let port = basePort; port < basePort + PORT_ATTEMPTS; port++) {
    if (await listenOnce(server, port)) {
      const address = server.address();
      if (address === null || typeof address === 'string') throw new Error('server has no bound port');
      return address.port;
    }
  }
  throw new Error(
    `ports ${basePort}-${basePort + PORT_ATTEMPTS - 1} are all in use; pass --port to pick another`,
  );
}

export function defaultOpenBrowser(url: string): void {
  if (process.platform === 'win32') spawn('cmd', ['/c', 'start', '', url], { stdio: 'ignore', detached: true }).unref();
  else if (process.platform === 'darwin') spawn('open', [url], { stdio: 'ignore', detached: true }).unref();
  else spawn('xdg-open', [url], { stdio: 'ignore', detached: true }).unref();
}

export function defaultFetchState(config: HeadcoreConfig, lang: string): Promise<GuiState> {
  const client = new EdgeClient(config.edge);
  return assembleGuiState({
    site: config.edge.site,
    language: lang,
    routes: () => client.getRoutesDetailed(lang),
    dictionaryCount: () => client.getDictionary(lang).then((entries) => entries.length),
    registry: listComponents().map(manifestToRegistryEntry),
  });
}

export interface GuiDeps {
  loadConfig: typeof defaultLoadConfig;
  fetchState: (config: HeadcoreConfig, lang: string) => Promise<GuiState>;
  openBrowser: (url: string) => void;
  distDir: string;
  /** Base port override for tests (0 = OS-assigned). */
  basePort: number;
}

export interface GuiInput {
  lang: string | undefined;
  port: number | undefined;
  noOpen: boolean;
}

export interface GuiResult {
  server: Server;
  url: string;
  port: number;
  initialErrors: string[];
}

export async function runGui(input: GuiInput, deps?: Partial<GuiDeps>): Promise<GuiResult> {
  const loadConfig = deps?.loadConfig ?? defaultLoadConfig;
  const config = await loadConfig(resolveCliConfigPath());
  const fetchState = deps?.fetchState ?? defaultFetchState;

  let currentLang = input.lang ?? config.edge.defaultLanguage;
  const refresh: GuiRefresh = async (lang) => {
    const next = lang ?? currentLang;
    const state = await fetchState(config, next);
    currentLang = next;
    return state;
  };

  const cache: GuiCache = { state: null, errors: [] };
  const initialErrors: string[] = [];
  try {
    cache.state = await refresh();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    cache.errors = [message];
    initialErrors.push(message);
  }

  const server = createServer(createGuiHandler(cache, refresh, deps?.distDir ?? defaultGuiDistDir()));
  const port = await listenWithRetry(server, input.port ?? deps?.basePort ?? DEFAULT_PORT);
  const url = `http://127.0.0.1:${port}`;
  if (!input.noOpen) (deps?.openBrowser ?? defaultOpenBrowser)(url);
  return { server, url, port, initialErrors };
}
