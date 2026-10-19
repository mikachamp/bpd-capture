export const SCHEMA_SQL = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ceNumber TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('in_process','completed')) DEFAULT 'in_process',
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  completedAt TEXT,
  dueDate TEXT,
  notes TEXT,
  clientName TEXT,
  projectName TEXT
);

CREATE TABLE IF NOT EXISTS media_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  orderId INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('photo','video')),
  filePath TEXT NOT NULL,
  fileName TEXT NOT NULL,
  createdAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE IF NOT EXISTS clients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  createdAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS stage_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  orderId INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  stage INTEGER NOT NULL,
  step TEXT,
  action TEXT NOT NULL,
  actor TEXT NOT NULL,
  notes TEXT,
  createdAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  orderId INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  size TEXT,
  material TEXT,
  process TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  completedQty INTEGER NOT NULL DEFAULT 0,
  step TEXT,
  isCompleted INTEGER NOT NULL DEFAULT 0,
  wtNumber TEXT,
  createdAt TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_media_orderId ON media_items(orderId);
CREATE INDEX IF NOT EXISTS idx_stage_history_orderId ON stage_history(orderId);
CREATE INDEX IF NOT EXISTS idx_order_items_orderId ON order_items(orderId);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_completedAt ON orders(completedAt);
CREATE INDEX IF NOT EXISTS idx_orders_dueDate ON orders(dueDate);
CREATE INDEX IF NOT EXISTS idx_orders_clientName ON orders(clientName);
`;

/**
 * CREATE TABLE IF NOT EXISTS never adds columns to a table that already
 * exists on-device, so dueDate needs an explicit migration for installs
 * that ran before this column existed. SQLite has no "ADD COLUMN IF NOT
 * EXISTS", so we just try the ALTER and ignore the "duplicate column"
 * failure when it's already there.
 */
export const MIGRATIONS_SQL: string[] = [
  `ALTER TABLE orders ADD COLUMN dueDate TEXT`,
  `ALTER TABLE orders ADD COLUMN notes TEXT`,
  `ALTER TABLE orders ADD COLUMN clientName TEXT`,
  `ALTER TABLE orders ADD COLUMN projectName TEXT`,
];

/**
 * Schema version 2 — sync support. Gated by PRAGMA user_version (see
 * db/client.ts) so each statement runs exactly once per install.
 * - uuid: the record's id on every device (local integer ids differ per device).
 * - updatedAt: newest edit wins when two devices change the same record.
 * - syncedAt: the updatedAt value last pushed to / pulled from GitHub;
 *   a row is "dirty" when syncedAt is null or older than updatedAt.
 * - sync_tombstones: paths to delete on GitHub for records deleted here
 *   (a trailing "/" or "." means every path starting with it).
 * - sync_remote_index: GitHub's file list as of the last sync, to tell
 *   "deleted on the other device" apart from "never synced".
 */
export const SCHEMA_VERSION = 6;

export const SYNC_MIGRATION_SQL: string[] = [
  `ALTER TABLE orders ADD COLUMN uuid TEXT`,
  `ALTER TABLE orders ADD COLUMN syncedAt TEXT`,
  `ALTER TABLE media_items ADD COLUMN uuid TEXT`,
  `ALTER TABLE media_items ADD COLUMN updatedAt TEXT`,
  `ALTER TABLE media_items ADD COLUMN syncedAt TEXT`,
  `ALTER TABLE clients ADD COLUMN uuid TEXT`,
  `ALTER TABLE clients ADD COLUMN updatedAt TEXT`,
  `ALTER TABLE clients ADD COLUMN syncedAt TEXT`,
  `UPDATE orders SET uuid = lower(hex(randomblob(16))) WHERE uuid IS NULL`,
  `UPDATE media_items SET uuid = lower(hex(randomblob(16))) WHERE uuid IS NULL`,
  `UPDATE media_items SET updatedAt = createdAt WHERE updatedAt IS NULL`,
  `UPDATE clients SET uuid = lower(hex(randomblob(16))) WHERE uuid IS NULL`,
  `UPDATE clients SET updatedAt = createdAt WHERE updatedAt IS NULL`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_uuid ON orders(uuid)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_media_uuid ON media_items(uuid)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_uuid ON clients(uuid)`,
  `CREATE TABLE IF NOT EXISTS sync_tombstones (path TEXT PRIMARY KEY, deletedAt TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS sync_remote_index (path TEXT PRIMARY KEY, blobSha TEXT NOT NULL)`,
];

/**
 * Schema version 3 — order stages (2026-10 redesign). Every CE order moves
 * Sample (0) -> Production (1) -> Packed/Dispatch (2) -> Installed (3); photos are filed
 * under the stage they were taken in, and installation photos are marked
 * before/after. Finished orders (status 'completed') start at Installed.
 */
export const STAGE_MIGRATION_SQL: string[] = [
  `ALTER TABLE orders ADD COLUMN stage INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE media_items ADD COLUMN stage INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE media_items ADD COLUMN side TEXT`,
  `UPDATE orders SET stage = 3 WHERE status = 'completed'`,
  `UPDATE media_items SET stage = (SELECT stage FROM orders WHERE orders.id = media_items.orderId)`,
];

/**
 * Schema version 4 — production steps. Production is split into the steps an
 * order needs (machining = cutting, fabricating, finishing); stage 2 is now
 * shown as "Dispatch" (packed and sent). Photos taken in Production record
 * which step they belong to.
 */
export const STEPS_MIGRATION_SQL: string[] = [
  `ALTER TABLE orders ADD COLUMN productionSteps TEXT NOT NULL DEFAULT 'machining,fabricating,finishing'`,
  `ALTER TABLE orders ADD COLUMN productionStep INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE media_items ADD COLUMN step TEXT`,
];

/**
 * Schema version 5 — stage history and sign-offs. Records who advanced each
 * stage/step and when, plus sign-off notes (e.g., client sample approvals,
 * operator machining logs, installation proofs).
 */
export const STAGE_HISTORY_MIGRATION_SQL: string[] = [
  `CREATE TABLE IF NOT EXISTS stage_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    orderId INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    stage INTEGER NOT NULL,
    step TEXT,
    action TEXT NOT NULL,
    actor TEXT NOT NULL,
    notes TEXT,
    createdAt TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_stage_history_orderId ON stage_history(orderId)`,
];

/**
 * Schema version 6 — job ticket line items and checklist. Records the
 * physical work ticket items, sizes, materials, processes, and quantities
 * with completion checkboxes.
 */
export const ORDER_ITEMS_MIGRATION_SQL: string[] = [
  `CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    orderId INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    size TEXT,
    material TEXT,
    process TEXT,
    quantity INTEGER NOT NULL DEFAULT 1,
    completedQty INTEGER NOT NULL DEFAULT 0,
    step TEXT,
    isCompleted INTEGER NOT NULL DEFAULT 0,
    wtNumber TEXT,
    createdAt TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_order_items_orderId ON order_items(orderId)`,
];

