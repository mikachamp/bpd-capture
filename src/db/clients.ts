import { Platform } from 'react-native';
import { getDb } from './client';
import { webClients } from './webMock';
import type { Client } from '../types/models';

const isWeb = Platform.OS === 'web';

/**
 * The clients table is a plain, unlinked suggestion list for the New Order
 * autocomplete — it does not reference orders.clientName (which stays
 * free-text). Renaming/deleting a client here has no effect on any existing
 * order; it only changes what's offered next time someone types a name.
 */
export async function listClients(): Promise<Client[]> {
  if (isWeb) return webClients.list();
  const db = await getDb();
  return db.getAllAsync<Client>(`SELECT * FROM clients ORDER BY name ASC`);
}

export async function addClient(rawName: string): Promise<Client> {
  const name = rawName.trim();
  if (isWeb) return webClients.add(name);
  const db = await getDb();
  const now = new Date().toISOString();
  await db.runAsync(`INSERT OR IGNORE INTO clients (name, createdAt) VALUES (?, ?)`, name, now);
  const client = await db.getFirstAsync<Client>(`SELECT * FROM clients WHERE name = ?`, name);
  if (!client) {
    throw new Error('Failed to save client.');
  }
  return client;
}

export async function deleteClient(id: number): Promise<void> {
  if (isWeb) return webClients.remove(id);
  const db = await getDb();
  await db.runAsync(`DELETE FROM clients WHERE id = ?`, id);
}
