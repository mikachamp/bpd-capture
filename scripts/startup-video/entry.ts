// Renders the real startup scene into a 1080x1920 canvas; render.cjs steps it frame by frame.
import * as THREE from 'three';
import { buildStartupScene } from '../../src/components/startupLogoDraw';

const W = 1080;
const H = 1920;
const canvas = document.createElement('canvas');
canvas.width = W;
canvas.height = H;
document.body.appendChild(canvas);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(W, H, false);
renderer.setClearColor(0x000000, 1);
const { scene, camera, tick } = buildStartupScene(W / H);

(window as unknown as { renderAt: (t: number) => string }).renderAt = (t) => {
  tick(t);
  renderer.render(scene, camera);
  return canvas.toDataURL('image/png');
};
