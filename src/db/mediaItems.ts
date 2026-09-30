import { Platform } from 'react-native';
import { getDb } from './client';
import type { MediaItem, MediaType } from '../types/models';
import { webMedia } from './webMock';

const isWeb = Platform.OS === 'web';

export async function addMediaItem(
  orderId: number,
  type: MediaType,
  filePath: string,
  fileName: string
): Promise<MediaItem> {
  if (isWeb) return webMedia.add(orderId, type, filePath, fileName);

  const db = await getDb();
  const now = new Date().toISOString();
  const result = await db.runAsync(
    `INSERT INTO media_items (orderId, type, filePath, fileName, createdAt) VALUES (?, ?, ?, ?, ?)`,
    orderId,
    type,
    filePath,
    fileName,
    now
  );
  const item = await db.getFirstAsync<MediaItem>(
    `SELECT * FROM media_items WHERE id = ?`,
    result.lastInsertRowId
  );
  if (!item) {
    throw new Error('Failed to save media item.');
  }
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
  await db.runAsync(`UPDATE media_items SET fileName = ?, filePath = ? WHERE id = ?`, fileName, filePath, id);
}

export async function deleteMediaItem(id: number): Promise<void> {
  if (isWeb) return webMedia.remove(id);
  const db = await getDb();
  await db.runAsync(`DELETE FROM media_items WHERE id = ?`, id);
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
