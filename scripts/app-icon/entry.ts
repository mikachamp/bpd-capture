// Renders the startup scene's final frame (the finished logo) as a square image.
// render.cjs passes ?size=…&alpha=0|1 and calls renderAt(t).
import * as THREE from 'three';
import { buildStartupScene } from '../../src/components/startupLogoDraw';

const params = new URLSearchParams(location.search);
const size = Number(params.get('size') ?? 1024);
const transparent = params.get('alpha') === '1';

const canvas = document.createElement('canvas');
canvas.width = size;
canvas.height = size;
document.body.appendChild(canvas);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: transparent, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(size, size, false);
renderer.setClearColor(0x000000, transparent ? 0 : 1);
const { scene, camera, tick } = buildStartupScene(1);

(window as unknown as { renderAt: (t: number) => string }).renderAt = (t) => {
  tick(t);
  renderer.render(scene, camera);
  return canvas.toDataURL('image/png');
};
