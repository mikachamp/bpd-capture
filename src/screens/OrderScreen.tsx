import { useCallback, useState } from 'react';
import { ActionSheetIOS, Alert, Image, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { differenceInCalendarDays, format, parseISO } from 'date-fns';
import type { RootStackParamList } from '../navigation/types';
import { deleteOrder, getOrderById, updateOrderStage } from '../db/orders';
import { deleteMediaItem, listMediaForOrder } from '../db/mediaItems';
import { deleteMediaFile, deleteOrderDirectory } from '../services/storage';
import { exportAndShareJobReport } from '../services/reportPdf';
import { onSyncedData } from '../sync/syncService';
import type { MediaItem, Order, Stage } from '../types/models';
import { STAGES, nextStepLabel, stageLabel } from '../utils/stages';
import { Icon } from '../components/Icon';
import { MediaPreview } from '../components/MediaGrid';
import { colors, fonts, radius, spacing } from '../theme/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Order'>;

const THUMBS_PER_ROW = 4;

/** Groups a stage's photos by the day they were taken (field visits rarely fit in one day). */
function byDay(items: MediaItem[]): { day: string; items: MediaItem[] }[] {
  const groups = new Map<string, MediaItem[]>();
  for (const item of [...items].sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
    const day = item.createdAt.slice(0, 10);
    groups.set(day, [...(groups.get(day) ?? []), item]);
  }
  return [...groups].map(([day, list]) => ({ day, items: list }));
}

/**
 * One CE order. The stepper shows where it is in Sample → Production → Packed →
 * Installed, one card says what happens next, and photos sit under the stage
 * they were taken in. The main button opens the camera on the current stage.
 */
export function OrderScreen({ route, navigation }: Props) {
  const { orderId } = route.params;
  const [order, setOrder] = useState<Order | null>(null);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [preview, setPreview] = useState<MediaItem | null>(null);
  const [exporting, setExporting] = useState<'client' | 'internal' | null>(null);

  const reload = useCallback(async () => {
    const [fresh, items] = await Promise.all([getOrderById(orderId), listMediaForOrder(orderId)]);
    setOrder(fresh);
    setMedia(items);
  }, [orderId]);

  useFocusEffect(useCallback(() => { void reload(); }, [reload]));
  useFocusEffect(useCallback(() => onSyncedData(() => void reload()), [reload]));

  if (!order) return <SafeAreaView style={styles.container} />;

  const completed = order.status === 'completed';
  const stage = order.stage;
  const stageMedia = (s: Stage) => media.filter((m) => m.stage === s);

  const due = (() => {
    if (completed) return { text: order.completedAt ? `Completed ${format(parseISO(order.completedAt), 'd MMM yyyy')}` : 'Completed', over: false };
    if (!order.dueDate) return { text: 'No due date', over: false };
    const days = differenceInCalendarDays(parseISO(order.dueDate), new Date());
    if (days < 0) return { text: `${-days} day${days === -1 ? '' : 's'} late · due ${format(parseISO(order.dueDate), 'd MMM')}`, over: true };
    return { text: days === 0 ? 'Due today' : `Due ${format(parseISO(order.dueDate), 'EEE d MMM')}`, over: false };
  })();

  const advance = async () => {
    if (completed) await updateOrderStage(order.id, 3, false);
    else if (stage < 3) await updateOrderStage(order.id, (stage + 1) as Stage);
    else await updateOrderStage(order.id, 3, true);
    await reload();
  };

  const stepBack = (target: Stage) => {
    if (target >= stage && !completed) return;
    Alert.alert(`Move back to ${stageLabel(target)}?`, 'Photos stay where they are.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Move back', onPress: async () => { await updateOrderStage(order.id, target, false); await reload(); } },
    ]);
  };

  const openCamera = () => navigation.navigate('Capture', { orderId: order.id, ceNumber: order.ceNumber, stage: completed ? 3 : stage });

  const exportReport = async (kind: 'client' | 'internal') => {
    // Client: what they need to see now (sample for approval, or the installation proof). Internal: everything.
    const clientStage: Stage = completed ? 3 : stage === 0 ? 0 : stage === 3 ? 3 : stage;
    const items = kind === 'internal' ? media : stageMedia(clientStage);
    if (items.length === 0) {
      Alert.alert('No photos yet', kind === 'client' ? `Take ${stageLabel(clientStage).toLowerCase()} photos first.` : 'Take some photos first.');
      return;
    }
    setExporting(kind);
    try {
      await exportAndShareJobReport(order, items);
    } catch {
      Alert.alert('Export failed', 'Could not create the report. Please try again.');
    } finally {
      setExporting(null);
    }
  };

  const confirmDelete = () =>
    Alert.alert('Delete this order?', 'This permanently deletes the order and all its photos and videos.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteOrderDirectory(order.ceNumber);
          await deleteOrder(order.id);
          navigation.goBack();
        },
      },
    ]);

  const openMore = () => {
    const options = ['Edit details', 'Delete order', 'Cancel'];
    const handle = (i: number) => {
      if (i === 0) navigation.navigate('JobDetail', { orderId: order.id });
      if (i === 1) confirmDelete();
    };
    if (Platform.OS === 'ios') ActionSheetIOS.showActionSheetWithOptions({ options, destructiveButtonIndex: 1, cancelButtonIndex: 2 }, handle);
    else Alert.alert(order.projectName || order.ceNumber, undefined, [
      { text: 'Edit details', onPress: () => handle(0) },
      { text: 'Delete order', style: 'destructive', onPress: () => handle(1) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const removeMedia = (item: MediaItem) =>
    Alert.alert('Delete this file?', item.fileName, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteMediaFile(item.filePath); await deleteMediaItem(item.id); await reload(); } },
    ]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.top}>
          <Pressable style={styles.round} onPress={() => navigation.goBack()} accessibilityLabel="Back"><Icon name="back" size={20} /></Pressable>
          <Pressable style={styles.round} onPress={openMore} accessibilityLabel="More options"><Icon name="more" size={20} /></Pressable>
        </View>

        <Text style={styles.crumb}>{order.clientName || 'No client'} · {order.ceNumber}</Text>
        <Text style={styles.title}>{order.projectName || order.ceNumber}</Text>
        <View style={styles.dueRow}>
          {due.over && <View style={styles.dot} />}
          <Text style={[styles.dueText, due.over && styles.dueOver]}>{due.text}</Text>
        </View>

        <View style={styles.stepper}>
          <View style={styles.stepLine} />
          {STAGES.map((s) => {
            const isDone = completed || s.key < stage;
            const isNow = !completed && s.key === stage;
            return (
              <Pressable key={s.key} style={styles.step} onPress={() => stepBack(s.key)} accessibilityLabel={`${s.label}${isDone ? ', done' : isNow ? ', current stage' : ''}`}>
                <View style={[styles.stepDot, isDone && styles.stepDone, isNow && styles.stepNow]}>
                  {isDone ? <Icon name="check" size={14} color="#0E2A1E" strokeWidth={2.4} /> : <Text style={[styles.stepNum, isNow && styles.stepNumNow]}>{s.key + 1}</Text>}
                </View>
                <Text style={[styles.stepLabel, isNow && styles.stepLabelNow]}>{s.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.next}>
          <Text style={styles.nextText}>{completed ? 'This order is complete.' : STAGES[stage].hint}</Text>
          <Pressable style={styles.nextBtn} onPress={advance}>
            <Icon name="check" size={16} color={colors.selectedText} strokeWidth={2} />
            <Text style={styles.nextBtnText}>{nextStepLabel(stage, stageMedia(stage).length > 0, completed)}</Text>
          </Pressable>
        </View>

        {STAGES.map((s) => {
          const items = stageMedia(s.key);
          const future = !completed && s.key > stage;
          const current = !completed && s.key === stage;
          if (future && items.length === 0) {
            return (
              <View key={s.key} style={[styles.section, styles.future]}>
                <View style={styles.sectionHead}><Text style={styles.sectionTitle}>{s.label}</Text><Text style={styles.sectionMeta}>Not started</Text></View>
              </View>
            );
          }
          const groups = byDay(items);
          return (
            <View key={s.key} style={styles.section}>
              <View style={styles.sectionHead}>
                <Text style={styles.sectionTitle}>{s.label}</Text>
                <Text style={styles.sectionMeta}>{(completed || s.key < stage) ? 'Done · ' : ''}{items.length} file{items.length === 1 ? '' : 's'}</Text>
              </View>
              {groups.length > 1 && groups.map((g) => (
                <View key={g.day}>
                  <Text style={styles.day}>{format(parseISO(g.day), 'EEEE d MMM')} · {g.items.length}</Text>
                  <Thumbs items={g.items} onOpen={setPreview} onLongPress={removeMedia} />
                </View>
              ))}
              {groups.length <= 1 && (
                <Thumbs items={items} onOpen={setPreview} onLongPress={removeMedia} onAdd={current ? openCamera : undefined} />
              )}
              {groups.length > 1 && current && <Thumbs items={[]} onOpen={setPreview} onLongPress={removeMedia} onAdd={openCamera} />}
            </View>
          );
        })}

        <View style={styles.reports}>
          <Pressable style={styles.report} onPress={() => exportReport('client')} disabled={exporting !== null}>
            <View style={styles.reportHead}><Text style={styles.reportTitle}>{exporting === 'client' ? 'Preparing…' : 'Client report'}</Text><Icon name="arrow" size={15} /></View>
            <Text style={styles.reportSub}>{completed || stage === 3 ? 'Installation proof, before and after' : stage === 0 ? 'Sample photos for approval' : 'Progress update'}</Text>
          </Pressable>
          <Pressable style={styles.report} onPress={() => exportReport('internal')} disabled={exporting !== null}>
            <View style={styles.reportHead}><Text style={styles.reportTitle}>{exporting === 'internal' ? 'Preparing…' : 'Internal record'}</Text><Icon name="arrow" size={15} /></View>
            <Text style={styles.reportSub}>Every stage and note</Text>
          </Pressable>
        </View>

        {order.notes ? <Text style={styles.notes}>{order.notes}</Text> : null}
        <Text style={styles.hint}>Press and hold a photo to delete it. Tap a finished stage to move back.</Text>
      </ScrollView>

      <View style={styles.bottom}>
        <Pressable style={styles.primary} onPress={openCamera}>
          <Icon name="camera" size={20} color={colors.accentInk} strokeWidth={1.9} />
          <Text style={styles.primaryText}>Photo · {stageLabel(completed ? 3 : stage)}</Text>
        </Pressable>
      </View>

      <Modal visible={preview !== null} animationType="fade" onRequestClose={() => setPreview(null)}>
        {preview && <MediaPreview item={preview} onClose={() => setPreview(null)} />}
      </Modal>
    </SafeAreaView>
  );
}

function Thumbs({ items, onOpen, onLongPress, onAdd }: { items: MediaItem[]; onOpen: (m: MediaItem) => void; onLongPress: (m: MediaItem) => void; onAdd?: () => void }) {
  return (
    <View style={styles.thumbs}>
      {items.map((m) => (
        <Pressable key={m.id} style={styles.thumbCell} onPress={() => onOpen(m)} onLongPress={() => onLongPress(m)} accessibilityLabel={m.fileName}>
          {m.type === 'photo' ? (
            <Image source={{ uri: m.filePath }} style={styles.thumbImg} />
          ) : (
            <View style={[styles.thumbImg, styles.thumbVideo]}><Icon name="video" size={20} color={colors.textSecondary} /></View>
          )}
          {m.side && <Text style={styles.side}>{m.side === 'before' ? 'Before' : 'After'}</Text>}
        </Pressable>
      ))}
      {onAdd && (
        <Pressable style={[styles.thumbCell, styles.addCell]} onPress={onAdd} accessibilityLabel="Add photo">
          <Icon name="plus" size={20} color={colors.textMuted} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingHorizontal: spacing.xl, paddingBottom: 120 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', height: 48, marginTop: spacing.sm },
  round: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  crumb: { fontFamily: fonts.family, fontSize: 13, color: colors.textMuted, marginTop: spacing.lg },
  title: { fontFamily: fonts.family, fontSize: 29, letterSpacing: -0.5, lineHeight: 33, color: colors.textPrimary, marginTop: 4 },
  dueRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.danger },
  dueText: { fontFamily: fonts.family, fontSize: 14, color: colors.textMuted },
  dueOver: { color: colors.danger },
  stepper: { flexDirection: 'row', marginTop: spacing.xl },
  stepLine: { position: 'absolute', left: '12%', right: '12%', top: 13, height: 2, backgroundColor: colors.border },
  step: { flex: 1, alignItems: 'center', gap: 6 },
  stepDot: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  stepDone: { backgroundColor: colors.success },
  stepNow: { backgroundColor: colors.accent, borderWidth: 4, borderColor: colors.accentTint },
  stepNum: { fontFamily: fonts.family, fontSize: 12, color: colors.textMuted },
  stepNumNow: { color: colors.accentInk, fontWeight: '600' },
  stepLabel: { fontFamily: fonts.family, fontSize: 12, color: colors.textMuted },
  stepLabelNow: { color: colors.textPrimary },
  next: { marginTop: spacing.lg, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md },
  nextText: { fontFamily: fonts.family, fontSize: 14, lineHeight: 21, color: colors.textSecondary },
  nextBtn: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, height: 40, paddingHorizontal: spacing.lg, borderRadius: radius.pill, backgroundColor: colors.selected },
  nextBtnText: { fontFamily: fonts.family, fontSize: 14, color: colors.selectedText },
  section: { marginTop: spacing.xl },
  future: { opacity: 0.45 },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: spacing.sm },
  sectionTitle: { fontFamily: fonts.family, fontSize: 15, fontWeight: '500', color: colors.textPrimary },
  sectionMeta: { fontFamily: fonts.family, fontSize: 12.5, color: colors.textMuted },
  day: { fontFamily: fonts.family, fontSize: 12, color: colors.textMuted, marginTop: spacing.sm, marginBottom: 6 },
  thumbs: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  thumbCell: { width: `${100 / THUMBS_PER_ROW - 2}%`, aspectRatio: 1, borderRadius: 12, overflow: 'hidden' },
  thumbImg: { width: '100%', height: '100%', borderRadius: 12 },
  thumbVideo: { backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  addCell: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  side: { position: 'absolute', left: 4, bottom: 4, fontFamily: fonts.family, fontSize: 9.5, color: colors.textPrimary, backgroundColor: 'rgba(15,20,28,0.7)', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 5, overflow: 'hidden' },
  reports: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xl },
  report: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, gap: 2 },
  reportHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reportTitle: { fontFamily: fonts.family, fontSize: 14, fontWeight: '500', color: colors.textPrimary },
  reportSub: { fontFamily: fonts.family, fontSize: 12, color: colors.textMuted, lineHeight: 16 },
  notes: { fontFamily: fonts.family, fontSize: 15, lineHeight: 23, color: colors.textSecondary, marginTop: spacing.xl },
  hint: { fontFamily: fonts.family, fontSize: 12, color: colors.textMuted, marginTop: spacing.xl, textAlign: 'center' },
  bottom: { position: 'absolute', left: spacing.xl, right: spacing.xl, bottom: spacing.xl },
  primary: { height: 56, borderRadius: radius.pill, backgroundColor: colors.accent, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, ...{ elevation: 6 } },
  primaryText: { fontFamily: fonts.family, fontSize: 16, fontWeight: '500', color: colors.accentInk },
});
