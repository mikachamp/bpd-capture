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

    await db.runAsync(
      `INSERT INTO orders (uuid, ceNumber, status, createdAt, updatedAt, completedAt, dueDate, notes, clientName, projectName) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      DEMO_UUID_PREFIX + seed.ceNumber,
      seed.ceNumber,
      seed.status,
      createdAt,
      updatedAt,
      completedAt,
      dueDate,
      seed.notes ?? null,
      seed.clientName ?? null,
      seed.projectName ?? null
    );
  }
}
