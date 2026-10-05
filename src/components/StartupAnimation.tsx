import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { GLView, type ExpoWebGLRenderingContext } from 'expo-gl';
import { buildStartupScene } from './startupAperture';
import { createExpoThreeRenderer } from '../utils/expoThreeRenderer';
import { colors, spacing } from '../theme/theme';

type Props = {
  onFinish: () => void;
};

// The iris finishes opening at ~2.8s; hold a beat on the revealed sheet.
const FINISH_AFTER_MS = 3300;

/**
 * The app's cold-start intro: a real three.js scene (rendered on expo-gl,
 * not a video/Lottie) where a blueprint-style job sheet assembles and gets
 * CE-stamped behind a closed camera iris, which then opens to reveal it —
 * capture mechanics revealing field documentation. Ported from the desktop
 * app's loading-screen concept gallery (concept 4, "Mix").
 */
export function StartupAnimation({ onFinish }: Props) {
  const activeRef = useRef(true);
  const [glFailed, setGlFailed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(onFinish, FINISH_AFTER_MS);
    return () => {
      activeRef.current = false;
      clearTimeout(timer);
    };
  }, [onFinish]);

  // Any error escaping here would be an uncaught exception at launch, which a
  // release build turns into an instant crash. A splash is never worth that:
  // on failure, drop the 3D view and let the wordmark-only splash finish.
  function failGracefully(error: unknown) {
    console.warn('Startup animation disabled:', error);
    activeRef.current = false;
    setGlFailed(true);
  }

  function handleContextCreate(gl: ExpoWebGLRenderingContext) {
    let renderer: ReturnType<typeof createExpoThreeRenderer>;
    let sceneParts: ReturnType<typeof buildStartupScene>;
    try {
      renderer = createExpoThreeRenderer(gl);
      sceneParts = buildStartupScene(gl.drawingBufferWidth / gl.drawingBufferHeight, 0.14);
    } catch (error) {
      failGracefully(error);
      return;
    }
    const { scene, camera, tick } = sceneParts;

    // No dispose on unmount: GLView tears down the GL context itself, and
    // calling gl delete* on an already-destroyed native context is unsafe.
    const start = Date.now();
    const render = () => {
      if (!activeRef.current) return;
      try {
        tick((Date.now() - start) / 1000);
        renderer.render(scene, camera);
        gl.endFrameEXP();
      } catch (error) {
        failGracefully(error);
        return;
      }
      requestAnimationFrame(render);
    };
    render();
  }

  return (
    <View style={styles.container}>
      {glFailed ? null : <GLView style={styles.glView} onContextCreate={handleContextCreate} />}
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
  },
  // Full-screen so swinging blades leave the screen edge naturally rather
  // than being clipped by a visible rectangle mid-screen.
  glView: StyleSheet.absoluteFill,
  brand: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: '14%',
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
