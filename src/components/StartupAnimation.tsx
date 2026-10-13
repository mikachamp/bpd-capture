import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { GLView, type ExpoWebGLRenderingContext } from 'expo-gl';
import { buildStartupScene } from './startupLogoDraw';
import { createExpoThreeRenderer } from '../utils/expoThreeRenderer';
import { colors } from '../theme/theme';

type Props = {
  onFinish: () => void;
};

// The logo is complete and face-on at ~3.1 s; hold a beat on it.
const FINISH_AFTER_MS = 3500;

/**
 * The app's cold-start intro: a real three.js scene (rendered on expo-gl, not a
 * video/Lottie) where the Blueprint Digital logo's pencil draws the logo, the
 * colours pour in and the bulb lights up. No text, by design.
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
  // on failure, drop the 3D view and go straight into the app.
  function failGracefully(error: unknown) {
    console.warn('Startup animation disabled:', error);
    activeRef.current = false;
    setGlFailed(true);
    onFinish();
  }

  function handleContextCreate(gl: ExpoWebGLRenderingContext) {
    let renderer: ReturnType<typeof createExpoThreeRenderer>;
    let sceneParts: ReturnType<typeof buildStartupScene>;
    try {
      renderer = createExpoThreeRenderer(gl);
      sceneParts = buildStartupScene(gl.drawingBufferWidth / gl.drawingBufferHeight);
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark,
  },
  glView: StyleSheet.absoluteFill,
});
