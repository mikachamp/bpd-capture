import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { format, isSameMonth, isToday } from 'date-fns';
import type { Order } from '../types/models';
import { buildMonthGridDays } from '../utils/calendarGrid';
import { groupOrdersByWeekInMonth } from '../utils/groupOrdersByWeek';
import { colors, fonts, radius, spacing, typography } from '../theme/theme';

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const DAY_SIZE = 40;
// A fixed px width lets flexWrap fit 8 cells per row on wider phones,
// shifting every date under the wrong weekday — a seventh of the row can't.
const SEVENTH = '14.2857%';

type DotTone = 'accent' | 'danger' | 'success' | 'warning';

type Props = {
  cursor: Date;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  orders: Order[];
  getDateKey: (order: Order) => string | null;
  dotTone?: (dayOrders: Order[], day: Date) => DotTone;
  onPressOrder: (orderId: number) => void;
  emptyLabel: string;
};

function defaultDotTone(): DotTone {
  return 'accent';
}

/** A row's on-time/late tag when it's a completed job that had a due date — otherwise the usual status badge. */
function RowMeta({ order }: { order: Order }) {
  if (order.status === 'completed' && order.dueDate && order.completedAt) {
    const late = format(new Date(order.completedAt), 'yyyy-MM-dd') > order.dueDate;
    return (
      <View style={[styles.tag, late ? styles.tagDanger : styles.tagSuccess]}>
        <Text style={[styles.tagText, late ? styles.tagTextDanger : styles.tagTextSuccess]}>
          {late ? 'Late' : 'On time'}
        </Text>
      </View>
    );
  }
  return (
    <View style={[styles.tag, order.status === 'completed' ? styles.tagSuccess : styles.tagWarning]}>
      <Text style={[styles.tagText, order.status === 'completed' ? styles.tagTextSuccess : styles.tagTextWarning]}>
        {order.status === 'completed' ? 'Completed' : 'In Process'}
      </Text>
    </View>
  );
}

export function MonthCalendarBoard({
  cursor,
  onPrevMonth,
  onNextMonth,
  orders,
  getDateKey,
  dotTone = defaultDotTone,
  onPressOrder,
  emptyLabel,
}: Props) {
  const days = useMemo(() => buildMonthGridDays(cursor), [cursor]);

  const ordersByDay = useMemo(() => {
    const map = new Map<string, Order[]>();
    for (const order of orders) {
      const key = getDateKey(order);
      if (!key) continue;
      const list = map.get(key) ?? [];
      list.push(order);
      map.set(key, list);
    }
    return map;
  }, [orders, getDateKey]);

  const weekGroups = useMemo(
    () => groupOrdersByWeekInMonth(cursor, orders, getDateKey),
    [cursor, orders, getDateKey]
  );

  return (
    <View>
      <View style={styles.navRow}>
        <Pressable hitSlop={10} onPress={onPrevMonth}>
          <Text style={styles.navArrow}>‹</Text>
        </Pressable>
        <Text style={styles.navLabel}>{format(cursor, 'MMMM yyyy')}</Text>
        <Pressable hitSlop={10} onPress={onNextMonth}>
          <Text style={styles.navArrow}>›</Text>
        </Pressable>
      </View>

      <View style={styles.grid}>
        <View style={styles.weekdayRow}>
          {WEEKDAY_LABELS.map((label, index) => (
            <Text key={`${label}-${index}`} style={styles.weekdayLabel}>
              {label}
            </Text>
          ))}
        </View>
        <View style={styles.gridDays}>
          {days.map((day) => {
            const dayOrders = ordersByDay.get(format(day, 'yyyy-MM-dd')) ?? [];
            const inMonth = isSameMonth(day, cursor);
            const today = isToday(day);
            const tone = dayOrders.length > 0 ? dotTone(dayOrders, day) : null;
            return (
              <View key={day.toISOString()} style={styles.dayCell}>
                <View style={[styles.dayInner, today && styles.dayInnerToday]}>
                  <Text style={[styles.dayText, !inMonth && styles.dayTextMuted, today && styles.dayTextToday]}>
                    {format(day, 'd')}
                  </Text>
                  {tone && <View style={[styles.dot, styles[`dot_${tone}` as const]]} />}
                </View>
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.listSection}>
        {weekGroups.length === 0 ? (
          <Text style={styles.emptyText}>{emptyLabel}</Text>
        ) : (
          weekGroups.map((group, index) => (
            <View key={group.key} style={index > 0 ? styles.weekDivider : undefined}>
              <Text style={styles.weekLabel}>{group.label}</Text>
              {group.orders.map((order) => (
                <Pressable key={order.id} style={styles.jobRow} onPress={() => onPressOrder(order.id)}>
                  <Text style={styles.jobRowCe} numberOfLines={1}>{order.projectName || order.ceNumber}</Text>
                  <RowMeta order={order} />
                </Pressable>
              ))}
            </View>
          ))
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  navArrow: {
    fontFamily: fonts.family,
    fontSize: 24,
    color: colors.accent,
    fontWeight: '600',
    paddingHorizontal: spacing.sm,
  },
  navLabel: {
    ...typography.title,
  },
  grid: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    marginHorizontal: spacing.lg,
    padding: spacing.md,
  },
  weekdayRow: {
    flexDirection: 'row',
  },
  weekdayLabel: {
    width: SEVENTH,
    textAlign: 'center',
    ...typography.label,
    fontFamily: fonts.family,
    fontSize: 11,
  },
  gridDays: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: SEVENTH,
    height: DAY_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayInner: {
    width: DAY_SIZE - 6,
    height: DAY_SIZE - 6,
    borderRadius: (DAY_SIZE - 6) / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayInnerToday: {
    backgroundColor: colors.accentTint,
  },
  dayText: {
    fontFamily: fonts.family,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  dayTextMuted: {
    color: colors.textMuted,
  },
  dayTextToday: {
    color: colors.accent,
  },
  dot: {
    position: 'absolute',
    bottom: 4,
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  dot_accent: {
    backgroundColor: colors.accent,
  },
  dot_danger: {
    backgroundColor: colors.danger,
  },
  dot_success: {
    backgroundColor: colors.success,
  },
  dot_warning: {
    backgroundColor: colors.warning,
  },
  listSection: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  weekDivider: {
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  weekLabel: {
    ...typography.label,
    marginBottom: spacing.sm,
  },
  emptyText: {
    ...typography.body,
    color: colors.textMuted,
    paddingVertical: spacing.sm,
  },
  jobRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  jobRowCe: {
    ...typography.subtitle,
    flexShrink: 1,
  },
  tag: {
    paddingVertical: 5,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    flexShrink: 0,
  },
  tagWarning: {
    backgroundColor: colors.warningTint,
  },
  tagSuccess: {
    backgroundColor: colors.successTint,
  },
  tagDanger: {
    backgroundColor: colors.dangerTint,
  },
  tagText: {
    fontFamily: fonts.family,
    fontSize: 11,
    fontWeight: '700',
  },
  tagTextWarning: {
    color: colors.warning,
  },
  tagTextSuccess: {
    color: colors.success,
  },
  tagTextDanger: {
    color: colors.danger,
  },
});
