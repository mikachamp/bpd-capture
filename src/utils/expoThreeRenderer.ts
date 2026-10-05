import type { ExpoWebGLRenderingContext } from 'expo-gl';
import * as THREE from 'three';

/**
 * three.js's WebGLRenderer expects a DOM canvas (reads .style, .width/.height,
 * add/removeEventListener). expo-gl's context has none of that, so we hand it
 * a minimal stand-in — the same shim expo-three's Renderer class uses
 * internally, inlined here to avoid depending on that unmaintained package
 * (its own dependency tree still pins react-native ^0.64).
 *
 * Throws if the device can't give three.js what it needs; callers must catch.
 */
export function createExpoThreeRenderer(gl: ExpoWebGLRenderingContext): THREE.WebGLRenderer {
  // three.js r163+ is WebGL2-only.
  if (!(gl as unknown as { supportsWebGL2?: boolean }).supportsWebGL2) {
    throw new Error('This device does not support WebGL2.');
  }

  const canvas = {
    width: gl.drawingBufferWidth,
    height: gl.drawingBufferHeight,
    style: {},
    addEventListener: () => {},
    removeEventListener: () => {},
    clientHeight: gl.drawingBufferHeight,
  } as unknown as HTMLCanvasElement;

  // three rejects any context that is `instanceof WebGLRenderingContext`,
  // assuming that means WebGL1. expo-gl's native WebGL2RenderingContext
  // extends WebGLRenderingContext, so that check misfires and throws on every
  // native device (browsers keep the two classes separate, so web is fine).
  // Hide the global just for construction — it's three's only use of it.
  const globals = globalThis as { WebGLRenderingContext?: unknown };
  const original = globals.WebGLRenderingContext;
  globals.WebGLRenderingContext = undefined;
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({
      context: gl as unknown as WebGL2RenderingContext,
      canvas,
      antialias: true,
      alpha: true,
    });
  } finally {
    globals.WebGLRenderingContext = original;
  }

  renderer.setPixelRatio(1);
  renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight, false);
  renderer.setClearColor(0x000000, 0);
  return renderer;
}
