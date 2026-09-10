import { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

/** Shared tactile-feedback animation for Pressable cards/buttons across the app. */
export function usePressScale(scaleTo = 0.97) {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const onPressIn = () => {
    scale.value = withTiming(scaleTo, { duration: 100 });
  };
  const onPressOut = () => {
    scale.value = withTiming(1, { duration: 150 });
  };

  return { style, onPressIn, onPressOut };
}
