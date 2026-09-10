import { Platform } from 'react-native';
import { Directory, File, Paths } from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library/legacy';
import type { MediaType } from '../types/models';

const GALLERY_ALBUM_NAME = 'BPD Capture';
const isWeb = Platform.OS === 'web';

function getOrdersBaseDirectory(): Directory {
  return new Directory(Paths.document, 'BPD_Capture', 'orders');
}

function getOrderDirectory(ceNumber: string): Directory {
  return new Directory(getOrdersBaseDirectory(), ceNumber);
}

/**
 * Runs on every app launch. This is the "setup" step that would otherwise be
 * done by a desktop installer: Android has no such installer, so the app
 * provisions its own folder tree the first time it starts.
 */
export function ensureBaseDirectoryExists(): void {
  if (isWeb) return;
  const base = getOrdersBaseDirectory();
  if (!base.exists) {
    base.create({ intermediates: true, idempotent: true });
  }
}

function ensureOrderDirectoryExists(ceNumber: string): Directory {
  const dir = getOrderDirectory(ceNumber);
  if (!dir.exists) {
    dir.create({ intermediates: true, idempotent: true });
  }
  return dir;
}

export type SavedMedia = {
  filePath: string;
  fileName: string;
};

/**
 * Moves a just-captured photo/video from the camera's temp cache into the
 * app's own CE-numbered folder, and also drops a backup copy into the
 * device's normal Gallery app so the media survives an app uninstall.
 */
export async function saveCapturedMedia(
  ceNumber: string,
  sourceUri: string,
  type: MediaType
): Promise<SavedMedia> {
  if (isWeb) {
    return { filePath: sourceUri, fileName: `${type}_${Date.now()}` };
  }

  const orderDir = ensureOrderDirectoryExists(ceNumber);
  const extension = type === 'photo' ? 'jpg' : 'mp4';
  const fileName = `${type}_${Date.now()}.${extension}`;
  const destinationFile = new File(orderDir, fileName);

  const sourceFile = new File(sourceUri);
  await sourceFile.copy(destinationFile);

  await saveToGallery(destinationFile.uri).catch((error) => {
    console.warn('Could not save a gallery backup copy:', error);
  });

  return { filePath: destinationFile.uri, fileName };
}

/**
 * Renames a captured file on disk to a new base name, keeping its original
 * extension. Returns the new URI/name so the caller can persist them.
 */
export async function renameMediaFile(currentFilePath: string, newBaseName: string): Promise<SavedMedia> {
  if (isWeb) {
    return { filePath: currentFilePath, fileName: newBaseName };
  }

  const file = new File(currentFilePath);
  const destination = new File(file.parentDirectory, `${newBaseName}${file.extension}`);
  await file.move(destination);
  return { filePath: file.uri, fileName: file.name };
}

export async function deleteMediaFile(filePath: string): Promise<void> {
  if (isWeb) return;
  const file = new File(filePath);
  if (file.exists) {
    file.delete();
  }
}

/** Deletes an order's entire CE-numbered folder (all its photos/videos on disk). */
export async function deleteOrderDirectory(ceNumber: string): Promise<void> {
  if (isWeb) return;
  const dir = getOrderDirectory(ceNumber);
  if (dir.exists) {
    dir.delete();
  }
}

async function saveToGallery(fileUri: string): Promise<void> {
  const permission = await MediaLibrary.requestPermissionsAsync();
  if (permission.status !== 'granted') {
    return;
  }

  const asset = await MediaLibrary.createAssetAsync(fileUri);
  const existingAlbum = await MediaLibrary.getAlbumAsync(GALLERY_ALBUM_NAME);
  if (existingAlbum) {
    await MediaLibrary.addAssetsToAlbumAsync([asset], existingAlbum, false);
  } else {
    await MediaLibrary.createAlbumAsync(GALLERY_ALBUM_NAME, asset, false);
  }
}
