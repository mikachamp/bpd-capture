import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';
import { MIGRATIONS_SQL, SCHEMA_SQL, SCHEMA_VERSION, STAGE_MIGRATION_SQL, SYNC_MIGRATION_SQL } from './schema';
import { markExistingDemoRows } from './demoData';

let dbPromise: Promise<SQLiteDatabase> | null = null;

export function getDb(): Promise<SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = openDatabaseAsync('bpd_capture.db');
  }
  return dbPromise;
}

export async function initDatabase(): Promise<void> {
  const db = await getDb();
  await db.execAsync(SCHEMA_SQL);
  for (const migration of MIGRATIONS_SQL) {
    try {
      await db.execAsync(migration);
    } catch {
      // Column/table already present from a prior install — nothing to do.
    }
  }

  const version = (await db.getFirstAsync<{ user_version: number }>(`PRAGMA user_version`))?.user_version ?? 0;
  if (version < 2) {
    await db.withTransactionAsync(async () => {
      for (const statement of SYNC_MIGRATION_SQL) {
        await db.execAsync(statement);
      }
      await markExistingDemoRows(db);
    });
  }
  if (version < 3) {
    await db.withTransactionAsync(async () => {
      for (const statement of STAGE_MIGRATION_SQL) {
        await db.execAsync(statement);
      }
    });
  }
  if (version < SCHEMA_VERSION) await db.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION}`);
}

/**
 * Closes the current connection and clears the cache so the next getDb()
 * reopens from disk. Needed before a backup restore replaces the underlying
 * .db file out from under an already-open connection.
 */
export async function closeDb(): Promise<void> {
  if (!dbPromise) return;
  const db = await dbPromise;
  await db.closeAsync();
  dbPromise = null;
}
