import * as THREE from 'three';
import {
  BLUE_GRADIENT,
  BLUE_LAYER,
  BODY_GRADIENT,
  COLOUR_LAYER,
  PENCIL,
  PENCIL_COLOR,
  type LinearGradient,
  type PathLoop,
} from './bpdLogoMark';

/**
 * Startup animation (concept 7 "Pencil draws the logo", loading-screen-concepts/index.html):
 * the logo's own pencil traces the mark's outline, the colours pour in along their real
 * gradient directions, the bulb lights up, and the pencil slides home. Ends face-on as the
 * exact logo, on a dark background with no text. ~3.1 s.
 */

const FOV = 45;
// Artwork units are the SVG's; S scales them into the scene, centred on the mark.
const S = 0.0078;
const CX = 590;
const CY = 527;
// Half the visible area in scene units: the mark is ~2.3, and the pencil reaches further while drawing.
const FIT_HALF = 3.4;

const VERT = 'varying vec2 vP; void main() { vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';

const clamp = (v: number) => Math.min(Math.max(v, 0), 1);
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const easeInOutQuad = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

function hexToVec(h: string) {
  return new THREE.Vector3(parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255);
}

function toShape(loop: PathLoop) {
  const s = new THREE.Shape();
  for (const c of loop) {
    const n = c.slice(1) as number[];
    if (c[0] === 'M') s.moveTo(n[0], n[1]);
    else if (c[0] === 'L') s.lineTo(n[0], n[1]);
    else s.bezierCurveTo(n[0], n[1], n[2], n[3], n[4], n[5]);
  }
  s.closePath();
  return s;
}

function endPoint(c: PathLoop[number]): [number, number] {
  const n = c.slice(1) as number[];
  return c[0] === 'C' ? [n[4], n[5]] : [n[0], n[1]];
}

