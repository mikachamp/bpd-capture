import { Platform } from 'react-native';
import { getDb } from './client';
import type { Order, OrderStatus, Stage } from '../types/models';
import { assertValidCeNumber, normalizeCeNumber } from '../utils/ceNumber';
import { DuplicateCeNumberErrorWeb, webOrders } from './webMock';
import { addTombstones } from './tombstones';
import { notifyLocalChange } from '../sync/changes';
import { jobMediaPrefix, jobPath } from '../sync/paths';

const isWeb = Platform.OS === 'web';

/**
 * Every query that returns Order rows selects this instead of a plain `*`,
 * so `order.coverImage` (the first photo captured for the job, used by
 * OrderListItem's thumbnail) is populated consistently everywhere an Order
 * can end up rendered — not just on the two screens a first pass might
 * think of. Missing one of these means a job with photos shows its
 * thumbnail on some screens and an initials fallback on others, for no
 * reason a user could explain.
 */
const ORDER_COLUMNS = `orders.*, (
  SELECT filePath FROM media_items mi
  WHERE mi.orderId = orders.id AND mi.type = 'photo'
  ORDER BY mi.createdAt ASC LIMIT 1
) AS coverImage`;

export class DuplicateCeNumberError extends Error {
  constructor(public ceNumber: string) {
    super(`An order for CE number "${ceNumber}" already exists.`);
    this.name = 'DuplicateCeNumberError';
  }
}

export type CreateOrderInput = {
  ceNumber: string;
  dueDate?: string | null;
  clientName?: string | null;
  projectName?: string | null;
  /** Comma-separated production steps; defaults to all three. */
  productionSteps?: string;
};

export async function createOrder(input: CreateOrderInput): Promise<Order> {
  const ceNumber = assertValidCeNumber(input.ceNumber);
  const dueDate = input.dueDate ?? null;
  const clientName = input.clientName?.trim() || null;
  const projectName = input.projectName?.trim() || null;

  if (isWeb) {
    try {
      return await webOrders.create(ceNumber, dueDate, clientName, projectName);
    } catch (error) {
      if (error instanceof DuplicateCeNumberErrorWeb) {
        throw new DuplicateCeNumberError(ceNumber);
      }
      throw error;
    }
  }

  const existing = await getOrderByCe(ceNumber);
  if (existing) {
    throw new DuplicateCeNumberError(ceNumber);
  }

  const db = await getDb();
  const now = new Date().toISOString();
  const result = await db.runAsync(
    `INSERT INTO orders (uuid, ceNumber, status, createdAt, updatedAt, completedAt, dueDate, clientName, projectName, productionSteps) VALUES (lower(hex(randomblob(16))), ?, 'in_process', ?, ?, NULL, ?, ?, ?, ?)`,
    ceNumber,
    now,
    now,
    dueDate,
    clientName,
    projectName,
    input.productionSteps ?? 'machining,fabricating,finishing'
  );
  const order = await getOrderById(result.lastInsertRowId);
  if (!order) {
    throw new Error('Failed to create order.');
  }
  notifyLocalChange();
  return order;
}

export async function updateOrderCeNumber(id: number, rawCeNumber: string): Promise<Order> {
  const ceNumber = assertValidCeNumber(rawCeNumber);

  if (isWeb) {
    try {
      return await webOrders.updateCeNumber(id, ceNumber);
    } catch (error) {
      if (error instanceof DuplicateCeNumberErrorWeb) {
        throw new DuplicateCeNumberError(ceNumber);
      }
      throw error;
    }
  }

  const existing = await getOrderByCe(ceNumber);
  if (existing && existing.id !== id) {
    throw new DuplicateCeNumberError(ceNumber);
  }

  const db = await getDb();
  const now = new Date().toISOString();
  await db.runAsync(`UPDATE orders SET ceNumber = ?, updatedAt = ? WHERE id = ?`, ceNumber, now, id);
  notifyLocalChange();
  const order = await getOrderById(id);
  if (!order) {
    throw new Error('Failed to update CE number.');
  }
  return order;
}

export async function updateOrderDueDate(id: number, dueDate: string | null): Promise<void> {
  if (isWeb) return webOrders.updateDueDate(id, dueDate);
  const db = await getDb();
  const now = new Date().toISOString();
  await db.runAsync(`UPDATE orders SET dueDate = ?, updatedAt = ? WHERE id = ?`, dueDate, now, id);
  notifyLocalChange();
}

export async function updateOrderNotes(id: number, notes: string | null): Promise<void> {
  if (isWeb) return webOrders.updateNotes(id, notes);
  const db = await getDb();
  const now = new Date().toISOString();
  await db.runAsync(`UPDATE orders SET notes = ?, updatedAt = ? WHERE id = ?`, notes, now, id);
  notifyLocalChange();
}

export async function updateOrderClientInfo(
  id: number,
  clientName: string | null,
  projectName: string | null
): Promise<void> {
  if (isWeb) return webOrders.updateClientInfo(id, clientName, projectName);
  const db = await getDb();
  const now = new Date().toISOString();
  await db.runAsync(
    `UPDATE orders SET clientName = ?, projectName = ?, updatedAt = ? WHERE id = ?`,
    clientName,
    projectName,
    now,
    id
  );
  notifyLocalChange();
}

