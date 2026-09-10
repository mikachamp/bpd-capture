import { StyleSheet, Text, View } from 'react-native';

type Props = {
  size?: number;
};

/**
 * Placeholder wordmark until Blueprint Digital supplies a real logo. Drawn
 * with plain Views/Text so it scales crisply at any size with no image
 * asset to manage; matches the generated app icon (assets/icon.png).
 */
export function AppLogo({ size = 40 }: Props) {
  const cameraSize = size * 0.55;
  return (
    <View style={[styles.tile, { width: size, height: size, borderRadius: size * 0.28 }]}>
      <View
        style={[
          styles.camera,
          {
            width: cameraSize,
            height: cameraSize * 0.76,
            borderRadius: size * 0.09,
            borderWidth: Math.max(1.5, size * 0.07),
          },
        ]}
      >
        <View
          style={[
            styles.lens,
            {
              width: cameraSize * 0.4,
              height: cameraSize * 0.4,
              borderRadius: cameraSize * 0.2,
              borderWidth: Math.max(1, size * 0.05),
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    backgroundColor: '#1A1A1A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  camera: {
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lens: {
    borderColor: '#fff',
  },
});
