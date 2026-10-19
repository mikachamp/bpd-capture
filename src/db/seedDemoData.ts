import { format } from 'date-fns';
import { getDb } from './client';
import { listAllCompletedOrders, listInProcessOrders } from './orders';
import { getSetting, setSetting } from './settings';
import { SEED_ORDERS } from './demoData';
import { DEMO_UUID_PREFIX } from '../sync/paths';

function daysAgoIso(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

function daysFromNowDate(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return format(date, 'yyyy-MM-dd');
}

/**
 * Populates the real on-device database with sample CE jobs, but only on a
 * completely empty database — never on top of an app the user has already
 * started using, so a routine update can never duplicate or clutter their
 * real data. Native-only; the web target has its own separate mock dataset
 * (see webMock.ts) that this never touches.
 */
const DEMO_SEEDED_KEY = 'demo_seeded';

export async function seedDemoDataIfEmpty(): Promise<void> {
  // Once per install: an emptied job list must stay empty, not refill with samples.
  if (await getSetting(DEMO_SEEDED_KEY)) return;
  const [inProcess, completed] = await Promise.all([listInProcessOrders(), listAllCompletedOrders()]);
  await setSetting(DEMO_SEEDED_KEY, new Date().toISOString());
  if (inProcess.length > 0 || completed.length > 0) return;

  const db = await getDb();
  for (const seed of SEED_ORDERS) {
    const createdAt = daysAgoIso(seed.createdDaysAgo);
    const completedAt = seed.status === 'completed' ? daysAgoIso(seed.completedDaysAgo ?? 0) : null;
    const updatedAt = completedAt ?? createdAt;
    const dueDate = seed.dueDateOffsetDays == null ? null : daysFromNowDate(seed.dueDateOffsetDays);

    const res = await db.runAsync(
      `INSERT INTO orders (uuid, ceNumber, status, createdAt, updatedAt, completedAt, dueDate, notes, clientName, projectName, stage, productionSteps, productionStep) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      DEMO_UUID_PREFIX + seed.ceNumber,
      seed.ceNumber,
      seed.status,
      createdAt,
      updatedAt,
      completedAt,
      dueDate,
      seed.notes ?? null,
      seed.clientName ?? null,
      seed.projectName ?? null,
      seed.stage ?? (seed.status === 'completed' ? 3 : 0),
      seed.productionSteps ?? 'machining,fabricating,finishing',
      seed.productionStep ?? 0
    );
    const orderId = res.lastInsertRowId;
    if (seed.ceNumber === 'CE-2026-0142') {
      await db.runAsync(
        `INSERT INTO stage_history (orderId, stage, step, action, actor, notes, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        orderId, 0, null, 'Sample approved', 'Asics (Client)', 'Approved white PETG sample', daysAgoIso(7)
      );
      await db.runAsync(
        `INSERT INTO stage_history (orderId, stage, step, action, actor, notes, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        orderId, 1, 'machining', 'Machining completed', 'Thabo', '3D printed 12 plinths, dimensions checked', daysAgoIso(3)
      );
      await db.runAsync(
        `INSERT INTO order_items (orderId, description, size, material, process, quantity, completedQty, step, isCompleted, wtNumber, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        orderId, 'Superblast shoe plinth body', '350 x 200 x 50mm', 'White PETG 2mm', 'CNC router cut & line bent', 12, 12, 'machining', 1, '14846', daysAgoIso(7)
      );
      await db.runAsync(
        `INSERT INTO order_items (orderId, description, size, material, process, quantity, completedQty, step, isCompleted, wtNumber, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        orderId, 'Base plate', '360 x 210mm', 'Clear Cast Acrylic 5mm', 'Laser cut & flame polished', 12, 6, 'fabricating', 0, '14847', daysAgoIso(7)
      );
    } else if (seed.ceNumber === 'CE-2026-0131') {
      await db.runAsync(
        `INSERT INTO stage_history (orderId, stage, step, action, actor, notes, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        orderId, 0, null, 'Sample approved', 'New Balance (Client)', 'Color proof signed off', daysAgoIso(10)
      );
      await db.runAsync(
        `INSERT INTO stage_history (orderId, stage, step, action, actor, notes, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        orderId, 1, 'machining', 'Machining completed', 'Thabo', 'CNC cut acrylic tags', daysAgoIso(6)
      );
      await db.runAsync(
        `INSERT INTO stage_history (orderId, stage, step, action, actor, notes, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        orderId, 1, 'finishing', 'Finishing completed', 'Sizwe', 'Deburred and packaged', daysAgoIso(2)
      );
      await db.runAsync(
        `INSERT INTO order_items (orderId, description, size, material, process, quantity, completedQty, step, isCompleted, wtNumber, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        orderId, 'New Balance Shoe Tags', '80 x 40mm', '3mm White PlexiGlass, White, 300gsm', 'Laser cut & strung', 500, 500, 'machining', 1, '14752', daysAgoIso(10)
      );
    } else if (seed.ceNumber === 'CE-2026-0117') {
      await db.runAsync(
        `INSERT INTO stage_history (orderId, stage, step, action, actor, notes, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        orderId, 0, null, 'Sample approved', 'Versus (Client)', 'Sample approved', daysAgoIso(28)
      );
      await db.runAsync(
        `INSERT INTO stage_history (orderId, stage, step, action, actor, notes, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        orderId, 1, 'machining', 'Machining completed', 'Thabo', 'Cut on laser bed 1', daysAgoIso(20)
      );
      await db.runAsync(
        `INSERT INTO stage_history (orderId, stage, step, action, actor, notes, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        orderId, 1, 'fabricating', 'Fabricating completed', 'Sizwe', 'Assembled display set', daysAgoIso(15)
      );
      await db.runAsync(
        `INSERT INTO stage_history (orderId, stage, step, action, actor, notes, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        orderId, 1, 'finishing', 'Finishing completed', 'Thabo', 'Vinyl applied and QC verified', daysAgoIso(10)
      );
      await db.runAsync(
        `INSERT INTO stage_history (orderId, stage, step, action, actor, notes, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        orderId, 2, null, 'Dispatched', 'Lerato', 'Dispatched with installation team', daysAgoIso(8)
      );
      await db.runAsync(
        `INSERT INTO stage_history (orderId, stage, step, action, actor, notes, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        orderId, 3, null, 'Installed & signed off', 'Thabo & Sipho', 'Installed in flagship store, signed off with store manager', daysAgoIso(6)
      );
    }
  }
}
