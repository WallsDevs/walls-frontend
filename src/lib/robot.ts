// @ts-nocheck
// WallsTeam companion robot — ported verbatim from walls-web's landing page (robot.js).
// Untyped on purpose: keeps the working Three.js scene identical to the shipped version.
import * as THREE from 'three';

const SHELL = { light: 0xe9f7fd, dark: 0x3a3637 };
const EDGE = { light: 0x231f20, dark: 0xe9f7fd };
// [yaw, headPitch, headYaw, headRoll, Lf, Lo, Lex, Lez, Rf, Ro, Rex, Rez, bob, bars]
const POSES = [
  [0,     0,     0,     0,    -0.15, 0.22, -0.35, 0,   -0.15, 0.22, -0.35, 0,   0.12, 0],
  [-0.55, 0.28, -0.1,   0,    -1.25, 0.12, -0.55, 0,   -1.05, 0.28, -0.75, 0,   0.05, 0],
  [0.55,  0.05,  0.25,  0,    -0.1,  0.2,  -0.3,  0,   -1.35, 0.85, -0.15, 0,   0.07, 0],
  [0.15, -0.08,  0.1,   0.14, -0.1,  0.2,  -0.3,  0,   -0.2,  1.1,   0,    2.6, 0.06, 1],
  [0.55,  0.02,  0.2,   0,    -0.1,  0.2,  -0.3,  0,   -0.55, 1.25, -0.2,  0,   0.08, 0],
  [0.4,   0.05,  0.3,   0,    -0.1,  0.2,  -0.3,  0,   -1.1,  0.75, -0.25, 0,   0.07, 0],
  [0.1,  -0.06,  0.05,  0,    -0.6,  0.55, -0.5,  0,   -0.6,  0.55, -0.5,  0,   0.1,  0],
  [0,     0.15,  0,     0,    -0.1,  0.2,  -0.3,  0,   -1.25, 0.45, -0.5,  0,   0.06, 0],
];
const LAST = POSES.length - 1;

