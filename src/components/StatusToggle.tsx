import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { OrderStatus } from '../types/models';
import { colors, radius, spacing } from '../theme/theme';

type Props = {
  status: OrderStatus;
  onChange: (status: OrderStatus) => void;
};

export function StatusToggle({ status, onChange }: Props) {
  return (
    <View style={styles.container}>
      <Pressable
        style={[styles.option, status === 'in_process' && styles.optionActiveInProcess]}
        onPress={() => onChange('in_process')}
      >
        <Text style={[styles.optionText, status === 'in_process' && styles.optionTextActive]}>In Process</Text>
      </Pressable>
      <Pressable
        style={[styles.option, status === 'completed' && styles.optionActiveCompleted]}
        onPress={() => onChange('completed')}
      >
        <Text style={[styles.optionText, status === 'completed' && styles.optionTextActive]}>Completed</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    padding: 4,
    gap: 4,
  },
  option: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    alignItems: 'center',
  },
  optionActiveInProcess: {
    backgroundColor: colors.warningTint,
  },
  optionActiveCompleted: {
    backgroundColor: colors.successTint,
  },
  optionText: {
    fontWeight: '600',
    color: colors.textSecondary,
  },
  optionTextActive: {
    color: colors.textPrimary,
  },
});
