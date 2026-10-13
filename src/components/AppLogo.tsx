import { Image } from 'react-native';

type Props = {
  size?: number;
};

/**
 * The Blueprint Digital logo mark (assets/bpd-logo-mark.png), rendered from
 * the startup animation's final frame by scripts/app-icon so it matches the
 * splash and the launcher icon exactly. No tile behind it, by design.
 */
export function AppLogo({ size = 40 }: Props) {
  return (
    <Image
      source={require('../../assets/bpd-logo-mark.png')}
      style={{ width: size, height: size }}
      resizeMode="contain"
      accessibilityLabel="Blueprint Digital logo"
    />
  );
}
