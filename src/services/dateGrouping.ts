import { format, getYear, getMonth } from 'date-fns';
import type { Order } from '../types/models';

function completedDate(order: Order): Date {
  return new Date(order.completedAt as string);
}

export type BucketOption = {
  key: string;
  label: string;
  count: number;
};

export function getAvailableYears(orders: Order[]): BucketOption[] {
  const counts = new Map<number, number>();
  for (const order of orders) {
    const year = getYear(completedDate(order));
    counts.set(year, (counts.get(year) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[0] - a[0])
    .map(([year, count]) => ({ key: String(year), label: String(year), count }));
}

export function getMonthsInYear(orders: Order[], year: number): BucketOption[] {
  const inYear = orders.filter((order) => getYear(completedDate(order)) === year);
  const counts = new Map<number, number>();
  for (const order of inYear) {
    const month = getMonth(completedDate(order));
    counts.set(month, (counts.get(month) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[0] - a[0])
    .map(([month, count]) => ({
      key: String(month),
      label: format(new Date(year, month, 1), 'MMMM'),
      count,
    }));
}
