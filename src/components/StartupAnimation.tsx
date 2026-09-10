import { useEffect } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { AppLogo } from './AppLogo';
import { colors, gradientAccent, radius, spacing } from '../theme/theme';

type Props = {
  onFinish: () => void;
};

const STATIONS = [
  { icon: '📷', label: 'Capture', at: 0.28 },
  { icon: '🔍', label: 'Inspect', at: 0.58 },
  { icon: '✅', label: 'QC Pass', at: 0.86 },
] as const;

const BELT_DURATION = 2000;
const STATION_PULSE = 260;
const HOLD_AFTER_PASS = 250;
const BRAND_REVEAL = 550;

/**
 * The app's cold-start intro: a part travels a production line through
 * capture -> inspect -> QC-pass checkpoints, then crossfades into the
 * wordmark. Pure Reanimated + Views (no image assets), timed to land at
 * ~3s so it never feels like it's stalling a real launch.
 */
export function StartupAnimation({ onFinish }: Props) {
  const { width } = useWindowDimensions();
  const beltWidth = Math.min(width - spacing.xxl * 2, 360);

  const partX = useSharedValue(-28);
  const partPassed = useSharedValue(0);
  const station1Glow = useSharedValue(0);
  const station2Glow = useSharedValue(0);
  const station3Glow = useSharedValue(0);
  const checkScale = useSharedValue(0);
  const sceneOpacity = useSharedValue(1);
  const brandOpacity = useSharedValue(0);
  const brandScale = useSharedValue(0.85);

  useEffect(() => {
    const finish = () => onFinish();

    partX.value = withTiming(beltWidth - 20, {
      duration: BELT_DURATION,
      easing: Easing.inOut(Easing.quad),
    });

    const pulse = (sv: typeof station1Glow) =>
      withSequence(withTiming(1, { duration: STATION_PULSE / 2 }), withTiming(0, { duration: STATION_PULSE / 2 }));

    station1Glow.value = withDelay(BELT_DURATION * STATIONS[0].at, pulse(station1Glow));
    station2Glow.value = withDelay(BELT_DURATION * STATIONS[1].at, pulse(station2Glow));
    station3Glow.value = withDelay(BELT_DURATION * STATIONS[2].at, withTiming(1, { duration: STATION_PULSE }));

    partPassed.value = withDelay(BELT_DURATION * STATIONS[2].at, withTiming(1, { duration: 200 }));
    checkScale.value = withDelay(
      BELT_DURATION * STATIONS[2].at,
      withSequence(withSpring(1.25, { damping: 6, stiffness: 180 }), withSpring(1, { damping: 8 }))
    );

    const sceneOutAt = BELT_DURATION + HOLD_AFTER_PASS;
    const sceneFadeDuration = 260;
    const brandStartAt = sceneOutAt + sceneFadeDuration;
    sceneOpacity.value = withDelay(sceneOutAt, withTiming(0, { duration: sceneFadeDuration }));
    brandOpacity.value = withDelay(brandStartAt, withTiming(1, { duration: BRAND_REVEAL }));
    brandScale.value = withDelay(
      brandStartAt,
      withTiming(1, { duration: BRAND_REVEAL, easing: Easing.out(Easing.back(1.2)) }, (finished) => {
        if (finished) runOnJS(finish)();
      })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [beltWidth]);

  const partStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: partX.value }],
    backgroundColor: partPassed.value > 0.5 ? colors.success : colors.accent,
  }));

  const sceneStyle = useAnimatedStyle(() => ({ opacity: sceneOpacity.value }));
  const brandStyle = useAnimatedStyle(() => ({
    opacity: brandOpacity.value,
    transform: [{ scale: brandScale.value }],
  }));
  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
    opacity: checkScale.value > 0 ? 1 : 0,
  }));

  const useGlowStyle = (sv: typeof station1Glow) =>
    useAnimatedStyle(() => ({
      opacity: 0.4 + sv.value * 0.6,
      transform: [{ scale: 1 + sv.value * 0.35 }],
      borderColor: sv.value > 0.5 ? colors.accent : 'rgba(255,255,255,0.25)',
    }));
  const glow1 = useGlowStyle(station1Glow);
  const glow2 = useGlowStyle(station2Glow);
  const glow3 = useGlowStyle(station3Glow);

  return (
    <LinearGradient colors={[colors.dark, '#17151F']} style={styles.container}>
      <Animated.View style={[styles.scene, sceneStyle]}>
        <Text style={styles.title}>Preparing your job site…</Text>
        <View style={[styles.belt, { width: beltWidth }]}>
          <View style={styles.beltLine} />
          {STATIONS.map((station, index) => (
            <Animated.View
              key={station.label}
              style={[
                styles.station,
                { left: beltWidth * station.at - 22 },
                index === 0 ? glow1 : index === 1 ? glow2 : glow3,
              ]}
            >
              <Text style={styles.stationIcon}>{station.icon}</Text>
            </Animated.View>
          ))}
          <Animated.View style={[styles.part, partStyle]} />
          <Animated.View style={[styles.checkBadge, { left: beltWidth * STATIONS[2].at - 16 }, checkStyle]}>
            <Text style={styles.checkText}>✓</Text>
          </Animated.View>
        </View>
        <View style={styles.labelRow}>
          {STATIONS.map((station) => (
            <Text key={station.label} style={[styles.stationLabel, { width: beltWidth / 3 }]}>
              {station.label}
            </Text>
          ))}
        </View>
      </Animated.View>

      <Animated.View style={[styles.brand, brandStyle]} pointerEvents="none">
        <AppLogo size={64} />
        <Text style={styles.brandTitle}>BPD Capture</Text>
        <Text style={styles.brandSubtitle}>Job site photo documentation</Text>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scene: {
    position: 'absolute',
    alignItems: 'center',
    gap: spacing.xxl,
  },
  title: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  belt: {
    height: 44,
    justifyContent: 'center',
  },
  beltLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '50%',
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  station: {
    position: 'absolute',
    top: -2,
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  stationIcon: {
    fontSize: 18,
  },
  part: {
    position: 'absolute',
    top: '50%',
    marginTop: -10,
    width: 20,
    height: 20,
    borderRadius: radius.sm,
    backgroundColor: colors.accent,
  },
  checkBadge: {
    position: 'absolute',
    top: -18,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: {
    color: colors.textOnDark,
    fontWeight: '800',
    fontSize: 16,
  },
  labelRow: {
    flexDirection: 'row',
  },
  stationLabel: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.55)',
    fontSize: 11,
    fontWeight: '600',
  },
  brand: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  brandTitle: {
    color: colors.textOnDark,
    fontSize: 24,
    fontWeight: '800',
  },
  brandSubtitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    fontWeight: '500',
  },
});
