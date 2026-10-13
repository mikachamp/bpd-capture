import { useCallback, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { addMonths, format, subMonths } from 'date-fns';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { listAllCompletedOrders } from '../db/orders';
import type { Order } from '../types/models';
import { type BucketOption, getAvailableYears, getMonthsInYear } from '../services/dateGrouping';
import { MonthCalendarBoard } from '../components/MonthCalendarBoard';
import { colors, fonts, spacing, typography } from '../theme/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'BrowseByDate'>;

type Step =
  | { level: 'year'; label: string }
  | { level: 'month'; label: string; year: number }
  | { level: 'calendar'; label: string; year: number; month: number };

function completedDateKey(order: Order): string | null {
  return order.completedAt ? format(new Date(order.completedAt), 'yyyy-MM-dd') : null;
}

export function BrowseByDateScreen({ navigation }: Props) {
  const [allCompleted, setAllCompleted] = useState<Order[]>([]);
  const [stack, setStack] = useState<Step[]>([{ level: 'year', label: 'Browse by Year' }]);
  const [cursor, setCursor] = useState(new Date());

  useFocusEffect(
    useCallback(() => {
      listAllCompletedOrders().then(setAllCompleted);
      setStack([{ level: 'year', label: 'Browse by Year' }]);
    }, [])
  );

  const current = stack[stack.length - 1];
  const push = (step: Step) => setStack((prev) => [...prev, step]);
  const goBack = () => setStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));

  const renderBuckets = (buckets: BucketOption[], onSelect: (key: string) => void) => (
    <FlatList
      data={buckets}
      keyExtractor={(item) => item.key}
      renderItem={({ item }) => (
        <Pressable style={styles.bucketRow} onPress={() => onSelect(item.key)}>
          <Text style={styles.bucketLabel}>{item.label}</Text>
          <Text style={styles.bucketCount}>{item.count}</Text>
        </Pressable>
      )}
      ListEmptyComponent={<Text style={styles.emptyText}>Nothing here yet.</Text>}
    />
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.centered}>
        <View style={styles.header}>
          <Pressable onPress={() => (stack.length > 1 ? goBack() : navigation.goBack())} hitSlop={12}>
            <Text style={styles.backLink}>{stack.length > 1 ? '‹ Back' : '‹ Dashboard'}</Text>
          </Pressable>
          <Text style={styles.title}>{current.level === 'calendar' ? 'Completed Jobs' : current.label}</Text>
        </View>
      </View>

      {current.level === 'year' &&
        renderBuckets(getAvailableYears(allCompleted), (key) => {
          const year = Number(key);
          push({ level: 'month', label: String(year), year });
        })}

      {current.level === 'month' &&
        renderBuckets(getMonthsInYear(allCompleted, current.year), (key) => {
          const month = Number(key);
          setCursor(new Date(current.year, month, 1));
          push({
            level: 'calendar',
            label: `${getMonthsInYear(allCompleted, current.year).find((m) => m.key === key)?.label} ${current.year}`,
            year: current.year,
            month,
          });
        })}

      {current.level === 'calendar' && (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <View style={styles.centered}>
            <MonthCalendarBoard
              cursor={cursor}
              onPrevMonth={() => setCursor((c) => subMonths(c, 1))}
              onNextMonth={() => setCursor((c) => addMonths(c, 1))}
              orders={allCompleted}
              getDateKey={completedDateKey}
              dotTone={(dayOrders) =>
                dayOrders.some((o) => o.dueDate && completedDateKey(o)! > o.dueDate) ? 'danger' : 'success'
              }
              onPressOrder={(id) => navigation.navigate('Order', { orderId: id })}
              emptyLabel="No completed orders this month."
            />
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
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
    paddingTop: spacing.md,
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
    ...typography.title,
    fontFamily: fonts.family,
    fontSize: 20,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },
  bucketRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  bucketLabel: {
    fontFamily: fonts.family,
    fontSize: 16,
    color: colors.textPrimary,
  },
  bucketCount: {
    fontFamily: fonts.family,
    fontSize: 14,
    color: colors.textSecondary,
  },
  emptyText: {
    padding: spacing.xxl,
    textAlign: 'center',
    color: colors.textSecondary,
  },
});