/** All orders (any status) that have a due date set, for the calendar screen. */
export async function listOrdersWithDueDate(): Promise<Order[]> {
  if (isWeb) return webOrders.listWithDueDate();
  const db = await getDb();
  return db.getAllAsync<Order>(
    `SELECT ${ORDER_COLUMNS} FROM orders WHERE dueDate IS NOT NULL ORDER BY dueDate ASC`
  );
}

/** Permanently deletes an order and all its media rows (cascades via the FK on media_items). */
export async function deleteOrder(id: number): Promise<void> {
  if (isWeb) return webOrders.remove(id);
  const db = await getDb();
  const row = await db.getFirstAsync<{ uuid: string | null }>(`SELECT uuid FROM orders WHERE id = ?`, id);
  await db.withTransactionAsync(async () => {
    if (row?.uuid) await addTombstones(db, row.uuid, [jobPath(row.uuid), jobMediaPrefix(row.uuid)]);
    await db.runAsync(`DELETE FROM orders WHERE id = ?`, id);
  });
  notifyLocalChange();
}

export async function getOrderById(id: number): Promise<Order | null> {
  if (isWeb) return webOrders.getById(id);
  const db = await getDb();
  return db.getFirstAsync<Order>(`SELECT ${ORDER_COLUMNS} FROM orders WHERE id = ?`, id);
}

export async function getOrderByCe(rawCeNumber: string): Promise<Order | null> {
  const ceNumber = normalizeCeNumber(rawCeNumber);
  if (isWeb) return webOrders.getByCe(ceNumber);
  const db = await getDb();
  return db.getFirstAsync<Order>(`SELECT ${ORDER_COLUMNS} FROM orders WHERE ceNumber = ?`, ceNumber);
}

export async function listInProcessOrders(): Promise<Order[]> {
  if (isWeb) return webOrders.listInProcess();
  const db = await getDb();
  return db.getAllAsync<Order>(
    `SELECT ${ORDER_COLUMNS} FROM orders WHERE status = 'in_process' ORDER BY createdAt DESC`
  );
}

export async function listCompletedOrdersInRange(startIso: string, endIso: string): Promise<Order[]> {
  if (isWeb) return webOrders.listCompletedInRange(startIso, endIso);
  const db = await getDb();
  return db.getAllAsync<Order>(
    `SELECT ${ORDER_COLUMNS} FROM orders WHERE status = 'completed' AND completedAt >= ? AND completedAt < ? ORDER BY completedAt DESC`,
    startIso,
    endIso
  );
}

export async function listAllCompletedOrders(): Promise<Order[]> {
  if (isWeb) return webOrders.listAllCompleted();
  const db = await getDb();
  return db.getAllAsync<Order>(
    `SELECT ${ORDER_COLUMNS} FROM orders WHERE status = 'completed' ORDER BY completedAt DESC`
  );
}

export async function updateOrderStatus(id: number, status: OrderStatus): Promise<void> {
  if (isWeb) return webOrders.updateStatus(id, status);
  const db = await getDb();
  const now = new Date().toISOString();
  const completedAt = status === 'completed' ? now : null;
  await db.runAsync(
    `UPDATE orders SET status = ?, updatedAt = ?, completedAt = ? WHERE id = ?`,
    status,
    now,
    completedAt,
    id
  );
  notifyLocalChange();
}

export async function searchByCe(rawPartial: string): Promise<Order[]> {
  const partial = normalizeCeNumber(rawPartial);
  if (!partial) return [];
  if (isWeb) return webOrders.search(partial);
  const db = await getDb();
  return db.getAllAsync<Order>(
    `SELECT ${ORDER_COLUMNS} FROM orders WHERE ceNumber LIKE ? ORDER BY createdAt DESC LIMIT 25`,
    `%${partial}%`
  );
}

export async function searchByClient(rawPartial: string): Promise<Order[]> {
  const partial = rawPartial.trim();
  if (!partial) return [];
  if (isWeb) return webOrders.searchByClient(partial);
  const db = await getDb();
  return db.getAllAsync<Order>(
    `SELECT ${ORDER_COLUMNS} FROM orders WHERE clientName LIKE ? ORDER BY createdAt DESC LIMIT 25`,
    `%${partial}%`
  );
}

/**
 * Moves an order to another stage. Reaching the end of Installed marks the
 * whole order completed; moving back from completed reopens it.
 */
export async function updateOrderStage(id: number, stage: Stage, completed = false): Promise<void> {
  if (isWeb) return webOrders.updateStatus(id, completed ? 'completed' : 'in_process');
  const db = await getDb();
  const now = new Date().toISOString();
  await db.runAsync(
    `UPDATE orders SET stage = ?, status = ?, completedAt = ?, updatedAt = ? WHERE id = ?`,
    stage,
    completed ? 'completed' : 'in_process',
    completed ? now : null,
    now,
    id
  );
  notifyLocalChange();
}

/** Moves an order to another production step (index into its own step list). */
export async function updateOrderProductionStep(id: number, step: number): Promise<void> {
  if (isWeb) return;
  const db = await getDb();
  await db.runAsync(`UPDATE orders SET productionStep = ?, updatedAt = ? WHERE id = ?`, step, new Date().toISOString(), id);
  notifyLocalChange();
}

/** Changes which production steps an order needs (comma-separated keys), restarting at the first. */
export async function updateOrderProductionSteps(id: number, steps: string): Promise<void> {
  if (isWeb) return;
  const db = await getDb();
  await db.runAsync(`UPDATE orders SET productionSteps = ?, productionStep = 0, updatedAt = ? WHERE id = ?`, steps, new Date().toISOString(), id);
  notifyLocalChange();
}
