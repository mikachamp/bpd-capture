import { Platform } from 'react-native';
import { getDb } from './client';
import type { Order, OrderItem, OrderStatus, Stage, StageEvent } from '../types/models';
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
  if (isWeb) return webOrders.updateStage(id, stage, completed);
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
  if (isWeb) return webOrders.updateProductionStep(id, step);
  const db = await getDb();
  await db.runAsync(`UPDATE orders SET productionStep = ?, updatedAt = ? WHERE id = ?`, step, new Date().toISOString(), id);
  notifyLocalChange();
}

/** Changes which production steps an order needs (comma-separated keys), restarting at the first. */
export async function updateOrderProductionSteps(id: number, steps: string): Promise<void> {
  if (isWeb) return webOrders.updateProductionSteps(id, steps);
  const db = await getDb();
  await db.runAsync(`UPDATE orders SET productionSteps = ?, productionStep = 0, updatedAt = ? WHERE id = ?`, steps, new Date().toISOString(), id);
  notifyLocalChange();
}

/**
 * Sign-offs and work ticket items travel inside their job's sync record, so any
 * change to them also bumps the order's updatedAt (that is what marks the job
 * for upload).
 */
async function touchOrder(orderId: number, now: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(`UPDATE orders SET updatedAt = ? WHERE id = ?`, now, orderId);
}

/** Records a sign-off or stage change event in the order's audit trail. */
export async function addStageEvent(
  orderId: number,
  stage: Stage,
  step: string | null,
  action: string,
  actor: string,
  notes: string | null = null,
  createdAt?: string
): Promise<StageEvent> {
  const ts = createdAt ?? new Date().toISOString();
  if (isWeb) return webOrders.addStageEvent(orderId, stage, step, action, actor, notes, ts);
  const db = await getDb();
  const res = await db.runAsync(
    `INSERT INTO stage_history (uuid, orderId, stage, step, action, actor, notes, createdAt, updatedAt) VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?, ?, ?, ?, ?)`,
    orderId,
    stage,
    step,
    action,
    actor,
    notes,
    ts,
    ts
  );
  await touchOrder(orderId, new Date().toISOString());
  notifyLocalChange();
  return {
    id: res.lastInsertRowId,
    orderId,
    stage,
    step,
    action,
    actor,
    notes,
    createdAt: ts,
  };
}

/** Returns the chronological stage and sign-off events for an order. */
export async function listStageEventsForOrder(orderId: number): Promise<StageEvent[]> {
  if (isWeb) return webOrders.listStageEvents(orderId);
  const db = await getDb();
  return db.getAllAsync<StageEvent>(
    `SELECT * FROM stage_history WHERE orderId = ? ORDER BY createdAt ASC, id ASC`,
    orderId
  );
}

/** Returns the work ticket checklist items for an order (deleted ones are kept for sync but hidden). */
export async function listOrderItemsForOrder(orderId: number): Promise<OrderItem[]> {
  if (isWeb) return webOrders.listOrderItems(orderId);
  const db = await getDb();
  const rows = await db.getAllAsync<Omit<OrderItem, 'isCompleted'> & { isCompleted: number }>(
    `SELECT * FROM order_items WHERE orderId = ? AND deleted = 0 ORDER BY id ASC`,
    orderId
  );
  return rows.map((r) => ({
    ...r,
    isCompleted: Boolean(r.isCompleted),
  }));
}

/** Pieces done and total across each open order's work ticket, for job lists ("8 of 12"). */
export async function listItemProgress(): Promise<Map<number, { done: number; total: number }>> {
  if (isWeb) return new Map();
  const db = await getDb();
  const rows = await db.getAllAsync<{ orderId: number; done: number; total: number }>(
    `SELECT orderId, SUM(completedQty) AS done, SUM(quantity) AS total FROM order_items WHERE deleted = 0 GROUP BY orderId`
  );
  return new Map(rows.map((r) => [r.orderId, { done: r.done ?? 0, total: r.total ?? 0 }]));
}

