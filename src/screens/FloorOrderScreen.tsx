import { useCallback, useMemo, useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { differenceInCalendarDays, format, parseISO } from 'date-fns';
import type { RootStackParamList } from '../navigation/types';
import {
  addOrderItem,
  deleteOrder,
  deleteOrderItem,
  getOrderById,
  listOrderItemsForOrder,
  listStageEventsForOrder,
  updateOrderHold,
  updateOrderItemCompletedQty,
  updateOrderLogistics,
  updateOrderProductionStep,
  updateOrderProductionSteps,
  updateOrderStage,
} from '../db/orders';
import { deleteMediaItem, listMediaForOrder } from '../db/mediaItems';
import { getNightShift, getOperator, getStaff, type NightShift } from '../db/team';
import { deleteMediaFile, deleteOrderDirectory } from '../services/storage';
import { exportAndShareJobReport } from '../services/reportPdf';
import { onSyncedData } from '../sync/syncService';
import type { MediaItem, Order, OrderItem, Stage, StageEvent } from '../types/models';
import { PRODUCTION_STEPS, STAGES, currentStep, nowLabel, stageLabel, stepLabel, stepsFor, type ProductionStepKey } from '../utils/stages';
import { applySignOff, clientActor, signOffFor, type SignOffPrompt } from '../utils/signOff';
import { Icon } from '../components/Icon';
import { MediaPreview } from '../components/MediaGrid';
import { colors as dayColors, fonts, nightColors, radius, spacing, stageColors } from '../theme/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Order'>;
type Palette = typeof dayColors;

/** Reasons a job gets stuck in the workshop, one tap each. */
const HOLD_REASONS = ['Waiting for parts', 'Waiting for material', 'Waiting for client', 'Machine down', 'Rework needed'];
const DISPATCH_METHODS = ['Own installer', 'Courier', 'Road freight', 'Client collects'];
const BIG = 64;
const TAP = 56;

/**
 * Floor Mode order screen, built for the bench: the stage band says what is
 * happening now in letters you can read from across the room, and there are
 * only two big actions, Take photo and "<step> done" (safety yellow, the one
 * thing that moves the job on). Counting pieces uses thumb-sized − / +.
 * Jobs at Installed switch to the dark Night Shift look when it's on Auto.
 */
export function FloorOrderScreen({ route, navigation }: Props) {
  const { orderId } = route.params;
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [order, setOrder] = useState<Order | null>(null);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [history, setHistory] = useState<StageEvent[]>([]);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [staff, setStaffList] = useState<string[]>([]);
  const [operator, setOperatorName] = useState<string | null>(null);
  const [nightSetting, setNightSetting] = useState<NightShift>('auto');
  const [preview, setPreview] = useState<MediaItem | null>(null);
  const [showAllPhotos, setShowAllPhotos] = useState(false);
  const [exporting, setExporting] = useState<'client' | 'internal' | null>(null);

  const [signOff, setSignOff] = useState<SignOffPrompt | null>(null);
  const [actor, setActor] = useState('');
  const [notes, setNotes] = useState('');
  const [addingItem, setAddingItem] = useState(false);
  const [holdOpen, setHoldOpen] = useState(false);
  const [holdText, setHoldText] = useState('');
  const [editingSteps, setEditingSteps] = useState<ProductionStepKey[] | null>(null);
  const [logistics, setLogistics] = useState<{ dispatchMethod: string; waybill: string; siteName: string } | null>(null);

  const reload = useCallback(async () => {
    const [fresh, files, events, ticket, team, me, night] = await Promise.all([
      getOrderById(orderId),
      listMediaForOrder(orderId),
      listStageEventsForOrder(orderId),
      listOrderItemsForOrder(orderId),
      getStaff(),
      getOperator(),
      getNightShift(),
    ]);
    setOrder(fresh);
    setMedia(files);
    setHistory(events);
    setItems(ticket);
    setStaffList(team);
    setOperatorName(me);
    setNightSetting(night);
  }, [orderId]);

  useFocusEffect(useCallback(() => { void reload(); }, [reload]));
  useFocusEffect(useCallback(() => onSyncedData(() => void reload()), [reload]));

  const completed = order?.status === 'completed';
  const night = nightSetting === 'on' || (nightSetting === 'auto' && order?.stage === 3 && !completed);
  const c = night ? nightColors : dayColors;
  const styles = useMemo(() => makeStyles(c), [c]);

  if (!order) return <View style={styles.container} />;

  const stage = order.stage;
  const steps = stepsFor(order);
  const step = currentStep(order);
  const stepIndex = Math.min(order.productionStep ?? 0, Math.max(steps.length - 1, 0));
  const band = completed ? stageColors[2] : stageColors[stage];
  const piecesDone = items.reduce((n, i) => n + i.completedQty, 0);
  const piecesTotal = items.reduce((n, i) => n + i.quantity, 0);

  const due = (() => {
    if (completed) return { text: order.completedAt ? `Completed ${format(parseISO(order.completedAt), 'd MMM yyyy')}` : 'Completed', late: false };
    if (!order.dueDate) return { text: 'No due date', late: false };
    const days = differenceInCalendarDays(parseISO(order.dueDate), new Date());
    if (days < 0) return { text: `${-days} day${days === -1 ? '' : 's'} late · was due ${format(parseISO(order.dueDate), 'EEE d MMM')}`, late: true };
    if (days === 0) return { text: 'Due today', late: false };
    return { text: `Due ${format(parseISO(order.dueDate), 'EEE d MMM')} · ${days} day${days === 1 ? '' : 's'} left`, late: false };
  })();

  const where = completed ? 'Completed' : stage === 1 && steps.length > 0 ? `Production · step ${stepIndex + 1} of ${steps.length}` : stageLabel(stage);
  const doneLabel = completed ? 'Reopen job' : stage === 0 ? 'Client approved' : stage === 3 ? 'Installed' : `${nowLabel(order)} done`;

  const openSignOff = () => {
    const prompt = signOffFor(order, operator);
    setActor(prompt.defaultActor);
    setNotes('');
    setSignOff(prompt);
  };

  const confirmSignOff = async () => {
    if (!signOff) return;
    if (!actor.trim()) {
      Alert.alert('Who signed it off?', 'Tap a name or type one. Add your team under Settings so names are one tap.');
      return;
    }
    await applySignOff(order, signOff, actor, notes);
    setSignOff(null);
    await reload();
  };

  const openCamera = () => navigation.navigate('Capture', { orderId: order.id, ceNumber: order.ceNumber, stage: completed ? 3 : stage, step });

  const changeQty = async (item: OrderItem, delta: number) => {
    const next = Math.max(0, Math.min(item.quantity, item.completedQty + delta));
    if (next === item.completedQty) return;
    await updateOrderItemCompletedQty(item.id, next);
    await reload();
  };

  const removeItem = (item: OrderItem) =>
    Alert.alert('Remove this item?', item.description, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => { await deleteOrderItem(item.id); await reload(); } },
    ]);

  const moveBack = (target: Stage) => {
    if (target >= stage && !completed) return;
    Alert.alert(`Move back to ${stageLabel(target)}?`, 'Photos and sign-offs stay where they are.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Move back', onPress: async () => { await updateOrderStage(order.id, target, false); await reload(); } },
    ]);
  };

  const goToStep = (index: number) => {
    if (stage !== 1 || completed || index === stepIndex) return;
    Alert.alert(`Move to ${stepLabel(steps[index])}?`, undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Move', onPress: async () => { await updateOrderProductionStep(order.id, index); await reload(); } },
    ]);
  };

  const putOnHold = async (reason: string) => {
    if (!reason.trim()) return;
    await updateOrderHold(order.id, reason);
    setHoldOpen(false);
    setHoldText('');
    await reload();
  };

  const resume = async () => {
    await updateOrderHold(order.id, null);
    await reload();
  };

  const saveLogistics = async () => {
    if (!logistics) return;
    await updateOrderLogistics(order.id, logistics);
    setLogistics(null);
    await reload();
  };

  const exportReport = async (kind: 'client' | 'internal') => {
    const clientStage: Stage = completed ? 3 : stage;
    const list = kind === 'internal' ? media : media.filter((m) => m.stage === clientStage);
    if (list.length === 0) {
      Alert.alert('No photos yet', kind === 'client' ? `Take ${stageLabel(clientStage).toLowerCase()} photos first.` : 'Take some photos first.');
      return;
    }
    setExporting(kind);
    try {
      await exportAndShareJobReport(order, list);
    } catch {
      Alert.alert('Report not made', 'Could not create the report. Please try again.');
    } finally {
      setExporting(null);
    }
  };

  const confirmDelete = () =>
    Alert.alert('Delete this job?', 'This permanently deletes the job and all its photos and videos.', [
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

  const removeMedia = (item: MediaItem) =>
    Alert.alert('Delete this file?', item.fileName, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteMediaFile(item.filePath); await deleteMediaItem(item.id); await reload(); } },
    ]);

  // Photos for what is happening now: this production step, or this stage.
  const nowMedia = media.filter((m) => m.stage === (completed ? 3 : stage) && (stage !== 1 || !step || m.step === step));
  const thumb = Math.floor((Math.min(width, 720) - spacing.lg * 2 - 8 * 2) / 3);
  const nameChoices = [...(stage === 0 && !completed ? [clientActor(order)] : []), ...staff];

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xxl }} keyboardShouldPersistTaps="handled">
        <View style={[styles.band, { backgroundColor: band, paddingTop: insets.top + spacing.sm }]}>
          <View style={styles.bandTop}>
            <Pressable style={styles.bandButton} onPress={() => navigation.goBack()} accessibilityLabel="Back">
              <Icon name="back" size={26} color="#FFFFFF" strokeWidth={2.2} />
            </Pressable>
            <Text style={styles.bandCrumb} numberOfLines={1}>{order.ceNumber}{order.clientName ? ` · ${order.clientName}` : ''}</Text>
          </View>
          <Text style={styles.bandWhere}>{where}</Text>
          <Text style={styles.bandNow} numberOfLines={1} adjustsFontSizeToFit>{nowLabel(order)}</Text>
          <Text style={styles.bandProject}>{order.projectName || order.ceNumber}</Text>
          <View style={styles.dueRow}>
            {due.late ? <Text style={styles.lateChip}>LATE</Text> : null}
            <Text style={styles.bandDue}>{due.text}</Text>
          </View>
        </View>

        {order.holdReason ? (
          <View style={styles.hold}>
            <View style={{ flex: 1 }}>
              <Text style={styles.holdLabel}>ON HOLD</Text>
              <Text style={styles.holdReason}>{order.holdReason}</Text>
            </View>
            <Pressable style={styles.holdResume} onPress={() => void resume()}>
              <Text style={styles.holdResumeText}>Resume</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.ticks}>
          {STAGES.map((s) => {
            const done = completed || s.key < stage;
            const now = !completed && s.key === stage;
            const label = s.key === 1 && now && steps.length > 0 ? `Prod ${stepIndex + 1}/${steps.length}` : s.key === 3 ? 'Install' : s.key === 1 ? 'Prod' : s.label;
            return (
              <Pressable
                key={s.key}
                onPress={() => moveBack(s.key)}
                style={[styles.tick, { backgroundColor: done || now ? stageColors[s.key] : c.border }, now && styles.tickNow]}
                accessibilityLabel={`${s.label}${done ? ', done' : now ? ', now' : ''}`}
              >
                <Text style={[styles.tickText, !(done || now) && { color: c.textMuted }]}>{done ? `✓ ${label}` : label}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.actions}>
          <Pressable style={[styles.bigButton, styles.photoButton]} onPress={openCamera} accessibilityLabel="Take photo">
            <Icon name="camera" size={28} color={c.background} strokeWidth={2.1} />
            <Text style={[styles.bigText, { color: c.background }]}>Take photo</Text>
            {nowMedia.length > 0 && <Text style={[styles.bigCount, { color: c.background }]}>{nowMedia.length}</Text>}
          </Pressable>
          <Pressable style={[styles.bigButton, completed ? styles.ghostButton : styles.doneButton]} onPress={openSignOff} accessibilityLabel={doneLabel}>
            <Icon name="check" size={28} color={completed ? c.textPrimary : c.accentInk} strokeWidth={2.4} />
            <Text style={[styles.bigText, { color: completed ? c.textPrimary : c.accentInk }]} numberOfLines={1} adjustsFontSizeToFit>{doneLabel}</Text>
          </Pressable>
        </View>

        {stage === 1 && !completed && steps.length > 1 && (
          <View style={styles.stepRow}>
            {steps.map((k, i) => {
              const done = i < stepIndex;
              const now = i === stepIndex;
              return (
                <Pressable key={k} style={[styles.stepChip, done && styles.stepChipDone, now && styles.stepChipNow]} onPress={() => goToStep(i)}>
                  <Text style={[styles.stepChipText, now && styles.stepChipTextNow]}>{done ? '✓ ' : ''}{stepLabel(k)}</Text>
                </Pressable>
              );
            })}
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Count pieces</Text>
            {piecesTotal > 0 && <Text style={styles.sectionMeta}>{piecesDone} of {piecesTotal}</Text>}
          </View>
          {items.length === 0 && <Text style={styles.empty}>No work ticket items yet. Add each line from the SO work ticket to count pieces as they are made.</Text>}
          {items.map((item) => (
            <Pressable key={item.id} style={[styles.item, item.isCompleted && styles.itemDone]} onLongPress={() => removeItem(item)} delayLongPress={600}>
              <View style={styles.itemBody}>
                <Text style={styles.itemName} numberOfLines={2}>{item.description}</Text>
                <Text style={styles.itemMeta} numberOfLines={1}>
                  of {item.quantity}{item.size ? ` · ${item.size}` : ''}{item.material ? ` · ${item.material}` : ''}{item.step ? ` · ${stepLabel(item.step)}` : ''}
                </Text>
              </View>
              <Pressable style={styles.qtyButton} onPress={() => void changeQty(item, -1)} accessibilityLabel={`One less ${item.description}`}>
                <Text style={styles.qtyButtonText}>−</Text>
              </Pressable>
              <Text style={[styles.qty, item.isCompleted && { color: c.success }]}>{item.completedQty}</Text>
              <Pressable style={styles.qtyButton} onPress={() => void changeQty(item, 1)} accessibilityLabel={`One more ${item.description}`}>
                <Text style={styles.qtyButtonText}>+</Text>
              </Pressable>
            </Pressable>
          ))}
          <Pressable style={styles.outlineButton} onPress={() => setAddingItem(true)}>
            <Icon name="plus" size={22} color={c.textPrimary} strokeWidth={2.2} />
            <Text style={styles.outlineText}>Add item</Text>
          </Pressable>
          {items.length > 0 && <Text style={styles.hint}>Press and hold an item to remove it.</Text>}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Photos · {step ? stepLabel(step) : stageLabel(completed ? 3 : stage)}</Text>
            <Pressable onPress={() => setShowAllPhotos((v) => !v)} hitSlop={12}>
              <Text style={styles.sectionLink}>{showAllPhotos ? 'Hide others' : `All ${media.length}`}</Text>
            </Pressable>
          </View>
          <View style={styles.thumbs}>
            {nowMedia.map((m) => <Thumb key={m.id} item={m} size={thumb} styles={styles} c={c} onOpen={setPreview} onLongPress={removeMedia} />)}
            <Pressable style={[styles.addThumb, { width: thumb, height: thumb }]} onPress={openCamera} accessibilityLabel="Add photo">
              <Icon name="camera" size={26} color={c.textMuted} />
            </Pressable>
          </View>
          {showAllPhotos && STAGES.map((s) => {
            const list = media.filter((m) => m.stage === s.key && !nowMedia.includes(m));
            if (list.length === 0) return null;
            return (
              <View key={s.key}>
                <Text style={styles.groupLabel}>{s.label} · {list.length}</Text>
                <View style={styles.thumbs}>
                  {list.map((m) => <Thumb key={m.id} item={m} size={thumb} styles={styles} c={c} onOpen={setPreview} onLongPress={removeMedia} />)}
                </View>
              </View>
            );
          })}
        </View>

        {(stage >= 2 || completed || order.dispatchMethod || order.siteName) && (
          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>Dispatch & site</Text>
              <Pressable onPress={() => setLogistics({ dispatchMethod: order.dispatchMethod ?? '', waybill: order.waybill ?? '', siteName: order.siteName ?? '' })} hitSlop={12}>
                <Text style={styles.sectionLink}>Edit</Text>
              </Pressable>
            </View>
            <Fact label="Sent by" value={order.dispatchMethod} styles={styles} />
            <Fact label="Waybill" value={order.waybill} styles={styles} />
            <Fact label="Store / site" value={order.siteName} styles={styles} />
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Sign-offs</Text>
            <Text style={styles.sectionMeta}>{history.length}</Text>
          </View>
          {history.length === 0 && <Text style={styles.empty}>Nobody has signed off a stage yet. Each "done" records who and when.</Text>}
          {[...history].reverse().map((e) => (
            <View key={e.id} style={styles.event}>
              <View style={[styles.eventDot, { backgroundColor: stageColors[e.stage] ?? c.textMuted }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.eventAction}>{e.action}</Text>
                <Text style={styles.eventMeta}>{e.actor} · {format(parseISO(e.createdAt), 'EEE d MMM, HH:mm')}</Text>
                {e.notes ? <Text style={styles.eventNotes}>{e.notes}</Text> : null}
              </View>
            </View>
          ))}
        </View>

        <View style={[styles.section, styles.reportRow]}>
          <Pressable style={[styles.outlineButton, styles.flex]} onPress={() => void exportReport('client')} disabled={exporting !== null}>
            <Icon name="file" size={20} color={c.textPrimary} />
            <Text style={styles.outlineText}>{exporting === 'client' ? 'Making…' : 'Client report'}</Text>
          </Pressable>
          <Pressable style={[styles.outlineButton, styles.flex]} onPress={() => void exportReport('internal')} disabled={exporting !== null}>
            <Icon name="file" size={20} color={c.textPrimary} />
            <Text style={styles.outlineText}>{exporting === 'internal' ? 'Making…' : 'Office record'}</Text>
          </Pressable>
        </View>

        {order.notes ? <Text style={styles.notes}>{order.notes}</Text> : null}

        <View style={styles.footer}>
          {!order.holdReason && !completed && (
            <Pressable style={styles.footerButton} onPress={() => setHoldOpen(true)}><Text style={styles.footerText}>Put on hold</Text></Pressable>
          )}
          <Pressable style={styles.footerButton} onPress={() => navigation.navigate('JobDetail', { orderId: order.id })}><Text style={styles.footerText}>Edit details</Text></Pressable>
          <Pressable style={styles.footerButton} onPress={() => setEditingSteps(steps)}><Text style={styles.footerText}>Production steps</Text></Pressable>
          <Pressable style={styles.footerButton} onPress={confirmDelete}><Text style={[styles.footerText, { color: c.danger }]}>Delete job</Text></Pressable>
        </View>
      </ScrollView>

      {/* Sign-off */}
      <Sheet visible={signOff !== null} onClose={() => setSignOff(null)} styles={styles}>
        <Text style={styles.sheetTitle}>{signOff?.title}</Text>
        <Text style={styles.sheetSub}>{signOff?.subtitle}</Text>
        <Text style={styles.inputLabel}>Signed off by</Text>
        {nameChoices.length > 0 && (
          <View style={styles.choiceWrap}>
            {nameChoices.map((name) => (
              <Pressable key={name} style={[styles.choice, actor === name && styles.choiceOn]} onPress={() => setActor(name)}>
                <Text style={[styles.choiceText, actor === name && styles.choiceTextOn]}>{name}</Text>
              </Pressable>
            ))}
          </View>
        )}
        <TextInput value={actor} onChangeText={setActor} placeholder={staff.length ? 'Or type a name' : 'Name (add your team under Settings)'} placeholderTextColor={c.textMuted} style={styles.input} />
        <Text style={styles.inputLabel}>Note (optional)</Text>
        <TextInput value={notes} onChangeText={setNotes} placeholder={signOff?.stage === 0 ? 'e.g. Approved by email' : 'e.g. Edges checked, all 12 done'} placeholderTextColor={c.textMuted} style={styles.input} />
        <Pressable style={[styles.bigButton, styles.doneButton, styles.sheetButton]} onPress={() => void confirmSignOff()}>
          <Icon name="check" size={26} color={c.accentInk} strokeWidth={2.4} />
          <Text style={[styles.bigText, { color: c.accentInk }]}>Sign off</Text>
        </Pressable>
      </Sheet>

      {/* Add work ticket item */}
      <AddItemSheet visible={addingItem} onClose={() => setAddingItem(false)} styles={styles} c={c} steps={steps} onAdd={async (item) => { await addOrderItem(order.id, item); setAddingItem(false); await reload(); }} />

      {/* Hold */}
      <Sheet visible={holdOpen} onClose={() => setHoldOpen(false)} styles={styles}>
        <Text style={styles.sheetTitle}>Put on hold</Text>
        <Text style={styles.sheetSub}>Shows on the job list so everyone knows why it is not moving.</Text>
        <View style={styles.choiceWrap}>
          {HOLD_REASONS.map((r) => (
            <Pressable key={r} style={styles.choice} onPress={() => void putOnHold(r)}>
              <Text style={styles.choiceText}>{r}</Text>
            </Pressable>
          ))}
        </View>
        <TextInput value={holdText} onChangeText={setHoldText} placeholder="Or type a reason" placeholderTextColor={c.textMuted} style={styles.input} onSubmitEditing={() => void putOnHold(holdText)} returnKeyType="done" />
        <Pressable style={[styles.bigButton, styles.photoButton, styles.sheetButton]} onPress={() => void putOnHold(holdText)}>
          <Text style={[styles.bigText, { color: c.background }]}>Put on hold</Text>
        </Pressable>
      </Sheet>

      {/* Dispatch & site */}
      <Sheet visible={logistics !== null} onClose={() => setLogistics(null)} styles={styles}>
        <Text style={styles.sheetTitle}>Dispatch & site</Text>
        <Text style={styles.inputLabel}>Sent by</Text>
        <View style={styles.choiceWrap}>
          {DISPATCH_METHODS.map((m) => (
            <Pressable key={m} style={[styles.choice, logistics?.dispatchMethod === m && styles.choiceOn]} onPress={() => setLogistics((l) => (l ? { ...l, dispatchMethod: m } : l))}>
              <Text style={[styles.choiceText, logistics?.dispatchMethod === m && styles.choiceTextOn]}>{m}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.inputLabel}>Waybill or tracking number</Text>
        <TextInput value={logistics?.waybill ?? ''} onChangeText={(t) => setLogistics((l) => (l ? { ...l, waybill: t } : l))} placeholder="e.g. RAM 4471 2289" placeholderTextColor={c.textMuted} style={styles.input} autoCapitalize="characters" />
        <Text style={styles.inputLabel}>Store or site</Text>
        <TextInput value={logistics?.siteName ?? ''} onChangeText={(t) => setLogistics((l) => (l ? { ...l, siteName: t } : l))} placeholder="e.g. Sandton City, upper level" placeholderTextColor={c.textMuted} style={styles.input} />
        <Pressable style={[styles.bigButton, styles.photoButton, styles.sheetButton]} onPress={() => void saveLogistics()}>
          <Text style={[styles.bigText, { color: c.background }]}>Save</Text>
        </Pressable>
      </Sheet>

      {/* Production steps */}
      <Sheet visible={editingSteps !== null} onClose={() => setEditingSteps(null)} styles={styles}>
        <Text style={styles.sheetTitle}>Production steps</Text>
        <Text style={styles.sheetSub}>Tick the steps this job needs. Changing them restarts Production at the first step.</Text>
        {PRODUCTION_STEPS.map((p) => {
          const on = editingSteps?.includes(p.key) ?? false;
          return (
            <Pressable key={p.key} style={styles.checkRow} onPress={() => setEditingSteps((cur) => (cur ? (on ? cur.filter((k) => k !== p.key) : [...cur, p.key]) : cur))}>
              <View style={[styles.checkBox, on && styles.checkBoxOn]}>{on && <Icon name="check" size={20} color={c.accentInk} strokeWidth={2.6} />}</View>
              <View style={{ flex: 1 }}>
                <Text style={styles.checkTitle}>{p.label}</Text>
                <Text style={styles.sheetSub}>{p.hint}</Text>
              </View>
            </Pressable>
          );
        })}
        <Pressable
          style={[styles.bigButton, styles.photoButton, styles.sheetButton]}
          onPress={async () => {
            if (!editingSteps) return;
            await updateOrderProductionSteps(order.id, PRODUCTION_STEPS.map((p) => p.key).filter((k) => editingSteps.includes(k)).join(','));
            setEditingSteps(null);
            await reload();
          }}
        >
          <Text style={[styles.bigText, { color: c.background }]}>Save steps</Text>
        </Pressable>
      </Sheet>

      <Modal visible={preview !== null} animationType="fade" onRequestClose={() => setPreview(null)}>
        {preview && <MediaPreview item={preview} onClose={() => setPreview(null)} />}
      </Modal>
    </View>
  );
}

type Styles = ReturnType<typeof makeStyles>;

function Thumb({ item, size, styles, c, onOpen, onLongPress }: { item: MediaItem; size: number; styles: Styles; c: Palette; onOpen: (m: MediaItem) => void; onLongPress: (m: MediaItem) => void }) {
  return (
    <Pressable style={[styles.thumb, { width: size, height: size }]} onPress={() => onOpen(item)} onLongPress={() => onLongPress(item)} accessibilityLabel={item.fileName}>
      {item.type === 'photo' ? (
        <Image source={{ uri: item.filePath }} style={styles.thumbImg} />
      ) : (
        <View style={[styles.thumbImg, styles.thumbVideo]}><Icon name="video" size={24} color={c.textSecondary} /></View>
      )}
      {item.side && <Text style={styles.side}>{item.side === 'before' ? 'BEFORE' : 'AFTER'}</Text>}
    </Pressable>
  );
}

function Fact({ label, value, styles }: { label: string; value: string | null | undefined; styles: Styles }) {
  return (
    <View style={styles.fact}>
      <Text style={styles.factLabel}>{label}</Text>
      <Text style={styles.factValue}>{value || '—'}</Text>
    </View>
  );
}

function Sheet({ visible, onClose, styles, children }: { visible: boolean; onClose: () => void; styles: Styles; children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.sheetBackdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
        <ScrollView style={styles.sheet} contentContainerStyle={[styles.sheetContent, { paddingBottom: insets.bottom + spacing.xl }]} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function AddItemSheet({ visible, onClose, onAdd, styles, c, steps }: {
  visible: boolean;
  onClose: () => void;
  onAdd: (item: Omit<OrderItem, 'id' | 'orderId' | 'createdAt'>) => Promise<void>;
  styles: Styles;
  c: Palette;
  steps: ProductionStepKey[];
}) {
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [size, setSize] = useState('');
  const [material, setMaterial] = useState('');
  const [step, setStep] = useState<string | null>(null);

  const save = async () => {
    if (!description.trim()) {
      Alert.alert('What is the item?', 'Type what is being made, e.g. "Plinth body".');
      return;
    }
    await onAdd({ description: description.trim(), quantity, completedQty: 0, size: size.trim() || null, material: material.trim() || null, process: null, step, isCompleted: false, wtNumber: null });
    setDescription('');
    setQuantity(1);
    setSize('');
    setMaterial('');
    setStep(null);
  };

  return (
    <Sheet visible={visible} onClose={onClose} styles={styles}>
      <Text style={styles.sheetTitle}>Add work ticket item</Text>
      <Text style={styles.inputLabel}>Item</Text>
      <TextInput value={description} onChangeText={setDescription} placeholder="e.g. Plinth body" placeholderTextColor={c.textMuted} style={styles.input} autoCapitalize="sentences" />
      <Text style={styles.inputLabel}>How many</Text>
      <View style={styles.qtyRow}>
        <Pressable style={styles.qtyButton} onPress={() => setQuantity((q) => Math.max(1, q - 1))} accessibilityLabel="Fewer"><Text style={styles.qtyButtonText}>−</Text></Pressable>
        <TextInput value={String(quantity)} onChangeText={(t) => setQuantity(Math.max(1, Math.min(9999, parseInt(t.replace(/[^0-9]/g, ''), 10) || 1)))} keyboardType="number-pad" style={[styles.input, styles.qtyInput]} />
        <Pressable style={styles.qtyButton} onPress={() => setQuantity((q) => Math.min(9999, q + 1))} accessibilityLabel="More"><Text style={styles.qtyButtonText}>+</Text></Pressable>
      </View>
      <Text style={styles.inputLabel}>Size and material (optional)</Text>
      <TextInput value={size} onChangeText={setSize} placeholder="e.g. 300 × 300 × 400 mm" placeholderTextColor={c.textMuted} style={styles.input} />
      <TextInput value={material} onChangeText={setMaterial} placeholder="e.g. 3 mm opal acrylic" placeholderTextColor={c.textMuted} style={[styles.input, { marginTop: spacing.sm }]} />
      {steps.length > 0 && (
        <>
          <Text style={styles.inputLabel}>Made at (optional)</Text>
          <View style={styles.choiceWrap}>
            {steps.map((k) => (
              <Pressable key={k} style={[styles.choice, step === k && styles.choiceOn]} onPress={() => setStep(step === k ? null : k)}>
                <Text style={[styles.choiceText, step === k && styles.choiceTextOn]}>{stepLabel(k)}</Text>
              </Pressable>
            ))}
          </View>
        </>
      )}
      <Pressable style={[styles.bigButton, styles.photoButton, styles.sheetButton]} onPress={() => void save()}>
        <Icon name="plus" size={24} color={c.background} strokeWidth={2.4} />
        <Text style={[styles.bigText, { color: c.background }]}>Add item</Text>
      </Pressable>
    </Sheet>
  );
}

function makeStyles(c: Palette) {
  const cond = { fontFamily: fonts.condensed, textTransform: 'uppercase' as const };
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    flex: { flex: 1 },
    band: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
    bandTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    bandButton: { width: 52, height: 52, borderRadius: radius.sm, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' },
    bandCrumb: { flex: 1, fontFamily: fonts.family, fontSize: 15, color: 'rgba(255,255,255,0.9)' },
    bandWhere: { ...cond, fontSize: 16, fontWeight: '600', letterSpacing: 0.8, color: 'rgba(255,255,255,0.85)', marginTop: spacing.lg },
    bandNow: { ...cond, fontSize: 54, lineHeight: 56, fontWeight: '700', color: '#FFFFFF', marginTop: 2 },
    bandProject: { fontFamily: fonts.family, fontSize: 18, fontWeight: '500', color: '#FFFFFF', marginTop: 4 },
    dueRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 6 },
    lateChip: { ...cond, fontSize: 14, fontWeight: '700', color: '#B83A22', backgroundColor: '#FFFFFF', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, overflow: 'hidden', letterSpacing: 0.6 },
    bandDue: { fontFamily: fonts.family, fontSize: 15, color: 'rgba(255,255,255,0.92)' },

    hold: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginHorizontal: spacing.lg, marginTop: spacing.lg, padding: spacing.md, borderRadius: radius.sm, backgroundColor: c.dangerTint, borderLeftWidth: 6, borderLeftColor: c.danger },
    holdLabel: { ...cond, fontSize: 15, fontWeight: '700', color: c.danger, letterSpacing: 0.8 },
    holdReason: { fontFamily: fonts.family, fontSize: 17, fontWeight: '600', color: c.textPrimary },
    holdResume: { height: 48, paddingHorizontal: spacing.lg, borderRadius: radius.sm, backgroundColor: c.textPrimary, justifyContent: 'center' },
    holdResumeText: { ...cond, fontSize: 18, fontWeight: '700', color: c.background },

    ticks: { flexDirection: 'row', gap: 4, marginHorizontal: spacing.lg, marginTop: spacing.lg },
    tick: { flex: 1, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 3 },
    tickNow: { borderWidth: 3, borderColor: c.textPrimary },
    tickText: { ...cond, fontSize: 14, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.3 },

    actions: { gap: spacing.sm, marginHorizontal: spacing.lg, marginTop: spacing.lg },
    bigButton: { height: BIG, borderRadius: radius.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.xl },
    photoButton: { backgroundColor: c.textPrimary },
    doneButton: { backgroundColor: c.accent },
    ghostButton: { borderWidth: 2, borderColor: c.textPrimary },
    bigText: { ...cond, flex: 1, fontSize: 24, fontWeight: '700', letterSpacing: 0.4 },
    bigCount: { ...cond, fontSize: 22, fontWeight: '700' },

    stepRow: { flexDirection: 'row', gap: spacing.sm, marginHorizontal: spacing.lg, marginTop: spacing.md, flexWrap: 'wrap' },
    stepChip: { height: 48, paddingHorizontal: spacing.lg, borderRadius: radius.sm, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, justifyContent: 'center' },
    stepChipDone: { backgroundColor: c.successTint, borderColor: c.successTint },
    stepChipNow: { borderWidth: 3, borderColor: c.textPrimary },
    stepChipText: { ...cond, fontSize: 17, fontWeight: '600', color: c.textSecondary },
    stepChipTextNow: { color: c.textPrimary, fontWeight: '700' },

    section: { marginHorizontal: spacing.lg, marginTop: spacing.xxl, gap: spacing.sm },
    sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
    sectionTitle: { ...cond, fontSize: 18, fontWeight: '700', color: c.textMuted, letterSpacing: 0.8 },
    sectionMeta: { ...cond, fontSize: 18, fontWeight: '700', color: c.textPrimary },
    sectionLink: { fontFamily: fonts.family, fontSize: 16, fontWeight: '600', color: c.textPrimary, textDecorationLine: 'underline' },
    empty: { fontFamily: fonts.family, fontSize: 15, lineHeight: 21, color: c.textMuted },
    hint: { fontFamily: fonts.family, fontSize: 13, color: c.textMuted, textAlign: 'center' },

    item: { flexDirection: 'row', alignItems: 'center', minHeight: TAP + 8, backgroundColor: c.surface, borderRadius: radius.sm, overflow: 'hidden' },
    itemDone: { borderLeftWidth: 6, borderLeftColor: c.success },
    itemBody: { flex: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
    itemName: { fontFamily: fonts.family, fontSize: 17, fontWeight: '600', color: c.textPrimary },
    itemMeta: { fontFamily: fonts.family, fontSize: 13.5, color: c.textMuted, marginTop: 2 },
    qtyButton: { width: TAP, height: TAP + 8, alignItems: 'center', justifyContent: 'center', backgroundColor: c.surfaceMuted },
    qtyButtonText: { fontFamily: fonts.family, fontSize: 30, fontWeight: '500', color: c.textPrimary, lineHeight: 34 },
    qty: { ...cond, width: 56, textAlign: 'center', fontSize: 26, fontWeight: '700', color: c.textPrimary },
    qtyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    qtyInput: { flex: 1, textAlign: 'center', fontSize: 22, fontWeight: '600' },

    outlineButton: { height: TAP, borderRadius: radius.sm, borderWidth: 2, borderColor: c.textPrimary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
    outlineText: { ...cond, fontSize: 19, fontWeight: '700', color: c.textPrimary, letterSpacing: 0.3 },
    reportRow: { flexDirection: 'row', gap: spacing.sm },

    thumbs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    thumb: { borderRadius: radius.sm, overflow: 'hidden' },
    thumbImg: { width: '100%', height: '100%' },
    thumbVideo: { backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center' },
    addThumb: { borderRadius: radius.sm, borderWidth: 2, borderStyle: 'dashed', borderColor: c.border, alignItems: 'center', justifyContent: 'center' },
    side: { position: 'absolute', left: 6, bottom: 6, ...cond, fontSize: 12, fontWeight: '700', color: '#FFFFFF', backgroundColor: 'rgba(0,0,0,0.65)', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 3, overflow: 'hidden' },
    groupLabel: { ...cond, fontSize: 15, fontWeight: '600', color: c.textMuted, marginTop: spacing.md, marginBottom: spacing.xs, letterSpacing: 0.6 },

    fact: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md, minHeight: 44, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: c.border },
    factLabel: { fontFamily: fonts.family, fontSize: 15, color: c.textMuted },
    factValue: { flex: 1, textAlign: 'right', fontFamily: fonts.family, fontSize: 16, fontWeight: '600', color: c.textPrimary },

    event: { flexDirection: 'row', gap: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: c.border },
    eventDot: { width: 12, height: 12, borderRadius: 2, marginTop: 6 },
    eventAction: { fontFamily: fonts.family, fontSize: 16, fontWeight: '600', color: c.textPrimary },
    eventMeta: { fontFamily: fonts.family, fontSize: 14, color: c.textMuted, marginTop: 1 },
    eventNotes: { fontFamily: fonts.family, fontSize: 14, color: c.textSecondary, marginTop: 3 },

    notes: { fontFamily: fonts.family, fontSize: 16, lineHeight: 23, color: c.textSecondary, marginHorizontal: spacing.lg, marginTop: spacing.xl },
    footer: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginHorizontal: spacing.lg, marginTop: spacing.xxl },
    footerButton: { height: 48, paddingHorizontal: spacing.lg, borderRadius: radius.sm, backgroundColor: c.surface, justifyContent: 'center' },
    footerText: { fontFamily: fonts.family, fontSize: 15, fontWeight: '600', color: c.textPrimary },

    sheetBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
    sheet: { maxHeight: '88%', flexGrow: 0, backgroundColor: c.background, borderTopLeftRadius: radius.md, borderTopRightRadius: radius.md },
    sheetContent: { padding: spacing.xl, gap: spacing.sm },
    sheetTitle: { ...cond, fontSize: 32, fontWeight: '700', color: c.textPrimary },
    sheetSub: { fontFamily: fonts.family, fontSize: 15, lineHeight: 21, color: c.textMuted },
    sheetButton: { marginTop: spacing.lg, justifyContent: 'center' },
    inputLabel: { ...cond, fontSize: 16, fontWeight: '700', color: c.textMuted, letterSpacing: 0.6, marginTop: spacing.md },
    input: { height: TAP, borderRadius: radius.sm, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, paddingHorizontal: spacing.md, fontFamily: fonts.family, fontSize: 18, color: c.textPrimary },
    choiceWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    choice: { minHeight: 52, paddingHorizontal: spacing.lg, borderRadius: radius.sm, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, justifyContent: 'center' },
    choiceOn: { backgroundColor: c.textPrimary, borderColor: c.textPrimary },
    choiceText: { fontFamily: fonts.family, fontSize: 17, fontWeight: '500', color: c.textPrimary },
    choiceTextOn: { color: c.background, fontWeight: '700' },
    checkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 64 },
    checkBox: { width: 36, height: 36, borderRadius: 4, borderWidth: 2, borderColor: c.textPrimary, alignItems: 'center', justifyContent: 'center' },
    checkBoxOn: { backgroundColor: c.accent, borderColor: c.accent },
    checkTitle: { fontFamily: fonts.family, fontSize: 18, fontWeight: '600', color: c.textPrimary },
  });
}
