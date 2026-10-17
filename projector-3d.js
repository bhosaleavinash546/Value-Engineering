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
  const fmt = (v) => "£" + (v < 0.1 ? v.toFixed(3) : v.toFixed(2));
  const box3 = new THREE.Box3();

  // ── renderer: physically based, with soft shadows ──
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: !!window.VH_CAPTURE });
  } catch (e) { root.classList.add("pj-nogl"); return; }
  if (!renderer.getContext()) { root.classList.add("pj-nogl"); return; }
  renderer.setPixelRatio(window.VH_CAPTURE && window.VH_PR ? window.VH_PR : Math.min(window.devicePixelRatio || 1, 2));   // video capture can ask for more, for sharper edges
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  canvasHost.appendChild(renderer.domElement);
  renderer.domElement.setAttribute("aria-hidden", "true");

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.9;
  const camera = new THREE.PerspectiveCamera(32, 1, 0.5, 600);
  camera.position.set(34, 24, 40);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = 0.08;
  controls.minDistance = 8; controls.maxDistance = 170;
  controls.target.set(0, 0, 0);
  controls.autoRotateSpeed = 0.6;

  scene.add(new THREE.HemisphereLight(0xeef2ff, 0x1c2333, 0.55));
  const key = new THREE.DirectionalLight(0xffffff, 2.1); key.position.set(20, 36, 24);
  key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02;
  Object.assign(key.shadow.camera, { left: -48, right: 48, top: 48, bottom: -48, near: 1, far: 140 }); key.shadow.radius = 4;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xa9c6ff, 0.7); rim.position.set(-26, 12, -22); scene.add(rim);
  const fill = new THREE.DirectionalLight(0xfff1e0, 0.35); fill.position.set(-10, 6, 30); scene.add(fill);

  // ground: a shadow catcher plus a soft contact shadow
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(260, 260), new THREE.ShadowMaterial({ opacity: 0.28 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -5.62; ground.receiveShadow = true; scene.add(ground);
  let shadow;
  {
    const c = document.createElement("canvas"); c.width = c.height = 128;
    const g = c.getContext("2d"), gr = g.createRadialGradient(64, 64, 6, 64, 64, 64);
    gr.addColorStop(0, "rgba(0,0,0,.5)"); gr.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    shadow = new THREE.Mesh(new THREE.PlaneGeometry(44, 32), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2; shadow.position.y = -5.6; scene.add(shadow);
  }

  // ── procedural textures (made once, shared) ──
  function canvasTex(w, h, draw, srgb = true) {
    const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h);
    const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
  }
  let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const TEX = {
    pcb: canvasTex(1024, 512, (g, w, h) => {
      g.fillStyle = "#1b5e3f"; g.fillRect(0, 0, w, h);
      g.strokeStyle = "#2a7d55"; g.lineCap = "round";
      for (let i = 0; i < 140; i++) {
        g.lineWidth = 1 + rnd() * 3; let x = rnd() * w, y = rnd() * h; g.beginPath(); g.moveTo(x, y);
        for (let k = 0; k < 4; k++) { if (rnd() < 0.5) x += (rnd() - 0.5) * 260; else y += (rnd() - 0.5) * 160; g.lineTo(x, y); }
        g.stroke();
      }
      g.fillStyle = "#d8b768"; for (let i = 0; i < 420; i++) g.fillRect(rnd() * w, rnd() * h, 3 + rnd() * 5, 3 + rnd() * 5);
      g.fillStyle = "#e9f0ea"; g.font = "bold 18px Arial"; g.fillText("VH-3600  MAIN  REV C", 30, h - 24);
      g.strokeStyle = "#e9f0ea"; g.lineWidth = 2; for (let i = 0; i < 26; i++) g.strokeRect(rnd() * w, rnd() * h, 14 + rnd() * 50, 10 + rnd() * 34);
    }),
    knurl: canvasTex(256, 8, (g, w, h) => { for (let x = 0; x < w; x += 4) { g.fillStyle = x % 8 ? "#000" : "#fff"; g.fillRect(x, 0, 4, h); } }, false),
    grain: canvasTex(256, 256, (g, w, h) => { const d = g.createImageData(w, h); for (let i = 0; i < d.data.length; i += 4) { const v = 118 + rnd() * 20; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; } g.putImageData(d, 0, 0); }, false),
    chip: canvasTex(256, 256, (g, w, h) => { g.fillStyle = "#16181c"; g.fillRect(0, 0, w, h); g.fillStyle = "#8d939c"; g.font = "bold 30px Arial"; g.fillText("VPX-4", 30, 110); g.font = "22px Arial"; g.fillText("2541 A3", 30, 150); g.beginPath(); g.arc(30, 30, 10, 0, 7); g.fill(); }),
    fan: canvasTex(256, 256, (g, w, h) => { g.fillStyle = "#1a1b1f"; g.fillRect(0, 0, w, h); g.fillStyle = "#c8ccd2"; g.beginPath(); g.arc(128, 128, 110, 0, 7); g.fill(); g.fillStyle = "#1a1b1f"; g.font = "bold 34px Arial"; g.textAlign = "center"; g.fillText("12V DC", 128, 120); g.font = "24px Arial"; g.fillText("0.18A  PWM", 128, 158); }),
  };
  TEX.knurl.wrapS = TEX.knurl.wrapT = THREE.RepeatWrapping; TEX.knurl.repeat.set(30, 1);
  TEX.grain.wrapS = TEX.grain.wrapT = THREE.RepeatWrapping; TEX.grain.repeat.set(6, 6);

  // ── materials (a fresh one per mesh, so a part can glow or fade on its own) ──
  const phys = (o) => new THREE.MeshPhysicalMaterial(o);
  const std = (o) => new THREE.MeshStandardMaterial(o);
  const MAT = {
    housing: () => phys({ color: 0xf2f4f7, roughness: 0.46, clearcoat: 0.3, clearcoatRoughness: 0.4 }),
    housing2: () => phys({ color: 0xe0e4ea, roughness: 0.55, clearcoat: 0.15, clearcoatRoughness: 0.5 }),
    gloss: () => phys({ color: 0x1c2026, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.08 }),
    charcoal: () => phys({ color: 0x24282f, roughness: 0.35, clearcoat: 0.4 }),
    dark: () => std({ color: 0x30353e, roughness: 0.5, metalness: 0.25 }),
    black: () => std({ color: 0x141619, roughness: 0.55, metalness: 0.05 }),
    pps: () => std({ color: 0x2a2d33, roughness: 0.72, metalness: 0.02 }),
    rubber: () => std({ color: 0x1a1c20, roughness: 0.95 }),
    glass: (c = 0xe6f3ff) => phys({ color: c, roughness: 0.04, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.05, transparent: true, opacity: 0.32, depthWrite: false }),
    dichroic: (c) => phys({ color: c, roughness: 0.06, metalness: 0.35, clearcoat: 1, clearcoatRoughness: 0.05, transparent: true, opacity: 0.5, depthWrite: false }),
    mirror: () => std({ color: 0xf3f5f8, roughness: 0.03, metalness: 1 }),
    gold: () => std({ color: 0xe2c98e, roughness: 0.12, metalness: 1, side: THREE.DoubleSide }),
    alu: () => std({ color: 0xc6ccd4, roughness: 0.3, metalness: 1 }),
    steel: () => std({ color: 0xb4bbc4, roughness: 0.42, metalness: 0.9 }),
    copper: () => std({ color: 0xc27a42, roughness: 0.35, metalness: 1 }),
    pcb: () => std({ color: 0xffffff, map: TEX.pcb, roughness: 0.45, metalness: 0.05 }),
    chip: () => std({ color: 0xffffff, map: TEX.chip, roughness: 0.4 }),
    flex: () => std({ color: 0xd88a2a, roughness: 0.3, metalness: 0.15 }),
    tape: () => std({ color: 0xe0b84a, roughness: 0.6 }),
    ferrite: () => std({ color: 0x3b3d42, roughness: 0.8, metalness: 0.1 }),
    blue: () => std({ color: 0x2c52a8, roughness: 0.45 }),
    white: () => std({ color: 0xf6f4ee, roughness: 0.8 }),
    ivory: () => std({ color: 0xece6d6, roughness: 0.7 }),
    ceramic: () => std({ color: 0xece5d3, roughness: 0.6 }),
    lcd: () => phys({ color: 0x0f2350, roughness: 0.08, metalness: 0.2, clearcoat: 1, clearcoatRoughness: 0.05, emissive: 0x0a1c48, emissiveIntensity: 0.5 }),
    film: (c) => std({ color: c, roughness: 0.25, transparent: true, opacity: 0.78, depthWrite: false }),
    duct: () => std({ color: 0x3a3e45, roughness: 0.7, transparent: true, opacity: 0.6, depthWrite: false }),
    fanlabel: () => std({ map: TEX.fan, roughness: 0.6 }),
    knurl: (c = 0x2b2f35) => std({ color: c, roughness: 0.55, bumpMap: TEX.knurl, bumpScale: 1.2 }),
  };
  const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  const rbox = (w, h, d, r = 0.2) => new RoundedBoxGeometry(w, h, d, 2, r);
  const cyl = (rt, rb, h, s = 32) => new THREE.CylinderGeometry(rt, rb, h, s);
  function m(geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
    const o = new THREE.Mesh(geo, mat); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); return o;
  }
  function unit(x, y, z, ...kids) { const g = new THREE.Group(); g.position.set(x, y, z); kids.forEach((k) => g.add(k)); return g; }
  // a rounded-rectangle outline, for extruded parts with real cut-outs
  function rrect(w, h, r, x = 0, y = 0, path = new THREE.Shape()) {
    const L = x - w / 2, B0 = y - h / 2, R = x + w / 2, T = y + h / 2;
    path.moveTo(L + r, B0); path.lineTo(R - r, B0); path.quadraticCurveTo(R, B0, R, B0 + r); path.lineTo(R, T - r); path.quadraticCurveTo(R, T, R - r, T);
    path.lineTo(L + r, T); path.quadraticCurveTo(L, T, L, T - r); path.lineTo(L, B0 + r); path.quadraticCurveTo(L, B0, L + r, B0); return path;
  }
  const hole = (w, h, r, x, y) => rrect(w, h, r, x, y, new THREE.Path());
  const circ = (r, x, y) => { const p = new THREE.Path(); p.absarc(x, y, r, 0, Math.PI * 2, true); return p; };
  const extrude = (shape, depth, bevel = 0.1) => new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 14 });
  // a lens element: an ellipsoid, thin along the light path ("x" or "z")
  function lensEl(r, t, axis, c) {
    const o3 = m(new THREE.SphereGeometry(1, 36, 18), MAT.glass(c));
    if (axis === "x") o3.scale.set(t / 2, r, r); else o3.scale.set(r, r, t / 2);
    return o3;
  }
  function text(str, w, h, opt = {}) {
    const c = document.createElement("canvas"); c.width = 512; c.height = Math.round(512 * h / w);
    const g = c.getContext("2d"); g.clearRect(0, 0, c.width, c.height);
    g.fillStyle = opt.color || "#8a93a3"; g.font = `${opt.weight || 700} ${Math.round(c.height * 0.62)}px "IBM Plex Sans", Arial, sans-serif`;
    g.textAlign = opt.align || "center"; g.textBaseline = "middle";
    g.fillText(str, opt.align === "left" ? 8 : c.width / 2, c.height / 2);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false }));
  }
  // small electronics helpers
  const cap = (r, h, sleeve = 0x1d2433) => { const g = new THREE.Group(); g.add(m(cyl(r, r, h, 32), std({ color: sleeve, roughness: 0.35 }), 0, h / 2, 0)); g.add(m(cyl(r * 0.92, r * 0.92, 0.04, 32), MAT.alu(), 0, h + 0.01, 0)); g.add(m(box(r * 0.5, h * 0.98, 0.02), std({ color: 0xbfc6cf }), r * 0.3, h / 2, r * 0.97)); return g; };
  const qfp = (s, t = 0.18) => { const g = new THREE.Group(); g.add(m(box(s, t, s), MAT.chip(), 0, t / 2, 0)); const n = Math.round(s * 7);
    for (let i = 0; i < n; i++) { const o = -s / 2 + (i + 0.5) * s / n; [[o, s / 2 + 0.06, 0], [o, -s / 2 - 0.06, 0], [s / 2 + 0.06, o, 1], [-s / 2 - 0.06, o, 1]].forEach(([a, b, r]) => g.add(m(box(r ? 0.12 : 0.04, 0.03, r ? 0.04 : 0.12), MAT.alu(), a, 0.02, b))); }
    return g; };
  const screwHead = () => { const g = new THREE.Group(); g.add(m(cyl(0.22, 0.24, 0.12, 24), MAT.steel(), 0, 0, 0)); g.add(m(box(0.28, 0.03, 0.05), MAT.black(), 0, 0.065, 0)); g.add(m(box(0.05, 0.03, 0.28), MAT.black(), 0, 0.065, 0)); return g; };

  const Y0 = 0.6;                      // height of the light path
  const PC = new THREE.Vector3(4, Y0, 3); // centre of the X-cube prism

  // ── reusable sub-assemblies ──
  // axial fan, axis along +z: square frame with a round throat, curved pitched blades, hub with label
  function axialFan(S, d) {
    const g = new THREE.Group();
    const sh = rrect(S, S, S * 0.08); sh.holes.push(circ(S * 0.46, 0, 0));
    [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([a, b]) => sh.holes.push(circ(S * 0.035, a * S * 0.41, b * S * 0.41)));
    g.add(m(extrude(sh, d, 0.04), MAT.black(), 0, 0, -d / 2));
    const hub = m(cyl(S * 0.17, S * 0.17, d * 0.8, 40), MAT.black(), 0, 0, 0, Math.PI / 2); g.add(hub);
    g.add(m(new THREE.CircleGeometry(S * 0.165, 40), MAT.fanlabel(), 0, 0, d * 0.41));
    const n = 7, R = S * 0.445, h = S * 0.17;
    for (let i = 0; i < n; i++) {
      const bs = new THREE.Shape(); bs.moveTo(h, -S * 0.07); bs.quadraticCurveTo((h + R) / 2, -S * 0.1, R, -S * 0.02);
      bs.quadraticCurveTo(R + 0.05, S * 0.12, R - S * 0.03, S * 0.17); bs.quadraticCurveTo((h + R) / 2, S * 0.1, h, S * 0.07); bs.lineTo(h, -S * 0.07);
      const bl = m(new THREE.ExtrudeGeometry(bs, { depth: 0.05, bevelEnabled: false, curveSegments: 12 }), MAT.black());
      const arm = new THREE.Group(); arm.rotation.z = i / n * Math.PI * 2; bl.rotation.x = 0.5; arm.add(bl); g.add(arm);
    }
    for (let i = 0; i < 4; i++) { const sp = m(box(S * 0.3, 0.12, 0.12), MAT.black(), 0, 0, -d / 2 + 0.06); sp.position.x = Math.cos(i * Math.PI / 2 + 0.6) * S * 0.31; sp.position.y = Math.sin(i * Math.PI / 2 + 0.6) * S * 0.31; sp.rotation.z = i * Math.PI / 2 + 0.6; g.add(sp); }
    return g;
  }
  // rear connectors, each facing -z with its face at local z = 0
  const shellMat = () => std({ color: 0xcfd5dc, roughness: 0.25, metalness: 1 });
  function trapShape(wt, wb, h, r = 0.08) { const s = new THREE.Shape(); s.moveTo(-wb / 2 + r, -h / 2); s.lineTo(wb / 2 - r, -h / 2); s.quadraticCurveTo(wb / 2, -h / 2, wb / 2 + r * 0.3, -h / 2 + r); s.lineTo(wt / 2, h / 2 - r); s.quadraticCurveTo(wt / 2, h / 2, wt / 2 - r, h / 2); s.lineTo(-wt / 2 + r, h / 2); s.quadraticCurveTo(-wt / 2, h / 2, -wt / 2 - r * 0.3, h / 2 - r); s.lineTo(-wb / 2 - r * 0.3, -h / 2 + r); s.quadraticCurveTo(-wb / 2, -h / 2, -wb / 2 + r, -h / 2); return s; }
  const CON = {
    dsub(wt, col = 0x2c52a8) {
      const g = new THREE.Group(), sh = trapShape(wt, wt * 0.82, 0.8);
      const shell = m(extrude(sh, 0.55, 0.02), shellMat(), 0, 0, -0.55); g.add(shell);
      g.add(m(extrude(trapShape(wt * 0.84, wt * 0.68, 0.58), 0.5, 0), std({ color: col, roughness: 0.5 }), 0, 0, -0.62));
      g.add(m(rbox(wt + 1.3, 1.25, 0.06, 0.05), shellMat(), 0, 0, -0.05));
      [-1, 1].forEach((s) => { g.add(m(cyl(0.16, 0.16, 0.5, 6), shellMat(), s * (wt / 2 + 0.42), 0, -0.3, Math.PI / 2)); g.add(m(cyl(0.08, 0.08, 0.06, 12), MAT.black(), s * (wt / 2 + 0.42), 0, -0.56, Math.PI / 2)); });
      return g;
    },
    hdmi() { const g = new THREE.Group(); g.add(m(extrude(trapShape(1.4, 1.05, 0.45, 0.05), 0.9, 0.02), shellMat(), 0, 0, -0.9)); g.add(m(box(1.0, 0.12, 0.7), MAT.black(), 0, 0.04, -0.4)); return g; },
    rj45() { const g = new THREE.Group(); g.add(m(rbox(1.6, 1.35, 1.8, 0.04), shellMat(), 0, 0, 0.9)); g.add(m(box(1.1, 0.8, 0.2), MAT.black(), 0, -0.08, -0.02));
      g.add(m(box(0.3, 0.16, 0.05), std({ color: 0x29d36c, emissive: 0x0b6b30, emissiveIntensity: 0.6 }), -0.5, 0.5, -0.03)); g.add(m(box(0.3, 0.16, 0.05), std({ color: 0xffb02e, emissive: 0x6b4100, emissiveIntensity: 0.6 }), 0.5, 0.5, -0.03)); return g; },
    usbA() { const g = new THREE.Group(); g.add(m(box(1.3, 0.55, 1.4), shellMat(), 0, 0, 0.7)); g.add(m(box(1.1, 0.14, 1.2), MAT.blue(), 0, 0.08, 0.62)); g.add(m(box(1.15, 0.42, 0.05), MAT.black(), 0, 0, 0.03)); return g; },
    usbB() { const g = new THREE.Group(); g.add(m(extrude(trapShape(0.75, 1.05, 0.95, 0.1), 1.3, 0.02), shellMat(), 0, 0, 0)); g.add(m(box(0.55, 0.45, 1.1), MAT.white(), 0, 0, 0.12)); return g; },
    jack(c) { const g = new THREE.Group(); g.add(m(rbox(1.0, 1.0, 1.3, 0.06), MAT.black(), 0, 0, 0.65)); g.add(m(cyl(0.3, 0.3, 0.25, 24), std({ color: c, roughness: 0.5 }), 0, 0, -0.1, Math.PI / 2)); g.add(m(cyl(0.12, 0.12, 0.3, 16), MAT.black(), 0, 0, -0.12, Math.PI / 2)); return g; },
    rca(c) { const g = new THREE.Group(); g.add(m(box(1.1, 1.1, 1.0), MAT.black(), 0, 0, 0.5)); g.add(m(cyl(0.34, 0.34, 0.6, 24), shellMat(), 0, 0, -0.3, Math.PI / 2)); g.add(m(cyl(0.24, 0.24, 0.62, 24), std({ color: c, roughness: 0.4 }), 0, 0, -0.3, Math.PI / 2)); g.add(m(cyl(0.07, 0.07, 0.64, 10), MAT.alu(), 0, 0, -0.3, Math.PI / 2)); return g; },
    rs232() { return CON.dsub(1.6, 0x2a2d33); },
  };
  // the rear panel layout (world x, y); faces sit at z = -11.42 so they line up with the case's rear face
  const IOZ = -11.42;
  const IO = [
    ["dsub", -7.6, -3.25, 2.3], ["dsub", -7.6, -1.75, 2.3], ["dsub", -4.6, -3.25, 2.3], ["rs232", -4.6, -1.75],
    ["hdmi", -2.2, -3.4], ["rj45", -2.2, -1.75], ["usbA", -0.3, -3.4], ["usbB", -0.3, -1.85],
    ["rca", 1.4, -3.3, 0xffd23f], ["jack", 1.4, -1.8, 0x8fd14f], ["jack", 2.9, -3.3, 0xff8fb0], ["jack", 2.9, -1.8, 0x2d2f33], ["rca", 4.3, -3.3, 0xf2f2f2], ["rca", 4.3, -1.8, 0xe23b3b],
  ];
  const IOHOLE = { dsub: [3.3, 1.25], rs232: [2.6, 1.25], hdmi: [1.6, 0.65], rj45: [1.7, 1.45], usbA: [1.4, 0.65], usbB: [1.15, 1.05], rca: [0.85, 0.85], jack: [0.75, 0.75] };
  // a plate in the x-y plane (thickness along z) with cut-outs
  function plateXY(w, h, cx, cy, holes, t, mat, r = 0.15) {
    const sh = rrect(w, h, r, cx, cy); holes.forEach(([hw, hh, hx, hy, hr]) => sh.holes.push(hr ? circ(hr, hx, hy) : hole(hw, hh, Math.min(0.12, hw / 3), hx, hy)));
    return m(extrude(sh, t, 0.02), mat);
  }
  // a flat plate in the x-z plane (thickness along y), drawn in world x and z
  function plateXZ(w, d, cx, cz, holes, t, mat, r = 0.2, bevel = 0.02) {
    const sh = rrect(w, d, r, cx, -cz); holes.forEach(([hw, hd, hx, hz, hr]) => sh.holes.push(hr ? circ(hr, hx, -hz) : hole(hw, hd, Math.min(0.15, hw / 3), hx, -hz)));
    const o = m(extrude(sh, t, bevel), mat); o.rotation.x = -Math.PI / 2; return o;
  }
  // an L-shaped side wall of a case half, running front to back round a rounded rear corner (world x, z)
  function sideWall(side, y0, h, mat) {
    const s = side, X = 15 * s, T = 0.3 * s, R = 1.2, sh = new THREE.Shape();
    const p = (x, z) => [x, -z];
    sh.moveTo(...p(X, 10.85)); sh.lineTo(...p(X, -10.3)); sh.quadraticCurveTo(...p(X, -11.5), ...p(X - R * s, -11.5)); sh.lineTo(...p(X - R * s, -11.2));
    sh.quadraticCurveTo(...p(X - T, -11.2), ...p(X - T, -10.3)); sh.lineTo(...p(X - T, 10.85)); sh.lineTo(...p(X, 10.85));
    const o = m(extrude(sh, h, 0), mat, 0, y0, 0); o.rotation.x = -Math.PI / 2; return o;
  }
  const finHeatsink = (w, h, d, fins) => { const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(w / 2, h);
    for (let i = fins - 1; i >= 0; i--) { const x0 = -w / 2 + (i + 0.5) * w / fins; s.lineTo(x0 + w / fins * 0.18, h); s.lineTo(x0 + w / fins * 0.18, 0.25); s.lineTo(x0 - w / fins * 0.18, 0.25); s.lineTo(x0 - w / fins * 0.18, h); }
    s.lineTo(-w / 2, h); s.lineTo(-w / 2, 0); return m(extrude(s, d, 0), MAT.alu(), 0, 0, -d / 2); };
  const smd = (w, d, c = 0x3b3d42) => m(box(w, 0.08, d), std({ color: c, roughness: 0.6 }));
  function onBoard(g, o, x, y, z, ry = 0) { if (x !== undefined) o.position.set(x, y, z); if (ry) o.rotation.y = ry; g.add(o); return o; }

  // ── the parts: each builder returns one or more "units" placed where they sit in the projector ──
  const B = {
    burner: () => {
      const b = m(new THREE.SphereGeometry(0.45, 48, 24), MAT.glass(0xf6f8ff)); b.scale.set(1.15, 0.85, 0.85);
      const arc = m(new THREE.SphereGeometry(0.07, 16, 8), std({ color: 0xffffff, emissive: 0xfff2c4, emissiveIntensity: 3 }));
      return [unit(-12.4, Y0, -1.5, b, arc,
        m(cyl(0.13, 0.13, 1.7), MAT.glass(0xf6f8ff), -1.0, 0, 0, 0, 0, Math.PI / 2), m(cyl(0.12, 0.12, 0.9), MAT.glass(0xf6f8ff), 0.75, 0, 0, 0, 0, Math.PI / 2),
        m(cyl(0.035, 0.035, 0.7), MAT.steel(), -0.4, 0, 0, 0, 0, Math.PI / 2), m(cyl(0.035, 0.035, 0.7), MAT.steel(), 0.4, 0, 0, 0, 0, Math.PI / 2),
        m(cyl(0.42, 0.38, 0.6), MAT.ceramic(), -2.0, 0, 0, 0, 0, Math.PI / 2), m(cyl(0.02, 0.02, 2.4, 8), MAT.steel(), 0.2, 0.5, 0, 0, 0, Math.PI / 2))];
    },
    reflector: () => {
      const pts = []; for (let i = 0; i <= 40; i++) { const r = 0.35 + (2.6 - 0.35) * i / 40; pts.push(new THREE.Vector2(r, (r * r) / 3.2)); }
      const outer = pts.map((v) => new THREE.Vector2(v.x + 0.12, v.y - 0.05));
      const refl = m(new THREE.LatheGeometry(pts, 48), MAT.gold());
      const back = m(new THREE.LatheGeometry(outer, 48), std({ color: 0x8a7b62, roughness: 0.55, metalness: 0.3 }));
      const neck = m(cyl(0.5, 0.5, 0.9, 32), MAT.ceramic(), 0, -0.3, 0);
      const rimR = m(new THREE.TorusGeometry(2.66, 0.1, 12, 48), MAT.alu(), 0, 2.11, 0, Math.PI / 2);
      const u = unit(-13.2, Y0, -1.5, unit(0, 0, 0, refl, back, neck, rimR)); u.children[0].rotation.z = -Math.PI / 2; return [u];
    },
    cage: () => {
      const front = rrect(5.8, 5.8, 0.4); front.holes.push(circ(2.6, 0, 0));
      const u = unit(-12.6, Y0, -1.5,
        m(rbox(0.25, 5.6, 5.6, 0.08), MAT.pps(), -2.15, 0, 0),
        m(rbox(3.6, 0.25, 5.6, 0.08), MAT.pps(), -0.4, 2.85, 0), m(rbox(3.6, 0.25, 5.6, 0.08), MAT.pps(), -0.4, -2.85, 0),
        m(extrude(front, 0.25, 0.04), MAT.pps(), 1.55, 0, 0, 0, Math.PI / 2),
        m(new THREE.TorusGeometry(1.1, 0.09, 10, 32, Math.PI), MAT.pps(), -0.6, 3.05, 0, -Math.PI / 2, 0, Math.PI / 2),
        m(rbox(0.9, 0.9, 1.3, 0.06), MAT.black(), -1.6, -2.1, 2.0));
      for (let i = 0; i < 3; i++) u.add(m(box(0.08, 0.06, 0.5), MAT.copper(), -1.2, -2.1 + (i - 1) * 0.25, 2.0));
      for (let i = 0; i < 4; i++) u.add(m(box(3.2, 0.06, 0.12), MAT.black(), -0.4, 3.0, -2.1 + i * 1.4));
      return [u];
    },
    uvir: () => [unit(-10.2, Y0, -1.5, m(box(0.12, 3.4, 3.4), MAT.dichroic(0xc4a8ff)), m(extrude((() => { const s = rrect(3.9, 3.9, 0.2); s.holes.push(hole(3.1, 3.1, 0.15, 0, 0)); return s; })(), 0.25, 0.03), MAT.pps(), -0.1, 0, 0, 0, Math.PI / 2))],
    lampdoor: () => {
      const sh = rrect(6.4, 6.4, 0.6); const u = unit(-11.8, 4.6, -1.5, m(extrude(sh, 0.16, 0.04), MAT.housing2(), 0, 0, 0, -Math.PI / 2));
      u.children[0].position.y = 0; u.add(m(rbox(2.2, 0.08, 0.5, 0.04), MAT.dark(), 0, 0.2, -2.6));
      const sc = screwHead(); sc.position.set(2.4, 0.22, 2.4); u.add(sc);
      const t = text("LAMP", 1.6, 0.5, { color: "#a1a9b6" }); t.rotation.x = -Math.PI / 2; t.position.set(0, 0.22, 0.6); u.add(t);
      return [u];
    },
    baffle: () => {
      const holes = []; for (let i = 0; i < 6; i++) holes.push([3.6, 0.32, -12.2, -3.6 + i * 0.85]);
      const u = unit(0, 0, 0, (() => { const p = plateXZ(5.6, 6.2, -12.2, -1.5, holes, 0.06, MAT.steel(), 0.15, 0.01); p.position.y = 3.85; return p; })(),
        m(box(5.6, 0.7, 0.06), MAT.steel(), -12.2, 3.55, 1.6), m(box(5.6, 0.7, 0.06), MAT.steel(), -12.2, 3.55, -4.6));
      return [u];
    },
    fly1: () => [flyEye(-8.6)], fly2: () => [flyEye(-7.2)],
    pbs: () => {
      const u = unit(-5.9, Y0, -1.5);
      for (let i = 0; i < 8; i++) u.add(m(box(0.5, 3.0, 0.43), i % 2 ? MAT.dichroic(0xe9f3ff) : MAT.glass(0xd6ecff), 0, 0, -1.5 + i * 0.43));
      for (let i = 0; i < 4; i++) u.add(m(box(0.02, 3.0, 0.43), MAT.film(0xd8a74a), 0.27, 0, -1.5 + 0.43 + i * 0.86));
      u.add(m(extrude((() => { const s = rrect(4.1, 3.6, 0.15); s.holes.push(hole(3.5, 3.05, 0.1, 0, 0)); return s; })(), 0.55, 0.02), MAT.pps(), -0.28, 0, 0, 0, Math.PI / 2));
      return [u];
    },
    cond: () => [unit(-4.6, Y0, -1.5, lensEl(1.75, 0.55, "x"), holder(1.85, "x"))],
    dm1: () => [unit(0.4, Y0, -1.5, m(box(0.08, 3, 3), MAT.dichroic(0x7aa8ff), 0, 0, 0, 0, Math.PI / 4), clip(Math.PI / 4))],
    dm2: () => [unit(4, Y0, -1.5, m(box(0.08, 3, 3), MAT.dichroic(0x7fe8b0), 0, 0, 0, 0, Math.PI / 4), clip(Math.PI / 4))],
    fold: () => [[0.4, 3, 1], [7.7, -1.5, 1], [7.7, 3, -1]].map(([x, z, s]) => unit(x, Y0, z, m(box(0.06, 3, 3), MAT.mirror(), 0, 0, 0, 0, s * Math.PI / 4), m(box(0.1, 3, 3), MAT.black(), -0.08 * s, 0, -0.08, 0, s * Math.PI / 4), clip(s * Math.PI / 4))),
    relay: () => [unit(6.1, Y0, -1.5, lensEl(1.4, 0.45, "x"), holder(1.5, "x")), unit(7.7, Y0, 0.8, lensEl(1.4, 0.45, "z"), holder(1.5, "z"))],
    field: () => [unit(1.75, Y0, 3, lensEl(1.3, 0.45, "x"), holder(1.38, "x")), unit(6.25, Y0, 3, lensEl(1.3, 0.45, "x"), holder(1.38, "x")), unit(4, Y0, 0.75, lensEl(1.3, 0.45, "z"), holder(1.38, "z"))],
    lcd: () => [panel(2.35, 3, 0), panel(5.65, 3, 0), panel(4, 1.35, 1)],
    polin: () => [film(2.1, 3, 0, 0x30353f), film(5.9, 3, 0, 0x30353f), film(4, 1.1, 1, 0x30353f)],
    polout: () => [film(2.6, 3, 0, 0x3a2f45), film(5.4, 3, 0, 0x3a2f45), film(4, 1.6, 1, 0x3a2f45)],
    prism: () => [unit(4, Y0, 3,
      m(box(2.4, 2.4, 2.4), MAT.glass(0xd8f0ff)),
      m(box(3.36, 2.38, 0.03), MAT.dichroic(0xff7b7b), 0, 0, 0, 0, Math.PI / 4),
      m(box(3.36, 2.38, 0.03), MAT.dichroic(0x6b9cff), 0, 0, 0, 0, -Math.PI / 4),
      m(rbox(3.0, 0.2, 3.0, 0.05), MAT.alu(), 0, -1.32, 0), m(rbox(3.0, 0.2, 3.0, 0.05), MAT.alu(), 0, 1.32, 0),
      ...[[-1.35, -1.35], [1.35, -1.35], [-1.35, 1.35], [1.35, 1.35]].map(([x, z]) => m(cyl(0.08, 0.08, 2.6, 10), MAT.steel(), x, 0, z)))],
    frame: () => {
      const holes = [[3.2, 1.2, -11, -1.5], [2.4, 2.4, 3.4, 0.6], [1.6, 0, -3, 3.5, 0.5], [0, 0, 8, 4.4, 0.35], [0, 0, -13, 4.4, 0.35], [0, 0, 8, -3.6, 0.35], [0, 0, -13, -3.6, 0.35]];
      const base = plateXZ(23.2, 9.8, -3, 0.8, holes, 0.28, MAT.pps(), 0.5, 0.04); base.position.y = -1.44;
      const u = unit(0, 0, 0, base);
      // side walls with slots that hold the optics, and screw bosses
      [[-14.4, -4.0, 13.6, 0.3], [-14.4, 1.0, 9.2, 0.3]].forEach(([x0, z, len]) => u.add(m(rbox(len, 1.3, 0.25, 0.05), MAT.pps(), x0 + len / 2, -0.65, z)));
      [-8.6, -7.2, -5.9, -4.6].forEach((x) => { u.add(m(box(0.5, 0.5, 0.3), MAT.pps(), x, -1.05, -3.7)); u.add(m(box(0.5, 0.5, 0.3), MAT.pps(), x, -1.05, 0.7)); });
      [[-12.5, -4], [-12.5, 4.2], [7.5, -4], [7.5, 4.2]].forEach(([x, z]) => { u.add(m(cyl(0.35, 0.42, 1.2, 20), MAT.pps(), x, -2.0, z)); u.add(m(cyl(0.16, 0.16, 0.05, 12), MAT.steel(), x, -1.13, z)); });
      return [u];
    },
    lens: () => [unit(4, Y0, 8.85,
      m(cyl(2.25, 2.25, 0.35, 40), MAT.alu(), 0, 0, -4.15, Math.PI / 2),
      m(cyl(1.9, 1.9, 5.6, 40), MAT.black(), 0, 0, -1.3, Math.PI / 2),
      m(cyl(2.1, 2.1, 1.3, 40), MAT.knurl(), 0, 0, 0.3, Math.PI / 2),
      m(rbox(0.5, 0.9, 0.6, 0.12), MAT.black(), 0, 2.3, 0.3),
      m(cyl(2.02, 2.02, 0.5, 40), MAT.gloss(), 0, 0, 1.35, Math.PI / 2),
      m(cyl(2.22, 2.22, 1.1, 40), MAT.knurl(0x23262b), 0, 0, 2.2, Math.PI / 2),
      m(cyl(2.3, 2.22, 0.9, 40), MAT.gloss(), 0, 0, 3.2, Math.PI / 2),
      m(new THREE.TorusGeometry(1.95, 0.06, 10, 64), MAT.alu(), 0, 0, 3.66),
      m(new THREE.RingGeometry(0.9, 1.88, 48), MAT.black(), 0, 0, 3.1),
      (() => { const g = lensEl(1.85, 0.6, "z", 0x5d7fc4); g.material.opacity = 0.38; g.material.metalness = 0.5; g.position.z = 3.7; return g; })(),
      (() => { const g = lensEl(1.5, 0.4, "z"); g.position.z = -4.3; return g; })(),
      (() => { const t = text("ZOOM", 0.9, 0.3, { color: "#c9ced6" }); t.position.set(0, 2.11, 0.75); t.rotation.x = -Math.PI / 2; return t; })(),
      (() => { const t = text("FOCUS", 1.1, 0.3, { color: "#c9ced6" }); t.position.set(0, 2.23, 2.2); t.rotation.x = -Math.PI / 2; return t; })())],
    blower: () => {
      const sh = new THREE.Shape(), N = 64;
      sh.moveTo(1.6, 2.6); sh.lineTo(1.6, 0);
      for (let i = 1; i <= N; i++) { const a = i / N * Math.PI * 2, r = 1.6 + 0.7 * i / N; sh.lineTo(r * Math.cos(a), r * Math.sin(a)); }
      sh.lineTo(2.3, 2.6); sh.lineTo(1.6, 2.6); sh.holes.push(circ(1.3, 0, 0));
      const body = m(extrude(sh, 1.4, 0.06), MAT.dark(), 0, 0, 0); body.rotation.x = -Math.PI / 2; body.position.y = -0.7;
      const u = unit(-2, -2.7, 7.5, body, m(cyl(0.45, 0.45, 1.3, 32), MAT.black(), 0, 0, 0), m(new THREE.CircleGeometry(0.44, 32), MAT.fanlabel(), 0, 0.66, 0, -Math.PI / 2), m(cyl(1.25, 1.25, 0.06, 48), MAT.black(), 0, -0.6, 0));
      for (let i = 0; i < 30; i++) { const a = i / 30 * Math.PI * 2; u.add(m(box(0.04, 1.15, 0.36), MAT.black(), Math.cos(a) * 1.05, 0, Math.sin(a) * 1.05, 0, -a + 0.7, 0)); }
      return [u];
    },
    intake: () => { const f = axialFan(5.6, 1.5); return [unit(13.0, -0.3, 0, f)].map((u) => (f.rotation.y = Math.PI / 2, u)); },
    exhaust: () => { const f = axialFan(6.0, 1.6); const u = unit(-13.6, 0.3, 6.5, f, m(rbox(1.2, 6.4, 0.3, 0.05), MAT.black(), 0.9, 0, 3.15), m(rbox(1.2, 6.4, 0.3, 0.05), MAT.black(), 0.9, 0, -3.15)); f.rotation.y = -Math.PI / 2; return [u]; },
    ducts: () => [unit(0, 0, 0, m(rbox(6.2, 0.75, 5.2, 0.2), MAT.duct(), 3.4, -1.95, 0.8), m(rbox(1.0, 1.1, 2.4, 0.15), MAT.duct(), -0.05, -2.35, 3.9),
      ...[2.1, 4, 5.9].map((x) => m(box(1.6, 0.06, 1.6), MAT.black(), x, -1.56, x === 4 ? 0.9 : 3)))],
    filter: () => {
      const u = unit(15.2, -0.3, 0);
      const cover = plateXY(7.6, 5.6, 0, 0, Array.from({ length: 9 }, (_, i) => [0.36, 4.4, -3.0 + i * 0.75, 0]), 0.3, MAT.housing2(), 0.3); cover.rotation.y = Math.PI / 2; cover.position.x = 0.15; u.add(cover);
      for (let i = 0; i < 18; i++) u.add(m(box(0.42, 4.8, 0.05), std({ color: 0x9aa2ad, roughness: 1 }), -0.1, 0, -3.2 + i * 0.38, 0, i % 2 ? 0.5 : -0.5, 0));
      u.add(m(extrude((() => { const q = rrect(7.2, 5.2, 0.2); q.holes.push(hole(6.6, 4.6, 0.1, 0, 0)); return q; })(), 0.5, 0.02), MAT.black(), -0.4, 0, 0, 0, Math.PI / 2));
      return [u];
    },
    therm: () => [[-10.6, 3.35, -1.5, "eng"], [4, 2.1, 3, "eng"], [11, -1.6, -7.5, "psu"]].map(([x, y, z, t]) => {
      const u = unit(x, y, z, m(new THREE.SphereGeometry(0.14, 16, 10), std({ color: 0x1b1d22, roughness: 0.3 })), m(cyl(0.025, 0.025, 1.0, 6), std({ color: 0xc23b3b }), -0.05, -0.55, 0), m(cyl(0.025, 0.025, 1.0, 6), std({ color: 0xe8e8e8 }), 0.05, -0.55, 0));
      u.userData.tm = t; return u;
    }),
    psu: () => {
      const u = unit(10, -3.6, -7.5, m(box(8.8, 0.16, 5.6), MAT.pcb()));
      onBoard(u, cap(0.62, 2.3), -3.2, 0.08, 1.4); onBoard(u, cap(0.52, 1.9, 0x1f2a5a), -1.9, 0.08, 1.8);
      const tf = new THREE.Group(); tf.add(m(rbox(1.9, 1.6, 1.7, 0.08), MAT.tape(), 0, 0.8, 0)); tf.add(m(box(2.1, 0.35, 1.0), MAT.ferrite(), 0, 1.68, 0)); tf.add(m(box(2.1, 0.35, 1.0), MAT.ferrite(), 0, -0.05, 0)); onBoard(u, tf, -1.3, 0.25, -1.0);
      const ch = new THREE.Group(); ch.add(m(new THREE.TorusGeometry(0.75, 0.32, 16, 40), MAT.copper(), 0, 0, 0)); ch.add(m(cyl(0.55, 0.55, 0.5, 32), MAT.ferrite(), 0, 0, 0, Math.PI / 2)); ch.rotation.x = 0; onBoard(u, ch, -3.3, 1.05, -1.2);
      onBoard(u, finHeatsink(3.2, 1.9, 1.0, 7), 2.3, 0.08, -1.6); onBoard(u, finHeatsink(2.6, 1.5, 0.9, 6), 2.4, 0.08, 1.3);
      [[1.3, -1.0], [1.9, -1.0], [2.5, -1.0]].forEach(([x, z]) => onBoard(u, m(box(0.45, 0.65, 0.18), MAT.black()), x, 0.4, z));
      onBoard(u, m(box(1.2, 0.8, 0.5), std({ color: 0xd8d4c8, roughness: 0.6 }), 0.2, 0.48, 2.3)); onBoard(u, m(cyl(0.38, 0.38, 0.14, 24), MAT.blue(), 1.6, 0.4, 2.3, Math.PI / 2));
      onBoard(u, m(box(0.9, 0.3, 0.9), MAT.black(), -0.2, 0.2, 0.9)); onBoard(u, qfp(0.5), 0.6, 0.08, 0.2);
      onBoard(u, m(rbox(1.2, 0.6, 0.6, 0.05), MAT.white(), 3.8, 0.38, -2.4)); onBoard(u, m(rbox(1.0, 0.6, 0.6, 0.05), MAT.white(), 3.8, 0.38, 2.4));
      return [u];
    },
    ballast: () => {
      const u = unit(-11.6, -3.6, -7.6, m(box(5.4, 0.16, 4.4), MAT.pcb()));
      const ig = new THREE.Group(); ig.add(m(cyl(0.55, 0.55, 1.5, 24), std({ color: 0x8b1d1d, roughness: 0.5 }), 0, 0, 0, 0, 0, Math.PI / 2)); ig.add(m(box(1.8, 0.5, 0.5), MAT.ferrite(), 0, 0, 0)); onBoard(u, ig, -1.0, 0.7, -1.0);
      onBoard(u, cap(0.42, 1.5), -1.6, 0.08, 1.2); onBoard(u, cap(0.32, 1.1, 0x1f2a5a), -0.7, 0.08, 1.4);
      const tor = m(new THREE.TorusGeometry(0.5, 0.22, 14, 32), MAT.copper(), 0.8, 0.45, 1.2, Math.PI / 2); u.add(tor);
      onBoard(u, finHeatsink(1.8, 1.4, 0.8, 5), 1.4, 0.08, -1.2);
      onBoard(u, m(box(0.45, 0.6, 0.18), MAT.black()), 1.2, 0.4, -0.55); onBoard(u, m(box(0.45, 0.6, 0.18), MAT.black()), 1.8, 0.4, -0.55);
      onBoard(u, qfp(0.45), 0.2, 0.08, 0.2); onBoard(u, m(rbox(1.0, 0.6, 0.55, 0.05), MAT.white(), -2.2, 0.38, -1.6));
      const hv = text("⚡ HIGH VOLTAGE", 2.4, 0.4, { color: "#ffd23f" }); hv.rotation.x = -Math.PI / 2; hv.position.set(0.9, 0.1, 1.95); u.add(hv);
      return [u];
    },
    inlet: () => {
      const face = (() => { const s = rrect(2.9, 1.9, 0.2); const h = new THREE.Path(); h.moveTo(-0.85, -0.45); h.lineTo(0.85, -0.45); h.lineTo(0.85, 0.2); h.lineTo(0.5, 0.5); h.lineTo(-0.5, 0.5); h.lineTo(-0.85, 0.2); h.lineTo(-0.85, -0.45); s.holes.push(h); return s; })();
      const u = unit(12, -2.3, -11.42, m(extrude(face, 0.18, 0.03), MAT.black(), 0, 0, 0), m(box(1.8, 1.0, 1.4), MAT.black(), 0, 0, 0.85), m(box(1.6, 0.9, 0.1), std({ color: 0x0c0d10 }), 0, 0, 0.12));
      [[-0.45, 0], [0.45, 0], [0, 0.25]].forEach(([x, y]) => u.add(m(box(0.08, 0.28, 0.5), MAT.alu(), x, y - 0.05, 0.3)));
      [-1.15, 1.15].forEach((x) => u.add(m(cyl(0.09, 0.09, 0.05, 12), MAT.steel(), x, 0, -0.02, Math.PI / 2)));
      return [u];
    },
    main: () => {
      const u = unit(-2, -3.75, -7.6, m(box(14, 0.16, 6.6), MAT.pcb()));
      onBoard(u, qfp(1.9, 0.22), -1.5, 0.08, 0.6); onBoard(u, finHeatsink(2.2, 0.9, 2.2, 8), -1.5, 0.3, 0.6);
      onBoard(u, qfp(0.9), 2.2, 0.08, 1.4); onBoard(u, m(box(1.4, 0.14, 0.8), MAT.chip(), 1.4, 0.15, -0.4)); onBoard(u, m(box(0.6, 0.12, 0.5), MAT.chip(), 3.6, 0.14, -0.1));
      onBoard(u, qfp(0.7), 4.6, 0.08, 1.6); onBoard(u, m(rbox(0.8, 0.35, 0.35, 0.12), MAT.alu(), 3.4, 0.25, 2.2));
      [[-4.4, 1.9], [-4.4, 1.0], [-3.6, 1.9]].forEach(([x, z]) => onBoard(u, m(rbox(0.7, 0.45, 0.7, 0.06), MAT.ferrite()), x, 0.3, z));
      [[-5.6, 2.5], [-5.0, 2.5], [5.6, 2.4], [6.2, 2.4]].forEach(([x, z]) => onBoard(u, cap(0.25, 0.7), x, 0.08, z));
      [[-6.2, 0.4], [-6.2, -0.4]].forEach(([x, z]) => onBoard(u, m(rbox(0.9, 0.35, 0.4, 0.04), MAT.white(), x, 0.25, z)));
      [-0.2, 1.2, 2.6].forEach((x) => onBoard(u, m(rbox(1.2, 0.3, 0.4, 0.04), MAT.ivory(), x, 0.23, 3.0)));
      for (let i = 0; i < 30; i++) onBoard(u, smd(0.16 + (i % 3) * 0.05, 0.1, i % 4 ? 0x3b3d42 : 0xa58a5b), -5 + (i % 10) * 0.9, 0.12, -0.6 - Math.floor(i / 10) * 0.35);
      return [u];
    },
    io: () => [unit(0, 0, 0, ...IO.map(([k, x, yy, a]) => { const c = CON[k](a); c.position.set(x, yy, IOZ); return c; }))],
    keypad: () => {
      const u = unit(9, 4.6, 6.4, m(extrude(rrect(6.8, 3.2, 0.5), 0.12, 0.04), MAT.charcoal(), 0, 0, 0, -Math.PI / 2));
      [[-2.3, 0, "▲"], [-0.9, 0, "▼"], [0.5, 0, "◀"], [1.9, -0.6, "▶"], [1.9, 0.6, "■"]].forEach(([x, z]) => u.add(m(cyl(0.34, 0.36, 0.18, 32), std({ color: 0xc9ced6, roughness: 0.55 }), x, 0.22, z)));
      u.add(m(cyl(0.42, 0.42, 0.2, 32), std({ color: 0xdfe4ea, roughness: 0.45 }), 2.6 + 0.4, 0.22, 0.9)); u.add(m(new THREE.TorusGeometry(0.46, 0.04, 8, 40), std({ color: 0x2e6fe8, emissive: 0x2e6fe8, emissiveIntensity: 1.2 }), 3.0, 0.22, 0.9, Math.PI / 2));
      const t = text("POWER", 1.1, 0.3, { color: "#9aa3b2" }); t.rotation.x = -Math.PI / 2; t.position.set(3.0, 0.2, 0.2); u.add(t);
      return [u];
    },
    ir: () => [unit(-10, 1.4, 11.55, m(rbox(1.0, 0.6, 0.25, 0.06), phys({ color: 0x3a0d16, roughness: 0.1, clearcoat: 1, transparent: true, opacity: 0.9 }))), unit(-6, 1.4, -11.42, m(rbox(1.0, 0.6, 0.25, 0.06), phys({ color: 0x3a0d16, roughness: 0.1, clearcoat: 1, transparent: true, opacity: 0.9 })))],
    speaker: () => {
      const cone = []; for (let i = 0; i <= 12; i++) { const r = 0.3 + 1.0 * i / 12; cone.push(new THREE.Vector2(r, Math.pow(i / 12, 1.4) * 0.45)); }
      return [unit(-9, -2.6, 8.2, m(rbox(3.6, 1.2, 3.6, 0.2), MAT.black(), 0, -0.4, 0), m(new THREE.TorusGeometry(1.35, 0.08, 10, 48), MAT.rubber(), 0, 0.42, 0, Math.PI / 2),
        m(new THREE.LatheGeometry(cone, 48), std({ color: 0x2a2c31, roughness: 0.85, side: THREE.DoubleSide }), 0, -0.05, 0), m(new THREE.SphereGeometry(0.32, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), MAT.black(), 0, -0.05, 0),
        ...[0, 1, 2, 3].map((i) => m(cyl(0.08, 0.08, 0.06, 10), MAT.steel(), Math.cos(i * Math.PI / 2 + 0.78) * 1.65, 0.22, Math.sin(i * Math.PI / 2 + 0.78) * 1.65)))];
    },
    interlock: () => [unit(-8.6, 3.4, -4.9, m(rbox(1.0, 0.55, 0.5, 0.05), MAT.black()), m(box(0.12, 0.45, 0.12), MAT.steel(), 0.25, 0.45, 0), m(box(0.06, 0.25, 0.3), MAT.alu(), -0.55, -0.1, 0))],
    harness: () => {
      const u = unit(0, 0, 0), tube = (pts, r, mat) => m(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p))), 40, r, 6), mat);
      const ribbon = (pts) => tube(pts, 0.06, MAT.flex());
      u.add(tube([[6, -3.3, -7.6], [5.6, -3.1, -7.4], [5.1, -3.35, -7.2]], 0.1, MAT.black()));
      u.add(tube([[-8.9, -3.3, -8.4], [-9.6, -2.4, -6.0], [-12.0, -1.2, -4.6], [-14.1, -1.6, -3.6]], 0.1, MAT.black()));
      [2.35, 5.65].forEach((x) => u.add(ribbon([[x, 2.0, 3], [x, 3.4, 2.2], [x * 0.5, 3.6, -3.0], [-0.5, 0.5, -5.2], [-0.5, -3.4, -5.6]])));
      u.add(ribbon([[4, 2.0, 1.35], [3.6, 3.5, 0.6], [1.5, 3.5, -3.2], [0.4, 0.5, -5.1], [0.4, -3.4, -5.6]]));
      [[2.6, 3.62, -0.6], [-11.0, -1.5, -4.5]].forEach(([x, y, z]) => u.add(m(cyl(0.22, 0.22, 0.55, 20), MAT.ferrite(), x, y, z, Math.PI / 2, 0, 0.3)));
      return [u];
    },
    top: () => {
      const u = unit(0, 0, 0);
      const roof = plateXZ(30, 22.4, 0, -0.3, [], 0.3, MAT.housing(), 1.2, 0.12); roof.position.y = 4.3; u.add(roof);
      u.add(sideWall(1, 0, 4.3, MAT.housing())); u.add(sideWall(-1, 0, 4.3, MAT.housing()));
      const rear = plateXY(27.6, 4.3, 0, 2.15, [[1.1, 0.7, -6, 1.4]], 0.3, MAT.housing(), 0.05); rear.position.z = -11.5; u.add(rear);
      for (let i = 0; i < 7; i++) u.add(m(rbox(0.06, 2.4, 0.4, 0.02), MAT.black(), -15.02, 2.0, 3.8 + i * 0.85));
      const label = text("VH-3600", 5, 0.9, { color: "#9aa3b2" }); label.rotation.x = -Math.PI / 2; label.position.set(-3.5, 4.75, 9.4); u.add(label);
      const l2 = text("3LCD", 2.6, 0.7, { color: "#b9c0cb" }); l2.rotation.x = -Math.PI / 2; l2.position.set(-12, 4.75, 9.4); u.add(l2);
      [[-6.5, -1], [-3.5, -1], [-0.5, -1]].forEach(([x]) => u.add(m(box(2.2, 0.03, 0.08), MAT.housing2(), x, 4.76, -9.5)));
      return [u];
    },
    bottom: () => {
      const u = unit(0, 0, 0);
      const floor = plateXZ(30, 22.4, 0, -0.3, [], 0.3, MAT.housing2(), 1.2, 0.12); floor.position.y = -4.6; u.add(floor);
      u.add(sideWall(1, -4.3, 4.3, MAT.housing2())); u.add(sideWall(-1, -4.3, 4.3, MAT.housing2()));
      const rear = plateXY(27.6, 4.3, 0, -2.15, [[14.4, 3.8, -2, -2.3], [3.0, 2.0, 12, -2.3]], 0.3, MAT.housing2(), 0.05); rear.position.z = -11.5; u.add(rear);
      for (let i = 0; i < 7; i++) u.add(m(rbox(0.06, 2.6, 0.4, 0.02), MAT.black(), -15.02, -2.0, 3.8 + i * 0.85));
      for (let i = 0; i < 9; i++) u.add(m(rbox(0.06, 2.6, 0.4, 0.02), MAT.black(), 15.02, -1.8, -3.2 + i * 0.8));
      // inside: screw bosses and stiffening ribs
      [[-13.6, -10], [13.6, -10], [-13.6, 9.6], [13.6, 9.6], [-5, -10.4], [5, -10.4], [-5, 9.9], [5, 9.9]].forEach(([x, z]) => u.add(m(cyl(0.38, 0.45, 1.4, 20), MAT.housing2(), x, -3.6, z)));
      [-6, 0, 6].forEach((x) => u.add(m(box(0.15, 0.6, 18), MAT.housing2(), x, -4.0, 0.5)));
      [-4, 4].forEach((z) => u.add(m(box(27, 0.6, 0.15), MAT.housing2(), 0, -4.0, z)));
      return [u];
    },
    bezel: () => {
      const holes = [[0, 0, 4, 0.6, 2.42], [1.0, 0.6, -10, 1.4]]; for (let i = 0; i < 6; i++) holes.push([0.3, 4.6, -14 + i * 0.5, -0.2]);
      const u = unit(0, 0, 10.9, plateXY(30, 9.2, 0, 0, holes, 0.55, MAT.charcoal(), 0.9),
        m(new THREE.TorusGeometry(2.55, 0.12, 16, 48), MAT.alu(), 4, Y0, 0.62));
      const lg = text("VAVEhub", 4.6, 0.9, { color: "#8f99aa" }); lg.position.set(-5.5, -3.0, 0.64); u.add(lg);
      return [u];
    },
    lenscover: () => [unit(9.6, Y0, 11.75, m(rbox(4.4, 4.6, 0.22, 0.12), MAT.gloss()), ...[-1, 0, 1].map((i) => m(rbox(0.14, 3.4, 0.08, 0.03), MAT.black(), 1.6 + i * 0.26, 0, 0.13)), m(rbox(0.6, 1.0, 0.3, 0.1), MAT.dark(), -2.2, 0, 0.1))],
    tiltfoot: () => [unit(0, -5.0, 8.4, m(cyl(0.7, 0.75, 0.35, 32), MAT.rubber(), 0, -0.4, 0), m(cyl(0.32, 0.32, 1.2, 24), MAT.knurl(0x2b2f35), 0, 0.3, 0), m(rbox(1.6, 0.4, 0.9, 0.1), MAT.dark(), 0, 0.6, 1.2))],
    feet: () => [[-12, -9], [12, -9]].map(([x, z]) => unit(x, -5.1, z, m(cyl(0.7, 0.78, 1.0, 32), MAT.rubber()), m(cyl(0.5, 0.5, 0.06, 24), MAT.black(), 0, -0.5, 0))),
    screws: () => { const u = unit(0, -4.66, 0); [[-13.6, -10], [13.6, -10], [-13.6, 9.6], [13.6, 9.6], [-5, -10.4], [5, -10.4], [-5, 9.9], [5, 9.9]].forEach(([x, z]) => { const s = screwHead(); s.position.set(x, 0, z); s.rotation.x = Math.PI; u.add(s); u.add(m(cyl(0.1, 0.1, 1.0, 10), MAT.steel(), x, 0.55, z)); }); return [u]; },
    mbcage: () => {
      const holes = []; for (let i = 0; i < 10; i++) for (let j = 0; j < 4; j++) holes.push([0, 0, -8 + i * 1.3, -10 + j * 1.6, 0.25]);
      const p = plateXZ(14.4, 7.0, -2, -7.6, holes, 0.06, MAT.steel(), 0.2, 0.01); p.position.y = -4.06;
      return [unit(0, 0, 0, p, m(box(14.4, 0.8, 0.06), MAT.steel(), -2, -3.7, -4.1), m(box(0.06, 0.8, 7.0), MAT.steel(), -9.2, -3.7, -7.6), m(box(0.06, 0.8, 7.0), MAT.steel(), 5.2, -3.7, -7.6))];
    },
    emi: () => {
      const holes = IO.map(([k, x, yy]) => [...IOHOLE[k], x, yy]);
      const p = plateXY(14.2, 3.9, -2, -2.3, holes, 0.05, std({ color: 0xd4d9df, roughness: 0.3, metalness: 1 }), 0.1); p.position.z = -11.2;
      const u = unit(0, 0, 0, p);
      for (let i = 0; i < 26; i++) u.add(m(box(0.4, 0.04, 0.35), std({ color: 0xd4d9df, roughness: 0.3, metalness: 1 }), -8.75 + i * 0.54, -0.33, -11.0, 0.5, 0, 0));
      return [u];
    },
    remote: () => [unit(36, -16, 14, m(rbox(4, 0.9, 13, 0.45), MAT.charcoal()),
      ...Array.from({ length: 12 }, (_, i) => m(rbox(0.6, 0.18, 0.4, 0.08), std({ color: 0x8a93a3, roughness: 0.6 }), -1.1 + (i % 3) * 1.1, 0.5, -1.6 + Math.floor(i / 3) * 1.0)),
      m(cyl(0.45, 0.45, 0.14, 24), std({ color: 0xd73a3a, roughness: 0.5 }), 1.1, 0.5, -5), m(new THREE.TorusGeometry(0.9, 0.12, 10, 40), std({ color: 0xc9ced6 }), 0, 0.5, -3.2, Math.PI / 2), m(rbox(0.8, 0.4, 0.3, 0.1), phys({ color: 0x3a0d16, clearcoat: 1 }), 0, 0.1, -6.5))],
    cables: () => [unit(36, -16.6, 0, m(new THREE.TorusGeometry(2.6, 0.2, 12, 64), MAT.black(), 0, 0, 0, Math.PI / 2), m(new THREE.TorusGeometry(2.15, 0.2, 12, 64), MAT.black(), 0, 0.4, 0, Math.PI / 2),
      m(rbox(1.6, 1.0, 2.0, 0.15), MAT.black(), 3.4, 0, 0), ...[-0.4, 0.4].map((x) => m(box(0.12, 0.4, 0.6), MAT.alu(), 3.4 + x, 0, 1.2)), m(rbox(1.8, 0.7, 1.0, 0.1), MAT.blue(), -3.5, 0.2, 0), m(new THREE.TorusGeometry(2.3, 0.18, 12, 64), MAT.blue(), 0, 0.8, 0, Math.PI / 2))],
    docs: () => [unit(36, -16.9, -12.5, m(box(7, 0.12, 9.6), MAT.white()), m(box(6.6, 0.12, 9.2), std({ color: 0xe8eef8, roughness: 0.8 }), 0.4, 0.12, 0.3),
      (() => { const t = text("VH-3600 · Quick start", 5.6, 0.7, { color: "#2c3446" }); t.rotation.x = -Math.PI / 2; t.position.set(0.4, 0.2, -3.2); return t; })(),
      ...Array.from({ length: 6 }, (_, i) => m(box(5, 0.02, 0.16), MAT.dark(), 0.4, 0.2, -2 + i * 0.9)))],
  };
  function holder(r, axis) {
    const sh = rrect(r * 2.2, r * 2.2, 0.15); sh.holes.push(circ(r * 0.92, 0, 0));
    const o = m(extrude(sh, 0.2, 0.02), MAT.pps()); if (axis === "x") { o.rotation.y = Math.PI / 2; o.position.x = 0.1; } else o.position.z = -0.1;
    return o;
  }
  function clip(ry) { const g = new THREE.Group(); g.rotation.y = ry; g.add(m(box(0.3, 0.3, 3.2), MAT.pps(), 0, -1.6, 0)); g.add(m(box(0.3, 0.3, 3.2), MAT.pps(), 0, 1.6, 0)); return g; }
  function flyEye(x) {
    const u = unit(x, Y0, -1.5, m(box(0.22, 3.0, 3.8), MAT.glass(0xe6f3ff)));
    const lg = new THREE.SphereGeometry(0.34, 12, 8);
    for (let r = 0; r < 5; r++) for (let c = 0; c < 4; c++) { const s = m(lg, MAT.glass(0xe6f3ff), 0.11, -1.2 + r * 0.6, -1.4 + c * 0.93); s.scale.set(0.35, 0.85, 1.25); u.add(s); }
    u.add(m(extrude((() => { const s = rrect(4.4, 3.6, 0.15); s.holes.push(hole(3.9, 3.1, 0.1, 0, 0)); return s; })(), 0.3, 0.02), MAT.pps(), -0.15, 0, 0, 0, Math.PI / 2));
    return u;
  }
  function panel(x, z, alongZ) {
    const fr = rrect(2.7, 2.3, 0.12); fr.holes.push(hole(1.55, 1.2, 0.05, 0, 0));
    const u = unit(x, Y0, z, m(extrude(fr, 0.16, 0.02), MAT.black(), -0.08, 0, 0, 0, Math.PI / 2), m(box(0.08, 1.2, 1.55), MAT.lcd()),
      m(box(0.03, 2.5, 1.1), MAT.flex(), 0, 2.3, 0), m(box(0.035, 0.3, 1.0), std({ color: 0xe0b84a, metalness: 1, roughness: 0.3 }), 0, 3.5, 0),
      ...[-1, 1].map((s) => m(box(0.1, 0.35, 0.4), MAT.black(), 0, s * 0.2, s * 1.55)));
    if (alongZ) u.rotation.y = Math.PI / 2; return u;
  }
  function film(x, z, alongZ, c) { const u = unit(x, Y0, z, m(box(0.06, 1.9, 2.3), MAT.glass(0xeef6ff)), m(box(0.02, 1.8, 2.2), MAT.film(c), 0.04, 0, 0)); if (alongZ) u.rotation.y = Math.PI / 2; return u; }

  // ── where each part goes in the exploded view ──
  const LIFT = new THREE.Vector3(0, 11, 0), S = 2.3, K = 2.9;
  const engine = (p, extra) => PC.clone().add(p.clone().sub(PC).multiplyScalar(S)).add(LIFT).add(extra || new THREE.Vector3());
  const stackOut = (p) => PC.clone().add(LIFT).add(p.clone().sub(PC).multiplyScalar(K));
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const OFF = { frame: V(0, 6, 0), blower: V(-2, -12, 9), intake: V(8, 0, 0), exhaust: V(-15, -2, 8), ducts: V(0, -6, 0), filter: V(17, 0, 0),
    psu: V(12, -10, -7), ballast: V(-12, -10, -7), inlet: V(12, -10, -14), main: V(0, -12, -4), mbcage: V(0, -17, -4), io: V(0, -9, -13), emi: V(0, -6, -17),
    keypad: V(0, 30, 4), speaker: V(-6, -12, 8), interlock: V(0, 14, -3), baffle: V(0, 17, 0),
    harness: V(0, -6, 0), top: V(0, 26, 0), bottom: V(0, -26, 0), bezel: V(-2, -5, 27), lenscover: V(-2, -5, 31), tiltfoot: V(0, -34, 4), feet: V(0, -34, 0), screws: V(0, -30, 0), lampdoor: V(0, 30, -3) };
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

  // ── merge each unit's small meshes into one mesh per material: far fewer draw calls, same look ──
  const matKey = (mt) => [mt.type, mt.color && mt.color.getHex(), mt.emissive && mt.emissive.getHex(), mt.emissiveIntensity, mt.roughness, mt.metalness, mt.transmission, mt.opacity,
    mt.transparent, mt.depthWrite, mt.side, mt.map && mt.map.uuid, mt.bumpMap && mt.bumpMap.uuid, mt.clearcoat, mt.iridescence, mt.thickness].join("|");
  const inv = new THREE.Matrix4(), rel = new THREE.Matrix4();
  function mergeUnit(u) {
    u.updateMatrixWorld(true); inv.copy(u.matrixWorld).invert();
    const groups = new Map();
    u.traverse((o) => { if (o.isMesh) { const k = matKey(o.material); if (!groups.has(k)) groups.set(k, { mat: o.material, list: [] }); groups.get(k).list.push(o); } });
    const out = new THREE.Group(); out.position.copy(u.position); out.quaternion.copy(u.quaternion); out.scale.copy(u.scale); out.userData = u.userData;
    groups.forEach(({ mat, list }) => {
      const parts = list.map((o) => { const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone(); rel.multiplyMatrices(inv, o.matrixWorld); g.applyMatrix4(rel); return g; });
      const n = parts.reduce((a, g) => a + g.attributes.position.count, 0), geo = new THREE.BufferGeometry();
      ["position", "normal", "uv"].forEach((name) => {
        const size = name === "uv" ? 2 : 3, arr = new Float32Array(n * size); let off = 0;
        parts.forEach((g) => { const at = g.attributes[name]; if (at) arr.set(at.array.subarray(0, at.count * size), off); off += g.attributes.position.count * size; });
        geo.setAttribute(name, new THREE.BufferAttribute(arr, size));
      });
      geo.computeBoundingSphere(); out.add(new THREE.Mesh(geo, mat));
    });
    return out;
  }

  // ── build ──
  const units = [];           // { id, n, obj, a: assembled pos, e: exploded pos, c: centre offset, mats, edge }
  const byN = {};
  const pickables = [];
  D.parts.forEach((p) => {
    if (p.hidden3d || !B[p.id]) return;
    B[p.id]().forEach((raw, i) => {
      const obj = mergeUnit(raw);
      const rec = { id: p.id, n: p.n, obj, a: obj.position.clone(), mats: [], edge: new THREE.LineBasicMaterial({ color: 0x0d1320, transparent: true, opacity: 0, depthWrite: false }) };
      rec.e = exploded(p.id, obj);
      rec.c = box3.setFromObject(obj).getCenter(new THREE.Vector3()).sub(obj.position);
      const meshes = [];
      obj.traverse((o) => { if (o.isMesh) meshes.push(o); });
      meshes.forEach((o) => {
        o.userData.rec = rec; pickables.push(o);
        const mt = o.material; mt.userData.o = mt.opacity; mt.userData.t = mt.transparent; mt.userData.em = mt.emissive ? mt.emissive.clone() : null; mt.userData.ei = mt.emissiveIntensity;
        rec.mats.push(mt);
        const glassy = mt.transmission > 0 || mt.transparent;
        o.castShadow = !glassy; o.receiveShadow = !(mt.isMeshBasicMaterial);
        // CAD-style feature edges, shown in the exploded view
        if (!glassy && !mt.isMeshBasicMaterial && o.geometry.attributes.position.count < 40000) {
          const ln = new THREE.LineSegments(new THREE.EdgesGeometry(o.geometry, 32), rec.edge); ln.raycast = () => {}; o.add(ln);
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
  let dirty = 30; renderer.shadowMap.autoUpdate = false; renderer.shadowMap.needsUpdate = true;
  const poke = (n = 8) => { dirty = Math.max(dirty, n); };
  controls.addEventListener("change", () => poke());
  const st = { t: 0, tTo: 0, light: false, lightA: 0, step: 0, sel: [], labels: false, hover: null, tween: null };
  const COVERS = new Set(["top", "bottom", "bezel", "lampdoor", "keypad", "lenscover", "interlock", "ir", "baffle"]);
  const DIM = new Set(["main", "psu", "ballast", "io", "emi", "mbcage", "inlet", "speaker", "harness", "blower", "ducts", "intake", "exhaust", "filter", "therm", "frame", "tiltfoot", "feet", "screws", "cage"]); // faded back while the light path is on
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
      u.edge.opacity = 0.5 * e * a;
    });
    shadow.material.opacity = 1 - st.t; ground.material.opacity = 0.28 * Math.max(0, 1 - st.t * 2); ground.visible = !lite && st.t < 0.5;
    beams.visible = st.lightA > 0.01;
    beams.children.forEach((o) => {
      o.visible = !st.step || o.userData.step <= st.step;
      if (o.material.userData.base === undefined) o.material.userData.base = o.material.opacity;
      o.material.opacity = o.material.userData.base * st.lightA;
    });
  }

  // ── camera moves ──
  const VIEWS = {
    home: [V(34, 24, 40), V(0, 0, 0)], exploded: [V(98, 58, 114), V(-6, 2.5, 0)], light: [V(-4, 31, 25), V(-2, 0, 2)],
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
    poke();
    units.forEach((u) => u.mats.forEach((mt) => { if (mt.userData.em) { mt.emissive.copy(mt.userData.em); mt.emissiveIntensity = mt.userData.ei; } }));
    ns.forEach((n) => (byN[n] || []).forEach((u) => u.mats.forEach((mt) => { if (mt.emissive) { mt.emissive.setHex(0x2e6fe8); mt.emissiveIntensity = 0.55; } })));
  }
  function select(n, opts = {}) {
    st.sel = n ? [n] : [];
    highlight(st.sel);
    root.querySelectorAll(".pj-part").forEach((b) => b.classList.toggle("is-on", +b.dataset.n === n));
    if (!n) { card.hidden = true; return; }
    const p = ITEM[n], LN = Object.fromEntries(D.lines.map((l) => [l.id, l]));
    const from = Object.entries(p.alloc).map(([k, v]) => `${k} ${LN[k].name} <b>${fmt(v)}</b>${LN[k].added ? " (VAVEhub estimate)" : ""}`).join("<br>");
    const ideas = (D.ideas || []).filter((i) => (i.parts || []).includes(p.n));
    card.innerHTML = `<button type="button" class="pj-card-x" aria-label="Close">✕</button>
      <p class="pj-card-k">Item ${p.n} · ${GROUP[p.g].name}</p><h3>${p.name}</h3>
      <dl><div><dt>Function</dt><dd><b>${p.fn}</b>${p.fn2 && p.fn2.length ? `<br>also: ${p.fn2.join(", ")}` : ""}${p.fnU && p.fnU.length ? `<br><span class="pj-unw">unwanted: ${p.fnU.join(", ")}</span>` : ""}</dd></div><div><dt>Quantity</dt><dd>${p.q}</dd></div>
      <div><dt>Material / process</dt><dd>${p.mat}</dd></div>
      <div><dt>Cost</dt><dd><b>${fmt(p.ext)}</b>${p.q > 1 ? ` (${fmt(p.cost)} each)` : ""}</dd></div>
      <div><dt>From the report</dt><dd>${from}</dd></div>
      ${ideas.length ? `<div><dt>VAVE ideas</dt><dd>${ideas.map((i) => `${i.id} ${i.t}`).join("<br>")}</dd></div>` : ""}</dl>`;
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
  const tmp = new THREE.Vector3();
  const svgNS = "http://www.w3.org/2000/svg", leaders = document.createElementNS(svgNS, "svg");
  leaders.setAttribute("class", "pj-leaders"); balloonsEl.prepend(leaders);
  const lab = {}; // label positions on screen, kept between frames so they settle rather than jump
  function placeBalloons() {
    const show = st.t > 0.6 || st.labels;
    balloonsEl.classList.toggle("is-named", st.labels);
    const w = canvasHost.clientWidth, h = canvasHost.clientHeight, live = [];
    if (!w || !h) return;
    for (const n in balloons) {
      const u = byN[n][0], b = balloons[n];
      if (!show || !u.obj.visible || (COVERS.has(u.id) && st.lightA > 0.5) || (st.only && !st.only.includes(+n))) { b.style.opacity = 0; b.style.pointerEvents = "none"; delete lab[n]; continue; }
      box3.setFromObject(u.obj); box3.getCenter(tmp);
      tmp.project(camera);
      if (tmp.z > 1) { b.style.opacity = 0; delete lab[n]; continue; }
      const ax = (tmp.x + 1) / 2 * w, ay = (1 - tmp.y) / 2 * h;
      if (ax < 4 || ay < 4 || ax > w - 4 || ay > h - 4) { b.style.opacity = 0; b.style.pointerEvents = "none"; delete lab[n]; continue; } // part is off screen
      const L = lab[n] || (lab[n] = { x: ax, y: ay - 22 });
      L.ax = ax; L.ay = ay; L.x += (ax - L.x) * 0.4; L.y += (ay - 22 - L.y) * 0.4; L.n = n;
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
    if (st.t < 0.5 && !["top", "bottom", "bezel", "lampdoor", "keypad", "lenscover", "tiltfoot", "feet", "ir"].includes(ITEM[n].id)) explode(true);
    const off = st.sel[0] === n;
    select(off ? 0 : n);
    if (!off) focusOn(n);
  });
  // swing the camera round to look at one part, from the same side as the exploded view
  function focusOn(n) {
    const u = byN[n][0], at = (st.tTo > 0.5 ? u.e : u.a).clone().add(u.c);
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
  tLab.onclick = () => { poke(); st.labels = !st.labels; tLab.setAttribute("aria-pressed", st.labels); };
  $("[data-act=reset]").onclick = () => { select(0); setLight(false); animateT(0); fly("home"); tExp.setAttribute("aria-pressed", false); tAsm.setAttribute("aria-pressed", true); };
  slider.addEventListener("input", () => { stopAuto(); if (st.light) setLight(false); st.t = st.tTo = slider.value / 100; tExp.setAttribute("aria-pressed", st.t > 0.5); tAsm.setAttribute("aria-pressed", st.t <= 0.5); });
  function stopAuto() { controls.autoRotate = false; }

  // ── size and loop ──
  function resize() {
    const w = canvasHost.clientWidth, h = canvasHost.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); poke();
  }
  new ResizeObserver(resize).observe(canvasHost); resize();
  let visible = true, last = performance.now();
  new IntersectionObserver((es) => { visible = es[0].isIntersecting; if (visible) { last = performance.now(); requestAnimationFrame(loop); } }).observe(root);
  function update(dt) {
    const t0 = st.t, l0 = st.lightA;
    if (st.t !== st.tTo) { const s = Math.sign(st.tTo - st.t) * dt / 1.3; st.t = Math.abs(st.tTo - st.t) <= Math.abs(s) ? st.tTo : st.t + s; slider.value = Math.round(st.t * 100); }
    const la = st.light ? 1 : 0; if (st.lightA !== la) { const s = Math.sign(la - st.lightA) * dt / 0.7; st.lightA = Math.abs(la - st.lightA) <= Math.abs(s) ? la : st.lightA + s; }
    if (st.tween) { const k = Math.min(1, (performance.now() - st.tween.s) / st.tween.ms), e = ease(k); camera.position.lerpVectors(st.tween.p0, st.tween.p1, e); controls.target.lerpVectors(st.tween.t0, st.tween.t1, e); if (k >= 1) st.tween = null; }
    flows.forEach((t) => { t.offset.y -= dt * 0.9; });
    const moved = st.t !== t0 || st.lightA !== l0;
    if (moved) renderer.shadowMap.needsUpdate = true;
    const anim = moved || !!st.tween || st.light || controls.autoRotate;
    controls.update();
    if (anim) poke();
    if (dirty <= 0) return;
    dirty--; apply();
    renderer.render(scene, camera); placeBalloons();
    // time between frames while animating (the GPU works asynchronously, so time the whole frame)
    const now = performance.now();
    if (!lite && anim && lastR && slow.length < 3) { slow.push(now - lastR); if (slow.length === 3 && Math.min(...slow) > 60) goLite(); }
    lastR = anim ? now : 0;
  }
  // slow machines (no GPU, old phones) get a lighter render: no shadows, simple glass, normal pixel density
  let lite = false, lastR = 0; const slow = [];
  function goLite() {
    lite = true; renderer.shadowMap.enabled = false; ground.visible = false; renderer.setPixelRatio(1); resize();
    units.forEach((u) => u.mats.forEach((mt) => {
      if (mt.clearcoat) mt.clearcoat = 0;
      mt.needsUpdate = true;
    }));
    controls.autoRotate = false; root.classList.add("pj-lite"); poke(1);
  }
  let started = false;
  function loop(now) {
    if (!started || !visible || window.VH_CAPTURE) return;
    const dt = Math.min(0.5, (now - last) / 1000); last = now; update(dt);
    requestAnimationFrame(loop);
  }
  controls.autoRotate = !window.matchMedia("(prefers-reduced-motion: reduce)").matches && !window.VH_CAPTURE;
  if (/[?&]lite\b/.test(location.search)) goLite();
  fly("home", 0);
  root.classList.add("is-ready");
  // compile the shaders off the main thread where the browser allows it, then start drawing
  const go = () => { started = true; last = performance.now(); requestAnimationFrame((t) => { loop(t); root.classList.add("is-live"); }); };
  if (window.VH_CAPTURE) started = true;
  else if (renderer.compileAsync) renderer.compileAsync(scene, camera).then(go, go); else go();

  // for the video renderer: set a state and draw one frame on demand
  window.VHProjector = {
    set(s = {}) {
      if ("t" in s) st.t = st.tTo = s.t;
      if ("light" in s) { st.light = s.light; st.lightA = s.lightA ?? (s.light ? 1 : 0); }
      if ("step" in s) st.step = s.step;
      if ("sel" in s) { st.sel = s.sel; highlight(s.sel); }
      if ("labels" in s) st.labels = s.labels;
      if ("only" in s) st.only = s.only;
      if (s.cam) { camera.position.set(...s.cam[0]); controls.target.set(...s.cam[1]); }
      if ("flow" in s) flows.forEach((t) => { t.offset.y = -s.flow; });
      controls.autoRotate = false; renderer.shadowMap.needsUpdate = true; apply(); controls.update(); renderer.render(scene, camera);
      for (let i = 0; i < (s.settle ?? 30); i++) placeBalloons();
    },
    info: () => renderer.info.render, scene, views: VIEWS, explode, setLight, showStep, select, focusOn,
    // from the study below: explode the projector and light up a group of parts
    show(ns) {
      stopAuto(); if (st.light) setLight(false);
      if (st.tTo < 0.5) explode(true);
      st.sel = ns.slice(); highlight(st.sel); card.hidden = true;
      root.querySelectorAll(".pj-part").forEach((b) => b.classList.toggle("is-on", ns.includes(+b.dataset.n)));
    },
  };
}
