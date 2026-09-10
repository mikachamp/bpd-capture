import { eachDayOfInterval, endOfMonth, endOfWeek, startOfMonth, startOfWeek } from 'date-fns';

const WEEK_STARTS_ON = 0; // Sunday

/** The 6x7 grid of days a month view renders, including the leading/trailing days that fill out the first and last weeks. */
export function buildMonthGridDays(cursor: Date): Date[] {
  const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: WEEK_STARTS_ON });
  const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: WEEK_STARTS_ON });
  return eachDayOfInterval({ start, end });
}

/** The 7 days of the week containing `cursor`. */
export function buildWeekDays(cursor: Date): Date[] {
  const start = startOfWeek(cursor, { weekStartsOn: WEEK_STARTS_ON });
  const end = endOfWeek(cursor, { weekStartsOn: WEEK_STARTS_ON });
  return eachDayOfInterval({ start, end });
}
