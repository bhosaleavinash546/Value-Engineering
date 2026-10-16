/* VAVEhub · VH-3600 projector: interactive 3D model (three.js, self-hosted under vendor/three).
   Units are centimetres. The optical layout follows a typical 3LCD engine: lamp → integrator →
   polarisation converter → two dichroic mirrors → three LCD panels round an X-cube prism → zoom lens.
   Red takes the long way round through two relay lenses. Front of the projector is +z, up is +y. */
import * as THREE from "three";
import { OrbitControls } from "./vendor/three/OrbitControls.js";
import { RoundedBoxGeometry } from "./vendor/three/RoundedBoxGeometry.js";
import { RoomEnvironment } from "./vendor/three/RoomEnvironment.js";

const D = window.VH_PROJ;
const root = document.getElementById("pjViewer");
if (root && D) init();

function init() {
  const $ = (s, el = root) => el.querySelector(s);
  const stage = $(".pj-stage"), canvasHost = $(".pj-canvas"), balloonsEl = $(".pj-balloons"), tip = $(".pj-tip"), card = $(".pj-card");
  const ITEM = Object.fromEntries(D.parts.map((p) => [p.n, p]));
  const GROUP = Object.fromEntries(D.groups.map((g) => [g.id, g]));
  const BY_ID = Object.fromEntries(D.parts.map((p) => [p.id, p]));
  const fmt = (v) => "£" + (v >= 10 ? v.toFixed(0) : v < 0.05 ? v.toFixed(3) : v.toFixed(2));

  // ── renderer ──
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: !!window.VH_CAPTURE });
  } catch (e) { root.classList.add("pj-nogl"); return; }
  if (!renderer.getContext()) { root.classList.add("pj-nogl"); return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  canvasHost.appendChild(renderer.domElement);
  renderer.domElement.setAttribute("aria-hidden", "true");

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  const camera = new THREE.PerspectiveCamera(32, 1, 0.5, 600);
  camera.position.set(34, 24, 40);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = 0.08;
  controls.minDistance = 8; controls.maxDistance = 160;
  controls.target.set(0, 0, 0);
  controls.autoRotateSpeed = 0.6;

  scene.add(new THREE.HemisphereLight(0xe8eeff, 0x20283a, 0.9));
  const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(18, 30, 22); scene.add(key);
  const rim = new THREE.DirectionalLight(0x9fc0ff, 0.6); rim.position.set(-24, 10, -20); scene.add(rim);

  // soft contact shadow under the projector
  {
    const c = document.createElement("canvas"); c.width = c.height = 128;
    const g = c.getContext("2d"), gr = g.createRadialGradient(64, 64, 6, 64, 64, 64);
    gr.addColorStop(0, "rgba(0,0,0,.55)"); gr.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(46, 34), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));
    sh.rotation.x = -Math.PI / 2; sh.position.y = -5.65; sh.userData.shadow = true; scene.add(sh);
    var shadow = sh;
  }

  // ── materials (a fresh one per mesh, so a part can glow or fade on its own) ──
  const MAT = {
    housing: () => new THREE.MeshStandardMaterial({ color: 0xeef1f5, roughness: 0.5, metalness: 0 }),
    housing2: () => new THREE.MeshStandardMaterial({ color: 0xdde2e9, roughness: 0.55, metalness: 0 }),
    charcoal: () => new THREE.MeshStandardMaterial({ color: 0x22262d, roughness: 0.3, metalness: 0.1 }),
    dark: () => new THREE.MeshStandardMaterial({ color: 0x30353e, roughness: 0.5, metalness: 0.3 }),
    black: () => new THREE.MeshStandardMaterial({ color: 0x121419, roughness: 0.55, metalness: 0.1 }),
    rubber: () => new THREE.MeshStandardMaterial({ color: 0x1b1d22, roughness: 0.9 }),
    glass: (c = 0xbfe3ff, o = 0.32) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.05, metalness: 0.15, transparent: true, opacity: o, depthWrite: false }),
    mirror: () => new THREE.MeshStandardMaterial({ color: 0xdfe5ee, roughness: 0.12, metalness: 1 }),
    gold: () => new THREE.MeshStandardMaterial({ color: 0xd9b779, roughness: 0.22, metalness: 0.9, side: THREE.DoubleSide }),
    alu: () => new THREE.MeshStandardMaterial({ color: 0xa8b0ba, roughness: 0.35, metalness: 0.75 }),
    pcb: () => new THREE.MeshStandardMaterial({ color: 0x1d6a46, roughness: 0.65, metalness: 0.05 }),
    chip: () => new THREE.MeshStandardMaterial({ color: 0x15171b, roughness: 0.4, metalness: 0.2 }),
    flex: () => new THREE.MeshStandardMaterial({ color: 0xd28a2c, roughness: 0.45, metalness: 0.2 }),
    tape: () => new THREE.MeshStandardMaterial({ color: 0xd8b24a, roughness: 0.6 }),
    blue: () => new THREE.MeshStandardMaterial({ color: 0x2c52a8, roughness: 0.4 }),
    white: () => new THREE.MeshStandardMaterial({ color: 0xf4f2ec, roughness: 0.8 }),
    ceramic: () => new THREE.MeshStandardMaterial({ color: 0xe8e1cf, roughness: 0.7 }),
    lcd: () => new THREE.MeshStandardMaterial({ color: 0x14306b, roughness: 0.15, metalness: 0.3, emissive: 0x0a1c48, emissiveIntensity: 0.6 }),
    film: (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.3, transparent: true, opacity: 0.72, depthWrite: false }),
    duct: () => new THREE.MeshStandardMaterial({ color: 0x8b95a3, roughness: 0.6, transparent: true, opacity: 0.55, depthWrite: false }),
  };
  const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  const rbox = (w, h, d, r = 0.2) => new RoundedBoxGeometry(w, h, d, 3, r);
  const cyl = (rt, rb, h, s = 40) => new THREE.CylinderGeometry(rt, rb, h, s);
  function m(geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
    const o = new THREE.Mesh(geo, mat); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); return o;
  }
  function unit(x, y, z, ...kids) { const g = new THREE.Group(); g.position.set(x, y, z); kids.forEach((k) => g.add(k)); return g; }
  // a lens element: an ellipsoid, thin along the light path ("x" or "z")
  function lensEl(r, t, axis, c, o) {
    const o3 = m(new THREE.SphereGeometry(1, 40, 20), MAT.glass(c, o));
    if (axis === "x") o3.scale.set(t / 2, r, r); else o3.scale.set(r, r, t / 2);
    return o3;
  }
  function text(str, w, h, opt = {}) {
    const c = document.createElement("canvas"); c.width = 512; c.height = Math.round(512 * h / w);
    const g = c.getContext("2d"); g.clearRect(0, 0, c.width, c.height);
    g.fillStyle = opt.color || "#8a93a3"; g.font = `${opt.weight || 700} ${Math.round(c.height * 0.62)}px "IBM Plex Sans", Arial, sans-serif`;
    g.textAlign = opt.align || "center"; g.textBaseline = "middle";
    g.fillText(str, opt.align === "left" ? 8 : c.width / 2, c.height / 2);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false }));
  }

  const Y0 = 0.6;                      // height of the light path
  const PC = new THREE.Vector3(4, Y0, 3); // centre of the X-cube prism

  // ── the parts: each builder returns one or more "units" placed where they sit in the projector ──
  const B = {
    burner: () => [unit(-12.4, Y0, -1.5,
      (() => { const b = m(new THREE.SphereGeometry(0.45, 32, 16), MAT.glass(0xf6f8ff, 0.6)); b.scale.set(1.15, 0.85, 0.85); return b; })(),
      m(cyl(0.13, 0.13, 1.7), MAT.glass(0xf6f8ff, 0.6), -1.0, 0, 0, 0, 0, Math.PI / 2),
      m(cyl(0.05, 0.05, 0.7), MAT.dark(), 0.05, 0, 0, 0, 0, Math.PI / 2),
      m(cyl(0.38, 0.38, 0.8), MAT.ceramic(), -2.2, 0, 0, 0, 0, Math.PI / 2))],
    reflector: () => {
      const pts = []; for (let i = 0; i <= 28; i++) { const r = 0.35 + (2.6 - 0.35) * i / 28; pts.push(new THREE.Vector2(r, (r * r) / 3.2)); }
      const refl = m(new THREE.LatheGeometry(pts, 56), MAT.gold());
      const rimR = m(new THREE.TorusGeometry(2.6, 0.08, 10, 56), MAT.alu(), 0, 2.11, 0, Math.PI / 2);
      const u = unit(-13.2, Y0, -1.5, unit(0, 0, 0, refl, rimR)); u.children[0].rotation.z = -Math.PI / 2; return [u];
    },
    cage: () => [unit(-12.6, Y0, -1.5,
      m(box(0.3, 5.6, 5.6), MAT.dark(), -1.0, 0, 0),
      m(box(3.4, 0.3, 5.6), MAT.dark(), 0.6, 2.8, 0), m(box(3.4, 0.3, 5.6), MAT.dark(), 0.6, -2.8, 0),
      m(box(0.8, 0.8, 1.2), MAT.black(), -1.5, -2.0, 1.8))],
    uvir: () => [unit(-10.2, Y0, -1.5, m(box(0.12, 3.2, 3.2), new THREE.MeshStandardMaterial({ color: 0xb58cff, roughness: 0.1, metalness: 0.35, transparent: true, opacity: 0.55, depthWrite: false })))],
    lampdoor: () => [unit(-11.8, 4.68, -1.5, m(rbox(6.4, 0.2, 6.4, 0.08), MAT.housing2()), m(box(2, 0.06, 0.4), MAT.dark(), 0, 0.12, 2.6))],
    fly1: () => [flyEye(-8.6)], fly2: () => [flyEye(-7.2)],
    pbs: () => { const u = unit(-5.9, Y0, -1.5); for (let i = 0; i < 8; i++) u.add(m(box(0.5, 3.0, 0.44), i % 2 ? MAT.glass(0xe9f3ff, 0.55) : MAT.glass(0xbfe3ff, 0.32), 0, 0, -1.54 + i * 0.44)); return [u]; },
    cond: () => [unit(-4.6, Y0, -1.5, lensEl(1.75, 0.55, "x"))],
    dm1: () => [unit(0.4, Y0, -1.5, m(box(0.1, 3, 3), MAT.glass(0x4f86ff, 0.55), 0, 0, 0, 0, Math.PI / 4))],
    dm2: () => [unit(4, Y0, -1.5, m(box(0.1, 3, 3), MAT.glass(0x37d07c, 0.55), 0, 0, 0, 0, Math.PI / 4))],
    fold: () => [[0.4, 3, 1], [7.7, -1.5, 1], [7.7, 3, -1]].map(([x, z, s]) => unit(x, Y0, z, m(box(0.1, 3, 3), MAT.mirror(), 0, 0, 0, 0, s * Math.PI / 4))),
    relay: () => [unit(6.1, Y0, -1.5, lensEl(1.4, 0.45, "x")), unit(7.7, Y0, 0.8, lensEl(1.4, 0.45, "z"))],
    field: () => [unit(1.75, Y0, 3, lensEl(1.3, 0.45, "x")), unit(6.25, Y0, 3, lensEl(1.3, 0.45, "x")), unit(4, Y0, 0.75, lensEl(1.3, 0.45, "z"))],
    lcd: () => [panel(2.35, 3, 0), panel(5.65, 3, 0), panel(4, 1.35, 1)],
    polin: () => [film(2.1, 3, 0, 0x30353f), film(5.9, 3, 0, 0x30353f), film(4, 1.1, 1, 0x30353f)],
    polout: () => [film(2.6, 3, 0, 0x3a2f45), film(5.4, 3, 0, 0x3a2f45), film(4, 1.6, 1, 0x3a2f45)],
    prism: () => [unit(4, Y0, 3,
      m(box(2.4, 2.4, 2.4), MAT.glass(0xa8e6ff, 0.3)),
      m(box(3.36, 2.38, 0.03), MAT.glass(0xff6b6b, 0.4), 0, 0, 0, 0, Math.PI / 4),
      m(box(3.36, 2.38, 0.03), MAT.glass(0x5b8cff, 0.4), 0, 0, 0, 0, -Math.PI / 4),
      m(box(2.6, 0.12, 2.6), MAT.dark(), 0, -1.26, 0))],
    frame: () => [unit(-3, -1.3, 0.8, m(rbox(23.2, 0.3, 9.8, 0.12), MAT.alu()),
      ...[[-9.5, -4], [-9.5, 4.2], [10.5, -4], [10.5, 4.2]].map(([x, z]) => m(cyl(0.35, 0.35, 1.2, 16), MAT.alu(), x, 0.6, z)))],
    lens: () => [unit(4, Y0, 8.85,
      m(cyl(1.9, 1.9, 7, 48), MAT.black(), 0, 0, -0.75, Math.PI / 2),
      m(cyl(2.08, 2.08, 1.3, 48), MAT.dark(), 0, 0, 0.1, Math.PI / 2),
      m(cyl(2.2, 2.2, 1.1, 48), MAT.rubber(), 0, 0, 2.0, Math.PI / 2),
      m(cyl(2.3, 2.2, 1.4, 48), MAT.black(), 0, 0, 3.55, Math.PI / 2),
      m(cyl(1.72, 1.72, 0.05, 40), MAT.black(), 0, 0, 4.0, Math.PI / 2),
      (() => { const g = lensEl(1.78, 0.5, "z", 0x8fc7ff, 0.55); g.position.z = 4.15; return g; })(),
      (() => { const g = lensEl(1.5, 0.4, "z"); g.position.z = -4.3; return g; })())],
    blower: () => [unit(2.5, -2.6, -4.2, m(cyl(2.2, 2.2, 1.4, 48), MAT.dark()),
      ...Array.from({ length: 22 }, (_, i) => { const a = i / 22 * Math.PI * 2; return m(box(0.08, 0.5, 0.6), MAT.black(), Math.cos(a) * 1.4, 0.92, Math.sin(a) * 1.4, 0, -a + 0.4, 0); }),
      m(cyl(0.7, 0.7, 1.6, 24), MAT.alu(), 0, 0.2, 0), m(box(1.6, 1.4, 1.8), MAT.dark(), 1.2, 0, 2.2))],
    lampfan: () => [unit(-10.8, 0.4, 3.6, m(cyl(1.4, 1.4, 1.3, 40), MAT.dark()),
      ...Array.from({ length: 16 }, (_, i) => { const a = i / 16 * Math.PI * 2; return m(box(0.07, 0.4, 0.45), MAT.black(), Math.cos(a) * 0.9, 0.8, Math.sin(a) * 0.9, 0, -a + 0.4, 0); }),
      m(box(1.2, 1.0, 1.4), MAT.dark(), -0.4, 0, -1.6))],
    exhaust: () => {
      const u = unit(-13.9, 0.3, 6.5, m(box(2.4, 0.5, 7.6), MAT.black(), 0, 3.55, 0), m(box(2.4, 0.5, 7.6), MAT.black(), 0, -3.55, 0),
        m(box(2.4, 7.6, 0.5), MAT.black(), 0, 0, 3.55), m(box(2.4, 7.6, 0.5), MAT.black(), 0, 0, -3.55),
        m(cyl(1.3, 1.3, 2.2, 32), MAT.dark(), 0, 0, 0, 0, 0, Math.PI / 2));
      for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2, b = m(box(0.12, 2.3, 1.2), MAT.black(), 0, Math.cos(a) * 2.0, Math.sin(a) * 2.0, a, 0.5, 0); u.add(b); }
      return [u];
    },
    ducts: () => [unit(3.4, -1.95, 0.3, m(box(3.0, 0.7, 6.4), MAT.duct())), unit(-11.0, 0.4, 2.2, m(box(1.8, 1.1, 1.4), MAT.duct()))],
    filter: () => [unit(14.65, -0.3, 0, m(box(0.5, 5.6, 7.6), MAT.dark()), m(box(0.42, 5.0, 7.0), new THREE.MeshStandardMaterial({ color: 0x6b7280, roughness: 1 }), 0.05, 0, 0))],
    therm: () => [[-10.6, 2.9, -1.5, "eng"], [4, 2.1, 3, "eng"], [11, -1.4, -7.5, "psu"]].map(([x, y, z, t]) => { const u = unit(x, y, z, m(cyl(0.13, 0.13, 0.5, 12), MAT.black()), m(cyl(0.03, 0.03, 0.9, 6), MAT.alu(), 0, -0.6, 0)); u.userData.tm = t; return u; }),
    psu: () => [unit(10, -3.6, -7.5, m(box(8.8, 0.16, 5.6), MAT.pcb()),
      m(box(1.8, 1.6, 1.8), MAT.tape(), -1.5, 0.9, -1),
      m(cyl(0.6, 0.6, 2.2, 24), MAT.black(), -3.2, 1.2, 1.2), m(cyl(0.5, 0.5, 1.8, 24), new THREE.MeshStandardMaterial({ color: 0x1f2a5a, roughness: 0.4 }), -1.8, 1.0, 1.6),
      m(box(3, 0.2, 1.2), MAT.alu(), 2.2, 0.15, -1.5), ...Array.from({ length: 7 }, (_, i) => m(box(0.1, 1.8, 1.2), MAT.alu(), 0.9 + i * 0.43, 1.1, -1.5)),
      m(box(1.2, 1.2, 1.2), MAT.tape(), 2.6, 0.7, 1.5), m(cyl(0.5, 0.5, 0.8, 20), MAT.black(), 3.7, 0.5, 1.7),
      ...Array.from({ length: 5 }, (_, i) => m(box(0.5, 0.3, 0.3), MAT.chip(), -0.3 + i * 0.7, 0.2, 2.3)))],
    inlet: () => [unit(12, -2.3, -11.1, m(box(3, 1.8, 0.9), MAT.black()), m(box(2, 1.0, 0.1), MAT.dark(), 0, 0, -0.5))],
    main: () => [unit(-1, -3.75, 7, m(box(16, 0.16, 7), MAT.pcb()),
      m(box(2.2, 0.25, 2.2), MAT.chip(), -1, 0.2, 0), m(box(1.2, 0.18, 0.9), MAT.chip(), 1.8, 0.17, -1.2), m(box(1.2, 0.18, 0.9), MAT.chip(), 1.8, 0.17, 0.6),
      m(box(1.0, 0.16, 1.0), MAT.chip(), -4.2, 0.16, 1.6), m(box(0.8, 0.14, 0.6), MAT.chip(), 3.6, 0.15, 1.9),
      m(box(2.6, 0.3, 0.5), new THREE.MeshStandardMaterial({ color: 0xf2f2ee, roughness: 0.6 }), 5.6, 0.2, -2.8),
      ...Array.from({ length: 9 }, (_, i) => m(cyl(0.18, 0.18, 0.5, 12), MAT.black(), -6.5 + i * 0.7, 0.3, -2.6)))],
    io: () => [unit(-1, -2.3, -11, m(box(12, 3, 0.16), MAT.pcb()),
      m(box(1.5, 0.6, 0.9), MAT.alu(), -4.4, -0.6, -0.45), m(box(1.5, 0.6, 0.9), MAT.alu(), -2.6, -0.6, -0.45),
      m(box(3.1, 1.2, 0.9), MAT.blue(), 0.2, -0.3, -0.45), m(box(1.3, 0.6, 0.9), MAT.alu(), 2.6, -0.6, -0.45),
      m(box(3.0, 1.1, 0.9), MAT.chip(), 4.6, -0.3, -0.45), m(cyl(0.3, 0.3, 0.9, 16), MAT.black(), -5.6, 0.6, -0.45, Math.PI / 2))],
    keypad: () => [unit(9, 4.66, 6.4, m(rbox(6.6, 0.2, 3.0, 0.08), MAT.charcoal()),
      ...[[-2.3, 0], [-0.9, 0], [0.5, 0], [1.9, -0.6], [1.9, 0.6]].map(([x, z]) => m(cyl(0.34, 0.34, 0.16, 20), new THREE.MeshStandardMaterial({ color: 0xc9ced6, roughness: 0.5 }), x, 0.14, z)),
      m(cyl(0.38, 0.38, 0.16, 20), new THREE.MeshStandardMaterial({ color: 0x2e6fe8, roughness: 0.4, emissive: 0x2e6fe8, emissiveIntensity: 0.3 }), -2.3 + 4.9, 0.14, 0.9))],
    ir: () => [unit(-10, 1.4, 11.65, m(box(1.0, 0.6, 0.2), MAT.glass(0x3a0d16, 0.85))), unit(-6, 1.4, -11.62, m(box(1.0, 0.6, 0.2), MAT.glass(0x3a0d16, 0.85)))],
    speaker: () => [unit(-6, -2.9, -7, m(cyl(1.6, 1.6, 0.8, 40), MAT.black()), m(cyl(1.25, 0.6, 0.3, 40), MAT.dark(), 0, 0.45, 0))],
    interlock: () => [unit(-8.3, 3.6, -4.9, m(box(0.9, 0.5, 0.45), MAT.black()), m(box(0.1, 0.5, 0.1), MAT.alu(), 0.2, 0.45, 0))],
    harness: () => {
      const u = unit(0, 0, 0), tube = (pts, r, mat) => m(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p))), 48, r, 8), mat);
      u.add(tube([[8, -2.9, -5.2], [6, -2.6, -1], [2, -3.2, 3], [-2, -3.4, 4.2]], 0.12, MAT.black()));
      u.add(tube([[7.5, -2.9, -8.5], [0, -1.8, -8.6], [-8, -1.2, -6], [-12.2, -1.2, -3.2]], 0.12, MAT.black()));
      u.add(tube([[4.6, -3.4, 4.2], [5.2, -2, 4.5], [5.65, 1, 3.6], [5.65, 1.9, 3]], 0.09, MAT.flex()));
      u.add(tube([[2.6, -3.4, 4.6], [2.2, -2, 4.4], [2.35, 1, 3.6], [2.35, 1.9, 3]], 0.09, MAT.flex()));
      return [u];
    },
    top: () => {
      const u = unit(0, 2.3, -0.3, m(rbox(30, 4.6, 22.4, 0.9), MAT.housing()));
      for (let i = 0; i < 7; i++) u.add(m(box(0.05, 2.6, 0.34), MAT.dark(), -15.01, -0.6, 3.6 + i * 0.85));
      const label = text("VH-3600", 5, 0.9, { color: "#9aa3b2" }); label.rotation.x = -Math.PI / 2; label.position.set(8.5, 2.31, 9.6); u.add(label);
      const l2 = text("3LCD", 2.6, 0.7, { color: "#b9c0cb" }); l2.rotation.x = -Math.PI / 2; l2.position.set(-12, 2.31, 9.6); u.add(l2);
      return [u];
    },
    bottom: () => {
      const u = unit(0, -2.3, -0.3, m(rbox(30, 4.6, 22.4, 0.9), MAT.housing2()));
      for (let i = 0; i < 7; i++) u.add(m(box(0.05, 2.4, 0.34), MAT.dark(), -15.01, 0.4, 3.6 + i * 0.85));
      for (let i = 0; i < 8; i++) u.add(m(box(0.05, 2.4, 0.34), MAT.dark(), 15.01, 0.6, -2.8 + i * 0.8));
      return [u];
    },
    bezel: () => {
      const u = unit(0, 0, 11.25, m(rbox(30, 9.2, 0.8, 0.35), MAT.charcoal()),
        m(new THREE.TorusGeometry(2.45, 0.13, 12, 56), MAT.alu(), 4, Y0, 0.42));
      const lg = text("VAVEhub", 4.6, 0.9, { color: "#8f99aa" }); lg.position.set(-9.5, -2.8, 0.42); u.add(lg);
      for (let i = 0; i < 6; i++) u.add(m(box(0.34, 3.2, 0.05), MAT.black(), 9.4 + i * 0.75, -0.6, 0.42));
      return [u];
    },
    lenscover: () => [unit(9.6, Y0, 11.85, m(rbox(4.4, 4.4, 0.22, 0.1), MAT.dark()), ...[-1, 0, 1].map((i) => m(box(0.12, 3.4, 0.08), MAT.black(), 1.6 + i * 0.25, 0, 0.13)))],
    feet: () => [[0, 8.6], [-12, -9], [12, -9]].map(([x, z]) => unit(x, -5.1, z, m(cyl(0.7, 0.75, 1.0, 24), MAT.rubber()))),
    screws: () => { const u = unit(0, -4.72, 0); [[-13.6, -10], [13.6, -10], [-13.6, 9.6], [13.6, 9.6], [-5, -10.4], [5, -10.4], [-5, 9.9], [5, 9.9]].forEach(([x, z]) => { u.add(m(cyl(0.22, 0.22, 0.12, 16), MAT.alu(), x, 0, z)); u.add(m(cyl(0.1, 0.1, 0.8, 8), MAT.alu(), x, 0.45, z)); }); return [u]; },
    remote: () => [unit(36, -16, 14, m(rbox(4, 0.9, 13, 0.4), MAT.charcoal()),
      ...Array.from({ length: 12 }, (_, i) => m(cyl(0.28, 0.28, 0.12, 14), new THREE.MeshStandardMaterial({ color: 0x8a93a3 }), -1 + (i % 3), 0.5, -3 + Math.floor(i / 3) * 1.4)),
      m(cyl(0.45, 0.45, 0.12, 18), MAT.blue(), 0, 0.5, -5))],
    cables: () => [unit(36, -16.6, 0, m(new THREE.TorusGeometry(2.6, 0.22, 10, 48), MAT.black(), 0, 0, 0, Math.PI / 2), m(new THREE.TorusGeometry(2.1, 0.22, 10, 48), MAT.black(), 0, 0.4, 0, Math.PI / 2), m(box(1.2, 0.8, 1.6), MAT.black(), 3.3, 0, 0), m(box(1.8, 0.7, 1.0), MAT.blue(), -3.5, 0.2, 0))],
    docs: () => [unit(36, -16.9, -12.5, m(box(7, 0.1, 9.6), MAT.white()), ...Array.from({ length: 6 }, (_, i) => m(box(5, 0.02, 0.18), MAT.dark(), 0, 0.06, -3.4 + i * 0.9)))],
  };
  function flyEye(x) {
    const u = unit(x, Y0, -1.5, m(box(0.22, 3.0, 3.8), MAT.glass(0xcfe9ff, 0.35)));
    for (let r = 0; r < 5; r++) for (let c = 0; c < 4; c++) { const s = m(new THREE.SphereGeometry(0.34, 16, 10), MAT.glass(0xcfe9ff, 0.4), 0.11, -1.2 + r * 0.6, -1.4 + c * 0.93); s.scale.set(0.35, 0.85, 1.25); u.add(s); }
    return u;
  }
  function panel(x, z, alongZ) {
    const u = unit(x, Y0, z, m(box(0.14, 2.0, 2.5), MAT.charcoal()), m(box(0.15, 1.45, 1.95), MAT.lcd()), m(box(0.04, 2.6, 1.0), MAT.flex(), 0, 2.25, 0));
    if (alongZ) u.rotation.y = Math.PI / 2; return u;
  }
  function film(x, z, alongZ, c) { const u = unit(x, Y0, z, m(box(0.05, 1.8, 2.3), MAT.film(c))); if (alongZ) u.rotation.y = Math.PI / 2; return u; }

  // ── where each part goes in the exploded view ──
  const LIFT = new THREE.Vector3(0, 11, 0), S = 2.3, K = 2.9;
  const engine = (p, extra) => PC.clone().add(p.clone().sub(PC).multiplyScalar(S)).add(LIFT).add(extra || new THREE.Vector3());
  const stackOut = (p) => PC.clone().add(LIFT).add(p.clone().sub(PC).multiplyScalar(K));
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const OFF = { frame: V(0, 6, 0), blower: V(-1, -9, -6), lampfan: V(-14, 7, 9), exhaust: V(-16, -2, 8), ducts: V(0, -6, 0), filter: V(14, 0, 0),
    psu: V(12, -10, -7), inlet: V(12, -10, -13), main: V(0, -13, 4), io: V(0, -9, -11), keypad: V(0, 30, 4), speaker: V(-6, -12, -8), interlock: V(0, 16, 0),
    harness: V(0, -6, 0), top: V(0, 26, 0), bottom: V(0, -26, 0), bezel: V(-2, -5, 27), lenscover: V(-2, -5, 31), feet: V(0, -32, 0), screws: V(0, -30, 0), lampdoor: V(0, 33, 0) };
  const ENGINE = new Set(["burner", "reflector", "cage", "uvir", "fly1", "fly2", "pbs", "cond", "dm1", "dm2", "fold", "relay", "prism", "lens"]);
  const STACK = new Set(["field", "lcd", "polin", "polout"]);
  const EXTRA = { burner: V(1.8, 0, 0), cage: V(-5, 0, 0), lens: V(0, 0, 5) };
  const ACC = new Set(["remote", "cables", "docs"]);
  function exploded(id, u) {
    const p = u.position;
    if (u.userData.tm === "eng") return engine(p);
    if (u.userData.tm === "psu") return p.clone().add(OFF.psu);
    if (ENGINE.has(id)) return engine(p, EXTRA[id]);
    if (STACK.has(id)) return stackOut(p);
    if (ACC.has(id)) return p.clone();
    if (id === "ir") return p.clone().add(V(0, -3, p.z > 0 ? 12 : -12));
    return p.clone().add(OFF[id] || V(0, 0, 0));
  }

  // ── build ──
  const units = [];           // { id, n, obj, a: assembled pos, e: exploded pos, mats }
  const byN = {};
  const pickables = [];
  D.parts.forEach((p) => {
    if (p.hidden3d || !B[p.id]) return;
    B[p.id]().forEach((obj, i) => {
      const rec = { id: p.id, n: p.n, obj, a: obj.position.clone(), mats: [] };
      rec.e = exploded(p.id, obj);
      obj.traverse((o) => {
        if (o.isMesh) {
          o.userData.rec = rec; pickables.push(o);
          const mt = o.material; mt.userData.o = mt.opacity; mt.userData.t = mt.transparent; mt.userData.em = mt.emissive ? mt.emissive.clone() : null; mt.userData.ei = mt.emissiveIntensity;
          rec.mats.push(mt);
        }
      });
      scene.add(obj); units.push(rec); (byN[p.n] = byN[p.n] || []).push(rec);
    });
  });

  // ── the light path ──
  const beams = new THREE.Group(); beams.visible = false; scene.add(beams);
  const stripe = (() => {
    const c = document.createElement("canvas"); c.width = 8; c.height = 64; const g = c.getContext("2d");
    const gr = g.createLinearGradient(0, 0, 0, 64); gr.addColorStop(0, "rgba(255,255,255,0.15)"); gr.addColorStop(0.5, "rgba(255,255,255,1)"); gr.addColorStop(1, "rgba(255,255,255,0.15)");
    g.fillStyle = gr; g.fillRect(0, 0, 8, 64); return c;
  })();
  const flows = [];
  function seg(a, b, color, step, r = 0.22) {
    const A = V(...a), Bv = V(...b), d = Bv.clone().sub(A), len = d.length();
    const tex = new THREE.CanvasTexture(stripe); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(1, len / 1.6);
    const glow = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 16, 1, true), new THREE.MeshBasicMaterial({ color, map: tex, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
    const core = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.35, r * 0.35, len, 8), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, depthWrite: false, toneMapped: false }));
    [glow, core].forEach((o) => { o.position.copy(A).add(Bv).multiplyScalar(0.5); o.quaternion.setFromUnitVectors(V(0, 1, 0), d.clone().normalize()); o.userData.step = step; beams.add(o); });
    flows.push(tex);
  }
  const y = Y0, W = 0xfff4d6, BL = 0x2f6bff, GR = 0x12d36a, RD = 0xff3030, YE = 0xffc928;
  seg([-12.2, y, -1.5], [-8.6, y, -1.5], W, 1, 0.55);
  seg([-8.6, y, -1.5], [-4.6, y, -1.5], W, 2, 0.4);
  seg([-4.6, y, -1.5], [0.4, y, -1.5], W, 3, 0.32);
  seg([0.4, y, -1.5], [0.4, y, 3], BL, 4); seg([0.4, y, 3], [2.8, y, 3], BL, 5);
  seg([0.4, y, -1.5], [4, y, -1.5], YE, 4); seg([4, y, -1.5], [4, y, 1.8], GR, 5);
  seg([4, y, -1.5], [7.7, y, -1.5], RD, 4); seg([7.7, y, -1.5], [7.7, y, 3], RD, 4); seg([7.7, y, 3], [5.2, y, 3], RD, 5);
  seg([4, y, 3], [4, y, 13.2], W, 6, 0.3);
  // the projected picture: a beam fanning out to a screen
  const SCR = { z: 62, w: 40, h: 30, cy: 12 };
  {
    const apex = V(4, Y0, 13.2), cs = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy]) => V(4 + sx * SCR.w / 2, SCR.cy + sy * SCR.h / 2, SCR.z));
    const g = new THREE.BufferGeometry(), pts = [];
    for (let i = 0; i < 4; i++) { const a = cs[i], b = cs[(i + 1) % 4]; pts.push(apex.x, apex.y, apex.z, a.x, a.y, a.z, b.x, b.y, b.z); }
    g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    const fr = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: 0xfff6dd, transparent: true, opacity: 0.06, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    fr.userData.step = 7; beams.add(fr);
    const c = document.createElement("canvas"); c.width = 1024; c.height = 768; const x = c.getContext("2d");
    const bg = x.createLinearGradient(0, 0, 1024, 768); bg.addColorStop(0, "#0b1430"); bg.addColorStop(1, "#16306b"); x.fillStyle = bg; x.fillRect(0, 0, 1024, 768);
    x.fillStyle = "#8fb8ff"; x.font = "700 34px 'IBM Plex Sans', Arial"; x.fillText("VE ACADEMY · LECTURE 4", 70, 120);
    x.fillStyle = "#ffffff"; x.font = "800 78px 'IBM Plex Sans', Arial"; x.fillText("Value =", 70, 300); x.fillText("Function ÷ Cost", 70, 400);
    [["#ff5a5a", 70], ["#2fe08a", 330], ["#4f8cff", 590]].forEach(([col, X]) => { x.fillStyle = col; x.fillRect(X, 520, 220, 120); });
    x.fillStyle = "#cfe0ff"; x.font = "500 30px Arial"; x.fillText("Projected by three LCD panels, one per colour", 70, 700);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(SCR.w, SCR.h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 1 }));
    scr.position.set(4, SCR.cy, SCR.z); scr.rotation.y = Math.PI; scr.userData.step = 7; beams.add(scr);
    const frame = new THREE.Mesh(new THREE.PlaneGeometry(SCR.w + 1.2, SCR.h + 1.2), new THREE.MeshBasicMaterial({ color: 0x0c0e14 }));
    frame.position.set(4, SCR.cy, SCR.z + 0.05); frame.rotation.y = Math.PI; frame.userData.step = 7; beams.add(frame);
  }

  // ── state ──
  const st = { t: 0, tTo: 0, light: false, lightA: 0, step: 0, sel: [], labels: false, hover: null, tween: null };
  const COVERS = new Set(["top", "bottom", "bezel", "lampdoor", "keypad", "lenscover", "interlock", "ir"]);
  const DIM = new Set(["main", "psu", "io", "inlet", "speaker", "harness", "blower", "ducts", "lampfan", "exhaust", "filter", "therm", "frame", "feet", "screws", "cage"]); // faded back while the light path is on
  const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  function setOpacity(rec, a) {
    rec.obj.visible = a > 0.02;
    rec.mats.forEach((mt) => {
      const tr = mt.userData.t || a < 0.999;
      if (tr !== mt.transparent) { mt.transparent = tr; mt.needsUpdate = true; }
      mt.opacity = mt.userData.o * a; mt.depthWrite = !tr || (!mt.userData.t && a > 0.6);
    });
  }
  function apply() {
    const e = ease(st.t);
    units.forEach((u) => {
      u.obj.position.lerpVectors(u.a, u.e, e);
      let a = 1;
      if (ACC.has(u.id)) a = Math.max(0, (st.t - 0.55) / 0.45);
      if (COVERS.has(u.id)) a = Math.min(a, 1 - st.lightA);
      if (u.id === "harness") a = Math.min(a, 1 - st.t * 0.8);
      if (DIM.has(u.id)) a = Math.min(a, 1 - st.lightA * 0.8);
      setOpacity(u, a);
    });
    shadow.material.opacity = 1 - st.t;
    beams.visible = st.lightA > 0.01;
    beams.children.forEach((o) => {
      o.visible = !st.step || o.userData.step <= st.step;
      if (o.material.userData.base === undefined) o.material.userData.base = o.material.opacity;
      o.material.opacity = o.material.userData.base * st.lightA;
    });
  }

  // ── camera moves ──
  const VIEWS = {
    home: [V(34, 24, 40), V(0, 0, 0)], exploded: [V(80, 46, 94), V(-7, -1, 1)], light: [V(-4, 31, 25), V(-2, 0, 2)],
    s1: [V(-5, 18, 10.5), V(-11, 0.6, -1.5)], s2: [V(-1, 17, 10), V(-7, 0.6, -1.5)], s3: [V(0.5, 15, 9), V(-5.5, 0.6, -1.5)],
    s4: [V(8, 21, 12), V(4, 0.6, 0.7)], s5: [V(8, 15, 11), V(4, 0.6, 2.5)], s6: [V(7, 13, 13), V(4, 0.6, 4.5)], s7: [V(48, 26, -16), V(6, 4, 26)],
  };
  function fly(view, ms = 1100) {
    const t = VIEWS[view][1], k = Math.pow(Math.max(1, 1.3 / camera.aspect), 0.75); // narrow screens: step back so it all fits
    const p = t.clone().add(VIEWS[view][0].clone().sub(t).multiplyScalar(k));
    st.tween = { p0: camera.position.clone(), t0: controls.target.clone(), p1: p.clone(), t1: t.clone(), s: performance.now(), ms };
    if (ms === 0) { camera.position.copy(p); controls.target.copy(t); st.tween = null; }
  }

  // ── selection, balloons, tooltips ──
  function highlight(ns) {
    units.forEach((u) => u.mats.forEach((mt) => { if (mt.userData.em) { mt.emissive.copy(mt.userData.em); mt.emissiveIntensity = mt.userData.ei; } }));
    ns.forEach((n) => (byN[n] || []).forEach((u) => u.mats.forEach((mt) => { if (mt.emissive) { mt.emissive.setHex(0x2e6fe8); mt.emissiveIntensity = 0.55; } })));
  }
  function select(n, opts = {}) {
    st.sel = n ? [n] : [];
    highlight(st.sel);
    root.querySelectorAll(".pj-part").forEach((b) => b.classList.toggle("is-on", +b.dataset.n === n));
    if (!n) { card.hidden = true; return; }
    const p = ITEM[n];
    card.innerHTML = `<button type="button" class="pj-card-x" aria-label="Close">✕</button>
      <p class="pj-card-k">Item ${p.n} · ${GROUP[p.g].name}</p><h3>${p.name}</h3>
      <dl><div><dt>Function</dt><dd><b>${p.fn}</b></dd></div><div><dt>Quantity</dt><dd>${p.q}</dd></div>
      <div><dt>Material / process</dt><dd>${p.mat}</dd></div><div><dt>Estimated cost</dt><dd>${fmt(p.c[0])}–${fmt(p.c[1])}${p.q > 1 ? " each" : ""}</dd></div></dl>`;
    card.hidden = false;
    card.querySelector(".pj-card-x").onclick = () => select(0);
    if (opts.scroll) root.querySelector(`.pj-part[data-n="${n}"]`)?.scrollIntoView({ block: "nearest" });
  }
  const balloons = {};
  D.parts.forEach((p) => {
    if (!byN[p.n]) return;
    const b = document.createElement("button"); b.type = "button"; b.className = "pj-balloon"; b.dataset.n = p.n;
    b.innerHTML = `<span>${p.n}</span><em>${p.name}</em>`; b.setAttribute("aria-label", `${p.n}: ${p.name}`); b.tabIndex = -1;
    b.addEventListener("click", () => select(p.n, { scroll: true }));
    balloonsEl.appendChild(b); balloons[p.n] = b;
  });
  const box3 = new THREE.Box3(), tmp = new THREE.Vector3();
  const svgNS = "http://www.w3.org/2000/svg", leaders = document.createElementNS(svgNS, "svg");
  leaders.setAttribute("class", "pj-leaders"); balloonsEl.prepend(leaders);
  const lab = {}; // label positions on screen, kept between frames so they settle rather than jump
  function placeBalloons() {
    const show = st.t > 0.6 || st.labels;
    balloonsEl.classList.toggle("is-named", st.labels);
    const w = canvasHost.clientWidth, h = canvasHost.clientHeight, live = [];
    for (const n in balloons) {
      const u = byN[n][0], b = balloons[n];
      if (!show || !u.obj.visible || (COVERS.has(u.id) && st.lightA > 0.5)) { b.style.opacity = 0; b.style.pointerEvents = "none"; delete lab[n]; continue; }
      box3.setFromObject(u.obj); box3.getCenter(tmp);
      tmp.project(camera);
      if (tmp.z > 1) { b.style.opacity = 0; delete lab[n]; continue; }
      const ax = (tmp.x + 1) / 2 * w, ay = (1 - tmp.y) / 2 * h;
      if (ax < 4 || ay < 4 || ax > w - 4 || ay > h - 4) { b.style.opacity = 0; b.style.pointerEvents = "none"; delete lab[n]; continue; } // part is off screen
      const L = lab[n] || (lab[n] = { x: ax, y: ay - 22 });
      L.ax = ax; L.ay = ay; L.x += (ax - L.x) * 0.25; L.y += (ay - 22 - L.y) * 0.25; L.n = n;
      live.push(L);
    }
    // push overlapping labels apart (named labels are wider, so they need more room sideways)
    const RX = st.labels ? 78 : 15, RY = st.labels ? 12 : 15;
    for (let it = 0; it < 12; it++) for (let i = 0; i < live.length; i++) for (let j = i + 1; j < live.length; j++) {
      const A = live[i], C = live[j], dx = C.x - A.x, dy = C.y - A.y;
      const ox = RX * 2 - Math.abs(dx), oy = RY * 2 - Math.abs(dy);
      if (ox > 0 && oy > 0) {
        if (ox / RX < oy / RY) { const m = (ox / 2) * Math.sign(dx || 1); A.x -= m; C.x += m; }
        else { const m = (oy / 2) * Math.sign(dy || 1); A.y -= m; C.y += m; }
      }
    }
    let lines = "";
    live.forEach((L) => {
      L.x = Math.max(14, Math.min(w - 14, L.x)); L.y = Math.max(14, Math.min(h - 14, L.y));
      const b = balloons[L.n], op = st.labels ? 1 : Math.min(1, (st.t - 0.6) / 0.3);
      b.style.transform = `translate(${L.x.toFixed(1)}px,${L.y.toFixed(1)}px)`; b.style.opacity = op; b.style.pointerEvents = "auto";
      lines += `<line x1="${L.ax.toFixed(1)}" y1="${L.ay.toFixed(1)}" x2="${L.x.toFixed(1)}" y2="${L.y.toFixed(1)}" style="opacity:${op}"/><circle cx="${L.ax.toFixed(1)}" cy="${L.ay.toFixed(1)}" r="2" style="opacity:${op}"/>`;
    });
    leaders.setAttribute("viewBox", `0 0 ${w} ${h}`); leaders.innerHTML = lines;
  }
  const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
  function pick(ev) {
    const r = renderer.domElement.getBoundingClientRect();
    ptr.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ptr, camera);
    const hit = ray.intersectObjects(pickables.filter((o) => o.visible && o.parent && isShown(o)), false).find((h) => h.object.material.opacity > 0.15);
    return hit ? hit.object.userData.rec : null;
  }
  const isShown = (o) => { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; };
  let down = null;
  renderer.domElement.addEventListener("pointerdown", (e) => { down = [e.clientX, e.clientY]; stopAuto(); });
  renderer.domElement.addEventListener("pointerup", (e) => {
    if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5) return;
    const rec = pick(e); select(rec ? rec.n : 0, { scroll: true });
  });
  renderer.domElement.addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse") return;
    const rec = pick(e);
    if (rec) { tip.textContent = `${rec.n} · ${ITEM[rec.n].name}`; tip.style.transform = `translate(${e.offsetX + 14}px,${e.offsetY + 10}px)`; tip.hidden = false; renderer.domElement.style.cursor = "pointer"; }
    else { tip.hidden = true; renderer.domElement.style.cursor = ""; }
  });
  renderer.domElement.addEventListener("pointerleave", () => { tip.hidden = true; });

  // ── side panel: parts list and how-it-works steps ──
  const list = $(".pj-list"); // drawn by case-study.js, so it's there even without WebGL
  list.addEventListener("click", (e) => {
    const b = e.target.closest(".pj-part"); if (!b) return;
    const n = +b.dataset.n; stopAuto();
    if (st.light) setLight(false);
    if (st.t < 0.5 && !["top", "bottom", "bezel", "lampdoor", "keypad", "lenscover", "feet", "ir"].includes(ITEM[n].id)) explode(true);
    const off = st.sel[0] === n;
    select(off ? 0 : n);
    if (!off) focusOn(n);
  });
  // swing the camera round to look at one part, from the same side as the exploded view
  function focusOn(n) {
    const u = byN[n][0], at = (st.tTo > 0.5 ? u.e : u.a).clone();
    box3.setFromObject(u.obj); const size = box3.getSize(tmp).length();
    const dir = VIEWS.exploded[0].clone().sub(VIEWS.exploded[1]).normalize();
    VIEWS.focus = [at.clone().add(dir.multiplyScalar(Math.min(70, Math.max(20, size * 3.2)))), at];
    fly("focus", 900);
  }
  const steps = $(".pj-steps");
  steps.addEventListener("click", (e) => { const b = e.target.closest(".pj-step"); if (b) showStep(+b.dataset.i); });
  root.querySelectorAll(".pj-tab").forEach((t) => t.addEventListener("click", () => tab(t.dataset.tab)));
  function tab(name) {
    root.querySelectorAll(".pj-tab").forEach((t) => t.setAttribute("aria-selected", t.dataset.tab === name));
    root.querySelector(".pj-list").hidden = name !== "parts"; root.querySelector(".pj-howto").hidden = name !== "how";
  }
  function showStep(i) {
    stopAuto();
    if (!st.light) setLight(true, true);
    st.step = i; fly("s" + i);
    steps.querySelectorAll(".pj-step").forEach((b) => b.classList.toggle("is-on", +b.dataset.i === i));
    st.sel = D.path[i - 1].parts.slice(); highlight(st.sel); card.hidden = true;
  }

  // ── controls ──
  const tExp = $("[data-act=explode]"), tAsm = $("[data-act=assemble]"), tLight = $("[data-act=light]"), tLab = $("[data-act=labels]"), slider = $(".pj-slider");
  function animateT(to) { st.tTo = to; }
  function explode(on) {
    stopAuto(); if (st.light) setLight(false);
    animateT(on ? 1 : 0); fly(on ? "exploded" : "home");
    tExp.setAttribute("aria-pressed", on); tAsm.setAttribute("aria-pressed", !on);
  }
  function setLight(on, keepStep) {
    st.light = on; tLight.setAttribute("aria-pressed", on);
    if (on) { animateT(0); tExp.setAttribute("aria-pressed", false); tAsm.setAttribute("aria-pressed", true); if (!keepStep) { st.step = 0; fly("light"); } tab("how"); }
    else { st.step = 0; steps.querySelectorAll(".pj-step").forEach((b) => b.classList.remove("is-on")); highlight([]); st.sel = []; }
  }
  tExp.onclick = () => explode(true);
  tAsm.onclick = () => explode(false);
  tLight.onclick = () => { stopAuto(); setLight(!st.light); if (!st.light) fly("home"); };
  tLab.onclick = () => { st.labels = !st.labels; tLab.setAttribute("aria-pressed", st.labels); };
  $("[data-act=reset]").onclick = () => { select(0); setLight(false); animateT(0); fly("home"); tExp.setAttribute("aria-pressed", false); tAsm.setAttribute("aria-pressed", true); };
  slider.addEventListener("input", () => { stopAuto(); if (st.light) setLight(false); st.t = st.tTo = slider.value / 100; tExp.setAttribute("aria-pressed", st.t > 0.5); tAsm.setAttribute("aria-pressed", st.t <= 0.5); });
  function stopAuto() { controls.autoRotate = false; }

  // ── size and loop ──
  function resize() {
    const w = canvasHost.clientWidth, h = canvasHost.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(canvasHost); resize();
  let visible = true, last = performance.now();
  new IntersectionObserver((es) => { visible = es[0].isIntersecting; if (visible) { last = performance.now(); requestAnimationFrame(loop); } }).observe(root);
  function update(dt) {
    if (st.t !== st.tTo) { const s = Math.sign(st.tTo - st.t) * dt / 1.3; st.t = Math.abs(st.tTo - st.t) <= Math.abs(s) ? st.tTo : st.t + s; slider.value = Math.round(st.t * 100); }
    const la = st.light ? 1 : 0; if (st.lightA !== la) { const s = Math.sign(la - st.lightA) * dt / 0.7; st.lightA = Math.abs(la - st.lightA) <= Math.abs(s) ? la : st.lightA + s; }
    if (st.tween) { const k = Math.min(1, (performance.now() - st.tween.s) / st.tween.ms), e = ease(k); camera.position.lerpVectors(st.tween.p0, st.tween.p1, e); controls.target.lerpVectors(st.tween.t0, st.tween.t1, e); if (k >= 1) st.tween = null; }
    flows.forEach((t) => { t.offset.y -= dt * 0.9; });
    apply(); controls.update(); renderer.render(scene, camera); placeBalloons();
  }
  function loop(now) {
    if (!visible || window.VH_CAPTURE) return;
    const dt = Math.min(0.1, (now - last) / 1000); last = now; update(dt);
    requestAnimationFrame(loop);
  }
  controls.autoRotate = !window.matchMedia("(prefers-reduced-motion: reduce)").matches && !window.VH_CAPTURE;
  fly("home", 0); requestAnimationFrame(loop);
  root.classList.add("is-ready");

  // for the video renderer: set a state and draw one frame on demand
  window.VHProjector = {
    set(s = {}) {
      if ("t" in s) st.t = st.tTo = s.t;
      if ("light" in s) { st.light = s.light; st.lightA = s.lightA ?? (s.light ? 1 : 0); }
      if ("step" in s) st.step = s.step;
      if ("sel" in s) { st.sel = s.sel; highlight(s.sel); }
      if ("labels" in s) st.labels = s.labels;
      if (s.cam) { camera.position.set(...s.cam[0]); controls.target.set(...s.cam[1]); }
      if ("flow" in s) flows.forEach((t) => { t.offset.y = -s.flow; });
      controls.autoRotate = false; apply(); controls.update(); renderer.render(scene, camera);
      for (let i = 0; i < (s.settle ?? 30); i++) placeBalloons();
    },
    views: VIEWS, explode, setLight, showStep, select, focusOn,
  };
}
