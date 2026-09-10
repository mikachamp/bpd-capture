import { format } from 'date-fns';
import { getDb } from './client';
import { listAllCompletedOrders, listInProcessOrders } from './orders';

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

type SeedOrder = {
  ceNumber: string;
  status: 'in_process' | 'completed';
  createdDaysAgo: number;
  completedDaysAgo?: number;
  dueDateOffsetDays?: number | null;
  clientName?: string | null;
  projectName?: string | null;
  notes?: string | null;
};

const SEED_ORDERS: SeedOrder[] = [
  {
    ceNumber: 'CE-2024-0091',
    status: 'in_process',
    createdDaysAgo: 1,
    dueDateOffsetDays: 2,
    clientName: 'Marcus Reyes',
    projectName: 'Roof replacement — 14 Ashford Ct',
  },
  {
    ceNumber: 'CE-2024-0088',
    status: 'in_process',
    createdDaysAgo: 3,
    dueDateOffsetDays: -1,
    clientName: 'Priya Chandran',
    projectName: 'Storm damage inspection',
    notes: 'Waiting on access approval from the site owner before we can finish the inspection.',
  },
  {
    ceNumber: 'CE-2024-0110',
    status: 'in_process',
    createdDaysAgo: 2,
    dueDateOffsetDays: 4,
    clientName: 'Wei Zhang',
    projectName: 'Kitchen remodel rough-in',
  },
  {
    ceNumber: 'CE-2024-0132',
    status: 'in_process',
    createdDaysAgo: 7,
    dueDateOffsetDays: -3,
    clientName: 'Tom Garrity',
    projectName: 'Pool deck inspection',
    notes: 'Homeowner has rescheduled access twice.',
  },
  {
    ceNumber: 'CE-2024-0120',
    status: 'in_process',
    createdDaysAgo: 1,
    dueDateOffsetDays: 14,
    clientName: 'Nadia Ferreira',
    projectName: 'Solar panel pre-install survey',
  },
  {
    ceNumber: 'CE-2024-0095',
    status: 'in_process',
    createdDaysAgo: 6,
    dueDateOffsetDays: null,
    clientName: 'Wei Zhang',
    projectName: 'Bathroom addition',
  },
  {
    ceNumber: 'CE-2024-0075',
    status: 'completed',
    createdDaysAgo: 10,
    completedDaysAgo: 2,
    dueDateOffsetDays: -5,
    clientName: 'Marcus Reyes',
    projectName: 'Fence line survey',
    notes: "Delayed a few days — site was inaccessible during last week's storm.",
  },
  {
    ceNumber: 'CE-2024-0060',
    status: 'completed',
    createdDaysAgo: 40,
    completedDaysAgo: 35,
    dueDateOffsetDays: -30,
    clientName: 'Dana Whitfield',
    projectName: 'Pre-purchase inspection',
  },
  {
    ceNumber: 'CE-2024-0079',
    status: 'completed',
    createdDaysAgo: 20,
    completedDaysAgo: 10,
    dueDateOffsetDays: -12,
    clientName: 'Tom Garrity',
    projectName: 'Siding replacement',
    notes: 'Material delivery was delayed by the supplier.',
  },
  {
    ceNumber: 'CE-2023-0512',
    status: 'completed',
    createdDaysAgo: 220,
    completedDaysAgo: 210,
    dueDateOffsetDays: null,
    clientName: null,
    projectName: null,
  },
];

/**
 * Populates the real on-device database with sample CE jobs, but only on a
 * completely empty database — never on top of an app the user has already
 * started using, so a routine update can never duplicate or clutter their
 * real data. Native-only; the web target has its own separate mock dataset
 * (see webMock.ts) that this never touches.
 */
export async function seedDemoDataIfEmpty(): Promise<void> {
  const [inProcess, completed] = await Promise.all([listInProcessOrders(), listAllCompletedOrders()]);
  if (inProcess.length > 0 || completed.length > 0) return;

  const db = await getDb();
  for (const seed of SEED_ORDERS) {
    const createdAt = daysAgoIso(seed.createdDaysAgo);
    const completedAt = seed.status === 'completed' ? daysAgoIso(seed.completedDaysAgo ?? 0) : null;
    const updatedAt = completedAt ?? createdAt;
    const dueDate = seed.dueDateOffsetDays == null ? null : daysFromNowDate(seed.dueDateOffsetDays);

    await db.runAsync(
      `INSERT INTO orders (ceNumber, status, createdAt, updatedAt, completedAt, dueDate, notes, clientName, projectName) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
