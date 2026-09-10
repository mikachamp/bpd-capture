import { format, isSameMonth, startOfWeek } from 'date-fns';
import type { Order } from '../types/models';

const WEEK_STARTS_ON = 0; // Sunday

export type WeekGroup = {
  key: string;
  label: string;
  orders: Order[];
};

/**
 * Buckets the orders that fall in `cursor`'s month into their calendar weeks
 * (Sun-Sat), so a month view can render one divider per week underneath the
 * grid instead of one flat list.
 */
export function groupOrdersByWeekInMonth(
  cursor: Date,
  orders: Order[],
  getDateKey: (order: Order) => string | null
): WeekGroup[] {
  const weeks = new Map<string, { start: Date; orders: Order[] }>();

  for (const order of orders) {
    const dateKey = getDateKey(order);
    if (!dateKey) continue;
    const date = new Date(`${dateKey}T00:00:00`);
    if (!isSameMonth(date, cursor)) continue;

    const start = startOfWeek(date, { weekStartsOn: WEEK_STARTS_ON });
    const key = start.toISOString();
    const entry = weeks.get(key) ?? { start, orders: [] };
    entry.orders.push(order);
    weeks.set(key, entry);
  }

  return Array.from(weeks.values())
    .sort((a, b) => a.start.getTime() - b.start.getTime())
    .map(({ start, orders: weekOrders }) => ({
      key: start.toISOString(),
      label: `Week of ${format(start, 'MMM d')}`,
      orders: weekOrders.sort((a, b) => (getDateKey(a) as string).localeCompare(getDateKey(b) as string)),
    }));
}
