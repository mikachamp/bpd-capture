import { useCallback, useMemo, useState } from 'react';
import { Alert, FlatList, Image, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { differenceInCalendarDays, format, parseISO } from 'date-fns';
import type { MainTabParamList, RootStackParamList } from '../navigation/types';
import { listAllCompletedOrders, listInProcessOrders } from '../db/orders';
import { onSyncedData } from '../sync/syncService';
import { exportAndShareDailyDigest } from '../services/reportPdf';
import type { Order } from '../types/models';
import { STAGES, stageLabel } from '../utils/stages';
import { AppLogo } from '../components/AppLogo';
import { Icon } from '../components/Icon';
import { colors, fonts, radius, spacing } from '../theme/theme';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'DashboardTab'>,
  NativeStackScreenProps<RootStackParamList>
>;

type Filter = 'all' | 0 | 1 | 2 | 3 | 'done';

function dueInfo(order: Order): { text: string; over: boolean } {
  if (order.status === 'completed') return { text: order.completedAt ? `Done ${format(parseISO(order.completedAt), 'd MMM')}` : 'Done', over: false };
  if (!order.dueDate) return { text: 'No date', over: false };
  const days = differenceInCalendarDays(parseISO(order.dueDate), new Date());
  if (days < 0) return { text: `${-days} day${days === -1 ? '' : 's'} late`, over: true };
  if (days === 0) return { text: 'Due today', over: false };
  return { text: `Due ${format(parseISO(order.dueDate), 'd MMM')}`, over: false };
}

/** Overdue first (most overdue on top), then by due date, then undated. */
function urgency(a: Order, b: Order): number {
  const key = (o: Order) => (o.dueDate ? o.dueDate : '9999-12-31');
  return key(a).localeCompare(key(b));
}

/**
 * Jobs (home). Built around Blueprint Digital's order flow: every CE order moves
 * Sample → Production → Packed → Installed, so the list filters by stage and
 * each row shows how far the order has got.
 */
export function JobsScreen({ navigation }: Props) {
  const [open, setOpen] = useState<Order[]>([]);
  const [done, setDone] = useState<Order[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState('');
  const [sendingDigest, setSendingDigest] = useState(false);

  const sendDigest = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Not available in web preview', 'The daily digest reads photos from the device and only works in the installed app.');
      return;
    }
    setSendingDigest(true);
    try {
      const { jobCount } = await exportAndShareDailyDigest();
      Alert.alert('Digest ready', `A digest covering ${jobCount} order${jobCount === 1 ? '' : 's'} completed today.`);
    } catch (error) {
      Alert.alert('Digest not sent', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setSendingDigest(false);
    }
  };

  const reload = useCallback(async () => {
    const [inProcess, completed] = await Promise.all([listInProcessOrders(), listAllCompletedOrders()]);
    setOpen(inProcess);
    setDone(completed);
  }, []);

  useFocusEffect(useCallback(() => { void reload(); }, [reload]));
  useFocusEffect(useCallback(() => onSyncedData(() => void reload()), [reload]));

  const overdue = open.filter((o) => dueInfo(o).over).length;

  const shown = useMemo(() => {
    const base = filter === 'done' ? done : filter === 'all' ? [...open].sort(urgency) : open.filter((o) => o.stage === filter).sort(urgency);
    const q = query.trim().toLowerCase();
    if (!q) return base;
    return (filter === 'all' ? [...open, ...done] : base).filter((o) =>
      [o.ceNumber, o.clientName ?? '', o.projectName ?? ''].some((v) => v.toLowerCase().includes(q))
    );
  }, [open, done, filter, query]);

  const chips: { key: Filter; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: open.length },
    ...STAGES.map((s) => ({ key: s.key as Filter, label: s.label, count: open.filter((o) => o.stage === s.key).length })),
    { key: 'done', label: 'Done', count: done.length },
  ];

  const header = (
    <View>
      <View style={styles.top}>
        <AppLogo size={30} />
        <View style={styles.topActions}>
          <Pressable style={styles.round} onPress={() => { setSearching((s) => !s); setQuery(''); }} accessibilityLabel="Search jobs">
            <Icon name={searching ? 'close' : 'search'} size={20} />
          </Pressable>
          <Pressable style={styles.round} onPress={() => navigation.navigate('NewOrder')} accessibilityLabel="New order">
            <Icon name="plus" size={20} />
          </Pressable>
        </View>
      </View>
      <Text style={styles.title}>Jobs</Text>
      <View style={styles.subRow}>
        <Text style={styles.sub}>{open.length} open order{open.length === 1 ? '' : 's'}</Text>
        {overdue > 0 && (
          <>
            <Text style={styles.sub}> · </Text>
            <View style={styles.dot} />
            <Text style={styles.sub}> {overdue} overdue</Text>
          </>
        )}
      </View>
      {searching && (
        <TextInput
          autoFocus
          value={query}
          onChangeText={setQuery}
          placeholder="Search CE number, client or product"
          placeholderTextColor={colors.textMuted}
          style={styles.search}
        />
      )}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {chips.map((c) => (
          <Pressable key={String(c.key)} style={[styles.chip, filter === c.key && styles.chipOn]} onPress={() => setFilter(c.key)}>
            <Text style={[styles.chipText, filter === c.key && styles.chipTextOn]}>{c.label}</Text>
            <Text style={styles.chipCount}>{c.count}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={shown}
        keyExtractor={(o) => String(o.id)}
        ListHeaderComponent={header}
        contentContainerStyle={styles.list}
        ListFooterComponent={
          <Pressable onPress={sendDigest} disabled={sendingDigest} style={styles.digest}>
            <Icon name="file" size={16} color={colors.textMuted} />
            <Text style={styles.digestText}>{sendingDigest ? 'Preparing digest…' : "Send today's digest"}</Text>
          </Pressable>
        }
        ListEmptyComponent={<Text style={[styles.sub, styles.empty]}>{query ? 'No orders match that search.' : 'No orders at this stage.'}</Text>}
        renderItem={({ item }) => {
          const due = dueInfo(item);
          return (
            <Pressable style={styles.row} onPress={() => navigation.navigate('Order', { orderId: item.id })}>
              {item.coverImage ? (
                <Image source={{ uri: item.coverImage }} style={styles.thumb} />
              ) : (
                <View style={[styles.thumb, styles.thumbEmpty]}>
                  <Icon name="camera" size={20} color={colors.textMuted} />
                </View>
              )}
              <View style={styles.rowBody}>
                <View style={styles.meta}>
                  <Text style={styles.client} numberOfLines={1}>{item.clientName || 'No client'}</Text>
                  <Text style={[styles.due, due.over && styles.dueOver]}>{due.over ? '● ' : ''}{due.text}</Text>
                </View>
                <Text style={styles.project} numberOfLines={2}>{item.projectName || item.ceNumber}</Text>
                <View style={styles.bar}>
                  {STAGES.map((s) => (
                    <View
                      key={s.key}
                      style={[
                        styles.barSeg,
                        (s.key < item.stage || item.status === 'completed') && styles.barDone,
                        s.key === item.stage && item.status !== 'completed' && styles.barNow,
                      ]}
                    />
                  ))}
                </View>
                <View style={styles.meta}>
                  <Text style={styles.stage}>{item.status === 'completed' ? 'Completed' : stageLabel(item.stage)}</Text>
                  <Text style={styles.ce}>{item.ceNumber}</Text>
                </View>
              </View>
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { paddingHorizontal: spacing.xl, paddingBottom: 120 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', height: 48, marginTop: spacing.sm },
  topActions: { flexDirection: 'row', gap: spacing.sm },
  round: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: fonts.family, fontSize: 32, fontWeight: '400', letterSpacing: -0.6, color: colors.textPrimary, marginTop: spacing.lg },
  subRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  sub: { fontFamily: fonts.family, fontSize: 14, color: colors.textMuted },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.danger },
  search: {
    fontFamily: fonts.family, fontSize: 15, color: colors.textPrimary, backgroundColor: colors.surface,
    borderRadius: radius.pill, paddingHorizontal: spacing.lg, height: 46, marginTop: spacing.lg,
  },
  chips: { gap: spacing.sm, paddingVertical: spacing.lg },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: colors.surface },
  chipOn: { backgroundColor: colors.selected },
  chipText: { fontFamily: fonts.family, fontSize: 13.5, color: colors.textSecondary },
  chipTextOn: { color: colors.selectedText },
  chipCount: { fontFamily: fonts.family, fontSize: 12, color: colors.textMuted },
  empty: { marginTop: spacing.xl },
  row: { flexDirection: 'row', gap: spacing.md, paddingVertical: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border },
  thumb: { width: 52, height: 52, borderRadius: radius.md },
  thumbEmpty: { backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  rowBody: { flex: 1, gap: 6 },
  meta: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  client: { fontFamily: fonts.family, fontSize: 12.5, fontWeight: '500', color: colors.textSecondary, flexShrink: 1 },
  due: { fontFamily: fonts.family, fontSize: 12.5, color: colors.textMuted },
  dueOver: { color: colors.danger },
  project: { fontFamily: fonts.family, fontSize: 17, color: colors.textPrimary, lineHeight: 22 },
  bar: { flexDirection: 'row', gap: 4 },
  barSeg: { flex: 1, height: 5, borderRadius: 3, backgroundColor: colors.surfaceMuted },
  barDone: { backgroundColor: colors.success },
  barNow: { backgroundColor: colors.accent },
  stage: { fontFamily: fonts.family, fontSize: 12.5, color: colors.textSecondary },
  ce: { fontFamily: fonts.family, fontSize: 12.5, color: colors.textMuted },
  digest: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: spacing.xl },
  digestText: { fontFamily: fonts.family, fontSize: 13, color: colors.textMuted, textDecorationLine: 'underline' },
});
