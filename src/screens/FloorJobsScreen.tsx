import { useCallback, useMemo, useState } from 'react';
import { Modal, Pressable, SectionList, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { differenceInCalendarDays, format, parseISO } from 'date-fns';
import type { MainTabParamList, RootStackParamList } from '../navigation/types';
import { listAllCompletedOrders, listInProcessOrders, listItemProgress } from '../db/orders';
import { BENCHES, getBench, getOperator, setBench, type Bench } from '../db/team';
import { onSyncedData } from '../sync/syncService';
import type { Order } from '../types/models';
import { benchOf, whereLabel } from '../utils/stages';
import { Icon } from '../components/Icon';
import { colors, fonts, radius, spacing, stageColors } from '../theme/theme';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'DashboardTab'>,
  NativeStackScreenProps<RootStackParamList>
>;

type Progress = Map<number, { done: number; total: number }>;
type Section = { key: string; title: string; data: Order[] };

const daysLeft = (o: Order) => (o.dueDate ? differenceInCalendarDays(parseISO(o.dueDate), new Date()) : null);

function dueText(o: Order): { text: string; late: boolean } {
  if (o.status === 'completed') return { text: o.completedAt ? `done ${format(parseISO(o.completedAt), 'd MMM')}` : 'done', late: false };
  const d = daysLeft(o);
  if (d === null) return { text: 'no date', late: false };
  if (d < 0) return { text: `${-d} day${d === -1 ? '' : 's'} late`, late: true };
  if (d === 0) return { text: 'due today', late: false };
  if (d === 1) return { text: 'due tomorrow', late: false };
  return { text: `due ${format(parseISO(o.dueDate as string), 'EEE d')}`, late: false };
}

/** Late first, then on hold last among the rest, then by due date. */
function byUrgency(a: Order, b: Order): number {
  const late = (o: Order) => ((daysLeft(o) ?? 1) < 0 ? 0 : 1);
  const held = (o: Order) => (o.holdReason ? 1 : 0);
  return late(a) - late(b) || held(a) - held(b) || (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999');
}

/**
 * Floor Mode home: the jobs waiting at this phone's bench first, in big rows
 * you can hit with a gloved thumb. The coloured edge is the job's stage (red
 * when late); on-hold jobs say why.
 */
export function FloorJobsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState<Order[]>([]);
  const [done, setDone] = useState<Order[]>([]);
  const [progress, setProgress] = useState<Progress>(new Map());
  const [bench, setBenchKey] = useState<Bench>('all');
  const [operator, setOperatorName] = useState<string | null>(null);
  const [showDone, setShowDone] = useState(false);
  const [picking, setPicking] = useState(false);
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState('');

  const reload = useCallback(async () => {
    const [inProcess, completed, counts, b, me] = await Promise.all([listInProcessOrders(), listAllCompletedOrders(), listItemProgress(), getBench(), getOperator()]);
    setOpen(inProcess);
    setDone(completed);
    setProgress(counts);
    setBenchKey(b);
    setOperatorName(me);
  }, []);

  useFocusEffect(useCallback(() => { void reload(); }, [reload]));
  useFocusEffect(useCallback(() => onSyncedData(() => void reload()), [reload]));

  const late = open.filter((o) => (daysLeft(o) ?? 1) < 0).length;
  const held = open.filter((o) => o.holdReason).length;
  const benchLabel = BENCHES.find((b) => b.key === bench)?.label ?? 'All jobs';

  const sections = useMemo<Section[]>(() => {
    const q = query.trim().toLowerCase();
    if (q) {
      const hits = [...open, ...done].filter((o) => [o.ceNumber, o.clientName ?? '', o.projectName ?? ''].some((v) => v.toLowerCase().includes(q)));
      return [{ key: 'search', title: `${hits.length} found`, data: hits.sort(byUrgency) }];
    }
    const result: Section[] = [];
    if (bench === 'all') {
      result.push({ key: 'open', title: `Open jobs · ${open.length}`, data: [...open].sort(byUrgency) });
    } else {
      const mine = open.filter((o) => benchOf(o) === bench).sort(byUrgency);
      const rest = open.filter((o) => benchOf(o) !== bench).sort(byUrgency);
      result.push({ key: 'mine', title: `At ${benchLabel.toLowerCase()} · ${mine.length}`, data: mine });
      if (rest.length) result.push({ key: 'rest', title: `Everything else · ${rest.length}`, data: rest });
    }
    if (showDone) result.push({ key: 'done', title: `Completed · ${done.length}`, data: done });
    return result;
  }, [open, done, bench, benchLabel, showDone, query]);

  const today = format(new Date(), 'EEEE d MMMM');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <SectionList
        sections={sections}
        keyExtractor={(o) => String(o.id)}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}
        ListHeaderComponent={
          <View>
            <View style={styles.top}>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{operator ? `${operator}'s jobs` : 'Jobs'}</Text>
                <Text style={styles.date}>{today}</Text>
              </View>
              <Pressable style={styles.square} onPress={() => { setSearching((s) => !s); setQuery(''); }} accessibilityLabel="Search jobs">
                <Icon name={searching ? 'close' : 'search'} size={26} strokeWidth={2} />
              </Pressable>
              <Pressable style={styles.square} onPress={() => navigation.navigate('NewOrder')} accessibilityLabel="New job">
                <Icon name="plus" size={26} strokeWidth={2.2} />
              </Pressable>
            </View>
            {searching && (
              <TextInput autoFocus value={query} onChangeText={setQuery} placeholder="CE number, client or product" placeholderTextColor={colors.textMuted} style={styles.search} />
            )}
            <Pressable style={styles.bench} onPress={() => setPicking(true)} accessibilityLabel={`My bench: ${benchLabel}. Change`}>
              <Text style={styles.benchLabel}>My bench</Text>
              <Text style={styles.benchValue}>{benchLabel} ▾</Text>
            </Pressable>
            <View style={styles.summary}>
              <Text style={styles.summaryText}>{open.length} open</Text>
              {late > 0 && <Text style={[styles.summaryText, styles.summaryLate]}>{late} late</Text>}
              {held > 0 && <Text style={styles.summaryText}>{held} on hold</Text>}
            </View>
          </View>
        }
        renderSectionHeader={({ section }) => <Text style={styles.sectionTitle}>{section.title}</Text>}
        renderSectionFooter={({ section }) =>
          section.data.length === 0 ? <Text style={styles.empty}>{section.key === 'mine' ? 'Nothing waiting at your bench right now.' : 'No jobs here.'}</Text> : null
        }
        renderItem={({ item }) => {
          const due = dueText(item);
          const count = progress.get(item.id);
          const edge = due.late ? colors.danger : item.status === 'completed' ? colors.success : stageColors[item.stage];
          return (
            <Pressable style={styles.row} onPress={() => navigation.navigate('Order', { orderId: item.id })} accessibilityLabel={`${item.projectName || item.ceNumber}, ${whereLabel(item)}, ${due.text}`}>
              <View style={[styles.edge, { backgroundColor: edge }]} />
              <View style={styles.rowBody}>
                <Text style={styles.project} numberOfLines={2}>{item.projectName || item.ceNumber}</Text>
                <Text style={styles.meta} numberOfLines={2}>
                  {item.ceNumber} · {whereLabel(item)}
                  {count && count.total > 0 ? ` · ${count.done}/${count.total}` : ''}
                  {' · '}
                  <Text style={due.late ? styles.metaLate : undefined}>{due.text}</Text>
                </Text>
                {item.holdReason ? <Text style={styles.hold} numberOfLines={1}>ON HOLD · {item.holdReason}</Text> : null}
              </View>
              <View style={styles.arrow}><Icon name="back" size={24} color={colors.textMuted} strokeWidth={2.2} /></View>
            </Pressable>
          );
        }}
        ListFooterComponent={
          <Pressable style={styles.more} onPress={() => setShowDone((v) => !v)}>
            <Text style={styles.moreText}>{showDone ? 'Hide completed' : `Show completed (${done.length})`}</Text>
          </Pressable>
        }
      />

      <Modal visible={picking} transparent animationType="slide" onRequestClose={() => setPicking(false)}>
        <Pressable style={styles.backdrop} onPress={() => setPicking(false)}>
          <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
            <Text style={styles.sheetTitle}>My bench</Text>
            {BENCHES.map((b) => (
              <Pressable
                key={b.key}
                style={[styles.sheetRow, bench === b.key && styles.sheetRowOn]}
                onPress={async () => { setBenchKey(b.key); setPicking(false); await setBench(b.key); }}
              >
                <Text style={[styles.sheetRowText, bench === b.key && styles.sheetRowTextOn]}>{b.label}</Text>
                <Text style={[styles.sheetRowCount, bench === b.key && styles.sheetRowTextOn]}>{b.key === 'all' ? open.length : open.filter((o) => benchOf(o) === b.key).length}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const cond = { fontFamily: fonts.condensed, textTransform: 'uppercase' as const };

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  title: { ...cond, fontSize: 34, lineHeight: 38, fontWeight: '700', color: colors.textPrimary },
  date: { fontFamily: fonts.family, fontSize: 15, color: colors.textMuted },
  square: { width: 52, height: 52, borderRadius: radius.sm, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  search: { marginHorizontal: spacing.lg, marginTop: spacing.md, height: 56, borderRadius: radius.sm, backgroundColor: colors.surface, paddingHorizontal: spacing.md, fontFamily: fonts.family, fontSize: 18, color: colors.textPrimary },
  bench: { marginHorizontal: spacing.lg, marginTop: spacing.md, height: 60, borderRadius: radius.sm, backgroundColor: colors.textPrimary, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg },
  benchLabel: { fontFamily: fonts.family, fontSize: 16, color: colors.background },
  benchValue: { ...cond, fontSize: 22, fontWeight: '700', color: colors.accent },
  summary: { flexDirection: 'row', gap: spacing.lg, paddingHorizontal: spacing.lg, marginTop: spacing.md },
  summaryText: { ...cond, fontSize: 17, fontWeight: '600', color: colors.textSecondary, letterSpacing: 0.4 },
  summaryLate: { color: colors.danger },
  sectionTitle: { ...cond, fontSize: 17, fontWeight: '700', color: colors.textMuted, letterSpacing: 0.8, paddingHorizontal: spacing.lg, marginTop: spacing.xl, marginBottom: spacing.sm },
  empty: { fontFamily: fonts.family, fontSize: 16, color: colors.textMuted, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'stretch', minHeight: 78, marginHorizontal: spacing.lg, marginBottom: spacing.sm, backgroundColor: colors.surface, borderRadius: radius.sm, overflow: 'hidden' },
  edge: { width: 8 },
  rowBody: { flex: 1, paddingVertical: spacing.md, paddingLeft: spacing.md, gap: 3 },
  project: { fontFamily: fonts.family, fontSize: 19, lineHeight: 23, fontWeight: '600', color: colors.textPrimary },
  meta: { fontFamily: fonts.family, fontSize: 14.5, color: colors.textMuted },
  metaLate: { color: colors.danger, fontWeight: '700' },
  hold: { ...cond, fontSize: 15, fontWeight: '700', color: colors.danger, letterSpacing: 0.4 },
  arrow: { width: 52, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '180deg' }] },
  more: { height: 56, marginHorizontal: spacing.lg, marginTop: spacing.lg, borderRadius: radius.sm, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  moreText: { ...cond, fontSize: 18, fontWeight: '700', color: colors.textSecondary },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.background, borderTopLeftRadius: radius.md, borderTopRightRadius: radius.md, padding: spacing.lg, gap: spacing.sm },
  sheetTitle: { ...cond, fontSize: 30, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.sm },
  sheetRow: { height: 60, borderRadius: radius.sm, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg },
  sheetRowOn: { backgroundColor: colors.textPrimary },
  sheetRowText: { fontFamily: fonts.family, fontSize: 19, fontWeight: '600', color: colors.textPrimary },
  sheetRowTextOn: { color: colors.background },
  sheetRowCount: { ...cond, fontSize: 22, fontWeight: '700', color: colors.textMuted },
});
