import { Platform } from 'react-native';
import { Camera } from 'expo-camera';
import { initDatabase } from './db/client';
import { seedDemoDataIfEmpty } from './db/seedDemoData';
import { listUnsafeCeNumbers } from './db/orders';
import { ensureBaseDirectoryExists } from './services/storage';

/**
 * Android has no separate installer step, so this runs on every app launch
 * and stands in for it: it provisions the local database and the on-device
 * folder tree before the first screen is shown.
 *
 * On web this is a no-op — SQLite and native folder storage don't exist in
 * a browser, and the web target exists only for previewing the UI during
 * development (see src/db/webMock.ts).
 */
export async function bootstrapApp(): Promise<void> {
  if (Platform.OS === 'web') return;
  await Camera.requestCameraPermissionsAsync().catch(() => {});
  await Camera.requestMicrophonePermissionsAsync().catch(() => {});
  await initDatabase();
  ensureBaseDirectoryExists();
  await seedDemoDataIfEmpty();
  // Jobs saved before CE numbers were validated (security review 2026-10-13):
  // reported, never changed. Their folders are protected by the storage guard.
  const unsafe = await listUnsafeCeNumbers().catch(() => []);
  if (unsafe.length > 0) console.warn(`Jobs with a CE number that can't be a folder name (rename them): ${unsafe.map((c) => JSON.stringify(c)).join(', ')}`);
}
