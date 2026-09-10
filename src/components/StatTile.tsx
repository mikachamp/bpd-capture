import { Pressable, StyleSheet, Text, View } from 'react-native';
import { cardShadow, colors, radius, spacing, typography } from '../theme/theme';

type Tone = 'neutral' | 'warning' | 'danger';

type Props = {
  label: string;
  value: string;
  hint?: string;
  tone?: Tone;
  onPress?: () => void;
};

/** A single headline number — see dataviz stat-tile contract: label, value, optional supporting hint. */
export function StatTile({ label, value, hint, tone = 'neutral', onPress }: Props) {
  const Wrapper = onPress ? Pressable : View;
  return (
    <Wrapper
      style={[styles.tile, tone === 'danger' && styles.tileDanger, tone === 'warning' && styles.tileWarning]}
      {...(onPress ? { onPress } : {})}
    >
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, tone === 'danger' && styles.valueDanger, tone === 'warning' && styles.valueWarning]}>
        {value}
      </Text>
      {hint && <Text style={styles.hint}>{hint}</Text>}
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  tile: {
    flexBasis: '48%',
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: 4,
    ...cardShadow,
  },
  tileDanger: {
    backgroundColor: colors.dangerTint,
    borderColor: colors.dangerTint,
  },
  tileWarning: {
    backgroundColor: colors.warningTint,
    borderColor: colors.warningTint,
  },
  label: {
    ...typography.label,
  },
  value: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: 2,
  },
  valueDanger: {
    color: colors.danger,
  },
  valueWarning: {
    color: colors.warning,
  },
  hint: {
    ...typography.caption,
    fontSize: 12,
  },
});
