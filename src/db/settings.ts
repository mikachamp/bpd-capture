import { Platform } from 'react-native';
import { getDb } from './client';

const isWeb = Platform.OS === 'web';

/** In-memory stand-in for web preview — never used on Android, same pattern as webMock.ts. */
const webSettings = new Map<string, string>();

export async function getSetting(key: string): Promise<string | null> {
  if (isWeb) return webSettings.get(key) ?? null;
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string | null }>(`SELECT value FROM settings WHERE key = ?`, key);
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string | null): Promise<void> {
  if (isWeb) {
    if (value === null) {
      webSettings.delete(key);
    } else {
      webSettings.set(key, value);
    }
    return;
  }
  const db = await getDb();
  await db.runAsync(`INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`, key, value);
}

export type DispatcherContact = {
  email: string | null;
};

const DISPATCHER_EMAIL_KEY = 'dispatcherEmail';

export async function getDispatcherContact(): Promise<DispatcherContact> {
  const email = await getSetting(DISPATCHER_EMAIL_KEY);
  return { email };
}

export async function setDispatcherContact(contact: DispatcherContact): Promise<void> {
  await setSetting(DISPATCHER_EMAIL_KEY, contact.email);
}
