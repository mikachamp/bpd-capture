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
