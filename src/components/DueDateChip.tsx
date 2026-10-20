import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { format, isBefore, isToday, startOfDay } from 'date-fns';
import { colors, fonts, radius, spacing } from '../theme/theme';
import { DueDateCalendarModal } from './DueDateCalendarModal';

type Props = {
  dueDate: string | null;
  onChange: (dueDate: string | null) => void;
  /** Compact renders as an inline pill (dashboard cards); full renders larger (job detail). */
  size?: 'compact' | 'full';
  /** A completed job is done — its due date is now just a record, never an active "overdue" alarm. */
  isCompleted?: boolean;
};

function describe(
  dueDate: string | null,
  isCompleted: boolean
): { label: string; tone: 'muted' | 'accent' | 'warning' | 'danger' } {
  if (!dueDate) {
    return { label: 'No due date', tone: 'muted' };
  }
  const date = startOfDay(new Date(`${dueDate}T00:00:00`));
  if (isCompleted) {
    return { label: `Due ${format(date, 'MMM d')}`, tone: 'accent' };
  }
  const today = startOfDay(new Date());
  if (isBefore(date, today)) {
    return { label: `Overdue · ${format(date, 'MMM d')}`, tone: 'danger' };
  }
  if (isToday(date)) {
    return { label: 'Due today', tone: 'warning' };
  }
  return { label: `Due ${format(date, 'EEE, MMM d')}`, tone: 'accent' };
}

export function DueDateChip({ dueDate, onChange, size = 'compact', isCompleted = false }: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const { label, tone } = describe(dueDate, isCompleted);
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (tone === 'danger') {
      pulse.value = withRepeat(withSequence(withTiming(1.06, { duration: 650 }), withTiming(1, { duration: 650 })), -1, true);
    } else {
      pulse.value = withTiming(1, { duration: 150 });
    }
  }, [tone, pulse]);

  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  return (
    <>
      <Animated.View style={pulseStyle}>
        <Pressable
          onPress={() => setPickerOpen(true)}
          style={[
            styles.chip,
            size === 'full' && styles.chipFull,
            tone === 'muted' && styles.chipMuted,
            tone === 'accent' && styles.chipAccent,
            tone === 'warning' && styles.chipWarning,
            tone === 'danger' && styles.chipDanger,
          ]}
        >
          <Text
            style={[
              styles.text,
              size === 'full' && styles.textFull,
              tone === 'muted' && styles.textMuted,
              tone === 'accent' && styles.textAccent,
              tone === 'warning' && styles.textWarning,
              tone === 'danger' && styles.textDanger,
            ]}
          >
            {label}
          </Text>
          {tone === 'muted' && (
            <View style={styles.addBadge}>
              <Text style={styles.addBadgeText}>+ Add</Text>
            </View>
          )}
        </Pressable>
      </Animated.View>

      <DueDateCalendarModal
        visible={pickerOpen}
        initialDate={dueDate}
        onClose={() => setPickerOpen(false)}
        onSelect={(value) => {
          setPickerOpen(false);
          onChange(value);
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.sm,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
  },
  chipFull: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  chipMuted: {
    backgroundColor: colors.surfaceMuted,
  },
  chipAccent: {
    backgroundColor: colors.accentTint,
  },
  chipWarning: {
    backgroundColor: colors.warningTint,
  },
  chipDanger: {
    backgroundColor: colors.dangerTint,
  },
  text: {
    fontFamily: fonts.family,
    fontSize: 12,
    fontWeight: '700',
  },
  textFull: {
    fontFamily: fonts.family,
    fontSize: 14,
  },
  textMuted: {
    color: colors.textMuted,
  },
  textAccent: {
    color: colors.accentText,
  },
  textWarning: {
    color: colors.warning,
  },
  textDanger: {
    color: colors.danger,
  },
  addBadge: {
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  addBadgeText: {
    color: colors.textOnDark,
    fontFamily: fonts.family,
    fontSize: 11,
    fontWeight: '700',
  },
});
