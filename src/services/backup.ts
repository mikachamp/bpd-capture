import { Platform } from 'react-native';
import { Directory, File, Paths } from 'expo-file-system';
import {
  isPasswordProtected,
  listContents,
  zip,
  zipWithPassword,
  unzip,
  unzipWithPassword,
} from 'react-native-zip-archive';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { format } from 'date-fns';
import { closeDb } from '../db/client';

const isWeb = Platform.OS === 'web';

const DB_FILE_NAME = 'bpd_capture.db';
const ORDERS_DIR_NAME = 'orders';

function getDbFile(): File {
  return new File(Paths.document, 'SQLite', DB_FILE_NAME);
}

function getOrdersDirectory(): Directory {
  return new Directory(Paths.document, 'BPD_Capture', ORDERS_DIR_NAME);
}

function freshStagingDirectory(name: string): Directory {
  const dir = new Directory(Paths.cache, name);
  if (dir.exists) {
    dir.delete();
  }
  dir.create({ intermediates: true });
  return dir;
}

/**
 * Bundles the SQLite database and every job's photos/videos into a single
 * .zip and opens the share sheet so it can be saved off-device (Drive, USB
 * transfer, etc.) — the only backup path an offline-first, no-server app has.
 * An optional password encrypts the archive (via the same zip library's
 * `zipWithPassword`) — worth using since the unencrypted zip is otherwise
 * plain, readable job data the moment it leaves the device.
 */
export async function exportBackup(password?: string): Promise<void> {
  if (isWeb) {
    throw new Error('Backup export requires on-device file access and only works in the installed app.');
  }

  const staging = freshStagingDirectory('bpd_backup_staging');
  try {
    const dbFile = getDbFile();
    if (dbFile.exists) {
      await dbFile.copy(new File(staging, DB_FILE_NAME));
    }
    const ordersDir = getOrdersDirectory();
    if (ordersDir.exists) {
      await ordersDir.copy(new Directory(staging, ORDERS_DIR_NAME));
    }

    const zipFile = new File(Paths.cache, `bpd-capture-backup-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.zip`);
    if (zipFile.exists) {
      zipFile.delete();
    }
    if (password) {
      await zipWithPassword(staging.uri, zipFile.uri, password);
    } else {
      await zip(staging.uri, zipFile.uri);
    }

    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) {
      throw new Error('Sharing is not available on this device.');
    }
    await Sharing.shareAsync(zipFile.uri, {
      mimeType: 'application/zip',
      dialogTitle: 'Save BPD Capture backup',
    });
  } finally {
    if (staging.exists) {
      staging.delete();
    }
  }
}

/**
 * react-native-zip-archive (and archive extractors generally) have a real,
 * recurring history of "zip-slip" path-traversal bugs — a malicious entry
 * name like `../../../../somewhere/else` can make extraction write outside
 * the intended destination. Restore accepts an arbitrary user-picked file,
 * so it can't assume the archive is trustworthy just because it opens.
 * Checked here via the library's own listing, before any bytes are
 * extracted — not a guarantee the native extractor is itself bug-free, but
 * it rejects the entire well-known attack class up front.
 */
async function assertNoUnsafeZipEntries(source: string): Promise<void> {
  const entries = await listContents(source);
  for (const entry of entries) {
    if (entry.path.startsWith('/') || entry.path.split(/[/\\]/).includes('..')) {
      throw new Error('This backup file contains unsafe file paths and was not restored.');
    }
  }
}

/** Picks a .zip backup file, or returns null if the user cancels. */
export async function pickBackupFile(): Promise<string | null> {
  if (isWeb) {
    throw new Error('Backup restore requires on-device file access and only works in the installed app.');
  }
  const picked = await DocumentPicker.getDocumentAsync({
    type: ['application/zip', 'application/x-zip-compressed'],
    copyToCacheDirectory: true,
  });
  return picked.canceled ? null : picked.assets[0].uri;
}

/** Checks a picked backup file for a password, so the caller only prompts for one when actually needed. */
export async function isBackupPasswordProtected(uri: string): Promise<boolean> {
  if (isWeb) return false;
  return isPasswordProtected(uri);
}

/**
 * Replaces the on-device database and media folder with a previously picked
 * backup's contents. Replaces rather than merges — matches how the export
 * bundles a full point-in-time snapshot, and keeps the restore predictable
 * (no partial-merge surprises).
 */
export async function importBackup(uri: string, password?: string): Promise<void> {
  if (isWeb) {
    throw new Error('Backup restore requires on-device file access and only works in the installed app.');
  }

  const staging = freshStagingDirectory('bpd_restore_staging');
  try {
    await assertNoUnsafeZipEntries(uri);
    if (password) {
      await unzipWithPassword(uri, staging.uri, password);
    } else {
      await unzip(uri, staging.uri);
    }

    const restoredDb = new File(staging, DB_FILE_NAME);
    const restoredOrders = new Directory(staging, ORDERS_DIR_NAME);
    if (!restoredDb.exists) {
      throw new Error("This file doesn't look like a BPD Capture backup (no database found inside).");
    }

    await closeDb();

    const dbFile = getDbFile();
    if (dbFile.exists) {
      dbFile.delete();
    }
    await restoredDb.copy(dbFile);

    const ordersDir = getOrdersDirectory();
    if (ordersDir.exists) {
      ordersDir.delete();
    }
    if (restoredOrders.exists) {
      await restoredOrders.copy(ordersDir);
    }
  } finally {
    if (staging.exists) {
      staging.delete();
    }
  }
}
