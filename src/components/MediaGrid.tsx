import { useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import type { MediaItem } from '../types/models';
import { colors, radius, spacing, typography } from '../theme/theme';

const MIN_THUMB_SIZE = 82;
const THUMB_GAP = 8;

type Props = {
  media: MediaItem[];
  onRename?: (item: MediaItem, newBaseName: string) => void;
  onDelete?: (item: MediaItem) => void;
  /** Rendered after the grid (or below the empty state) — e.g. a footer action reached by scrolling. */
  footer?: React.ReactElement | null;
};

function baseName(fileName: string): string {
  const dot = fileName.lastIndexOf('.');
  return dot > 0 ? fileName.slice(0, dot) : fileName;
}

const GRID_HORIZONTAL_PADDING = 12;

export function MediaGrid({ media, onRename, onDelete, footer }: Props) {
  const { width } = useWindowDimensions();
  const numColumns = Math.max(2, Math.floor(width / (MIN_THUMB_SIZE + THUMB_GAP)));
  const thumbSize =
    (width - GRID_HORIZONTAL_PADDING * 2 - THUMB_GAP * (numColumns - 1)) / numColumns;
  const [previewItem, setPreviewItem] = useState<MediaItem | null>(null);
  const [actionItem, setActionItem] = useState<MediaItem | null>(null);
  const [renameItem, setRenameItem] = useState<MediaItem | null>(null);
  const [renameValue, setRenameValue] = useState('');

  if (media.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No photos or videos captured yet.</Text>
        {footer}
      </View>
    );
  }

  const openRename = (item: MediaItem) => {
    setActionItem(null);
    setRenameValue(baseName(item.fileName));
    setRenameItem(item);
  };

  const confirmDelete = (item: MediaItem) => {
    setActionItem(null);
    Alert.alert('Delete this item?', 'This permanently removes the photo or video from this order.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => onDelete?.(item) },
    ]);
  };

  const submitRename = () => {
    const trimmed = renameValue.trim();
    if (renameItem && trimmed) {
      onRename?.(renameItem, trimmed);
    }
    setRenameItem(null);
  };

  return (
    <>
      <FlatList
        key={`grid-${numColumns}`}
        data={media}
        numColumns={numColumns}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={styles.row}
        ListFooterComponent={footer}
        renderItem={({ item }) => (
          <View style={[styles.thumbWrapper, { width: thumbSize, height: thumbSize }]}>
            <Pressable style={styles.thumbPress} onPress={() => setPreviewItem(item)}>
              {item.type === 'photo' ? (
                <Image source={{ uri: item.filePath }} style={styles.thumb} resizeMode="cover" />
              ) : (
                <View style={[styles.thumb, styles.videoThumb]}>
                  <Text style={styles.videoIcon}>▶</Text>
                  <Text style={styles.videoLabel}>Video</Text>
                </View>
              )}
            </Pressable>
            <Pressable style={styles.moreButton} onPress={() => setActionItem(item)} hitSlop={8}>
              <Text style={styles.moreButtonText}>⋯</Text>
            </Pressable>
          </View>
        )}
      />

      <Modal visible={previewItem !== null} animationType="fade" onRequestClose={() => setPreviewItem(null)}>
        {previewItem && (
          <MediaPreview item={previewItem} onClose={() => setPreviewItem(null)} />
        )}
      </Modal>

      <Modal visible={actionItem !== null} transparent animationType="fade" onRequestClose={() => setActionItem(null)}>
        <Pressable style={styles.actionBackdrop} onPress={() => setActionItem(null)}>
          <View style={styles.actionSheet}>
            <Text style={styles.actionTitle} numberOfLines={1}>{actionItem?.fileName}</Text>
            <Pressable style={styles.actionRow} onPress={() => actionItem && openRename(actionItem)}>
              <Text style={styles.actionRowText}>Rename</Text>
            </Pressable>
            <Pressable style={styles.actionRow} onPress={() => actionItem && confirmDelete(actionItem)}>
              <Text style={[styles.actionRowText, styles.actionRowDanger]}>Delete</Text>
            </Pressable>
            <Pressable style={styles.actionCancel} onPress={() => setActionItem(null)}>
              <Text style={styles.actionCancelText}>Cancel</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      <Modal visible={renameItem !== null} transparent animationType="fade" onRequestClose={() => setRenameItem(null)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.renameBackdrop}
        >
          <View style={styles.renameSheet}>
            <Text style={styles.actionTitle}>Rename file</Text>
            <TextInput
              value={renameValue}
              onChangeText={setRenameValue}
              autoFocus
              style={styles.renameInput}
              onSubmitEditing={submitRename}
              returnKeyType="done"
            />
            <View style={styles.renameButtonRow}>
              <Pressable style={styles.renameCancelButton} onPress={() => setRenameItem(null)}>
                <Text style={styles.renameCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.renameSaveButton} onPress={submitRename}>
                <Text style={styles.renameSaveText}>Save</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

function MediaPreview({ item, onClose }: { item: MediaItem; onClose: () => void }) {
  const player = useVideoPlayer(item.type === 'video' ? item.filePath : null, (instance) => {
    instance.play();
  });

  return (
    <View style={styles.previewContainer}>
      <Pressable style={styles.closeButton} onPress={onClose}>
        <Text style={styles.closeButtonText}>Close</Text>
      </Pressable>
      {item.type === 'photo' ? (
        <Image source={{ uri: item.filePath }} style={styles.previewMedia} resizeMode="contain" />
      ) : (
        <VideoView player={player} style={styles.previewMedia} nativeControls />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    ...typography.body,
    color: colors.textMuted,
  },
  listContent: {
    paddingHorizontal: 12,
    paddingBottom: 24,
    gap: THUMB_GAP,
  },
  row: {
    gap: THUMB_GAP,
  },
  thumbWrapper: {
    // width/height are set inline per-render from the computed thumbSize —
    // a fixed size (not flex) so a partially-filled last row doesn't stretch
    // its one or two items to fill the whole row's width.
  },
  thumbPress: {
    flex: 1,
  },
  thumb: {
    flex: 1,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
  },
  videoThumb: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoIcon: {
    fontSize: 24,
    color: colors.textSecondary,
  },
  videoLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  moreButton: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(20,22,28,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreButtonText: {
    color: colors.textOnDark,
    fontSize: 14,
    fontWeight: '700',
    marginTop: -6,
  },
  previewContainer: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewMedia: {
    width: '100%',
    height: '100%',
  },
  closeButton: {
    position: 'absolute',
    top: 48,
    right: 20,
    zIndex: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
  },
  closeButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  actionBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(20,22,28,0.45)',
    justifyContent: 'flex-end',
  },
  actionSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.xs,
  },
  actionTitle: {
    ...typography.caption,
    textAlign: 'center',
    paddingBottom: spacing.sm,
  },
  actionRow: {
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  actionRowText: {
    ...typography.subtitle,
    color: colors.accent,
  },
  actionRowDanger: {
    color: colors.danger,
  },
  actionCancel: {
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.xs,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
  },
  actionCancelText: {
    ...typography.subtitle,
    color: colors.textSecondary,
  },
  renameBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(20,22,28,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  renameSheet: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.md,
  },
  renameInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 16,
    color: colors.textPrimary,
  },
  renameButtonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  renameCancelButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
  },
  renameCancelText: {
    fontWeight: '700',
    color: colors.textSecondary,
  },
  renameSaveButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.accent,
    alignItems: 'center',
  },
  renameSaveText: {
    fontWeight: '700',
    color: colors.textOnDark,
  },
});
