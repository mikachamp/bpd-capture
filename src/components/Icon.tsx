import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { colors } from '../theme/theme';

/** Line icons drawn on a 24×24 grid (replaces the emoji the old design used). */
export type IconName =
  | 'list' | 'calendar' | 'chart' | 'settings' | 'camera' | 'video' | 'upload' | 'search'
  | 'arrow' | 'back' | 'close' | 'plus' | 'check' | 'more' | 'flash' | 'users' | 'file';

type Props = { name: IconName; size?: number; color?: string; strokeWidth?: number };

export function Icon({ name, size = 22, color = colors.textPrimary, strokeWidth = 1.7 }: Props) {
  const p = { stroke: color, strokeWidth, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === 'list' && (
        <>
          <Path d="M8 6.5h12M8 12h12M8 17.5h12" {...p} />
          <Circle cx={4.2} cy={6.5} r={0.9} fill={color} />
          <Circle cx={4.2} cy={12} r={0.9} fill={color} />
          <Circle cx={4.2} cy={17.5} r={0.9} fill={color} />
        </>
      )}
      {name === 'calendar' && (
        <>
          <Rect x={4} y={5.5} width={16} height={14.5} rx={3} {...p} />
          <Path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" {...p} />
        </>
      )}
      {name === 'chart' && <Path d="M4 19h16M7 15l4-4 3 3 5-6" {...p} />}
      {name === 'settings' && (
        <>
          <Circle cx={12} cy={12} r={3} {...p} />
          <Path d="M19.4 13.5a7.6 7.6 0 0 0 0-3l2-1.5-2-3.4-2.4 1a7.5 7.5 0 0 0-2.6-1.5L14 2.5h-4l-.4 2.6A7.5 7.5 0 0 0 7 6.6l-2.4-1-2 3.4 2 1.5a7.6 7.6 0 0 0 0 3l-2 1.5 2 3.4 2.4-1a7.5 7.5 0 0 0 2.6 1.5l.4 2.6h4l.4-2.6a7.5 7.5 0 0 0 2.6-1.5l2.4 1 2-3.4z" {...p} />
        </>
      )}
      {name === 'camera' && (
        <>
          <Path d="M4 8.5h3.2l1.6-2.5h6.4l1.6 2.5H20V18a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18z" {...p} />
          <Circle cx={12} cy={13} r={3.4} {...p} />
        </>
      )}
      {name === 'video' && (
        <>
          <Rect x={3.5} y={6.5} width={12} height={11} rx={2.5} {...p} />
          <Path d="M15.5 10.5 20.5 8v8l-5-2.5" {...p} />
        </>
      )}
      {name === 'upload' && <Path d="M12 15.5V4.5M7.5 9 12 4.5 16.5 9M5 19.5h14" {...p} />}
      {name === 'search' && (
        <>
          <Circle cx={11} cy={11} r={6} {...p} />
          <Path d="m20 20-4.3-4.3" {...p} />
        </>
      )}
      {name === 'arrow' && <Path d="M8 16 16 8M9.5 8H16v6.5" {...p} />}
      {name === 'back' && <Path d="M14.5 5.5 8 12l6.5 6.5" {...p} />}
      {name === 'close' && <Path d="M6 6l12 12M18 6 6 18" {...p} />}
      {name === 'plus' && <Path d="M12 5v14M5 12h14" {...p} />}
      {name === 'check' && <Path d="M5 12.5 10 17l9-10" {...p} />}
      {name === 'more' && (
        <>
          <Circle cx={6} cy={12} r={1.3} fill={color} />
          <Circle cx={12} cy={12} r={1.3} fill={color} />
          <Circle cx={18} cy={12} r={1.3} fill={color} />
        </>
      )}
      {name === 'flash' && <Path d="M13 3 5 13.5h6L10 21l9-11h-6z" {...p} />}
      {name === 'users' && (
        <>
          <Circle cx={9} cy={9} r={3.2} {...p} />
          <Path d="M3.5 19c.6-3 2.8-4.6 5.5-4.6s4.9 1.6 5.5 4.6M15.5 6.2a3 3 0 0 1 0 5.6M17.5 14.6c1.6.6 2.6 2 3 4.4" {...p} />
        </>
      )}
      {name === 'file' && (
        <>
          <Path d="M7 3.5h7l4 4V20a.5.5 0 0 1-.5.5h-10A.5.5 0 0 1 7 20z" {...p} />
          <Path d="M14 3.5v4h4M9.5 13h5M9.5 16.5h5" {...p} />
        </>
      )}
    </Svg>
  );
}
