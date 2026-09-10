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

CREATE INDEX IF NOT EXISTS idx_media_orderId ON media_items(orderId);
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
