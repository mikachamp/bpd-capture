import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { format } from 'date-fns';
import type { Order } from '../types/models';
import { cardShadow, colors, radius, spacing, typography } from '../theme/theme';
import { DueDateChip } from './DueDateChip';
import { usePressScale } from '../utils/usePressScale';

type Props = {
  order: Order;
  onPress: () => void;
  onDueDateChange?: (dueDate: string | null) => void;
};

export function OrderListItem({ order, onPress, onDueDateChange }: Props) {
  const isCompleted = order.status === 'completed';
  const dateLabel = isCompleted && order.completedAt
    ? `Completed ${format(new Date(order.completedAt), 'MMM d, yyyy')}`
    : `Opened ${format(new Date(order.createdAt), 'MMM d, yyyy')}`;
  const clientLine = [order.clientName, order.projectName].filter(Boolean).join(' · ');
  const { style: pressStyle, onPressIn, onPressOut } = usePressScale();

  return (
    <Pressable onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut}>
      <Animated.View
        style={[styles.card, isCompleted ? styles.accentCompleted : styles.accentInProcess, pressStyle]}
      >
      <View style={styles.topRow}>
        <View style={styles.info}>
          <View style={styles.ceNumberRow}>
            <Text style={styles.ceNumber} numberOfLines={1}>{order.ceNumber}</Text>
            {order.notes ? <Text style={styles.noteIcon}>📝</Text> : null}
          </View>
          {clientLine ? (
            <Text style={styles.clientLine} numberOfLines={1}>{clientLine}</Text>
          ) : null}
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
    fontSize: 13,
  },
  clientLine: {
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
    fontSize: 13,
  },
  viewMoreChevron: {
    color: colors.accent,
    fontWeight: '700',
    fontSize: 16,
    marginTop: -1,
  },
});
