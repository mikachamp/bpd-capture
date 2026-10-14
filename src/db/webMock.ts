/**
 * BPD Capture is an Android-only app; expo-sqlite and expo-file-system's
 * native folder storage don't run in a browser. This in-memory stand-in
 * exists purely so the UI can be previewed and screenshotted on web during
 * development — it is never used on Android, where the real SQLite-backed
 * repositories in orders.ts/mediaItems.ts are used instead.
 */
import { format } from 'date-fns';
import type { Client, MediaItem, MediaType, Order, OrderStatus } from '../types/models';
import { normalizeCeNumber } from '../utils/ceNumber';

let nextOrderId = 1;
let nextMediaId = 1;
let nextClientId = 1;

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

const orders: Order[] = [
  {
    id: nextOrderId++,
    ceNumber: 'CE-2024-0091',
    status: 'in_process',
    stage: 1,
    productionSteps: 'machining,fabricating,finishing',
    productionStep: 0,
    createdAt: daysAgoIso(1),
    updatedAt: daysAgoIso(1),
    completedAt: null,
    dueDate: daysFromNowDate(2),
    notes: null,
    clientName: 'Marcus Reyes',
    projectName: 'Roof replacement — 14 Ashford Ct',
  },
  {
    id: nextOrderId++,
    ceNumber: 'CE-2024-0088',
    status: 'in_process',
    stage: 1,
    productionSteps: 'machining,fabricating,finishing',
    productionStep: 0,
    createdAt: daysAgoIso(3),
    updatedAt: daysAgoIso(3),
    completedAt: null,
    dueDate: daysFromNowDate(-1),
    notes: 'Waiting on access approval from the site owner before we can finish the inspection.',
    clientName: 'Priya Chandran',
    projectName: 'Storm damage inspection',
  },
  {
    id: nextOrderId++,
    ceNumber: 'CE-2024-0075',
    status: 'completed',
    stage: 3,
    productionSteps: 'machining,fabricating,finishing',
    productionStep: 0,
    createdAt: daysAgoIso(10),
    updatedAt: daysAgoIso(2),
    completedAt: daysAgoIso(2),
    dueDate: daysFromNowDate(-5),
    notes: 'Delayed a few days — site was inaccessible during last week\'s storm.',
    clientName: 'Marcus Reyes',
    projectName: 'Fence line survey',
  },
  {
    id: nextOrderId++,
    ceNumber: 'CE-2024-0060',
    status: 'completed',
    stage: 3,
    productionSteps: 'machining,fabricating,finishing',
    productionStep: 0,
    createdAt: daysAgoIso(40),
    updatedAt: daysAgoIso(35),
    completedAt: daysAgoIso(35),
    dueDate: daysFromNowDate(-30),
    notes: null,
    clientName: 'Dana Whitfield',
    projectName: 'Pre-purchase inspection',
  },
  {
    id: nextOrderId++,
    ceNumber: 'CE-2023-0512',
    status: 'completed',
    stage: 3,
    productionSteps: 'machining,fabricating,finishing',
    productionStep: 0,
    createdAt: daysAgoIso(220),
    updatedAt: daysAgoIso(210),
    completedAt: daysAgoIso(210),
    dueDate: null,
    notes: null,
    clientName: null,
    projectName: null,
  },
  {
    id: nextOrderId++,
    ceNumber: 'CE-2024-0102',
    status: 'in_process',
    stage: 1,
    productionSteps: 'machining,fabricating,finishing',
    productionStep: 0,
    createdAt: daysAgoIso(5),
    updatedAt: daysAgoIso(5),
    completedAt: null,
    dueDate: daysFromNowDate(9),
    notes: null,
    clientName: 'Priya Chandran',
    projectName: 'Deck rebuild',
  },
  {
    id: nextOrderId++,
    ceNumber: 'CE-2024-0110',
    status: 'in_process',
    stage: 1,
    productionSteps: 'machining,fabricating,finishing',
    productionStep: 0,
    createdAt: daysAgoIso(2),
    updatedAt: daysAgoIso(2),
    completedAt: null,
    dueDate: daysFromNowDate(4),
    notes: null,
    clientName: 'Wei Zhang',
    projectName: 'Kitchen remodel rough-in',
  },
  {
    id: nextOrderId++,
    ceNumber: 'CE-2024-0111',
    status: 'in_process',
    stage: 1,
    productionSteps: 'machining,fabricating,finishing',
    productionStep: 0,
    createdAt: daysAgoIso(4),
    updatedAt: daysAgoIso(4),
    completedAt: null,
    dueDate: daysFromNowDate(1),
    notes: 'Framing crew is running about a day behind schedule.',
    clientName: 'Aaliyah Brooks',
    projectName: 'New construction framing',
  },
  {
    id: nextOrderId++,
    ceNumber: 'CE-2024-0095',
    status: 'in_process',
    stage: 1,
    productionSteps: 'machining,fabricating,finishing',
    productionStep: 0,
    createdAt: daysAgoIso(6),
    updatedAt: daysAgoIso(6),
    completedAt: null,
    dueDate: null,
    notes: null,
    clientName: 'Wei Zhang',
    projectName: 'Bathroom addition',
  },
  {
    id: nextOrderId++,
    ceNumber: 'CE-2024-0079',
    status: 'completed',
    stage: 3,
    productionSteps: 'machining,fabricating,finishing',
    productionStep: 0,
    createdAt: daysAgoIso(20),
    updatedAt: daysAgoIso(10),
    completedAt: daysAgoIso(10),
    dueDate: daysFromNowDate(-12),
    notes: 'Material delivery was delayed by the supplier.',
    clientName: 'Tom Garrity',
    projectName: 'Siding replacement',
  },
  {
    id: nextOrderId++,
    ceNumber: 'CE-2024-0083',
    status: 'completed',
    stage: 3,
    productionSteps: 'machining,fabricating,finishing',
    productionStep: 0,
    createdAt: daysAgoIso(30),
    updatedAt: daysAgoIso(22),
    completedAt: daysAgoIso(22),
    dueDate: daysFromNowDate(-20),
    notes: null,
    clientName: 'Aaliyah Brooks',
    projectName: 'Window replacement',
  },
  {
    id: nextOrderId++,
    ceNumber: 'CE-2024-0067',
    status: 'completed',
    stage: 3,
    productionSteps: 'machining,fabricating,finishing',
    productionStep: 0,
    createdAt: daysAgoIso(50),
    updatedAt: daysAgoIso(45),
    completedAt: daysAgoIso(45),
    dueDate: null,
    notes: null,
    clientName: 'Dana Whitfield',
    projectName: 'Gutter install',
  },
  {
    id: nextOrderId++,
    ceNumber: 'CE-2024-0055',
    status: 'completed',
    stage: 3,
    productionSteps: 'machining,fabricating,finishing',
    productionStep: 0,
    createdAt: daysAgoIso(60),
    updatedAt: daysAgoIso(49),
    completedAt: daysAgoIso(49),
    dueDate: daysFromNowDate(-50),
    notes: null,
    clientName: 'Tom Garrity',
    projectName: 'Retaining wall inspection',
  },
  {
    id: nextOrderId++,
    ceNumber: 'CE-2023-0498',
    status: 'completed',
    stage: 3,
    productionSteps: 'machining,fabricating,finishing',
    productionStep: 0,
    createdAt: daysAgoIso(240),
    updatedAt: daysAgoIso(230),
    completedAt: daysAgoIso(230),
    dueDate: null,
    notes: null,
    clientName: 'Wei Zhang',
    projectName: 'Foundation crack repair',
  },
  {
    id: nextOrderId++,
    ceNumber: 'CE-2024-0120',
    status: 'in_process',
    stage: 1,
    productionSteps: 'machining,fabricating,finishing',
    productionStep: 0,
    createdAt: daysAgoIso(1),
    updatedAt: daysAgoIso(1),
    completedAt: null,
    dueDate: daysFromNowDate(14),
    notes: null,
    clientName: 'Nadia Ferreira',
    projectName: 'Solar panel pre-install survey',
  },
  {
    id: nextOrderId++,
    ceNumber: 'CE-2024-0121',
    status: 'in_process',
    stage: 1,
    productionSteps: 'machining,fabricating,finishing',
    productionStep: 0,
    createdAt: daysAgoIso(8),
    updatedAt: daysAgoIso(8),
    completedAt: null,
    dueDate: null,
    notes: 'Waiting on utility interconnection approval before final QC.',
    clientName: 'Nadia Ferreira',
    projectName: 'Solar panel post-install QC',
  },
  {
    id: nextOrderId++,
    ceNumber: 'CE-2024-0045',
    status: 'completed',
    stage: 3,
    productionSteps: 'machining,fabricating,finishing',
    productionStep: 0,
    createdAt: daysAgoIso(80),
    updatedAt: daysAgoIso(68),
    completedAt: daysAgoIso(68),
    dueDate: daysFromNowDate(-70),
    notes: null,
    clientName: 'Marcus Reyes',
    projectName: 'Driveway pour inspection',
  },
  {
    id: nextOrderId++,
    ceNumber: 'CE-2024-0132',
    status: 'in_process',
    stage: 1,
    productionSteps: 'machining,fabricating,finishing',
    productionStep: 0,
    createdAt: daysAgoIso(7),
    updatedAt: daysAgoIso(7),
    completedAt: null,
    dueDate: daysFromNowDate(-3),
    notes: 'Homeowner has rescheduled access twice.',
    clientName: 'Tom Garrity',
    projectName: 'Pool deck inspection',
  },
  {
    id: nextOrderId++,
    ceNumber: 'CE-2023-0455',
    status: 'completed',
    stage: 3,
    productionSteps: 'machining,fabricating,finishing',
    productionStep: 0,
    createdAt: daysAgoIso(215),
    updatedAt: daysAgoIso(205),
    completedAt: daysAgoIso(205),
    dueDate: daysFromNowDate(-200),
    notes: null,
    clientName: 'Dana Whitfield',
    projectName: 'Chimney inspection',
  },
  {
    id: nextOrderId++,
    ceNumber: 'CE-2024-0140',
    status: 'in_process',
    stage: 1,
    productionSteps: 'machining,fabricating,finishing',
    productionStep: 0,
    createdAt: daysAgoIso(3),
    updatedAt: daysAgoIso(3),
    completedAt: null,
    dueDate: daysFromNowDate(21),
    notes: null,
    clientName: 'Aaliyah Brooks',
    projectName: 'Garage conversion',
  },
];

