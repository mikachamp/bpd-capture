import { Platform } from 'react-native';
import { Directory, File, Paths } from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library/legacy';
import type { MediaType } from '../types/models';
import { isSafeFolderName } from '../utils/ceNumber';

const GALLERY_ALBUM_NAME = 'BPD Capture';
const isWeb = Platform.OS === 'web';

function getOrdersBaseDirectory(): Directory {
  return new Directory(Paths.document, 'BPD_Capture', 'orders');
}

function getOrderDirectory(ceNumber: string): Directory {
  // Last line of defence: a stored CE number must already be a safe folder name.
  if (!isSafeFolderName(ceNumber)) {
    throw new Error(`Refusing to use "${ceNumber}" as a job folder name.`);
  }
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
 * app's own CE-numbered folder, and (by default) also drops a backup copy
 * into the device's normal Gallery app so the media survives an app
 * uninstall. Pass `backupToGallery: false` for media that's already in the
 * gallery (e.g. picked via "Upload from Gallery") — re-saving a duplicate
 * copy of something already there is what triggers Android's repeated
 * "Allow BPD Capture to modify this photo?" prompt, one per upload.
 */
export async function saveCapturedMedia(
  ceNumber: string,
  sourceUri: string,
  type: MediaType,
  options: { backupToGallery?: boolean } = {}
): Promise<SavedMedia> {
  const { backupToGallery = true } = options;

  if (isWeb) {
    return { filePath: sourceUri, fileName: `${type}_${Date.now()}` };
  }

  const orderDir = ensureOrderDirectoryExists(ceNumber);
  const extension = type === 'photo' ? 'jpg' : 'mp4';
  const fileName = `${type}_${Date.now()}.${extension}`;
  const destinationFile = new File(orderDir, fileName);

  const sourceFile = new File(sourceUri);
  await sourceFile.copy(destinationFile);

  if (backupToGallery) {
    await saveToGallery(destinationFile.uri).catch((error) => {
      console.warn('Could not save a gallery backup copy:', error);
    });
  }

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

/**
 * Renaming a CE number moves its media folder to match — callers must also
 * update every media_items.filePath row for the order (see
 * db/mediaItems.ts's updateMediaFilePathsForOrder) since this only moves the
 * files on disk, not the paths already stored in the database.
 */
export async function renameOrderDirectory(oldCeNumber: string, newCeNumber: string): Promise<void> {
  if (isWeb) return;
  const oldDir = getOrderDirectory(oldCeNumber);
  if (!oldDir.exists) return;
  const newDir = getOrderDirectory(newCeNumber);
  await oldDir.move(newDir);
}

/** Returns false (without throwing) when the user declines gallery access. */
export async function saveToGallery(fileUri: string): Promise<boolean> {
  // Without granular permissions, Android 13+ also prompts for "music and
  // audio" access — alarming for a photo app, and never needed here.
  const permission = await MediaLibrary.requestPermissionsAsync(false, ['photo', 'video']);
  if (permission.status !== 'granted') {
    return false;
  }

  // Write straight into the album. Creating the asset elsewhere and then moving
  // it in counts as modifying another file on Android 11+, which pops an
  // "Allow BPD Capture to modify this photo?" dialog on every single capture.
  const existingAlbum = await MediaLibrary.getAlbumAsync(GALLERY_ALBUM_NAME);
  if (existingAlbum) {
    await MediaLibrary.createAssetAsync(fileUri, existingAlbum);
  } else {
    await MediaLibrary.createAlbumAsync(GALLERY_ALBUM_NAME, undefined, undefined, fileUri);
  }
  return true;
}