export function buildStartupScene(aspect: number) {
  const disposables: { dispose: () => void }[] = [];
  const track = <T extends { dispose: () => void }>(x: T) => {
    disposables.push(x);
    return x;
  };
  const extrude = (shapes: THREE.Shape[], depth: number) =>
    track(new THREE.ExtrudeGeometry(shapes, { depth, bevelEnabled: false, curveSegments: 24 }));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FOV, aspect, 0.1, 100);
  // Fit the mark to whichever axis is tighter, so it reads the same on a phone and a desktop window.
  camera.position.set(0, 0, Math.max(FIT_HALF, FIT_HALF / aspect) / Math.tan(((FOV / 2) * Math.PI) / 180));

  const art = new THREE.Group();
  art.scale.set(S, -S, S);
  art.position.set(-CX * S, CY * S, 0);
  const stage = new THREE.Group();
  stage.add(art);
  scene.add(stage);

  // Gradient fill matching SVG semantics (stops in sRGB, clamped ends), written raw so the
  // hex values land on screen unchanged. Only visible where the gradient parameter < uFill,
  // so animating uFill pours the colour in along the gradient's own direction.
  function pouringMaterial(grad: LinearGradient) {
    const off = new Array<number>(16).fill(1);
    const col = Array.from({ length: 16 }, () => new THREE.Vector3());
    grad.stops.forEach(([o, h], i) => {
      off[i] = o;
      col[i] = hexToVec(h);
    });
    return track(
      new THREE.ShaderMaterial({
        uniforms: {
          uP0: { value: new THREE.Vector2(grad.p0[0], grad.p0[1]) },
          uD: { value: new THREE.Vector2(grad.p1[0] - grad.p0[0], grad.p1[1] - grad.p0[1]) },
          uOff: { value: off },
          uCol: { value: col },
          uN: { value: grad.stops.length },
          uFill: { value: -0.1 },
        },
        vertexShader: VERT,
        fragmentShader: `
          uniform vec2 uP0; uniform vec2 uD; uniform float uOff[16]; uniform vec3 uCol[16]; uniform int uN; uniform float uFill;
          varying vec2 vP;
          void main() {
            float raw = dot(vP - uP0, uD) / dot(uD, uD);
            float vis = 1.0 - smoothstep(uFill - 0.04, uFill, raw);
            if (vis < 0.01) discard;
            float t = clamp(raw, 0.0, 1.0);
            vec3 c = uCol[0];
            for (int i = 1; i < 16; i++) {
              if (i >= uN) break;
              if (t >= uOff[i - 1]) c = mix(uCol[i - 1], uCol[i], clamp((t - uOff[i - 1]) / max(uOff[i] - uOff[i - 1], 1e-5), 0.0, 1.0));
            }
            gl_FragColor = vec4(c, vis);
          }`,
        transparent: true,
        side: THREE.DoubleSide,
      })
    );
  }

  // Bulb interior: white in the logo; here it's the light that switches on. Traced from the
  // inner bulb edge of the blue path, closed across the bulb's opening. Fully transparent until
  // lit, so an unlit bulb never shows as a shape.
  const interiorShape = new THREE.Shape();
  interiorShape.moveTo(823.51, 647.68);
  interiorShape.bezierCurveTo(815.13, 639.98, 806.41, 634.77, 798.57, 625.72);
  interiorShape.bezierCurveTo(747.7, 567.0, 775.6, 506.17, 742.19, 444.02);
  interiorShape.bezierCurveTo(686.16, 339.79, 542.88, 324.44, 465.01, 413.47);
  interiorShape.bezierCurveTo(374.83, 516.58, 444.07, 678.02, 578.02, 700.01);
  interiorShape.bezierCurveTo(629.61, 708.48, 650.11, 709.06, 694.8, 743.31);
  interiorShape.bezierCurveTo(698.09, 745.83, 713.87, 758.26, 718.42, 764.88);
  interiorShape.closePath();
  const interiorMat = track(
    new THREE.ShaderMaterial({
      uniforms: { uOn: { value: 0 }, uWarm: { value: 1 } },
      vertexShader: VERT,
      fragmentShader:
        'uniform float uOn; uniform float uWarm; varying vec2 vP; void main() { vec3 lit = mix(vec3(1.0), vec3(1.0, 0.94, 0.8), uWarm); gl_FragColor = vec4(lit, uOn); }',
      transparent: true,
      side: THREE.DoubleSide,
    })
  );
  const interior = new THREE.Mesh(extrude([interiorShape], 8), interiorMat);
  interior.position.z = -2;
  art.add(interior);

  // Soft warm glow behind the bulb (additive, no textures).
  const haloMat = track(
    new THREE.ShaderMaterial({
      uniforms: { uStrength: { value: 0 } },
      vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader:
        'uniform float uStrength; varying vec2 vUv; void main() { float d = length(vUv - 0.5) * 2.0; float a = pow(max(1.0 - d, 0.0), 2.0) * uStrength; gl_FragColor = vec4(vec3(1.0, 0.93, 0.78) * a, a); }',
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  const halo = new THREE.Mesh(track(new THREE.PlaneGeometry(1500, 1500)), haloMat);
  halo.position.set(590, 545, -60);
  art.add(halo);

  const blueMat = pouringMaterial(BLUE_GRADIENT);
  const bodyMat = pouringMaterial(BODY_GRADIENT);
  const blue = new THREE.Mesh(extrude(BLUE_LAYER.map(toShape), 8), blueMat);
  blue.position.z = 2;
  const body = new THREE.Mesh(extrude(COLOUR_LAYER.map(toShape), 8), bodyMat);
  body.position.z = 10;
  art.add(blue, body);

  // The outline the pencil traces: the mark's full silhouette, evenly spaced so it moves steadily.
  const outline = toShape(BLUE_LAYER[0])
    .getSpacedPoints(700)
    .map((p) => new THREE.Vector3(p.x, p.y, 24));
  const traceGeo = track(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(outline, true), 1400, 2.6, 6, true));
  const traceMat = track(new THREE.MeshBasicMaterial({ color: '#9BD8F7', transparent: true, opacity: 1 }));
  const trace = new THREE.Mesh(traceGeo, traceMat);
  traceGeo.setDrawRange(0, 0);
  art.add(trace);
  const traceTotal = traceGeo.index ? traceGeo.index.count : 0;

  // The logo's pencil, grouped at its true logo position (zero offset = exactly in place).
  // Light while drawing on the dark background; the logo's near-black once it lands on the lit
  // bulb. The graphite tip stays white so it doesn't vanish into the dark background.
  const pencil = new THREE.Group();
  pencil.position.z = 18;
  art.add(pencil);
  const barMat = track(new THREE.MeshBasicMaterial({ color: '#E9E9EE', side: THREE.DoubleSide }));
  const tipMat = track(new THREE.MeshBasicMaterial({ color: '#FFFFFF', side: THREE.DoubleSide }));
  const [tipLoop, ...barLoops] = PENCIL;
  for (const loop of barLoops) pencil.add(new THREE.Mesh(extrude([toShape(loop)], 8), barMat));
  pencil.add(new THREE.Mesh(extrude([toShape(tipLoop)], 8), tipMat));
  const axis = new THREE.Vector2(165.73, 159.04).normalize();
  const apex = tipLoop
    .map(endPoint)
    .reduce((a, p) => (p[0] * axis.x + p[1] * axis.y > a[0] * axis.x + a[1] * axis.y ? p : a));
  const darkPencil = new THREE.Color(PENCIL_COLOR);
  const lightPencil = new THREE.Color('#E9E9EE');
  const home = new THREE.Vector3(0, 0, 0);

  const TRACE_START = 0.25;
  const TRACE_END = 1.75;

  function tick(t: number) {
    // 1. Trace: the pencil's graphite apex rides the outline; the line draws behind it.
    const traceT = clamp((t - TRACE_START) / (TRACE_END - TRACE_START));
    traceGeo.setDrawRange(0, Math.floor((traceTotal * traceT) / 3) * 3);
    const along = outline[Math.min(outline.length - 1, Math.floor(traceT * (outline.length - 1)))];

    // 2. Pencil: rides the outline, then slides home into its place in the logo.
    const homeT = easeInOutQuad(clamp((t - 1.75) / 0.65));
    pencil.position.set(along.x - apex[0], along.y - apex[1], 0).lerp(home, homeT);
    pencil.position.z = 18;
    pencil.visible = t > 0.1;
    barMat.color.lerpColors(lightPencil, darkPencil, clamp((t - 2.15) / 0.3));

    // 3. Colour pours in along each gradient: blue sweeps left to right, body rises bottom to top.
    blueMat.uniforms.uFill.value = -0.1 + 1.25 * easeInOutQuad(clamp((t - 1.3) / 0.6));
    bodyMat.uniforms.uFill.value = -0.1 + 1.25 * easeInOutQuad(clamp((t - 1.65) / 0.75));

    // 4. The bulb lights up with a quick flicker, and the guide line fades away.
    const flick = t < 2.2 ? 0 : t < 2.27 ? 1 : t < 2.33 ? 0.25 : 1;
    interiorMat.uniforms.uOn.value = Math.min(1, flick * clamp((t - 2.2) / 0.25 + 0.6));
    interiorMat.uniforms.uWarm.value = 1 - clamp((t - 2.5) / 0.6);
    haloMat.uniforms.uStrength.value = flick * (t < 2.8 ? 0.8 : 0.8 - 0.5 * clamp((t - 2.8) / 0.8));
    traceMat.opacity = 1 - clamp((t - 2.3) / 0.45);
    trace.visible = traceMat.opacity > 0.01;

    // Gentle 3D settle to exactly face-on as the logo completes.
    const settle = 1 - easeOutCubic(clamp(t / 2.6));
    stage.rotation.y = -0.35 * settle;
    stage.rotation.x = 0.12 * settle;
  }

  function dispose() {
    for (const d of disposables) d.dispose();
  }

  return { scene, camera, tick, dispose };
}
