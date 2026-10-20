import { useEffect, useRef, useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions, useMicrophonePermissions, type CameraMode } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { saveCapturedMedia } from '../services/storage';
import { addMediaItem } from '../db/mediaItems';
import { getOrderById } from '../db/orders';
import type { PhotoSide, Stage } from '../types/models';
import { STAGES, stepLabel, stepsFor, type ProductionStepKey } from '../utils/stages';
import { Icon } from '../components/Icon';
import { colors, fonts, radius, spacing } from '../theme/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Capture'>;

/** Text on the camera's dark overlay: always light, whatever the app palette. */
const OVERLAY_TEXT = '#C9D1DC';

/**
 * Multi-shot camera. Stays open between shots (a typical job is 10–15
 * photos), files every shot under the chosen stage, and on Installed pairs
 * Before / After shots for the installation proof. Each shot is saved the
 * moment it's taken, so closing never loses anything. In Production, shots
 * are also filed under the step (machining / fabricating / finishing).
 */
export function CaptureScreen({ route, navigation }: Props) {
  const { orderId, ceNumber } = route.params;
  const [stage, setStage] = useState<Stage>(route.params.stage ?? 0);
  const [side, setSide] = useState<PhotoSide>('before');
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [microphonePermission, requestMicrophonePermission] = useMicrophonePermissions();
  const [mode, setMode] = useState<CameraMode>('picture');
  const [isRecording, setIsRecording] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [count, setCount] = useState(0);
  const [lastUri, setLastUri] = useState<string | null>(null);
  const cameraRef = useRef<CameraView>(null);
  const insets = useSafeAreaInsets();
  const [steps, setSteps] = useState<ProductionStepKey[]>([]);
  const [step, setStep] = useState<string | null>(route.params.step ?? null);

  // The order's own production steps (machining / fabricating / finishing as needed).
  useEffect(() => {
    getOrderById(orderId).then((order) => {
      if (!order) return;
      const list = stepsFor(order);
      setSteps(list);
      setStep((current) => current ?? list[Math.min(order.productionStep ?? 0, list.length - 1)] ?? null);
    });
  }, [orderId]);
  const discardNextRecording = useRef(false);

  if (!cameraPermission || !microphonePermission) {
    return <SafeAreaView style={styles.container} />;
  }

  if (!cameraPermission.granted || !microphonePermission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionPrompt}>
          <Text style={styles.permissionText}>BPD Capture needs camera and microphone access to record job photos and videos.</Text>
          <Pressable
            style={styles.permissionButton}
            onPress={async () => {
              await requestCameraPermission();
              await requestMicrophonePermission();
            }}
          >
            <Text style={styles.permissionButtonText}>Grant access</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const persistCapture = async (uri: string, type: 'photo' | 'video') => {
    setIsSaving(true);
    try {
      const saved = await saveCapturedMedia(ceNumber, uri, type);
      await addMediaItem(orderId, type, saved.filePath, saved.fileName, stage, stage === 3 ? side : null, stage === 1 ? step : null);
      setCount((n) => n + 1);
      if (type === 'photo') setLastUri(saved.filePath);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      // After a "before" shot in store, the natural next shot is its "after".
      if (stage === 3 && side === 'before') setSide('after');
    } catch {
      Alert.alert('Save failed', 'Could not save this capture. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleShutterPress = async () => {
    if (isSaving) return;
    if (mode === 'picture') {
      const photo = await cameraRef.current?.takePictureAsync();
      if (photo?.uri) await persistCapture(photo.uri, 'photo');
      return;
    }
    if (isRecording) {
      cameraRef.current?.stopRecording();
      return;
    }
    setIsRecording(true);
    const video = await cameraRef.current?.recordAsync();
    setIsRecording(false);
    if (discardNextRecording.current) {
      discardNextRecording.current = false;
      return;
    }
    if (video?.uri) await persistCapture(video.uri, 'video');
  };

  const close = () => {
    if (isRecording) {
      discardNextRecording.current = true;
      cameraRef.current?.stopRecording();
    }
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <CameraView ref={cameraRef} style={styles.camera} facing="back" mode={mode} />

      <View style={styles.overlay} pointerEvents="box-none">
        <View style={[styles.head, { paddingTop: insets.top + spacing.sm }]}>
          <Pressable style={styles.round} onPress={close} accessibilityLabel={isRecording ? 'Stop and discard' : 'Close camera'}>
            <Icon name="close" size={20} color="#FFFFFF" />
          </Pressable>
          <View style={styles.headInfo}>
            <Text style={styles.headTitle}>{ceNumber}</Text>
            <Text style={styles.headSub}>Saves to {STAGES[stage].label}{stage === 3 ? ` · ${side === 'before' ? 'Before' : 'After'}` : ''}{stage === 1 && step ? ` · ${stepLabel(step)}` : ''}</Text>
          </View>
          <View style={styles.counter}><Text style={styles.counterText}>{count}</Text></View>
        </View>

        <View style={[styles.tray, { paddingBottom: insets.bottom + spacing.md }]}>
          <View style={styles.pills}>
            {STAGES.map((s) => (
              <Pressable key={s.key} style={[styles.pill, stage === s.key && styles.pillOn]} onPress={() => !isRecording && setStage(s.key)}>
                <Text style={[styles.pillText, stage === s.key && styles.pillTextOn]}>{s.label}</Text>
              </Pressable>
            ))}
          </View>
          {stage === 1 && steps.length > 0 && (
            <View style={styles.pills}>
              {steps.map((k) => (
                <Pressable key={k} style={[styles.sidePill, step === k && styles.sidePillOn]} onPress={() => !isRecording && setStep(k)}>
                  <Text style={[styles.pillText, step === k && styles.sideTextOn]}>{stepLabel(k)}</Text>
                </Pressable>
              ))}
            </View>
          )}
          {stage === 3 && (
            <View style={styles.pills}>
              {(['before', 'after'] as PhotoSide[]).map((s) => (
                <Pressable key={s} style={[styles.sidePill, side === s && styles.sidePillOn]} onPress={() => setSide(s)}>
                  <Text style={[styles.pillText, side === s && styles.sideTextOn]}>{s === 'before' ? 'Before' : 'After'}</Text>
                </Pressable>
              ))}
            </View>
          )}

          <View style={styles.shutterRow}>
            <View style={styles.side3}>
              {lastUri ? <Image source={{ uri: lastUri }} style={styles.last} /> : <View style={[styles.last, styles.lastEmpty]} />}
            </View>
            <Pressable style={[styles.shutter, isRecording && styles.shutterRecording]} onPress={handleShutterPress} disabled={isSaving} accessibilityLabel={mode === 'picture' ? 'Take photo' : isRecording ? 'Stop recording' : 'Start recording'}>
              <View style={[styles.shutterInner, isRecording && styles.shutterInnerRecording]} />
            </Pressable>
            <View style={[styles.side3, styles.modes]}>
              <Pressable onPress={() => !isRecording && setMode('picture')}><Text style={[styles.mode, mode === 'picture' && styles.modeOn]}>Photo</Text></Pressable>
              <Pressable onPress={() => !isRecording && setMode('video')}><Text style={[styles.mode, mode === 'video' && styles.modeOn]}>Video</Text></Pressable>
            </View>
          </View>

          <Pressable style={styles.done} onPress={close}>
            <Text style={styles.doneText}>{count === 0 ? 'Done' : `Done · ${count} saved`}</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFill, justifyContent: 'space-between' },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  round: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(15,20,28,0.6)', alignItems: 'center', justifyContent: 'center' },
  headInfo: { flex: 1, backgroundColor: 'rgba(15,20,28,0.6)', borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 6 },
  headTitle: { fontFamily: fonts.family, fontSize: 14, fontWeight: '500', color: '#FFFFFF' },
  headSub: { fontFamily: fonts.family, fontSize: 12, color: OVERLAY_TEXT },
  counter: { minWidth: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(15,20,28,0.6)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  counterText: { fontFamily: fonts.family, fontSize: 16, fontWeight: '500', color: '#FFFFFF' },
  tray: { gap: spacing.md, paddingHorizontal: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.lg, backgroundColor: 'rgba(11,15,21,0.55)' },
  pills: { flexDirection: 'row', justifyContent: 'center', gap: 6, flexWrap: 'wrap' },
  pill: { height: 34, paddingHorizontal: 12, borderRadius: radius.pill, backgroundColor: 'rgba(23,32,48,0.85)', justifyContent: 'center' },
  pillOn: { backgroundColor: colors.accent },
  pillText: { fontFamily: fonts.family, fontSize: 13, color: OVERLAY_TEXT },
  pillTextOn: { color: colors.accentInk, fontWeight: '500' },
  sidePill: { height: 30, paddingHorizontal: 12, borderRadius: radius.pill, backgroundColor: 'rgba(23,32,48,0.85)', justifyContent: 'center' },
  sidePillOn: { backgroundColor: colors.selected, borderWidth: 1, borderColor: colors.accent },
  sideTextOn: { color: colors.selectedText },
  shutterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  side3: { flex: 1 },
  last: { width: 48, height: 48, borderRadius: 12 },
  lastEmpty: { backgroundColor: 'rgba(23,32,48,0.85)' },
  modes: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.md },
  mode: { fontFamily: fonts.family, fontSize: 13, color: OVERLAY_TEXT },
  modeOn: { color: colors.accent, fontWeight: '500' },
  shutter: { width: 78, height: 78, borderRadius: 39, borderWidth: 4, borderColor: 'rgba(255,255,255,0.35)', alignItems: 'center', justifyContent: 'center' },
  shutterRecording: { borderColor: colors.danger },
  shutterInner: { width: 62, height: 62, borderRadius: 31, backgroundColor: '#F3F5F8' },
  shutterInnerRecording: { width: 28, height: 28, borderRadius: 6, backgroundColor: colors.danger },
  done: { alignSelf: 'center', height: 44, paddingHorizontal: spacing.xl, borderRadius: radius.pill, backgroundColor: 'rgba(23,32,48,0.85)', justifyContent: 'center' },
  doneText: { fontFamily: fonts.family, fontSize: 15, color: '#FFFFFF' },
  permissionPrompt: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 },
  permissionText: { fontFamily: fonts.family, color: '#fff', textAlign: 'center', fontSize: 15 },
  permissionButton: { backgroundColor: colors.accent, paddingVertical: 12, paddingHorizontal: 24, borderRadius: radius.pill },
  permissionButtonText: { fontFamily: fonts.family, color: colors.accentInk, fontWeight: '600' },
});
