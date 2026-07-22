import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { snapshotMeta, type GuiSnapshotMeta, type GuiState } from 'headcore-core';

const MAX_SNAPSHOTS = 100;
const SAFE_ID = /^[A-Za-z0-9_-]+$/;

interface IndexEntry {
  meta: GuiSnapshotMeta;
  hash: string;
}

export interface HistoryStore {
  /** Snapshot summaries, newest first. */
  list(): Promise<GuiSnapshotMeta[]>;
  /** Full stored state, or null for an unknown/invalid id. */
  load(id: string): Promise<GuiState | null>;
  /** Persist a fetch. Returns null when skipped (identical to the newest snapshot). */
  save(state: GuiState): Promise<GuiSnapshotMeta | null>;
}

/** Content identity of a fetch — fetchedAt excluded so an unchanged site dedupes. */
function contentHash(state: GuiState): string {
  const { site, language, routes, registry, dictionary } = state;
  return createHash('sha1')
    .update(JSON.stringify({ site, language, routes, registry, dictionary }))
    .digest('hex');
}

function snapshotId(state: GuiState): string {
  return `${state.fetchedAt.replace(/[:.]/g, '-')}-${state.language.replace(/[^A-Za-z0-9-]/g, '_')}`;
}

/**
 * One JSON file per snapshot plus an index.json of summaries, capped at the
 * newest 100. Consecutive identical fetches are skipped so restarting the GUI
 * does not pile up duplicate snapshots.
 */
export function createHistoryStore(dir: string): HistoryStore {
  const indexPath = join(dir, 'index.json');

  async function readIndex(): Promise<IndexEntry[]> {
    try {
      const parsed = JSON.parse(await readFile(indexPath, 'utf8')) as unknown;
      return Array.isArray(parsed) ? (parsed as IndexEntry[]) : [];
    } catch {
      return [];
    }
  }

  return {
    async list() {
      return (await readIndex())
        .map((e) => e.meta)
        .sort((a, b) => b.fetchedAt.localeCompare(a.fetchedAt));
    },

    async load(id) {
      if (!SAFE_ID.test(id)) return null;
      try {
        return JSON.parse(await readFile(join(dir, `${id}.json`), 'utf8')) as GuiState;
      } catch {
        return null;
      }
    },

    async save(state) {
      const hash = contentHash(state);
      // Index is kept sorted oldest → newest; only the newest entry dedupes,
      // so alternating languages still record each switch.
      const index = await readIndex();
      const latest = index[index.length - 1];
      if (latest !== undefined && latest.hash === hash) return null;
      const id = snapshotId(state);
      if (index.some((e) => e.meta.id === id)) return null;

      const meta = snapshotMeta(state, id);
      await mkdir(dir, { recursive: true });
      await writeFile(join(dir, `${id}.json`), JSON.stringify(state), 'utf8');
      const next = [...index, { meta, hash }].sort((a, b) => a.meta.fetchedAt.localeCompare(b.meta.fetchedAt));
      const pruned = next.slice(-MAX_SNAPSHOTS);
      for (const dropped of next.slice(0, next.length - pruned.length)) {
        await rm(join(dir, `${dropped.meta.id}.json`), { force: true });
      }
      await writeFile(indexPath, JSON.stringify(pruned), 'utf8');
      return meta;
    },
  };
}
