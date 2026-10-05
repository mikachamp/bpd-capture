import { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { addMonths, format, isSameDay, isSameMonth, isToday, subMonths } from 'date-fns';
import { colors, radius, spacing, typography } from '../theme/theme';
import { buildMonthGridDays } from '../utils/calendarGrid';

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

type Props = {
  visible: boolean;
  initialDate: string | null;
  onClose: () => void;
  onSelect: (dateIso: string | null) => void;
};

/**
 * Custom month-grid date picker. Deliberately built from scratch (View/
 * Pressable, no native picker) so setting a due date never depends on a
 * native module being present in the installed dev-client build.
 */
export function DueDateCalendarModal({ visible, initialDate, onClose, onSelect }: Props) {
  const [cursor, setCursor] = useState(() => (initialDate ? new Date(`${initialDate}T00:00:00`) : new Date()));

  const days = useMemo(() => buildMonthGridDays(cursor), [cursor]);

  const selected = initialDate ? new Date(`${initialDate}T00:00:00`) : null;

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Pressable hitSlop={10} onPress={() => setCursor((c) => subMonths(c, 1))}>
              <Text style={styles.navArrow}>‹</Text>
            </Pressable>
            <Text style={styles.monthLabel}>{format(cursor, 'MMMM yyyy')}</Text>
            <Pressable hitSlop={10} onPress={() => setCursor((c) => addMonths(c, 1))}>
              <Text style={styles.navArrow}>›</Text>
            </Pressable>
          </View>

          <View style={styles.weekdayRow}>
            {WEEKDAY_LABELS.map((label, index) => (
              <Text key={`${label}-${index}`} style={styles.weekdayLabel}>
                {label}
              </Text>
            ))}
          </View>

          <View style={styles.grid}>
            {days.map((day) => {
              const inMonth = isSameMonth(day, cursor);
              const isSelected = selected ? isSameDay(day, selected) : false;
              const today = isToday(day);
              return (
                <Pressable
                  key={day.toISOString()}
                  style={styles.dayCell}
                  onPress={() => onSelect(format(day, 'yyyy-MM-dd'))}
                >
                  <View style={[styles.dayInner, isSelected && styles.dayInnerSelected]}>
                    <Text
                      style={[
                        styles.dayText,
                        !inMonth && styles.dayTextMuted,
                        today && !isSelected && styles.dayTextToday,
                        isSelected && styles.dayTextSelected,
                      ]}
                    >
                      {format(day, 'd')}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.footer}>
            <Pressable style={styles.noDueDateButton} onPress={() => onSelect(null)}>
              <Text style={styles.noDueDateText}>No due date</Text>
            </Pressable>
            <Pressable style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const DAY_SIZE = 40;
// See MonthCalendarBoard: fixed px cells wrap 8-per-row on wide sheets.
const SEVENTH = '14.2857%';

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(20,22,28,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  sheet: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.md,
  },
  navArrow: {
    fontSize: 24,
    color: colors.accent,
    paddingHorizontal: spacing.sm,
    fontWeight: '600',
  },
  monthLabel: {
    ...typography.subtitle,
  },
  weekdayRow: {
    flexDirection: 'row',
  },
  weekdayLabel: {
    width: SEVENTH,
    textAlign: 'center',
    ...typography.label,
    fontSize: 11,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: SEVENTH,
    height: DAY_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayInner: {
    width: DAY_SIZE - 6,
    height: DAY_SIZE - 6,
    borderRadius: (DAY_SIZE - 6) / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayInnerSelected: {
    backgroundColor: colors.accent,
  },
  dayText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  dayTextMuted: {
    color: colors.textMuted,
  },
  dayTextToday: {
    color: colors.accent,
  },
  dayTextSelected: {
    color: colors.textOnDark,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.md,
    marginTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  noDueDateButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  noDueDateText: {
    color: colors.danger,
    fontWeight: '600',
    fontSize: 14,
  },
  cancelButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  cancelText: {
    color: colors.textSecondary,
    fontWeight: '600',
    fontSize: 14,
  },
});
