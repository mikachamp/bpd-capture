import type { ExpoWebGLRenderingContext } from 'expo-gl';
import * as THREE from 'three';

/**
 * three.js's WebGLRenderer expects a DOM canvas (reads .style, .width/.height,
 * add/removeEventListener). expo-gl's context has none of that, so we hand it
 * a minimal stand-in — the same shim expo-three's Renderer class uses
 * internally, inlined here to avoid depending on that unmaintained package
 * (its own dependency tree still pins react-native ^0.64).
 */
export function createExpoThreeRenderer(gl: ExpoWebGLRenderingContext): THREE.WebGLRenderer {
  const canvas = {
    width: gl.drawingBufferWidth,
    height: gl.drawingBufferHeight,
    style: {},
    addEventListener: () => {},
    removeEventListener: () => {},
    clientHeight: gl.drawingBufferHeight,
  } as unknown as HTMLCanvasElement;

  const renderer = new THREE.WebGLRenderer({
    context: gl as unknown as WebGLRenderingContext,
    canvas,
    antialias: true,
    alpha: true,
  });
  renderer.setPixelRatio(1);
  renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight, false);
  renderer.setClearColor(0x000000, 0);
  return renderer;
}
