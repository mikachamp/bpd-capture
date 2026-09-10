import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { Alert, Keyboard, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { format } from 'date-fns';
import * as ImagePicker from 'expo-image-picker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import {
  deleteOrder,
  getOrderById,
  updateOrderClientInfo,
  updateOrderDueDate,
  updateOrderNotes,
  updateOrderStatus,
} from '../db/orders';
import { addMediaItem, deleteMediaItem, listMediaForOrder, renameMediaItem } from '../db/mediaItems';
import { deleteMediaFile, deleteOrderDirectory, renameMediaFile, saveCapturedMedia } from '../services/storage';
import { exportAndShareJobReport } from '../services/reportPdf';
import type { MediaItem, Order, OrderStatus } from '../types/models';
import { MediaGrid } from '../components/MediaGrid';
import { StatusToggle } from '../components/StatusToggle';
import { DueDateChip } from '../components/DueDateChip';
import { colors, gradientAccent, radius, spacing, typography } from '../theme/theme';
import { usePressScale } from '../utils/usePressScale';

type Props = NativeStackScreenProps<RootStackParamList, 'JobDetail'>;

export function JobDetailScreen({ route, navigation }: Props) {
  const { orderId } = route.params;
  const [order, setOrder] = useState<Order | null>(null);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isExportingReport, setIsExportingReport] = useState(false);
  const [notesDraft, setNotesDraft] = useState('');
  const [clientNameDraft, setClientNameDraft] = useState('');
  const [projectNameDraft, setProjectNameDraft] = useState('');
  const [detailsLoadedFor, setDetailsLoadedFor] = useState<number | null>(null);

  useEffect(() => {
    if (order && detailsLoadedFor !== order.id) {
      setNotesDraft(order.notes ?? '');
      setClientNameDraft(order.clientName ?? '');
      setProjectNameDraft(order.projectName ?? '');
      setDetailsLoadedFor(order.id);
    }
  }, [order, detailsLoadedFor]);

  const reload = useCallback(async () => {
    const [freshOrder, freshMedia] = await Promise.all([getOrderById(orderId), listMediaForOrder(orderId)]);
    setOrder(freshOrder);
    setMedia(freshMedia);
  }, [orderId]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  const [justSaved, setJustSaved] = useState(false);

  const handleStatusChange = async (status: OrderStatus) => {
    await updateOrderStatus(orderId, status);
    reload();
  };

  const handleDueDateChange = async (dueDate: string | null) => {
    setOrder((prev) => (prev ? { ...prev, dueDate } : prev));
    await updateOrderDueDate(orderId, dueDate);
  };

  const handleRenameMedia = async (item: MediaItem, newBaseName: string) => {
    try {
      const renamed = await renameMediaFile(item.filePath, newBaseName);
      await renameMediaItem(item.id, renamed.fileName, renamed.filePath);
      await reload();
    } catch (error) {
      Alert.alert('Rename failed', 'Could not rename this file. Please try again.');
    }
  };

  const handleDeleteMedia = async (item: MediaItem) => {
    try {
      await deleteMediaFile(item.filePath);
      await deleteMediaItem(item.id);
      await reload();
    } catch (error) {
      Alert.alert('Delete failed', 'Could not delete this file. Please try again.');
    }
  };

  const handleNotesBlur = async () => {
    const trimmed = notesDraft.trim();
    if (trimmed === (order?.notes ?? '')) return;
    setOrder((prev) => (prev ? { ...prev, notes: trimmed || null } : prev));
    await updateOrderNotes(orderId, trimmed || null);
  };

  const handleClientInfoBlur = async () => {
    const trimmedClient = clientNameDraft.trim();
    const trimmedProject = projectNameDraft.trim();
    if (trimmedClient === (order?.clientName ?? '') && trimmedProject === (order?.projectName ?? '')) return;
    setOrder((prev) => (prev ? { ...prev, clientName: trimmedClient || null, projectName: trimmedProject || null } : prev));
    await updateOrderClientInfo(orderId, trimmedClient || null, trimmedProject || null);
  };

  const handleSaveAll = async () => {
    Keyboard.dismiss();
    await Promise.all([handleClientInfoBlur(), handleNotesBlur()]);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 1200);
  };

  const handleExportReport = async () => {
    if (!order) return;
    if (Platform.OS === 'web') {
      Alert.alert(
        'Not available in web preview',
        'Field report export reads photos directly off the device and only works in the installed Android app.'
      );
      return;
    }
    setIsExportingReport(true);
    try {
      await exportAndShareJobReport(order, media);
    } catch (error) {
      Alert.alert('Export failed', 'Could not generate the field report. Please try again.');
    } finally {
      setIsExportingReport(false);
    }
  };

  const handleDeleteJob = () => {
    if (!order) return;
    Alert.alert(
      'Delete this job?',
      `This permanently removes ${order.ceNumber} and all its photos/videos. This cannot be undone.`,
      [
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
      ]
    );
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      title: order?.ceNumber ?? 'Job Detail',
      headerRight: () => (
        <Pressable onPress={handleSaveAll} hitSlop={8}>
          <Text style={styles.headerSaveText}>{justSaved ? 'Saved ✓' : 'Save'}</Text>
        </Pressable>
      ),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation, order?.ceNumber, clientNameDraft, projectNameDraft, notesDraft, justSaved]);

  const handleUploadFromGallery = async () => {
    if (!order) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow access to your photos and videos to upload existing media.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (result.canceled) return;

    setIsUploading(true);
    try {
      for (const asset of result.assets) {
        const type = asset.type === 'video' ? 'video' : 'photo';
        const saved = await saveCapturedMedia(order.ceNumber, asset.uri, type);
        await addMediaItem(order.id, type, saved.filePath, saved.fileName);
      }
      await reload();
    } catch (error) {
      Alert.alert('Upload failed', 'Could not upload one or more files. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const exportPress = usePressScale();

  if (!order) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.loading}>Loading...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.ceNumber}>{order.ceNumber}</Text>
          <Text style={styles.timestamps}>
            Opened {format(new Date(order.createdAt), 'MMM d, yyyy')}
            {order.completedAt ? ` · Completed ${format(new Date(order.completedAt), 'MMM d, yyyy')}` : ''}
          </Text>

          <View style={styles.clientField}>
            <Text style={styles.fieldLabel}>Client Name</Text>
            <TextInput
              value={clientNameDraft}
              onChangeText={setClientNameDraft}
              onBlur={handleClientInfoBlur}
              placeholder="Add client name"
              placeholderTextColor={colors.textMuted}
              style={styles.fieldInput}
            />
          </View>
          <View style={styles.clientField}>
            <Text style={styles.fieldLabel}>Project Name</Text>
            <TextInput
              value={projectNameDraft}
              onChangeText={setProjectNameDraft}
              onBlur={handleClientInfoBlur}
              placeholder="Add project name"
              placeholderTextColor={colors.textMuted}
              style={styles.fieldInput}
            />
          </View>

          <DueDateChip
            dueDate={order.dueDate}
            onChange={handleDueDateChange}
            size="full"
            isCompleted={order.status === 'completed'}
          />
          <StatusToggle status={order.status} onChange={handleStatusChange} />
        </View>

        <View style={styles.notesSection}>
          <Text style={styles.sectionLabel}>Notes</Text>
          <TextInput
            value={notesDraft}
            onChangeText={setNotesDraft}
            onBlur={handleNotesBlur}
            placeholder="Add notes about this job — e.g. why it's delayed, access issues, follow-ups…"
            placeholderTextColor={colors.textMuted}
            multiline
            style={styles.notesInput}
          />
        </View>

        <View style={styles.actionRow}>
          <Pressable
            style={[styles.actionButton, styles.captureButton]}
            onPress={() => navigation.navigate('Capture', { orderId: order.id, ceNumber: order.ceNumber })}
          >
            <Text style={styles.captureButtonText}>📷 Capture</Text>
          </Pressable>
          <Pressable
            style={[styles.actionButton, styles.uploadButton]}
            onPress={handleUploadFromGallery}
            disabled={isUploading}
          >
            <Text style={styles.uploadButtonText}>{isUploading ? 'Uploading…' : '⬆ Upload from Gallery'}</Text>
          </Pressable>
        </View>

        <Pressable
          onPress={handleExportReport}
          onPressIn={exportPress.onPressIn}
          onPressOut={exportPress.onPressOut}
          disabled={isExportingReport}
          style={styles.exportRow}
        >
          <Animated.View style={exportPress.style}>
            <LinearGradient
              colors={gradientAccent}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.exportButton}
            >
              <Text style={styles.exportButtonText}>
                {isExportingReport ? 'Preparing report…' : '📄 Export Field Report'}
              </Text>
            </LinearGradient>
          </Animated.View>
        </Pressable>

        <Text style={styles.sectionLabel}>
          {media.length > 0 ? `Media (${media.length})` : 'Media'}
        </Text>
      </View>

      <View style={styles.mediaContainer}>
        <MediaGrid
          media={media}
          onRename={handleRenameMedia}
          onDelete={handleDeleteMedia}
          footer={
            <Pressable onPress={handleDeleteJob} style={styles.deleteJobLink} hitSlop={8}>
              <Text style={styles.deleteJobLinkText}>Delete Job</Text>
            </Pressable>
          }
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loading: {
    padding: spacing.xl,
    color: colors.textSecondary,
  },
  content: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  ceNumber: {
    ...typography.display,
  },
  timestamps: {
    ...typography.caption,
  },
  clientField: {
    gap: 4,
  },
  fieldLabel: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  fieldInput: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 14,
    color: colors.textPrimary,
  },
  notesSection: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  notesInput: {
    minHeight: 72,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 14,
    color: colors.textPrimary,
    textAlignVertical: 'top',
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
  },
  actionButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  exportRow: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
  },
  exportButton: {
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  exportButtonText: {
    color: colors.textOnDark,
    fontWeight: '700',
    fontSize: 15,
  },
  captureButton: {
    backgroundColor: colors.dark,
  },
  captureButtonText: {
    color: colors.textOnDark,
    fontWeight: '700',
    fontSize: 15,
  },
  uploadButton: {
    backgroundColor: colors.surfaceMuted,
  },
  uploadButtonText: {
    color: colors.textPrimary,
    fontWeight: '700',
    fontSize: 15,
  },
  sectionLabel: {
    ...typography.label,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.sm,
  },
  mediaContainer: {
    flex: 1,
  },
  deleteJobLink: {
    alignSelf: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm,
  },
  deleteJobLinkText: {
    color: colors.danger,
    fontWeight: '600',
    fontSize: 13,
    textAlign: 'center',
  },
  headerSaveText: {
    color: colors.accent,
    fontWeight: '700',
    fontSize: 16,
    paddingHorizontal: spacing.sm,
  },
});
