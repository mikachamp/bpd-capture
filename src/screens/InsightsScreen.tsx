import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { differenceInCalendarDays, format } from 'date-fns';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList, MainTabParamList } from '../navigation/types';
import { listAllCompletedOrders, listInProcessOrders } from '../db/orders';
import type { Order } from '../types/models';
import { StatTile } from '../components/StatTile';
import { Meter } from '../components/Meter';
import { colors, fonts, radius, spacing, typography } from '../theme/theme';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'InsightsTab'>,
  NativeStackScreenProps<RootStackParamList>
>;

const todayKey = () => format(new Date(), 'yyyy-MM-dd');
const daysFromTodayKey = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return format(d, 'yyyy-MM-dd');
};

export function InsightsScreen({ navigation }: Props) {
  const [inProcess, setInProcess] = useState<Order[]>([]);
  const [completed, setCompleted] = useState<Order[]>([]);

  useFocusEffect(
    useCallback(() => {
      Promise.all([listInProcessOrders(), listAllCompletedOrders()]).then(([ip, done]) => {
        setInProcess(ip);
        setCompleted(done);
      });
    }, [])
  );

  const today = todayKey();
  const weekAhead = daysFromTodayKey(7);

  const overdueJobs = inProcess
    .filter((o) => o.dueDate && o.dueDate < today)
    .sort((a, b) => (a.dueDate as string).localeCompare(b.dueDate as string));

  const dueThisWeekCount = inProcess.filter((o) => o.dueDate && o.dueDate >= today && o.dueDate <= weekAhead).length;

  const completedWithDueDate = completed.filter((o) => o.dueDate);
  const onTimeCount = completedWithDueDate.filter(
    (o) => format(new Date(o.completedAt as string), 'yyyy-MM-dd') <= (o.dueDate as string)
  ).length;
  const onTimeRate = completedWithDueDate.length ? Math.round((onTimeCount / completedWithDueDate.length) * 100) : null;

  const turnaroundDays = completed.map((o) => differenceInCalendarDays(new Date(o.completedAt as string), new Date(o.createdAt)));
  const avgTurnaround = turnaroundDays.length
    ? (turnaroundDays.reduce((sum, d) => sum + d, 0) / turnaroundDays.length).toFixed(1)
    : null;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.centered}>
          <View style={styles.header}>
            <Text style={styles.title}>Insights</Text>
          </View>

          <View style={styles.tileRow}>
            <StatTile label="In process" value={String(inProcess.length)} />
            <StatTile
              label="Overdue"
              value={String(overdueJobs.length)}
              tone={overdueJobs.length > 0 ? 'danger' : 'neutral'}
              hint={overdueJobs.length > 0 ? 'Needs attention' : undefined}
            />
            <StatTile
              label="Due this week"
              value={String(dueThisWeekCount)}
              tone={dueThisWeekCount > 0 ? 'warning' : 'neutral'}
              onPress={() => navigation.navigate('CalendarTab', { initialMode: 'week' })}
            />
            <StatTile label="Avg. turnaround" value={avgTurnaround ? `${avgTurnaround}d` : '—'} hint="Opened to completed" />
          </View>

          <Meter
            label="On-time completion rate"
            percent={onTimeRate}
            hint={
              completedWithDueDate.length
                ? `${onTimeCount} of ${completedWithDueDate.length} completed jobs finished by their due date`
                : 'No completed jobs with a due date yet'
            }
          />

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Overdue Jobs</Text>
            {overdueJobs.length === 0 ? (
              <Text style={styles.emptyText}>Nothing overdue — nice work.</Text>
            ) : (
              overdueJobs.map((order) => (
                <Pressable
                  key={order.id}
                  style={styles.jobRow}
                  onPress={() => navigation.navigate('Order', { orderId: order.id })}
                >
                  <Text style={styles.jobRowCe} numberOfLines={1}>{order.projectName || order.ceNumber}</Text>
                  <Text style={styles.jobRowDue}>Due {format(new Date(`${order.dueDate}T00:00:00`), 'MMM d')}</Text>
                </Pressable>
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingBottom: 120, // clears the floating tab bar
  },
  centered: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
  },
  header: {
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    gap: 4,
  },
  backLink: {
    color: colors.accentText,
    fontFamily: fonts.family,
    fontSize: 18,
    fontWeight: '700',
    paddingVertical: spacing.xs,
  },
  title: {
    ...typography.display,
  },
  tileRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  section: {
    marginTop: spacing.xl,
  },
  sectionLabel: {
    ...typography.label,
    marginBottom: spacing.sm,
  },
  emptyText: {
    ...typography.body,
    color: colors.textMuted,
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
  jobRowDue: {
    ...typography.caption,
    color: colors.danger,
    fontWeight: '700',
  },
});
