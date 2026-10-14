import { File, Paths } from 'expo-file-system';
import { Video } from 'react-native-compressor';
import { getDb } from '../db/client';
import { getSetting, setSetting } from '../db/settings';
import { deleteMediaFile, deleteOrderDirectory, renameOrderDirectory, writeSyncedMediaFile } from '../services/storage';
import { DEMO_UUID_PREFIX } from './paths';
import type { ClientRecord, JobRecord, LocalStamp, MediaRecord, SyncStore } from './syncCore';

/** GitHub rejects files over 100 MB; base64 is 4/3 of the size. Stay under with room to spare. */
const MAX_UPLOAD_BASE64 = Math.floor(95 * 1024 * 1024 * (4 / 3));


const extensionOf = (path: string) => (path.match(/\.([a-z0-9]+)$/i)?.[1] ?? 'bin').toLowerCase();
const withExtension = (name: string, ext: string) => name.replace(/\.[a-z0-9]+$/i, '') + '.' + ext;

/** Media that sync skipped (too large even after compression), shown in Settings. */
export const skippedUploads: string[] = [];

/**
 * The phone's side of sync: reads and writes the SQLite tables and the job
 * folders directly. Writes made here never call notifyLocalChange(), so
 * applying a pull can't trigger another sync.
 */
