import { Platform } from 'react-native';
import { getDb } from './client';
import type { MediaItem, MediaType, PhotoSide, Stage } from '../types/models';
import { webMedia } from './webMock';
import { addTombstones } from './tombstones';
import { notifyLocalChange } from '../sync/changes';
import { mediaPrefix } from '../sync/paths';

const isWeb = Platform.OS === 'web';

export async function addMediaItem(
  orderId: number,
  type: MediaType,
  filePath: string,
  fileName: string,
  stage: Stage = 0,
  side: PhotoSide | null = null,
  step: string | null = null
): Promise<MediaItem> {
  if (isWeb) return webMedia.add(orderId, type, filePath, fileName);

  const db = await getDb();
  const now = new Date().toISOString();
  const result = await db.runAsync(
    `INSERT INTO media_items (uuid, orderId, type, filePath, fileName, createdAt, updatedAt, stage, side, step) VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    orderId,
    type,
    filePath,
    fileName,
    now,
    now,
    stage,
    side,
    step
  );
  const item = await db.getFirstAsync<MediaItem>(
    `SELECT * FROM media_items WHERE id = ?`,
    result.lastInsertRowId
  );
  if (!item) {
    throw new Error('Failed to save media item.');
  }
  notifyLocalChange();
  return item;
}

export async function listMediaForOrder(orderId: number): Promise<MediaItem[]> {
  if (isWeb) return webMedia.listForOrder(orderId);
  const db = await getDb();
  return db.getAllAsync<MediaItem>(
    `SELECT * FROM media_items WHERE orderId = ? ORDER BY createdAt ASC`,
    orderId
  );
}

export async function renameMediaItem(id: number, fileName: string, filePath: string): Promise<void> {
  if (isWeb) return webMedia.rename(id, fileName, filePath);
  const db = await getDb();
  const now = new Date().toISOString();
  await db.runAsync(`UPDATE media_items SET fileName = ?, filePath = ?, updatedAt = ? WHERE id = ?`, fileName, filePath, now, id);
  notifyLocalChange();
}

export async function deleteMediaItem(id: number): Promise<void> {
  if (isWeb) return webMedia.remove(id);
  const db = await getDb();
  const row = await db.getFirstAsync<{ uuid: string | null; orderUuid: string | null }>(
    `SELECT mi.uuid AS uuid, o.uuid AS orderUuid FROM media_items mi JOIN orders o ON o.id = mi.orderId WHERE mi.id = ?`,
    id
  );
  await db.withTransactionAsync(async () => {
    if (row?.uuid && row.orderUuid) await addTombstones(db, row.orderUuid, [mediaPrefix(row.orderUuid, row.uuid)]);
    await db.runAsync(`DELETE FROM media_items WHERE id = ?`, id);
  });
  notifyLocalChange();
}

/**
 * Renaming a CE number moves its on-disk media folder (see
 * services/storage.ts's renameOrderDirectory), which leaves every stored
 * filePath pointing at the old, now-nonexistent folder name unless those
 * rows are updated too. Web preview's media paths are picsum URLs/blob
 * URIs, not real folders, so there's nothing to rewrite there.
 */
export async function updateMediaFilePathsForOrder(
  orderId: number,
  oldCeNumber: string,
  newCeNumber: string
): Promise<void> {
  if (isWeb) return;
  const db = await getDb();
  await db.runAsync(
    `UPDATE media_items SET filePath = REPLACE(filePath, ?, ?) WHERE orderId = ?`,
    oldCeNumber,
    newCeNumber,
    orderId
  );
}
