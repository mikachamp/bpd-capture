import { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { GLView, type ExpoWebGLRenderingContext } from 'expo-gl';
import { buildStartupScene } from './startupAperture';
import { createExpoThreeRenderer } from '../utils/expoThreeRenderer';
import { colors, spacing } from '../theme/theme';

type Props = {
  onFinish: () => void;
};

const FINISH_AFTER_MS = 3000;

/**
 * The app's cold-start intro: a real three.js scene (rendered on expo-gl,
 * not a video/Lottie) where a blueprint-style job sheet assembles and gets
 * CE-stamped behind a closed camera iris, which then opens to reveal it —
 * capture mechanics revealing field documentation. Ported from the desktop
 * app's loading-screen concept gallery (concept 4, "Mix").
 */
export function StartupAnimation({ onFinish }: Props) {
  const activeRef = useRef(true);

  useEffect(() => {
    const timer = setTimeout(onFinish, FINISH_AFTER_MS);
    return () => {
      activeRef.current = false;
      clearTimeout(timer);
    };
  }, [onFinish]);

  function handleContextCreate(gl: ExpoWebGLRenderingContext) {
    const renderer = createExpoThreeRenderer(gl);
    const aspect = gl.drawingBufferWidth / gl.drawingBufferHeight;
    const { scene, camera, tick, dispose } = buildStartupScene(aspect);

    const start = Date.now();
    const render = () => {
      if (!activeRef.current) {
        dispose();
        renderer.dispose();
        return;
      }
      const t = (Date.now() - start) / 1000;
      tick(t);
      renderer.render(scene, camera);
      gl.endFrameEXP();
      requestAnimationFrame(render);
    };
    render();
  }

  return (
    <View style={styles.container}>
      <GLView style={styles.glView} onContextCreate={handleContextCreate} />
      <View style={styles.brand} pointerEvents="none">
        <Text style={styles.brandTitle}>BPD Capture</Text>
        <Text style={styles.brandSubtitle}>Job site photo documentation</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glView: {
    width: '100%',
    height: '62%',
  },
  brand: {
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: -spacing.xxl,
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