const mediaItems: MediaItem[] = [
  {
    id: nextMediaId++,
    orderId: 3,
    type: 'photo',
    stage: 1,
    side: null,
    step: null,
    filePath: 'https://picsum.photos/seed/bpd1/400',
    fileName: 'photo_1.jpg',
    createdAt: daysAgoIso(2),
  },
  {
    id: nextMediaId++,
    orderId: 3,
    type: 'photo',
    stage: 1,
    side: null,
    step: null,
    filePath: 'https://picsum.photos/seed/bpd2/400',
    fileName: 'photo_2.jpg',
    createdAt: daysAgoIso(2),
  },
  {
    id: nextMediaId++,
    orderId: 3,
    type: 'video',
    stage: 1,
    side: null,
    step: null,
    filePath: '',
    fileName: 'video_1.mp4',
    createdAt: daysAgoIso(2),
  },
];

function coverImageFor(orderId: number): string | null {
  const photos = mediaItems
    .filter((m) => m.orderId === orderId && m.type === 'photo')
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return photos[0]?.filePath ?? null;
}

/** Mirrors the real ORDER_COLUMNS subquery in db/orders.ts so web preview shows the same thumbnails/fallbacks. */
function withCoverImage(order: Order): Order {
  return { ...order, coverImage: coverImageFor(order.id) };
}

