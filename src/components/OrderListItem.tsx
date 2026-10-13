import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { format } from 'date-fns';
import type { Order } from '../types/models';
import { cardShadow, colors, fonts, radius, spacing, typography } from '../theme/theme';
import { DueDateChip } from './DueDateChip';
import { usePressScale } from '../utils/usePressScale';

type Props = {
  order: Order;
  onPress: () => void;
  onDueDateChange?: (dueDate: string | null) => void;
};

const AVATAR_COLORS = ['#6C5CE7', '#4FC3F7', '#F59E0B', '#EF4444', '#10B981', '#EC4899', '#8B5CF6'];

function initialsFor(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

function colorFor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

export function OrderListItem({ order, onPress, onDueDateChange }: Props) {
  const isCompleted = order.status === 'completed';
  const dateLabel = isCompleted && order.completedAt
    ? `Completed ${format(new Date(order.completedAt), 'MMM d, yyyy')}`
    : `Opened ${format(new Date(order.createdAt), 'MMM d, yyyy')}`;
  const heading = order.projectName || order.ceNumber;
  const metaLine = [order.clientName, order.ceNumber].filter(Boolean).join(' · ');
  const { style: pressStyle, onPressIn, onPressOut } = usePressScale();

  return (
    <Pressable onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut}>
      <Animated.View
        style={[styles.card, isCompleted ? styles.accentCompleted : styles.accentInProcess, pressStyle]}
      >
      <View style={styles.topRow}>
        {order.coverImage ? (
          <Image source={{ uri: order.coverImage }} style={styles.avatarImage} />
        ) : (
          <View style={[styles.avatarFallback, { backgroundColor: colorFor(order.clientName || order.ceNumber) }]}>
            <Text style={styles.avatarFallbackText}>{initialsFor(order.clientName || order.ceNumber)}</Text>
          </View>
        )}
        <View style={styles.info}>
          <View style={styles.ceNumberRow}>
            <Text style={styles.ceNumber} numberOfLines={1}>{heading}</Text>
          </View>
          <Text style={styles.clientLine} numberOfLines={1}>{metaLine}</Text>
          <Text style={styles.dateLabel} numberOfLines={1}>{dateLabel}</Text>
        </View>
        <View style={[styles.badge, isCompleted ? styles.badgeCompleted : styles.badgeInProcess]}>
          <Text style={styles.badgeText}>{isCompleted ? 'Completed' : 'In Process'}</Text>
        </View>
      </View>

      <View style={styles.bottomRow}>
        <DueDateChip
          dueDate={order.dueDate}
          isCompleted={isCompleted}
          onChange={(value) => onDueDateChange?.(value)}
        />
        <Pressable onPress={onPress} hitSlop={8} style={styles.viewMoreButton}>
          <Text style={styles.viewMoreText}>View more</Text>
          <Text style={styles.viewMoreChevron}>›</Text>
        </Pressable>
      </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderLeftWidth: 4,
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.md,
    ...cardShadow,
  },
  accentInProcess: {
    borderLeftColor: colors.warning,
  },
  accentCompleted: {
    borderLeftColor: colors.success,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
  },
  avatarFallback: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallbackText: {
    color: colors.textOnDark,
    fontWeight: '700',
    fontFamily: fonts.family,
    fontSize: 16,
  },
  info: {
    flex: 1,
    flexShrink: 1,
  },
  ceNumberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  ceNumber: {
    ...typography.title,
  },
  noteIcon: {
    fontFamily: fonts.family,
    fontSize: 13,
  },
  clientLine: {
    fontFamily: fonts.family,
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 2,
  },
  dateLabel: {
    ...typography.caption,
    marginTop: 2,
  },
  badge: {
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    flexShrink: 0,
  },
  badgeInProcess: {
    backgroundColor: colors.warningTint,
  },
  badgeCompleted: {
    backgroundColor: colors.successTint,
  },
  badgeText: {
    fontFamily: fonts.family,
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  viewMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewMoreText: {
    color: colors.accent,
    fontWeight: '700',
    fontFamily: fonts.family,
    fontSize: 13,
  },
  viewMoreChevron: {
    color: colors.accent,
    fontWeight: '700',
    fontFamily: fonts.family,
    fontSize: 16,
    marginTop: -1,
  },
});