export function createMobileStore(): SyncStore {
  // uuid -> local file path for media queued for upload in this sync
  const uploadPaths = new Map<string, string>();

  type Stamp = { updatedAt: string; syncedAt: string | null };

  return {
    async dirtyJobs() {
      const db = await getDb();
      return db.getAllAsync<JobRecord>(
        `SELECT uuid, ceNumber, status, createdAt, updatedAt, completedAt, dueDate, notes, clientName, projectName, stage, productionSteps, productionStep
         FROM orders WHERE uuid NOT LIKE 'demo-%' AND (syncedAt IS NULL OR syncedAt < updatedAt)`
      );
    },
    async dirtyClients() {
      const db = await getDb();
      return db.getAllAsync<ClientRecord>(
        `SELECT uuid, name, createdAt, updatedAt FROM clients WHERE syncedAt IS NULL OR syncedAt < updatedAt`
      );
    },
    async dirtyMedia() {
      const db = await getDb();
      const rows = await db.getAllAsync<{ uuid: string; jobUuid: string; type: 'photo' | 'video'; fileName: string; filePath: string; createdAt: string; updatedAt: string; stage: number; side: 'before' | 'after' | null; step: string | null }>(
        `SELECT mi.uuid AS uuid, o.uuid AS jobUuid, mi.type AS type, mi.fileName AS fileName, mi.filePath AS filePath, mi.createdAt AS createdAt, mi.updatedAt AS updatedAt, mi.stage AS stage, mi.side AS side, mi.step AS step
         FROM media_items mi JOIN orders o ON o.id = mi.orderId
         WHERE o.uuid NOT LIKE 'demo-%' AND (mi.syncedAt IS NULL OR mi.syncedAt < mi.updatedAt)`
      );
      return rows.map((row) => {
        uploadPaths.set(row.uuid, row.filePath);
        // Videos are uploaded as compressed MP4s, so describe them that way.
        const extension = row.type === 'video' ? 'mp4' : extensionOf(row.filePath);
        const fileName = row.type === 'video' ? withExtension(row.fileName || 'video', 'mp4') : row.fileName;
        return { uuid: row.uuid, jobUuid: row.jobUuid, type: row.type, fileName, extension, createdAt: row.createdAt, updatedAt: row.updatedAt, stage: row.stage, side: row.side, step: row.step };
      });
    },
    async tombstones() {
      const db = await getDb();
      return (await db.getAllAsync<{ path: string }>(`SELECT path FROM sync_tombstones`)).map((r) => r.path);
    },
    async clearTombstones(paths) {
      const db = await getDb();
      for (const path of paths) await db.runAsync(`DELETE FROM sync_tombstones WHERE path = ?`, path);
    },

    async jobStamp(uuid): Promise<LocalStamp> {
      const db = await getDb();
      return db.getFirstAsync<Stamp>(`SELECT updatedAt, syncedAt FROM orders WHERE uuid = ?`, uuid);
    },
    async clientStamp(uuid): Promise<LocalStamp> {
      const db = await getDb();
      return db.getFirstAsync<Stamp>(`SELECT updatedAt, syncedAt FROM clients WHERE uuid = ?`, uuid);
    },
    async mediaStamp(uuid): Promise<LocalStamp> {
      const db = await getDb();
      return db.getFirstAsync<Stamp>(`SELECT updatedAt, syncedAt FROM media_items WHERE uuid = ?`, uuid);
    },

    async applyJob(r) {
      const db = await getDb();
      let local = await db.getFirstAsync<{ id: number; ceNumber: string }>(`SELECT id, ceNumber FROM orders WHERE uuid = ?`, r.uuid);
      const isNew = !local;
      // Same CE number created separately on this device and never synced: same job, adopt GitHub's id.
      const sameCe = await db.getFirstAsync<{ id: number; uuid: string; syncedAt: string | null }>(
        `SELECT id, uuid, syncedAt FROM orders WHERE ceNumber = ? AND uuid != ?`,
        r.ceNumber,
        r.uuid
      );
      let ceNumber = r.ceNumber;
      if (sameCe && !local && !sameCe.syncedAt) {
        await db.runAsync(`UPDATE orders SET uuid = ? WHERE id = ?`, r.uuid, sameCe.id);
        local = { id: sameCe.id, ceNumber: r.ceNumber };
      } else if (sameCe) {
        ceNumber = `${r.ceNumber}-2`; // two different jobs with one CE number: keep both, flag the copy
      }

      if (local) {
        if (local.ceNumber !== ceNumber) {
          await renameOrderDirectory(local.ceNumber, ceNumber);
          await db.runAsync(`UPDATE media_items SET filePath = REPLACE(filePath, ?, ?) WHERE orderId = ?`, local.ceNumber, ceNumber, local.id);
        }
        await db.runAsync(
          `UPDATE orders SET ceNumber = ?, status = ?, createdAt = ?, updatedAt = ?, completedAt = ?, dueDate = ?, notes = ?, clientName = ?, projectName = ?, stage = ?, productionSteps = ?, productionStep = ?, syncedAt = ? WHERE id = ?`,
          ceNumber, r.status, r.createdAt, r.updatedAt, r.completedAt, r.dueDate, r.notes, r.clientName, r.projectName, r.stage ?? (r.status === 'completed' ? 3 : 0), r.productionSteps ?? 'machining,fabricating,finishing', r.productionStep ?? 0, r.updatedAt, local.id
        );
      } else {
        await db.runAsync(
          `INSERT INTO orders (uuid, ceNumber, status, createdAt, updatedAt, completedAt, dueDate, notes, clientName, projectName, stage, productionSteps, productionStep, syncedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          r.uuid, ceNumber, r.status, r.createdAt, r.updatedAt, r.completedAt, r.dueDate, r.notes, r.clientName, r.projectName, r.stage ?? (r.status === 'completed' ? 3 : 0), r.productionSteps ?? 'machining,fabricating,finishing', r.productionStep ?? 0, r.updatedAt
        );
      }
      return isNew;
    },

    async applyClient(r) {
      const db = await getDb();
      const byName = await db.getFirstAsync<{ id: number }>(`SELECT id FROM clients WHERE name = ? AND (uuid IS NULL OR uuid != ?)`, r.name, r.uuid);
      if (byName) {
        await db.runAsync(`UPDATE clients SET uuid = ?, updatedAt = ?, syncedAt = ? WHERE id = ?`, r.uuid, r.updatedAt, r.updatedAt, byName.id);
        return;
      }
      await db.runAsync(
        `INSERT INTO clients (uuid, name, createdAt, updatedAt, syncedAt) VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(uuid) DO UPDATE SET name = excluded.name, updatedAt = excluded.updatedAt, syncedAt = excluded.syncedAt`,
        r.uuid, r.name, r.createdAt, r.updatedAt, r.updatedAt
      );
    },

    async applyMedia(r, base64) {
      const db = await getDb();
      const job = await db.getFirstAsync<{ id: number; ceNumber: string }>(`SELECT id, ceNumber FROM orders WHERE uuid = ?`, r.jobUuid);
      if (!job) return;
      const existing = await db.getFirstAsync<{ id: number }>(`SELECT id FROM media_items WHERE uuid = ?`, r.uuid);
      if (existing) {
        await db.runAsync(`UPDATE media_items SET fileName = ?, stage = ?, side = ?, step = ?, updatedAt = ?, syncedAt = ? WHERE id = ?`, r.fileName, r.stage ?? 0, r.side ?? null, r.step ?? null, r.updatedAt, r.updatedAt, existing.id);
        return;
      }
      if (base64 === null) return;
      const filePath = writeSyncedMediaFile(job.ceNumber, r.fileName, r.uuid, base64);
      await db.runAsync(
        `INSERT INTO media_items (uuid, orderId, type, filePath, fileName, createdAt, updatedAt, stage, side, step, syncedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        r.uuid, job.id, r.type, filePath, r.fileName, r.createdAt, r.updatedAt, r.stage ?? 0, r.side ?? null, r.step ?? null, r.updatedAt
      );
    },

    async deleteJobLocal(uuid) {
      const db = await getDb();
      const job = await db.getFirstAsync<{ ceNumber: string }>(`SELECT ceNumber FROM orders WHERE uuid = ?`, uuid);
      if (!job) return;
      await deleteOrderDirectory(job.ceNumber);
      await db.runAsync(`DELETE FROM orders WHERE uuid = ?`, uuid);
    },
    async deleteClientLocal(uuid) {
      const db = await getDb();
      await db.runAsync(`DELETE FROM clients WHERE uuid = ?`, uuid);
    },
    async deleteMediaLocal(uuid) {
      const db = await getDb();
      const item = await db.getFirstAsync<{ filePath: string }>(`SELECT filePath FROM media_items WHERE uuid = ?`, uuid);
      if (!item) return;
      await deleteMediaFile(item.filePath);
      await db.runAsync(`DELETE FROM media_items WHERE uuid = ?`, uuid);
    },

    async readMediaForUpload(record) {
      const path = uploadPaths.get(record.uuid);
      if (!path) return null;
      let source = new File(path);
      if (!source.exists) return null;
      let tempUri: string | null = null;
      if (record.type === 'video') {
        // 720p-class, ~2.5 Mbit/s: roughly 20 MB a minute instead of 100+ MB.
        tempUri = await Video.compress(path, { compressionMethod: 'manual', maxSize: 1280, bitrate: 2_500_000 });
        source = new File(tempUri);
      }
      try {
        const base64 = await source.base64();
        if (base64.length > MAX_UPLOAD_BASE64) {
          skippedUploads.push(record.fileName);
          return null;
        }
        return base64;
      } finally {
        if (tempUri && tempUri !== path) {
          const temp = new File(tempUri);
          if (temp.exists && temp.uri.startsWith(Paths.cache.uri)) temp.delete();
        }
      }
    },

    async markSynced(kind, uuid, updatedAt) {
      const db = await getDb();
      if (kind === 'job') await db.runAsync(`UPDATE orders SET syncedAt = ? WHERE uuid = ?`, updatedAt, uuid);
      else if (kind === 'client') await db.runAsync(`UPDATE clients SET syncedAt = ? WHERE uuid = ?`, updatedAt, uuid);
      else await db.runAsync(`UPDATE media_items SET syncedAt = ? WHERE uuid = ?`, updatedAt, uuid);
    },

    async remoteIndex() {
      const db = await getDb();
      const rows = await db.getAllAsync<{ path: string; blobSha: string }>(`SELECT path, blobSha FROM sync_remote_index`);
      return new Map(rows.map((r) => [r.path, r.blobSha]));
    },
    async saveRemoteIndex(index) {
      const db = await getDb();
      await db.withTransactionAsync(async () => {
        await db.runAsync(`DELETE FROM sync_remote_index`);
        for (const [path, sha] of index) await db.runAsync(`INSERT INTO sync_remote_index (path, blobSha) VALUES (?, ?)`, path, sha);
      });
    },
    getState: (key) => getSetting(key),
    setState: (key, value) => setSetting(key, value),
  };
}

export const isDemoUuid = (uuid: string) => uuid.startsWith(DEMO_UUID_PREFIX);
