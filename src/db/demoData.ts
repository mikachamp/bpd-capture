import type { SQLiteDatabase } from 'expo-sqlite';
import { DEMO_UUID_PREFIX } from '../sync/paths';

/** Sample jobs inserted on a brand-new install (see seedDemoData.ts). Pure data, no imports of the db layer. */
export type SeedOrder = {
  ceNumber: string;
  status: 'in_process' | 'completed';
  createdDaysAgo: number;
  completedDaysAgo?: number;
  dueDateOffsetDays?: number | null;
  clientName?: string | null;
  projectName?: string | null;
  notes?: string | null;
};

export const SEED_ORDERS: SeedOrder[] = [
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
 * Demo jobs must never sync to GitHub. New installs insert them with a
 * "demo-" uuid; this marks the ones already on a device from before sync
 * existed, matching on CE number and the seeded project name.
 */
export async function markExistingDemoRows(db: SQLiteDatabase): Promise<void> {
  for (const seed of SEED_ORDERS) {
    await db.runAsync(
      `UPDATE orders SET uuid = ? WHERE ceNumber = ? AND projectName IS ?`,
      DEMO_UUID_PREFIX + seed.ceNumber,
      seed.ceNumber,
      seed.projectName ?? null
    );
  }
}
