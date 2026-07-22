import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, rmSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHistoryStore } from '../src/commands/gui-history.js';
import type { GuiState } from 'headcore-core';

function state(over: Partial<GuiState> = {}): GuiState {
  return {
    site: 's', language: 'en', fetchedAt: '2026-07-21T10:00:00.000Z',
    routes: [], registry: [], dictionary: [], ...over,
  };
}

const tmpDirs: string[] = [];
afterEach(() => {
  for (const d of tmpDirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

function newDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'headcore-history-'));
  tmpDirs.push(dir);
  return dir;
}

describe('createHistoryStore', () => {
  it('saves a snapshot and lists newest first', async () => {
    const store = createHistoryStore(newDir());
    await store.save(state({ fetchedAt: '2026-07-20T10:00:00.000Z' }));
    await store.save(state({ fetchedAt: '2026-07-21T10:00:00.000Z', dictionary: [{ key: 'k', value: 'v' }] }));

    const list = await store.list();
    expect(list).toHaveLength(2);
    expect(list[0].fetchedAt).toBe('2026-07-21T10:00:00.000Z');
    expect(list[0].dictionaryEntries).toBe(1);
    expect(list[1].fetchedAt).toBe('2026-07-20T10:00:00.000Z');
  });

  it('loads the exact stored state by id', async () => {
    const store = createHistoryStore(newDir());
    const s = state({ dictionary: [{ key: 'k', value: 'v' }] });
    const meta = await store.save(s);
    expect(meta).not.toBeNull();
    expect(await store.load(meta!.id)).toEqual(s);
  });

  it('returns null for unknown or path-traversal ids', async () => {
    const store = createHistoryStore(newDir());
    expect(await store.load('nope')).toBeNull();
    expect(await store.load('../secret')).toBeNull();
    expect(await store.load('a/b')).toBeNull();
  });

  it('skips a save identical to the newest snapshot', async () => {
    const store = createHistoryStore(newDir());
    expect(await store.save(state({ fetchedAt: '2026-07-20T10:00:00.000Z' }))).not.toBeNull();
    // Same content, later fetch: dedupe (only fetchedAt differs).
    expect(await store.save(state({ fetchedAt: '2026-07-21T10:00:00.000Z' }))).toBeNull();
    expect(await store.list()).toHaveLength(1);
  });

  it('records a change after an identical fetch was skipped', async () => {
    const store = createHistoryStore(newDir());
    await store.save(state({ fetchedAt: '2026-07-20T10:00:00.000Z' }));
    await store.save(state({ fetchedAt: '2026-07-21T10:00:00.000Z' }));
    const meta = await store.save(state({ fetchedAt: '2026-07-22T10:00:00.000Z', dictionary: [{ key: 'k', value: 'v' }] }));
    expect(meta).not.toBeNull();
    expect(await store.list()).toHaveLength(2);
  });

  it('counts renderings and components in the meta', async () => {
    const store = createHistoryStore(newDir());
    const meta = await store.save(state({
      routes: [{
        routePath: '/', name: 'Home', updatedAt: null, components: ['Hero', 'Tabs'],
        layout: { main: [{ componentName: 'Hero', fields: {}, placeholders: {} }, { componentName: 'Tabs', fields: {}, placeholders: { inner: [{ componentName: 'Tab', fields: {}, placeholders: {} }] } }] },
      }],
    }));
    expect(meta).toMatchObject({ routes: 1, renderings: 3, components: 2 });
  });

  it('prunes the oldest snapshots past the cap', async () => {
    const dir = newDir();
    const store = createHistoryStore(dir);
    for (let i = 0; i < 103; i++) {
      const day = String(1 + (i % 28)).padStart(2, '0');
      const month = String(1 + Math.floor(i / 28)).padStart(2, '0');
      await store.save(state({
        fetchedAt: `2026-${month}-${day}T10:00:00.000Z`,
        dictionary: [{ key: 'k', value: String(i) }],
      }));
    }
    const list = await store.list();
    expect(list).toHaveLength(100);
    // Data files pruned too: 100 snapshots + index.json.
    expect(readdirSync(dir)).toHaveLength(101);
  });
});
