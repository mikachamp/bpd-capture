import type { SQLiteDatabase } from 'expo-sqlite';
import { DEMO_UUID_PREFIX } from '../sync/paths';

/**
 * Records GitHub paths to delete on the next sync. A path ending in "/" or
 * "." stands for every remote path starting with it (a whole job's media
 * folder, or one photo's binary + sidecar). Demo records never synced, so
 * deleting them leaves nothing to clean up remotely.
 */
export async function addTombstones(db: SQLiteDatabase, recordUuid: string | null, paths: string[]): Promise<void> {
  if (!recordUuid || recordUuid.startsWith(DEMO_UUID_PREFIX)) return;
  const now = new Date().toISOString();
  for (const path of paths) {
    await db.runAsync(`INSERT OR REPLACE INTO sync_tombstones (path, deletedAt) VALUES (?, ?)`, path, now);
  }
}
