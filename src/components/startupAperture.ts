import * as THREE from 'three';

/**
 * The "Mix" concept from the desktop app's loading-screen gallery
 * (BPD_Capture_Desktop/loading-screen-concepts/index.html, concept 4),
 * ported to three.js running on expo-gl: a blueprint-style job sheet
 * assembles and gets CE-stamped while hidden behind a closed camera iris,
 * then the iris opens to reveal the finished, sealed document. Cyan/purple
 * match the app's gradientAccent; everything is live geometry + lights, not
 * a texture or video.
 */

const CYAN = 0x4fc3f7;
const PURPLE = 0x7c4dff;

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function buildStartupScene(aspect: number) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 100);
  camera.position.set(0, 0, 9.5);

  const key = new THREE.PointLight(0xaab4ff, 8, 30);
  key.position.set(0, 2, 8);
  const cyan = new THREE.PointLight(CYAN, 24, 22);
  cyan.position.set(-4, 2, 5);
  const purple = new THREE.PointLight(PURPLE, 24, 22);
  purple.position.set(4, -2, 5);
  scene.add(key, cyan, purple, new THREE.AmbientLight(0x2a2a40, 1.1));

  // --- blueprint board, behind the iris plane ---
  const COLS = 5;
  const ROWS = 7;
  const CELL = 0.62;
  const GAP = 0.04;
  const BOARD_Z = -1.4;
  const panelGeo = new THREE.PlaneGeometry(CELL - GAP, CELL - GAP);
  const panelMat = new THREE.MeshStandardMaterial({
    color: 0x1c2430,
    metalness: 0.2,
    roughness: 0.6,
    emissive: 0x0a1018,
    side: THREE.DoubleSide,
  });
  const panelEdges = new THREE.EdgesGeometry(panelGeo);
  const boardW = COLS * CELL;
  const boardH = ROWS * CELL;

  type Panel = {
    mesh: THREE.Mesh;
    start: THREE.Vector3;
    target: THREE.Vector3;
    delay: number;
    bobPhase: number;
    bobSpeed: number;
  };
  const panels: Panel[] = [];
  const disposables: { dispose: () => void }[] = [panelGeo, panelMat, panelEdges];

  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS; r++) {
      const target = new THREE.Vector3((c - (COLS - 1) / 2) * CELL, (r - (ROWS - 1) / 2) * CELL, BOARD_Z);
      const start = target
        .clone()
        .add(new THREE.Vector3((Math.random() - 0.5) * 9, (Math.random() - 0.5) * 9, -4 - Math.random() * 4));
      const mesh = new THREE.Mesh(panelGeo, panelMat);
      const lineMat = new THREE.LineBasicMaterial({ color: CYAN, transparent: true, opacity: 0.5 });
      const line = new THREE.LineSegments(panelEdges, lineMat);
      mesh.add(line);
      mesh.position.copy(start);
      mesh.rotation.set((Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3);
      scene.add(mesh);
      disposables.push(lineMat);
      panels.push({
        mesh,
        start,
        target,
        delay: (c + r * COLS) * 0.012,
        bobPhase: Math.random() * Math.PI * 2,
        bobSpeed: 0.5 + Math.random() * 0.4,
      });
    }
  }

  const frameGeo = new THREE.EdgesGeometry(new THREE.PlaneGeometry(boardW + 0.3, boardH + 0.3));
  const frameMat = new THREE.LineBasicMaterial({ color: PURPLE, transparent: true, opacity: 0 });
  const frame = new THREE.LineSegments(frameGeo, frameMat);
  frame.position.z = BOARD_Z;
  scene.add(frame);
  disposables.push(frameGeo, frameMat);

  const stampGroup = new THREE.Group();
  const ringGeo = new THREE.TorusGeometry(0.38, 0.045, 16, 48);
  const ringMat = new THREE.MeshStandardMaterial({ color: CYAN, emissive: 0x15405a, metalness: 0.4, roughness: 0.4 });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  stampGroup.add(ring);
  disposables.push(ringGeo, ringMat);
  const tickGeo = new THREE.BoxGeometry(0.06, 0.22, 0.04);
  const tickMat = new THREE.MeshStandardMaterial({ color: 0xf5f5f7, emissive: 0x222233 });
  disposables.push(tickGeo, tickMat);
  for (let i = 0; i < 3; i++) {
    const tick = new THREE.Mesh(tickGeo, tickMat);
    tick.position.set(-0.13 + i * 0.13, 0, 0);
    stampGroup.add(tick);
  }
  stampGroup.position.set(boardW / 2 - 0.1, boardH / 2 - 0.1, BOARD_Z + 0.4);
  stampGroup.scale.setScalar(0.001);
  scene.add(stampGroup);

  const backGlowGeo = new THREE.PlaneGeometry(boardW + 1, boardH + 1);
  const backGlowMat = new THREE.MeshBasicMaterial({ color: 0x1c2a3a, transparent: true, opacity: 0 });
  const backGlow = new THREE.Mesh(backGlowGeo, backGlowMat);
  backGlow.position.z = BOARD_Z + 0.1;
  scene.add(backGlow);
  disposables.push(backGlowGeo, backGlowMat);

  // --- iris, in front, closed over the board until it opens ---
  const BLADE_COUNT = 8;
  const RING_R = 1.9;
  const LEN = 3.6;
  const CLOSED = Math.PI * 0.08;
  const OPEN = Math.PI * 0.64;
  const IRIS_DELAY = 1.3;
  const IRIS_DUR = 1.5;

  const bladeShape = new THREE.Shape();
  const w = 1.0;
  bladeShape.moveTo(0, -w / 2);
  bladeShape.lineTo(0, w / 2);
  bladeShape.lineTo(LEN * 0.72, w * 0.16);
  bladeShape.lineTo(LEN, 0);
  bladeShape.lineTo(LEN * 0.72, -w * 0.16);
  bladeShape.closePath();
  const bladeGeo = new THREE.ShapeGeometry(bladeShape);
  const bladeMat = new THREE.MeshStandardMaterial({
    color: 0x24242e,
    metalness: 0.55,
    roughness: 0.35,
    emissive: 0x0b0f14,
    side: THREE.DoubleSide,
  });
  disposables.push(bladeGeo, bladeMat);

  const irisGroup = new THREE.Group();
  const pivots: THREE.Group[] = [];
  for (let i = 0; i < BLADE_COUNT; i++) {
    const theta = (i / BLADE_COUNT) * Math.PI * 2;
    const pivot = new THREE.Group();
    pivot.position.set(Math.cos(theta) * RING_R, Math.sin(theta) * RING_R, 0);
    pivot.rotation.z = theta + Math.PI;
    const blade = new THREE.Mesh(bladeGeo, bladeMat);
    blade.rotation.z = CLOSED;
    pivot.add(blade);
    irisGroup.add(pivot);
    pivots.push(pivot);
  }
  scene.add(irisGroup);

  function tick(t: number) {
    for (const p of panels) {
      const local = Math.min(Math.max((t - p.delay) / 1.1, 0), 1);
      const e = easeOutCubic(local);
      p.mesh.position.lerpVectors(p.start, p.target, e);
      p.mesh.rotation.x *= 1 - e;
      p.mesh.rotation.y *= 1 - e;
      p.mesh.rotation.z *= 1 - e;
      if (local >= 1) {
        p.mesh.position.z = p.target.z + Math.sin(t * p.bobSpeed + p.bobPhase) * 0.03;
      }
    }
    const frameT = Math.min(Math.max((t - 1.1) / 0.4, 0), 1);
    frameMat.opacity = frameT * (0.65 + Math.sin(t * 0.9) * 0.15);

    const stampT = easeOutCubic(Math.min(Math.max((t - 0.9) / 0.5, 0), 1));
    stampGroup.scale.setScalar(0.001 + stampT * 0.999);
    stampGroup.rotation.z = stampT >= 1 ? (t - 1.4) * 0.3 : (1 - stampT) * Math.PI * 2;

    const openT = easeOutCubic(Math.min(Math.max((t - IRIS_DELAY) / IRIS_DUR, 0), 1));
    const settled = Math.max(t - IRIS_DELAY - IRIS_DUR, 0);
    const breathe = openT >= 1 ? Math.sin(settled * 1.1) * 0.045 : 0;
    const rot = CLOSED + (OPEN - CLOSED) * openT + breathe;
    for (const p of pivots) (p.children[0] as THREE.Mesh).rotation.z = rot;
    irisGroup.rotation.z = openT >= 1 ? settled * 0.08 : 0;
    backGlowMat.opacity = openT * 0.35;

    cyan.position.x = -4 + Math.sin(t * 0.4) * 1.5;
    purple.position.x = 4 + Math.cos(t * 0.4) * 1.5;
  }

  function dispose() {
    for (const d of disposables) d.dispose();
  }

  return { scene, camera, tick, dispose };
}
