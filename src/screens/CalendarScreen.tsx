import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { addMonths, addWeeks, format, isToday, subMonths, subWeeks } from 'date-fns';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList, MainTabParamList } from '../navigation/types';
import { listOrdersWithDueDate } from '../db/orders';
import type { Order } from '../types/models';
import { buildWeekDays } from '../utils/calendarGrid';
import { MonthCalendarBoard } from '../components/MonthCalendarBoard';
import { colors, fonts, radius, spacing, typography } from '../theme/theme';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'CalendarTab'>,
  NativeStackScreenProps<RootStackParamList>
>;
type ViewMode = 'month' | 'week';

const today = new Date(new Date().toDateString());

export function CalendarScreen({ navigation, route }: Props) {
  const [mode, setMode] = useState<ViewMode>(route.params?.initialMode ?? 'month');
  const [cursor, setCursor] = useState(new Date());
  const [orders, setOrders] = useState<Order[]>([]);

  useFocusEffect(
    useCallback(() => {
      listOrdersWithDueDate().then(setOrders);
    }, [])
  );

  const ordersByDay = useMemo(() => {
    const map = new Map<string, Order[]>();
    for (const order of orders) {
      if (!order.dueDate) continue;
      const list = map.get(order.dueDate) ?? [];
      list.push(order);
      map.set(order.dueDate, list);
    }
    return map;
  }, [orders]);

  const jobsForDay = (day: Date) => ordersByDay.get(format(day, 'yyyy-MM-dd')) ?? [];

  const goPrev = () => setCursor((c) => (mode === 'month' ? subMonths(c, 1) : subWeeks(c, 1)));
  const goNext = () => setCursor((c) => (mode === 'month' ? addMonths(c, 1) : addWeeks(c, 1)));

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.centered}>
        <View style={styles.header}>
          <Text style={styles.title}>Calendar</Text>
        </View>

        <View style={styles.modeToggle}>
          <Pressable
            style={[styles.modeOption, mode === 'month' && styles.modeOptionActive]}
            onPress={() => setMode('month')}
          >
            <Text style={[styles.modeOptionText, mode === 'month' && styles.modeOptionTextActive]}>Month</Text>
          </Pressable>
          <Pressable
            style={[styles.modeOption, mode === 'week' && styles.modeOptionActive]}
            onPress={() => setMode('week')}
          >
            <Text style={[styles.modeOptionText, mode === 'week' && styles.modeOptionTextActive]}>Week</Text>
          </Pressable>
        </View>

        {mode === 'week' && (
          <View style={styles.navRow}>
            <Pressable hitSlop={10} onPress={goPrev}>
              <Text style={styles.navArrow}>‹</Text>
            </Pressable>
            <Text style={styles.navLabel}>Week of {format(buildWeekDays(cursor)[0], 'MMM d, yyyy')}</Text>
            <Pressable hitSlop={10} onPress={goNext}>
              <Text style={styles.navArrow}>›</Text>
            </Pressable>
          </View>
        )}
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={styles.centered}>
          {mode === 'month' ? (
            <MonthCalendarBoard
              cursor={cursor}
              onPrevMonth={goPrev}
              onNextMonth={goNext}
              orders={orders}
              getDateKey={(order) => order.dueDate}
              dotTone={(dayOrders, day) =>
                dayOrders.some((o) => o.status === 'in_process' && day < today) ? 'danger' : 'accent'
              }
              onPressOrder={(id) => navigation.navigate('Order', { orderId: id })}
              emptyLabel="No jobs due this month."
            />
          ) : (
            <WeekList
              cursor={cursor}
              jobsForDay={jobsForDay}
              onPressOrder={(id) => navigation.navigate('Order', { orderId: id })}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function WeekList({
  cursor,
  jobsForDay,
  onPressOrder,
}: {
  cursor: Date;
  jobsForDay: (day: Date) => Order[];
  onPressOrder: (orderId: number) => void;
}) {
  const days = useMemo(() => buildWeekDays(cursor), [cursor]);

  return (
    <View style={styles.weekList}>
      {days.map((day) => {
        const jobs = jobsForDay(day);
        return (
          <View key={day.toISOString()} style={styles.weekDayBlock}>
            <View style={styles.weekDayHeader}>
              <Text style={styles.weekDayLabel}>{format(day, 'EEE, MMM d')}</Text>
              {isToday(day) && (
                <View style={styles.todayTag}>
                  <Text style={styles.todayTagText}>Today</Text>
                </View>
              )}
            </View>
            {jobs.length === 0 ? (
              <Text style={styles.noJobsText}>No due dates</Text>
            ) : (
              jobs.map((order) => (
                <Pressable key={order.id} style={styles.jobRow} onPress={() => onPressOrder(order.id)}>
                  <Text style={styles.jobRowCe}>{order.ceNumber}</Text>
                  <View
                    style={[
                      styles.jobRowBadge,
                      order.status === 'completed' ? styles.jobRowBadgeCompleted : styles.jobRowBadgeInProcess,
                    ]}
                  >
                    <Text style={styles.jobRowBadgeText}>{order.status === 'completed' ? 'Completed' : 'In Process'}</Text>
                  </View>
                </Pressable>
              ))
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    gap: 4,
  },
  backLink: {
    color: colors.accent,
    fontFamily: fonts.family,
    fontSize: 18,
    fontWeight: '700',
    paddingVertical: spacing.xs,
  },
  title: {
    ...typography.display,
  },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    padding: 4,
    gap: 4,
    marginHorizontal: spacing.xl,
    marginTop: spacing.sm,
  },
  modeOption: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    alignItems: 'center',
  },
  modeOptionActive: {
    backgroundColor: colors.surface,
  },
  modeOptionText: {
    fontWeight: '700',
    color: colors.textSecondary,
    fontFamily: fonts.family,
    fontSize: 13,
  },
  modeOptionTextActive: {
    color: colors.textPrimary,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  navArrow: {
    fontFamily: fonts.family,
    fontSize: 26,
    color: colors.accent,
    fontWeight: '600',
    paddingHorizontal: spacing.sm,
  },
  navLabel: {
    ...typography.title,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  noJobsText: {
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
  },
  jobRowCe: {
    ...typography.subtitle,
  },
  jobRowBadge: {
    paddingVertical: 5,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
  },
  jobRowBadgeInProcess: {
    backgroundColor: colors.warningTint,
  },
  jobRowBadgeCompleted: {
    backgroundColor: colors.successTint,
  },
  jobRowBadgeText: {
    fontFamily: fonts.family,
    fontSize: 11,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  weekList: {
    marginHorizontal: spacing.lg,
    gap: spacing.lg,
  },
  weekDayBlock: {
    gap: spacing.sm,
  },
  weekDayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  weekDayLabel: {
    ...typography.subtitle,
  },
  todayTag: {
    backgroundColor: colors.accentTint,
    borderRadius: radius.pill,
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
  },
  todayTagText: {
    color: colors.accent,
    fontFamily: fonts.family,
    fontSize: 11,
    fontWeight: '700',
  },
});