function withCoverImages(list: Order[]): Order[] {
  return list.map(withCoverImage);
}

const clients: Client[] = [
  'Marcus Reyes',
  'Priya Chandran',
  'Dana Whitfield',
  'Wei Zhang',
  'Tom Garrity',
  'Aaliyah Brooks',
  'Nadia Ferreira',
].map((name) => ({ id: nextClientId++, name, createdAt: daysAgoIso(60) }));

export const webClients = {
  async list(): Promise<Client[]> {
    return [...clients].sort((a, b) => a.name.localeCompare(b.name));
  },
  async add(name: string): Promise<Client> {
    const existing = clients.find((c) => c.name.toLowerCase() === name.toLowerCase());
    if (existing) return existing;
    const client: Client = { id: nextClientId++, name, createdAt: new Date().toISOString() };
    clients.push(client);
    return client;
  },
  async remove(id: number): Promise<void> {
    const index = clients.findIndex((c) => c.id === id);
    if (index !== -1) clients.splice(index, 1);
  },
};

export class DuplicateCeNumberErrorWeb extends Error {}

export const webOrders = {
  async create(
    rawCeNumber: string,
    dueDate: string | null = null,
    clientName: string | null = null,
    projectName: string | null = null
  ): Promise<Order> {
    const ceNumber = normalizeCeNumber(rawCeNumber);
    if (orders.some((o) => o.ceNumber === ceNumber)) {
      throw new DuplicateCeNumberErrorWeb(ceNumber);
    }
    const now = new Date().toISOString();
    const order: Order = {
      id: nextOrderId++,
      ceNumber,
      status: 'in_process',
      stage: 0,
      productionSteps: 'machining,fabricating,finishing',
      productionStep: 0,
      createdAt: now,
      updatedAt: now,
      completedAt: null,
      dueDate,
      notes: null,
      clientName,
      projectName,
    };
    orders.unshift(order);
    return withCoverImage(order);
  },
  async updateCeNumber(id: number, ceNumber: string): Promise<Order> {
    const conflict = orders.find((o) => o.ceNumber === ceNumber && o.id !== id);
    if (conflict) {
      throw new DuplicateCeNumberErrorWeb(ceNumber);
    }
    const order = orders.find((o) => o.id === id);
    if (!order) {
      throw new Error('Order not found.');
    }
    order.ceNumber = ceNumber;
    order.updatedAt = new Date().toISOString();
    return withCoverImage(order);
  },
  async updateDueDate(id: number, dueDate: string | null): Promise<void> {
    const order = orders.find((o) => o.id === id);
    if (!order) return;
    order.dueDate = dueDate;
    order.updatedAt = new Date().toISOString();
  },
  async updateNotes(id: number, notes: string | null): Promise<void> {
    const order = orders.find((o) => o.id === id);
    if (!order) return;
    order.notes = notes;
    order.updatedAt = new Date().toISOString();
  },
  async updateClientInfo(id: number, clientName: string | null, projectName: string | null): Promise<void> {
    const order = orders.find((o) => o.id === id);
    if (!order) return;
    order.clientName = clientName;
    order.projectName = projectName;
    order.updatedAt = new Date().toISOString();
  },
  async listWithDueDate(): Promise<Order[]> {
    return withCoverImages(
      orders
        .filter((o) => o.dueDate !== null)
        .sort((a, b) => (a.dueDate as string).localeCompare(b.dueDate as string))
    );
  },
  async getById(id: number): Promise<Order | null> {
    const order = orders.find((o) => o.id === id);
    return order ? withCoverImage(order) : null;
  },
  async getByCe(rawCeNumber: string): Promise<Order | null> {
    const ceNumber = normalizeCeNumber(rawCeNumber);
    const order = orders.find((o) => o.ceNumber === ceNumber);
    return order ? withCoverImage(order) : null;
  },
  async listInProcess(): Promise<Order[]> {
    return withCoverImages(
      orders.filter((o) => o.status === 'in_process').sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    );
  },
  async listCompletedInRange(startIso: string, endIso: string): Promise<Order[]> {
    return withCoverImages(
      orders.filter((o) => o.status === 'completed' && o.completedAt && o.completedAt >= startIso && o.completedAt < endIso)
    );
  },
  async listAllCompleted(): Promise<Order[]> {
    return withCoverImages(
      orders.filter((o) => o.status === 'completed').sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''))
    );
  },
  async updateStatus(id: number, status: OrderStatus): Promise<void> {
    const order = orders.find((o) => o.id === id);
    if (!order) return;
    order.status = status;
    order.updatedAt = new Date().toISOString();
    order.completedAt = status === 'completed' ? new Date().toISOString() : null;
  },
  async search(rawPartial: string): Promise<Order[]> {
    const partial = normalizeCeNumber(rawPartial);
    if (!partial) return [];
    return withCoverImages(orders.filter((o) => o.ceNumber.includes(partial)).slice(0, 25));
  },
  async searchByClient(rawPartial: string): Promise<Order[]> {
    const partial = rawPartial.trim().toLowerCase();
    if (!partial) return [];
    return withCoverImages(orders.filter((o) => o.clientName?.toLowerCase().includes(partial)).slice(0, 25));
  },
  async remove(id: number): Promise<void> {
    const index = orders.findIndex((o) => o.id === id);
    if (index !== -1) orders.splice(index, 1);
    for (let i = mediaItems.length - 1; i >= 0; i--) {
      if (mediaItems[i].orderId === id) mediaItems.splice(i, 1);
    }
  },
};

export const webMedia = {
  async add(orderId: number, type: MediaType, filePath: string, fileName: string): Promise<MediaItem> {
    const item: MediaItem = { id: nextMediaId++, orderId, type, filePath, fileName, createdAt: new Date().toISOString(), stage: 0, side: null, step: null };
    mediaItems.push(item);
    return item;
  },
  async listForOrder(orderId: number): Promise<MediaItem[]> {
    return mediaItems.filter((m) => m.orderId === orderId);
  },
  async rename(id: number, fileName: string, filePath: string): Promise<void> {
    const item = mediaItems.find((m) => m.id === id);
    if (!item) return;
    item.fileName = fileName;
    item.filePath = filePath;
  },
  async remove(id: number): Promise<void> {
    const index = mediaItems.findIndex((m) => m.id === id);
    if (index !== -1) mediaItems.splice(index, 1);
  },
};