/** Adds a single work ticket checklist item to an order. */
export async function addOrderItem(
  orderId: number,
  item: Omit<OrderItem, 'id' | 'orderId' | 'createdAt'>
): Promise<OrderItem> {
  const ts = new Date().toISOString();
  if (isWeb) return webOrders.addOrderItem(orderId, item);
  const db = await getDb();
  const res = await db.runAsync(
    `INSERT INTO order_items (uuid, orderId, description, size, material, process, quantity, completedQty, step, isCompleted, wtNumber, createdAt, updatedAt) VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    orderId,
    item.description,
    item.size,
    item.material,
    item.process,
    item.quantity,
    item.completedQty,
    item.step,
    item.isCompleted ? 1 : 0,
    item.wtNumber,
    ts,
    ts
  );
  await touchOrder(orderId, ts);
  notifyLocalChange();
  return {
    id: res.lastInsertRowId,
    orderId,
    ...item,
    createdAt: ts,
  };
}

/** Toggles an item's completion checkbox. */
export async function toggleOrderItemCompleted(id: number, isCompleted: boolean): Promise<void> {
  if (isWeb) return webOrders.toggleOrderItem(id, isCompleted);
  const db = await getDb();
  const now = new Date().toISOString();
  await db.runAsync(
    `UPDATE order_items SET isCompleted = ?, completedQty = CASE WHEN ? = 1 THEN quantity ELSE completedQty END, updatedAt = ? WHERE id = ?`,
    isCompleted ? 1 : 0,
    isCompleted ? 1 : 0,
    now,
    id
  );
  await db.runAsync(`UPDATE orders SET updatedAt = ? WHERE id = (SELECT orderId FROM order_items WHERE id = ?)`, now, id);
  notifyLocalChange();
}

/** Updates an item's completed count (e.g. 25 of 50 cut). */
export async function updateOrderItemCompletedQty(id: number, completedQty: number): Promise<void> {
  if (isWeb) return webOrders.updateOrderItemQty(id, completedQty);
  const db = await getDb();
  const now = new Date().toISOString();
  await db.runAsync(
    `UPDATE order_items SET completedQty = ?, isCompleted = CASE WHEN ? >= quantity THEN 1 ELSE 0 END, updatedAt = ? WHERE id = ?`,
    completedQty,
    completedQty,
    now,
    id
  );
  await db.runAsync(`UPDATE orders SET updatedAt = ? WHERE id = (SELECT orderId FROM order_items WHERE id = ?)`, now, id);
  notifyLocalChange();
}

/** Deletes a work ticket item (soft delete, so the delete syncs to the other devices). */
export async function deleteOrderItem(id: number): Promise<void> {
  if (isWeb) return webOrders.deleteOrderItem(id);
  const db = await getDb();
  const now = new Date().toISOString();
  await db.runAsync(`UPDATE order_items SET deleted = 1, updatedAt = ? WHERE id = ?`, now, id);
  await db.runAsync(`UPDATE orders SET updatedAt = ? WHERE id = (SELECT orderId FROM order_items WHERE id = ?)`, now, id);
  notifyLocalChange();
}

/** Adds a batch of items from a scanned work ticket. */
export async function addOrderItemsBatch(
  orderId: number,
  items: Array<Omit<OrderItem, 'id' | 'orderId' | 'createdAt'>>
): Promise<OrderItem[]> {
  const result: OrderItem[] = [];
  for (const item of items) {
    const created = await addOrderItem(orderId, item);
    result.push(created);
  }
  return result;
}

/** Puts a job on hold with a reason ("Waiting for parts"), or takes it off hold with null. */
export async function updateOrderHold(id: number, holdReason: string | null): Promise<void> {
  if (isWeb) return;
  const db = await getDb();
  await db.runAsync(`UPDATE orders SET holdReason = ?, updatedAt = ? WHERE id = ?`, holdReason?.trim() || null, new Date().toISOString(), id);
  notifyLocalChange();
}

/** How the order left the workshop, its waybill/tracking number, and the store or site it goes to. */
export async function updateOrderLogistics(
  id: number,
  fields: { dispatchMethod: string | null; waybill: string | null; siteName: string | null }
): Promise<void> {
  if (isWeb) return;
  const db = await getDb();
  await db.runAsync(
    `UPDATE orders SET dispatchMethod = ?, waybill = ?, siteName = ?, updatedAt = ? WHERE id = ?`,
    fields.dispatchMethod?.trim() || null,
    fields.waybill?.trim() || null,
    fields.siteName?.trim() || null,
    new Date().toISOString(),
    id
  );
  notifyLocalChange();
}