export function createRobot(canvas, opts = {}) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: true });
  } catch (e) {
    const noop = () => {};
    return { setTarget: noop, setSection: noop, setGaze: noop, setExtras: noop, setShell: noop, dispose: noop };
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const CAM_D = 14;
  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
  camera.position.set(0, 0, CAM_D);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x231f20, 1.1));
  const key = new THREE.DirectionalLight(0xffffff, 2.4); key.position.set(-4, 7, 9); scene.add(key);
  const fill = new THREE.DirectionalLight(0xe9f7fd, 0.7); fill.position.set(5, -1, 6); scene.add(fill);
  const rim = new THREE.DirectionalLight(0x0147ff, 1.8); rim.position.set(4, 3, -7); scene.add(rim);

  const mShell = new THREE.MeshStandardMaterial({ color: SHELL.light, roughness: 0.55, metalness: 0.05 }); mShell.name = 'shell';
  const mJoint = new THREE.MeshStandardMaterial({ color: 0x231f20, roughness: 0.6, metalness: 0.25 }); mJoint.name = 'joint';
  const mVisor = new THREE.MeshStandardMaterial({ color: 0x171415, roughness: 0.3, metalness: 0.5 }); mVisor.name = 'visor';
  const mGlow = new THREE.MeshStandardMaterial({ color: 0x0147ff, emissive: 0x0147ff, emissiveIntensity: 1.4, roughness: 0.3 }); mGlow.name = 'glow';
  const mWhite = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 }); mWhite.name = 'plate';
  const mEdge = new THREE.LineBasicMaterial({ color: EDGE.light, transparent: true, opacity: 0.32 });

  const box = (w, h, d, mat, name, edges = true) => {
    const g = new THREE.BoxGeometry(w, h, d);
    const m = new THREE.Mesh(g, mat); m.name = name;
    if (edges) m.add(new THREE.LineSegments(new THREE.EdgesGeometry(g), mEdge));
    return m;
  };
  const cyl = (rt, rb, h, mat, name, seg = 28) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat); m.name = name; return m; };

  const root = new THREE.Group(); root.name = 'robot'; scene.add(root);
  const body = new THREE.Group(); body.name = 'body'; root.add(body);

  // torso
  const torso = box(1.7, 1.5, 1.05, mShell, 'torso'); body.add(torso);
  const belt = box(1.76, 0.16, 1.1, mJoint, 'belt'); belt.position.y = -0.72; body.add(belt);
  // chest: recessed raisin panel with a flush blue W mark, framed by two thin plates
  const panel = box(1.16, 0.86, 0.06, mJoint, 'chestPanel'); panel.position.set(0, 0.12, 0.53); body.add(panel);
  const badge = new THREE.Mesh(new THREE.PlaneGeometry(1.04, 0.74), new THREE.MeshBasicMaterial({ color: 0x231f20, transparent: true }));
  badge.name = 'badge'; badge.position.set(0, 0.12, 0.565); body.add(badge);
  const seamL = box(0.06, 0.86, 0.04, mShell, 'seamL'); seamL.position.set(-0.7, 0.12, 0.545); body.add(seamL);
  const seamR = seamL.clone(); seamR.name = 'seamR'; seamR.position.x = 0.7; body.add(seamR);
  const core = box(0.34, 0.06, 0.05, mGlow, 'core', false); core.position.set(0, -0.44, 0.545); body.add(core);
  const vent = box(0.9, 0.05, 0.04, mJoint, 'vent', false); vent.position.set(0, -0.6, 0.535); body.add(vent);

  // thruster
  const thr = cyl(0.55, 0.32, 0.45, mJoint, 'thruster'); thr.position.y = -0.98; body.add(thr);
  const ring = cyl(0.5, 0.5, 0.08, mGlow, 'ring'); ring.position.y = -1.22; body.add(ring);
  const cone = cyl(0.3, 0.14, 0.2, mJoint, 'cone'); cone.position.y = -1.34; body.add(cone);

  // head
  const neck = cyl(0.22, 0.22, 0.3, mJoint, 'neck'); neck.position.y = 0.9; body.add(neck);
  const head = new THREE.Group(); head.name = 'head'; head.position.y = 1.68; body.add(head);
  head.add(box(1.6, 1.15, 1.25, mShell, 'skull'));
  const visor = box(1.3, 0.52, 0.1, mVisor, 'visor'); visor.position.set(0, 0.05, 0.61); head.add(visor);
  const eyeL = box(0.22, 0.13, 0.03, mGlow, 'eyeL', false); eyeL.position.set(-0.3, 0.06, 0.675); head.add(eyeL);
  const eyeR = box(0.22, 0.13, 0.03, mGlow, 'eyeR', false); eyeR.position.set(0.3, 0.06, 0.675); head.add(eyeR);
  const barsArr = [];
  for (let i = 0; i < 5; i++) { const b = box(0.07, 0.34, 0.03, mGlow, 'bar' + i, false); b.position.set(-0.36 + i * 0.18, 0.05, 0.675); b.scale.y = 0.0001; head.add(b); barsArr.push(b); }
  const earL = box(0.12, 0.42, 0.42, mJoint, 'earL'); earL.position.x = -0.85; head.add(earL);
  const earR = earL.clone(); earR.name = 'earR'; earR.position.x = 0.85; head.add(earR);
  const ant = cyl(0.035, 0.035, 0.42, mJoint, 'antenna', 12); ant.position.set(0.5, 0.78, 0); head.add(ant);
  const tip = box(0.15, 0.15, 0.15, mGlow, 'antennaTip', false); tip.position.set(0.5, 1.04, 0); head.add(tip);

  // arms
  function arm(side) {
    const shoulder = new THREE.Group(); shoulder.position.set(side * 1.02, 0.55, 0);
    shoulder.add(box(0.34, 0.34, 0.34, mJoint, 'shoulder'));
    const upper = box(0.26, 0.8, 0.26, mShell, 'upperArm'); upper.position.y = -0.55; shoulder.add(upper);
    const elbow = new THREE.Group(); elbow.position.y = -0.98; shoulder.add(elbow);
    elbow.add(box(0.3, 0.3, 0.3, mJoint, 'elbow'));
    const fore = box(0.24, 0.72, 0.24, mShell, 'forearm'); fore.position.y = -0.5; elbow.add(fore);
    const hand = new THREE.Group(); hand.position.y = -0.95; elbow.add(hand);
    hand.add(box(0.3, 0.14, 0.28, mJoint, 'palm'));
    const f1 = box(0.08, 0.3, 0.2, mJoint, 'finger'); f1.position.set(-0.1, -0.2, 0); hand.add(f1);
    const f2 = f1.clone(); f2.position.x = 0.1; hand.add(f2);
    body.add(shoulder);
    return { shoulder, elbow };
  }
  const L = arm(-1), R = arm(1);

  // packet (kept for API compatibility; never shown)
  const packet = box(0.42, 0.42, 0.42, mGlow, 'packet', false); packet.position.set(0, -0.2, 1.45); packet.scale.setScalar(0.0001); packet.visible = false; body.add(packet);

  // soft shadow
  const sc = document.createElement('canvas'); sc.width = sc.height = 128;
  const cx = sc.getContext('2d'); const grd = cx.createRadialGradient(64, 64, 4, 64, 64, 64);
  grd.addColorStop(0, 'rgba(35,31,32,0.45)'); grd.addColorStop(1, 'rgba(35,31,32,0)'); cx.fillStyle = grd; cx.fillRect(0, 0, 128, 128);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.0), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sc), transparent: true, depthWrite: false }));
  shadow.name = 'shadow'; shadow.position.y = -2.15; root.add(shadow);

  if (opts.markUrl) {
    // Paint the brand mark big on the chest panel (raisin background, blue mark).
    const img = new Image();
    img.onload = () => {
      const out = document.createElement('canvas'); out.width = 1040; out.height = 740; const o = out.getContext('2d');
      o.fillStyle = '#231f20'; o.fillRect(0, 0, 1040, 740);
      const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
      const s = Math.min(900 / iw, 620 / ih), dw = iw * s, dh = ih * s;
      o.drawImage(img, (1040 - dw) / 2, (740 - dh) / 2, dw, dh);
      const tex = new THREE.CanvasTexture(out); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
      badge.material.map = tex; badge.material.color.setHex(0xffffff); badge.material.needsUpdate = true;
    };
    img.src = opts.markUrl;
  }

  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let W = 1, H = 1;
  function resize() {
    W = canvas.clientWidth || window.innerWidth; H = canvas.clientHeight || window.innerHeight;
    renderer.setSize(W, H, false); camera.aspect = W / H; camera.updateProjectionMatrix();
  }
  resize(); window.addEventListener('resize', resize);

  const S = { tx: W / 2, ty: H / 2, tsize: 320, x: W / 2, y: H / 2, size: 320, sec: 0, secCur: 0, gaze: null, gx: 0, gy: 0,
    build: 0, buildCur: 0, flowNode: 0, pointCur: 0, deliver: 0, deliverCur: 0, bars: 0, barsCur: 0, appear: 0, started: false };
  let raf = 0, last = performance.now(), time = 0, ticks = 0, timer = 0;

  function frame(now) {
    if (!timer) raf = requestAnimationFrame(frame);
    ticks++;
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now; time += dt;
    const kPos = 1 - Math.exp(-dt * 7.5), kSec = 1 - Math.exp(-dt * 4.5), kFast = 1 - Math.exp(-dt * 8);
    S.x += (S.tx - S.x) * kPos; S.y += (S.ty - S.y) * kPos; S.size += (S.tsize - S.size) * kPos;
    S.secCur += (S.sec - S.secCur) * kSec;
    S.buildCur += (S.build - S.buildCur) * kFast;
    S.pointCur += (S.flowNode / 4 - S.pointCur) * kSec;
    S.deliverCur += (S.deliver - S.deliverCur) * kFast;
    S.barsCur += (S.bars - S.barsCur) * kFast;
    if (S.started) S.appear += (1 - S.appear) * kFast;
    const gxT = S.gaze ? S.gaze.x : Math.sin(time * 0.6) * 0.5, gyT = S.gaze ? S.gaze.y : Math.sin(time * 0.43) * 0.25;
    S.gx += (gxT - S.gx) * kFast; S.gy += (gyT - S.gy) * kFast;

    const i0 = Math.max(0, Math.min(LAST, Math.floor(S.secCur))), i1 = Math.min(LAST, i0 + 1), f = Math.min(1, Math.max(0, S.secCur - i0));
    const P = POSES[i0].map((v, k) => v + (POSES[i1][k] - v) * f);
    let [yaw, hp, hy, hr, Lf, Lo, Lex, Lez, Rf, Ro, Rex, Rez, bob, bars] = P;
    // Listening pose only while the voice demo is on; otherwise the right arm 'types'.
    const wEar = Math.max(0, 1 - Math.abs(S.secCur - 3)) * (1 - S.barsCur);
    Rf = Rf * (1 - wEar) + (-0.95) * wEar; Ro = Ro * (1 - wEar) + 0.15 * wEar; Rex = Rex * (1 - wEar) + (-0.9) * wEar; Rez = Rez * (1 - wEar); hr *= (1 - wEar);
    bars *= S.barsCur;
    const wBuild = Math.max(0, 1 - Math.abs(S.secCur - 1));
    Rex += wBuild * S.buildCur * 0.35 * Math.sin(time * 5); Lf -= wBuild * 0.3 * S.buildCur; Lex += wBuild * S.buildCur * 0.25 * Math.sin(time * 4 + 1);
    const wFlow = Math.max(0, 1 - Math.abs(S.secCur - 2));
    Ro += wFlow * (S.pointCur - 0.5) * 0.7; hy += wFlow * (S.pointCur - 0.5) * 0.5;
    const d = 0;
    Lf = Lf * (1 - d) + (-1.3) * d; Rf = Rf * (1 - d) + (-1.3) * d; Lo *= (1 - d * 0.9); Ro *= (1 - d * 0.9); Lex = Lex * (1 - d) + (-0.6) * d; Rex = Rex * (1 - d) + (-0.6) * d; hp += d * 0.15;

    body.rotation.y = yaw;
    body.position.y = reduced ? 0 : Math.sin(time * 1.5) * bob;
    head.rotation.set(hp - S.gy * 0.25, hy + S.gx * 0.4, hr);
    eyeL.position.x = -0.3 + S.gx * 0.07; eyeR.position.x = 0.3 + S.gx * 0.07;
    eyeL.position.y = eyeR.position.y = 0.06 + S.gy * 0.05;
    const blink = (time % 3.9) < 0.11 ? 0.12 : 1;
    eyeL.scale.y = eyeR.scale.y = Math.max(0.0001, (1 - bars) * blink);
    for (let i = 0; i < 5; i++) barsArr[i].scale.y = Math.max(0.0001, bars * (0.25 + 0.75 * Math.abs(Math.sin(time * 7 + i * 1.3))));
    const sway = reduced ? 0 : 0.03;
    L.shoulder.rotation.set(Lf + Math.sin(time * 1.3) * sway, 0, -Lo); L.elbow.rotation.set(Lex, 0, -Lez);
    R.shoulder.rotation.set(Rf + Math.sin(time * 1.1 + 1) * sway, 0, Ro); R.elbow.rotation.set(Rex, 0, Rez);
    packet.scale.setScalar(Math.max(0.0001, d)); packet.rotation.y = time * 1.2; packet.rotation.x = time * 0.7; packet.position.y = -0.25 + Math.sin(time * 3) * 0.04;
    mGlow.emissiveIntensity = 1.1 + 0.45 * Math.sin(time * 3) + d * 0.8;
    shadow.material.opacity = 0.9 - (reduced ? 0 : Math.sin(time * 1.5) * bob * 1.5);

    const halfH = Math.tan(camera.fov * Math.PI / 360) * CAM_D, halfW = halfH * camera.aspect;
    const wx = (S.x / W * 2 - 1) * halfW, wy = (1 - S.y / H * 2) * halfH;
    const upp = (2 * halfH) / H;
    // Shrink while travelling between stops so the robot doesn't barge through content mid-flight.
    const travel = Math.min(1, Math.hypot(S.tx - S.x, S.ty - S.y) / (H * 0.5));
    const scl = Math.max(0.0001, (S.size * 0.9 * upp) / 4.4 * S.appear * (1 - 0.5 * travel));
    root.position.set(wx, wy - 0.45 * scl, 0); root.scale.setScalar(scl);
    renderer.render(scene, camera);
  }
  raf = requestAnimationFrame(frame);
  // Hidden/offscreen iframes never fire rAF; fall back to a timer so the scene still renders.
  const watchdog = setTimeout(() => { if (ticks === 0) { cancelAnimationFrame(raf); timer = setInterval(() => frame(performance.now()), 33); } }, 700);

  function setShell(name) {
    const n = SHELL[name] ? name : 'light';
    mShell.color.setHex(SHELL[n]); mEdge.color.setHex(EDGE[n]); mEdge.opacity = n === 'dark' ? 0.22 : 0.32;
  }
  setShell(opts.shell);

  return {
    setTarget(x, y, size) { S.tx = x; S.ty = y; S.tsize = size; if (!S.started) { S.started = true; S.x = x; S.y = y; S.size = size; } },
    setSection(i) { S.sec = Math.max(0, Math.min(LAST, i)); },
    setGaze(x, y) { S.gaze = (x == null) ? null : { x: Math.max(-1, Math.min(1, x)), y: Math.max(-1, Math.min(1, y)) }; },
    setExtras(o) { if (o.build != null) S.build = o.build; if (o.flowNode != null) S.flowNode = o.flowNode; if (o.deliver != null) S.deliver = o.deliver; if (o.bars != null) S.bars = o.bars; },
    setShell,
    debug() { return { S: { ...S }, scale: root.scale.x, pos: root.position.toArray(), W, H, time, drawCalls: renderer.info.render.calls, tris: renderer.info.render.triangles }; },
    dispose() { cancelAnimationFrame(raf); clearInterval(timer); clearTimeout(watchdog); window.removeEventListener('resize', resize); renderer.dispose(); },
  };
}
