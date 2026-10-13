import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radius, spacing, typography } from '../theme/theme';

type Props = {
  label: string;
  /** 0-100, or null when there's no data to compute a rate from yet. */
  percent: number | null;
  hint: string;
};

function severity(percent: number): 'success' | 'warning' | 'danger' {
  if (percent >= 80) return 'success';
  if (percent >= 50) return 'warning';
  return 'danger';
}

/** A single ratio against a limit — fill carries severity, track is a lighter step of the same ramp. */
export function Meter({ label, percent, hint }: Props) {
  const tone = percent === null ? null : severity(percent);

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.label}>{label}</Text>
        <Text
          style={[
            styles.percentText,
            tone === 'success' && styles.textSuccess,
            tone === 'warning' && styles.textWarning,
            tone === 'danger' && styles.textDanger,
          ]}
        >
          {percent === null ? '—' : `${percent}%`}
        </Text>
      </View>
      <View
        style={[
          styles.track,
          tone === 'success' && styles.trackSuccess,
          tone === 'warning' && styles.trackWarning,
          tone === 'danger' && styles.trackDanger,
        ]}
      >
        {percent !== null && (
          <View
            style={[
              styles.fill,
              { width: `${percent}%` },
              tone === 'success' && styles.fillSuccess,
              tone === 'warning' && styles.fillWarning,
              tone === 'danger' && styles.fillDanger,
            ]}
          />
        )}
      </View>
      <Text style={styles.hint}>{hint}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    ...typography.subtitle,
  },
  percentText: {
    fontFamily: fonts.family,
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  textSuccess: { color: colors.success },
  textWarning: { color: colors.warning },
  textDanger: { color: colors.danger },
  track: {
    height: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    overflow: 'hidden',
  },
  trackSuccess: { backgroundColor: colors.successTint },
  trackWarning: { backgroundColor: colors.warningTint },
  trackDanger: { backgroundColor: colors.dangerTint },
  fill: {
    height: '100%',
    borderRadius: radius.pill,
  },
  fillSuccess: { backgroundColor: colors.success },
  fillWarning: { backgroundColor: colors.warning },
  fillDanger: { backgroundColor: colors.danger },
  hint: {
    ...typography.caption,
  },
});
