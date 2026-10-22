// ───────────────────────────── cast ─────────────────────────────
const LIGHTS = {};
const T_END = 43.3;
let YOU, MOM, KID, GRAMPS, YOU2;
function buildAll() {
  buildHouse();
  const you = { skin: 0xc68a5e, shirt: '#2f6fb5', collar: '#25599a', pants: '#3a3f4a', hair: '#1c1410', hairStyle: 'short', wide: 1.05, belly: 0.4 };
  YOU = buildToon(Object.assign({ name: 'you', seed: 1 }, you));
  YOU2 = buildToon(Object.assign({ name: 'you2', seed: 5 }, you, { shirt: '#5a5a62', collar: '#4a4a52' }));   // later that night, alone, in a grey T-shirt
  MOM = buildToon({ name: 'mom', seed: 2, skin: 0xd6a07a, shirt: '#c9405a', pants: '#2c3550', hair: '#3a2214', hairStyle: 'long', head: 0.98 });
  KID = buildToon({ name: 'kid', seed: 3, s: 0.72, head: 1.25, skin: 0xc99068, shirt: '#f2b62a', pants: '#3a5a8a', hair: '#1a120c', hairStyle: 'spiky', shortSleeve: true });
  GRAMPS = buildToon({ name: 'gramps', seed: 4, skin: 0xb88660, shirt: '#e8e4d8', pants: '#5a4a3a', hair: '#cfcac0', hairStyle: 'bald', mustache: true, glasses: true, belly: 0.6, wide: 1.05 });
  buildAnatomy(YOU);
  // phones: mom's in her right hand, the kid's tablet
  const scr = (c1, c2) => canvasTex(128, 256, (c, w, h) => { const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, c1); gr.addColorStop(1, c2); c.fillStyle = gr; c.fillRect(0, 0, w, h); c.fillStyle = 'rgba(255,255,255,0.85)'; c.beginPath(); c.arc(w / 2, h * 0.45, 26, 0, 7); c.fill(); c.fillStyle = 'rgba(0,0,0,0.4)'; c.beginPath(); c.moveTo(w / 2 - 8, h * 0.45 - 12); c.lineTo(w / 2 + 14, h * 0.45); c.lineTo(w / 2 - 8, h * 0.45 + 12); c.fill(); });
  const phone = (T, w_, h_, tex) => { const g = new THREE.Group(); T.hands[1].root.add(g); g.position.set(-0.02 * T.s, -0.025 * T.s, 0.05 * T.s); g.rotation.set(-1.2, 0, 0);
    mesh(rbox(w_, h_, 0.008, 0.006), std(0x111114, 0.3), g, [0, 0, 0], [0, 0, 0], false); mesh(new THREE.PlaneGeometry(w_ * 0.9, h_ * 0.92), new THREE.MeshBasicMaterial({ map: tex, color: new THREE.Color(1.4, 1.4, 1.4) }), g, [0, 0, -0.0042], [0, Math.PI, 0], false); return g; };
  MOM.phone = phone(MOM, 0.072, 0.15, scr('#ff5a8a', '#5a3aff'));
  KID.phone = phone(KID, 0.16, 0.11, scr('#3affb0', '#2a6aff'));
  hudInit();
}

// ───────────────────────────── poses ─────────────────────────────
function seatPose(o = {}) {
  return P_(Object.assign({ pelvis: [-0.05, 0, 0], spine: [-0.05, 0, 0], chest: [-0.03, 0, 0], neck: [0.05, 0, 0], head: [0.05, 0, 0],
    hands: { 1: hand(V3(0.2, 0.28, -0.36), V3(0.6, -0.5, 0.4), V3(0, 1, 0), 0.4, V3(-0.15, -0.2, -1)), [-1]: hand(V3(-0.2, 0.28, -0.36), V3(-0.6, -0.5, 0.4), V3(0, 1, 0), 0.4, V3(0.15, -0.2, -1)) },
    feet: { 1: foot(V3(0.13, -0.42, -0.42), V3(0.2, 0.4, -1), V3(0.1, 0, -1)), [-1]: foot(V3(-0.13, -0.42, -0.4), V3(-0.2, 0.4, -1), V3(-0.1, 0, -1)) } }, o));
}
const neckHands = () => ({
  1: Object.assign(hand(V3(0.07, 0.03, -0.11), V3(1, -0.7, 0.1), V3(0.2, 0.3, -1), 0.75, V3(-1, 0.15, 0.25)), { bone: 'neck' }),
  [-1]: Object.assign(hand(V3(-0.07, 0.01, -0.11), V3(-1, -0.7, 0.1), V3(-0.2, 0.3, -1), 0.75, V3(1, 0.15, 0.25)), { bone: 'neck' }) });
function eatPose(k) {    // fork to the mouth (k = 0 plate … 1 mouth)
  const p = seatPose({ neck: [0.25 - 0.2 * k, 0, 0], head: [0.1, 0, 0] });
  p.hands[1] = hand(V3().lerpVectors(V3(0.12, 0.3, -0.38), V3(0.06, 0.66, -0.2), k), V3(0.8, -0.6, 0.2), V3(0.4, 1, 0), 0.8, V3().lerpVectors(V3(-0.2, -0.4, -1), V3(-0.6, 0.3, -0.6), k));
  return p;
}
function chokeSeatPose(shake = 0) {
  const p = seatPose({ spine: [-0.15, 0, 0], chest: [-0.05, shake * 0.05, 0], neck: [0.25, 0, 0], head: [-0.15, shake * 0.1, 0] });
  p.hands = neckHands(); return p;
}
function laughPose(k) {  // the flashback: head back, laughing with the mouth full
  return seatPose({ spine: [0.12 * k, 0, 0], neck: [0.3 * k, 0.1, 0], head: [0.3 * k, 0, 0],
    hands: { 1: hand(V3(0.18, 0.3, -0.36), V3(0.6, -0.5, 0.4), V3(0, 1, 0), 0.5, V3(-0.15, -0.2, -1)), [-1]: hand(V3(-0.12, 0.38, -0.18), V3(-0.6, -0.5, 0.4), V3(0, 1, 0), 0.5, V3(0.3, -0.2, -1)) } });
}
const STAND_Y = 0.8;
function standPose(o = {}) {
  return P_(Object.assign({ pelvis: [0.02, 0, 0], spine: [0.0, 0, 0], chest: [0, 0, 0], neck: [0.05, 0, 0], head: [0.05, 0, 0],
    hands: { 1: hand(V3(0.24, 0.07, 0.03), V3(0.3, 0, 1), V3(1, 0, 0.2), 0.35, V3(0, -1, -0.1)), [-1]: hand(V3(-0.24, 0.07, 0.03), V3(-0.3, 0, 1), V3(-1, 0, 0.2), 0.35, V3(0, -1, -0.1)) },
    feet: { 1: foot(V3(0.12, -0.72, 0), V3(0.1, 0, -1), V3(0.12, 0, -1)), [-1]: foot(V3(-0.12, -0.72, 0.04), V3(-0.1, 0, -1), V3(-0.12, 0, -1)) } }, o));
}
function panicStandPose(shake = 0, bend = 0.2) {
  const p = standPose({ spine: [-bend, shake * 0.06, 0], chest: [-0.08, 0, shake * 0.04], neck: [0.2, 0, 0], head: [-0.25, shake * 0.15, 0] });
  p.hands = neckHands(); p.feet[1].pos = V3(0.16, -0.72, -0.05); p.feet[-1].pos = V3(-0.15, -0.72, 0.1); return p;
}
function bentPose(bend, arms = 'neck') {  // receiving the manoeuvre: bent forward, arms at the neck or loose
  const p = standPose({ spine: [-bend, 0, 0], chest: [-bend * 0.5, 0, 0], neck: [0.2, 0, 0], head: [0.1, 0, 0] });
  if (arms === 'neck') p.hands = neckHands();
  else { p.hands[1] = hand(V3(0.28, 0.12, -0.12), V3(0.6, 0, 0.8), V3(1, 0, 0), 0.5, V3(0, -1, -0.3)); p.hands[-1] = hand(V3(-0.28, 0.12, -0.12), V3(-0.6, 0, 0.8), V3(-1, 0, 0), 0.5, V3(0, -1, -0.3)); }
  return p;
}
function phonePose(look = 1) {
  const p = seatPose({ neck: [0.35 * look, 0, 0], head: [0.25 * look, 0, 0] });
  p.hands[1] = hand(V3(0.06, 0.36, -0.3), V3(0.8, -0.6, 0.3), V3(0, 0.7, 0.7), 0.6, V3(-0.4, 0.4, -1));
  p.hands[-1] = hand(V3(-0.08, 0.34, -0.3), V3(-0.8, -0.6, 0.3), V3(0, 0.7, 0.7), 0.6, V3(0.4, 0.4, -1));
  return p;
}
// one toon's hands on another's body: a world point → this toon's local, in its own units
const handOn = (T, world, pole, up, curl, dir) => hand(T.g.worldToLocal(world.clone()).multiplyScalar(1 / T.s), pole, up, curl, dir);

// ───────────────────────────── time keys (from audio/palabras.json, take 2) ─────────────────────────────
const K = {
  pov: 1.1, water: 3.44, dive: 4.6, xin: 4.95, meat: 7.28, swallow: 8.88, epi: 10.48, flash: 12.37, cuela: 14.92, stuck: 16.2,
  noAir: 16.55, stand: 17.0, scream: 18.64, lungs: 19.58, salida: 22.0, hug: 23.91, fist: 25.2, push: 26.76, pop: 28.87, flyEnd: 31.3,
  rule: 32.15, blows: 35.04, comps: 36.48, repeat: 37.64, alone: 38.5, call: 39.6, chair: 40.92, pop2: 42.4, end: T_END,
};
const thrusts1 = [27.05, 27.75, 28.55], blows = [35.1, 35.35, 35.6, 35.85, 36.1], comps = [36.55, 36.78, 37.01, 37.24, 37.47], thrusts2 = [41.35, 41.85, 42.32];
const pulse = (t, list, d = 0.18) => { let v = 0; for (const a of list) { const u = (t - a) / d; if (u > -1 && u < 1.5) v = Math.max(v, u < 0 ? 1 + u : Math.max(0, 1 - u / 1.5)); } return v; };
const countBefore = (t, list) => list.filter(a => t >= a).length;

// ───────────────────────────── per-frame state ─────────────────────────────
const MOUTH = (T) => T.headG.localToWorld(V3(0, -0.057 * T.s, -0.12 * T.s));
function applyAll(t) {
  const s = { t, xray: 0, desat: 0, dark: 0, tint: [1, 1, 1] };
  const sh = Math.sin(t * 23) * 0.5 + Math.sin(t * 37) * 0.5;
  const kitchen = t >= K.alone;
  // lighting: the dining-room lamp; the kitchen alone at night for the ending
  const xd = clamp(win(t, K.xin - 0.15, K.xin + 0.1, 12.25, 12.37) + win(t, K.cuela - 0.1, K.cuela + 0.05, 17.3, 17.6) + win(t, K.lungs, K.lungs + 0.2, K.hug - 0.1, K.hug + 0.05) + win(t, K.pop - 0.05, K.pop, 29.3, 29.45));
  HOUSE.lamp.intensity = kitchen ? 0 : 9 * (1 - 0.8 * xd); HOUSE.fill.intensity = kitchen ? 0.18 : 1.1 * (1 - 0.85 * xd); HOUSE.kLight.intensity = kitchen ? 6 : 0; HOUSE.tvL.visible = xd < 0.5;
  HOUSE.tvM.color.setRGB(0.6 + 0.3 * Math.sin(t * 7), 0.8, 1.4); HOUSE.tvL.intensity = kitchen ? 0 : 2.5 + Math.sin(t * 9) * 0.8;
  HOUSE.hands[0].rotation.z = -1.2 - t * 0.02; HOUSE.hands[1].rotation.z = -3.4 - t * 0.002;
  for (const [T, seat] of [[YOU, 'you'], [MOM, 'mom'], [KID, 'kid'], [GRAMPS, 'gramps']]) { const p = HOUSE.seats[seat]; T.g.position.set(p.x, 0.5, p.z); T.g.rotation.set(0, Math.atan2(p.x, p.z), 0); }
  // ── you
  const xray = win(t, K.xin - 0.15, K.xin + 0.1, 12.25, 12.37) + win(t, K.cuela - 0.1, K.cuela + 0.05, 17.3, 17.6) + win(t, K.lungs, K.lungs + 0.2, K.hug - 0.1, K.hug + 0.05)
    + win(t, 26.5, 26.8, 28.75, 28.85) + win(t, K.pop - 0.05, K.pop, 29.3, 29.45);
  s.xray = clamp(xray);
  let P, F = FACE.choke;
  const flush = clamp(0.5 + t / 16 * 0.5), pale = ss(16.5, 23.5, t);
  YOU.g.visible = !kitchen;
  const neutral = { neck: [0, 0, 0], head: [0, 0, 0] };
  if (t < 0.32) { P = eatPose(ss(0, 0.25, t)); F = FACE.calm; }
  else if (t < K.pov) { P = mixPose(eatPose(1), chokeSeatPose(sh), ss(0.3, 0.75, t)); F = mixFace(FACE.calm, FACE.choke, ss(0.3, 0.6, t)); }
  else if (t < K.flash) P = s.xray > 0.5 ? seatPose(neutral) : chokeSeatPose(sh);
  else if (t < K.cuela) { const k = win(t, K.flash, K.flash + 0.3, 14.7, 14.92); P = laughPose(k); F = mixFace(FACE.calm, FACE.laugh, k); }
  else if (t < K.stand) P = s.xray > 0.5 ? seatPose(neutral) : chokeSeatPose(sh);
  else if (t < K.hug) {
    const k = ss(K.stand, K.stand + 0.45, t);
    YOU.g.position.y = lerp(0.5, STAND_Y, k); YOU.g.position.z += 0.12 * k;
    P = s.xray > 0.5 ? standPose(neutral) : mixPose(chokeSeatPose(sh), panicStandPose(sh * 1.5, 0.15), k); F = mixFace(FACE.choke, FACE.panic, ss(17.5, 18.6, t));
  } else if (t < K.rule) {
    YOU.g.position.set(0, STAND_Y, 0.9);
    const th = pulse(t, thrusts1, 0.12) + 1.2 * pulse(t, [K.pop], 0.15);
    P = s.xray > 0.5 ? standPose(Object.assign({ spine: [-0.2, 0, 0] }, neutral)) : bentPose(0.25 + 0.15 * th, t < K.pop + 0.4 ? 'neck' : 'loose');
    YOU.g.position.y += 0.03 * th; YOU.g.position.z -= 0.03 * th;
    F = t < K.pop ? FACE.panic : mixFace(FACE.shock, FACE.relief, ss(K.pop + 0.6, 31.5, t));
  } else {      // the rule, demonstrated: the universal sign, 5 back blows, 5 abdominal thrusts
    YOU.g.position.set(0, STAND_Y, 0.9);
    const th = pulse(t, comps, 0.08), bl = pulse(t, blows, 0.08);
    P = t < K.blows ? panicStandPose(sh * 0.6, 0.15) : bentPose((t < K.comps ? 0.55 : 0.25) + 0.12 * th + 0.05 * bl, t < K.comps ? 'loose' : 'neck');
    YOU.g.position.y += 0.025 * th; F = mixFace(FACE.choke, FACE.panic, 0.5);
  }
  poseToon(YOU, P);
  const rel = 1 - ss(K.pop, 31.5, t), demo = t > K.rule ? 0.5 : 1;
  faceToon(YOU, Object.assign({}, F, { flush: (t < K.flash || t > K.cuela) ? flush * (t > K.rule ? 0.6 : rel) : 0.1, pale: pale * (t > K.rule ? 0.4 : rel) * demo }));
  xrayToon(YOU, s.xray);
  // the chair goes over when you stand
  { const c = HOUSE.chairs.you, k = ss(K.stand + 0.1, K.stand + 0.55, t); c.position.set(0, 0.04 * Math.sin(k * Math.PI), 0.78 + 0.25 * k); c.rotation.set(-1.45 * k * k, 0, 0); }
  // the fork: in your hand, then dropped
  { const f = HOUSE.fork;
    if (t < 0.42) { f.matrixAutoUpdate = false; f.matrix.copy(YOU.g.matrixWorld).multiply(YOU.hands[1].root.matrix).multiply(new THREE.Matrix4().makeTranslation(0, -0.02, 0.06)); f.matrixWorldNeedsUpdate = true; }
    else { f.matrixAutoUpdate = true; const u = clamp((t - 0.42) / 0.35); f.position.set(0.08 + 0.05 * u, Math.max(HOUSE.table.y + 0.01, 1.02 - 1.6 * u * u), 0.5 - 0.1 * u); f.rotation.set(1.2 * (1 - ss(0.6, 1, u)), 0.3, 0.4 * u); } }
  // ── mom: laughing at her phone, slides you her glass without looking, notices, comes behind you
  {
    let P2 = phonePose(), F2 = FACE.phone;
    const glass = HOUSE.glass_mom; HOUSE.glassMom0 = HOUSE.glassMom0 || glass.position.clone();
    const g0 = HOUSE.glassMom0, g1 = V3(-0.12, g0.y, 0.42);
    glass.position.lerpVectors(g0, g1, ss(3.6, 4.35, t));
    if (t > 3.5 && t < 4.6) P2.hands[-1] = handOn(MOM, glass.position.clone().add(V3(0, 0.06, 0)), V3(-0.6, -0.5, 0.4), V3(0, 1, 0), 0.6, V3(1, 0, 0));
    if (t > K.flash && t < K.cuela) { P2 = phonePose(0.3); F2 = FACE.laugh; P2.hands[1] = hand(V3(0.18, 0.4, -0.45), V3(0.8, -0.5, 0.2), V3(1, 0.3, 0), 0.6, V3(0.3, 0.6, -1)); }
    if (t > 18.7 && t < K.hug) { F2 = FACE.shock; P2 = seatPose({ neck: [0, -0.4, 0], head: [0, -0.3, 0] }); }
    MOM.phone.visible = t < 18.7;
    if (t >= K.hug) {
      const demoSide = t >= K.blows && t < K.comps;
      MOM.g.position.copy(YOU.g.localToWorld(demoSide ? V3(-0.42, 0, 0.22) : V3(0, 0, 0.36))); MOM.g.position.y = STAND_Y; MOM.g.rotation.set(0, demoSide ? -0.6 : 0, 0);
      MOM.g.updateMatrixWorld(true);
      const belly = (dx, push) => YOU.spine.localToWorld(V3(dx, 0.05 + 0.05 * push, -0.15 + 0.06 * push));
      const th = t < K.rule ? pulse(t, [...thrusts1, K.pop], 0.12) : pulse(t, comps, 0.08);
      P2 = standPose({ spine: [-0.25, 0, 0], chest: [-0.1, 0, 0], neck: [0.15, 0, 0], head: [0.05, 0.2, 0] });
      if (!demoSide && (t < K.pop + 0.8 || t >= K.comps)) {
        P2.hands[1] = handOn(MOM, belly(0.02, th), V3(0.9, -0.3, 0.3), V3(0, 1, 0.3), 1, V3(-1, 0.2, -0.3));
        P2.hands[-1] = handOn(MOM, belly(-0.02, th), V3(-0.9, -0.3, 0.3), V3(0, 1, 0.3), 0.9, V3(1, 0.2, -0.3));
      } else if (demoSide) {
        const lift = 1 - pulse(t, blows, 0.08);
        P2.hands[1] = handOn(MOM, YOU.chest.localToWorld(V3(0, 0.12, 0.16 + 0.12 * lift)), V3(0.6, -0.2, 0.8), V3(0, 0, 1), 0.2, V3(0, -0.3, -1));
        P2.hands[-1] = handOn(MOM, YOU.chest.localToWorld(V3(0, 0.05, -0.2)), V3(-0.6, -0.5, 0.4), V3(0, 1, 0), 0.6, V3(1, 0, 0));
      }
      F2 = t < K.pop + 0.6 ? FACE.focus : t < K.rule ? FACE.relief : FACE.focus;
    }
    poseToon(MOM, P2); faceToon(MOM, F2); MOM.g.visible = !kitchen;
  }
  // ── the kid on the tablet; notices late
  { const look = t <= 18.9; poseToon(KID, look ? phonePose() : seatPose({ neck: [0, 0.2, 0] })); faceToon(KID, look ? FACE.phone : (t > K.pop + 0.8 ? FACE.laugh : FACE.shock)); KID.phone.visible = look; KID.g.visible = !kitchen; }
  // ── grandpa watches TV; the meat lands in his glass; he turns
  { const turn = ss(31.4, 31.9, t); poseToon(GRAMPS, seatPose({ neck: [0, lerp(-0.9, 0.0, turn), 0], head: [lerp(-0.05, 0.15, turn), lerp(-0.4, 0.1, turn), 0] })); faceToon(GRAMPS, t > 31.5 ? mixFace(FACE.shock, FACE.laugh, ss(32.6, 33.5, t)) : FACE.laugh); GRAMPS.g.visible = !kitchen; }
  animateAnatomy(t, s);
  // the meat flies out and into grandpa's glass (slow motion)
  if (t >= K.pop + 0.45 && t < K.alone) {
    ANAT.meat.position.copy(meatFly(t)); ANAT.meat.rotation.set(t * 6, t * 4, 0); ANAT.meat.visible = true; ANAT.meat.scale.setScalar(1.6);
  }
  airTrail(t);
  splash(t);
  kitchenScene(t, sh);
  s.desat = 0.55 * ss(17.2, 19.3, t) * (1 - ss(K.lungs, K.lungs + 0.3, t)) + 0.45 * win(t, K.flash, K.flash + 0.15, K.cuela - 0.1, K.cuela) + 0.6 * win(t, K.rule, K.rule + 0.2, K.alone - 0.1, K.alone);
  s.dark = 0.6 * ss(16.6, 19.4, t) * (1 - ss(K.lungs, K.lungs + 0.4, t)) + 0.35 * win(t, 38.6, 38.8, K.pop2, K.pop2 + 0.4);
  s.tint = t > K.flash && t < K.cuela ? [1.08, 1.0, 0.85] : [1, 1, 1];
  scene.updateMatrixWorld(true);
  return s;
}
// the splash in grandpa's glass
// the meat's flight path: mouth → arc → grandpa's glass
function meatFly(t) {
  const u = clamp((t - (K.pop + 0.45)) / (K.flyEnd - K.pop - 0.45)), b = HOUSE.glass_gramps.position.clone().add(V3(0, 0.07, 0)), e = 1 - Math.pow(1 - u, 1.6);
  const p = V3().lerpVectors(MOUTH(YOU), b, e); p.y += 0.35 * Math.sin(Math.PI * e);
  if (u >= 1) p.y = b.y - 0.03;
  return p;
}
// the burst of air that shoots the meat out: blue streak puffs along its path, fading
const TRAIL = [];
function airTrail(t) {
  if (!TRAIL.length) for (let i = 0; i < 14; i++) TRAIL.push(mesh(new THREE.SphereGeometry(0.022, 10, 8), new THREE.MeshBasicMaterial({ color: 0xbfe6ff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }), scene, [0, 0, 0], [0, 0, 0], false));
  const a = t - (K.pop + 0.45), on = a > 0 && t < K.flyEnd - 0.2;
  TRAIL.forEach((m, i) => {
    const tt = t - 0.035 * (i + 1); m.visible = on && tt > K.pop + 0.45;
    if (!m.visible) return;
    m.position.copy(meatFly(tt)).add(V3(nz2(tt, i) * 0.02, nz2(tt, i + 5) * 0.02, nz2(tt, i + 9) * 0.02));
    m.scale.setScalar(0.45 + i * 0.1); m.material.opacity = 0.4 * (1 - i / 14) * (1 - ss(0.6, 1.8, a));
  });
}
const SPL = [];
function splash(t) {
  if (!SPL.length) for (let i = 0; i < 18; i++) { const m = mesh(new THREE.SphereGeometry(0.008, 8, 6), new THREE.MeshPhysicalMaterial({ color: 0x9a1030, roughness: 0.05, transparent: true, opacity: 0.9 }), scene, [0, 0, 0], [0, 0, 0], false); m.userData.v = V3(Math.cos(i * 2.4) * (0.4 + (i % 3) * 0.2), 1.2 + (i % 4) * 0.3, Math.sin(i * 2.4) * (0.4 + (i % 3) * 0.2)); SPL.push(m); }
  const a = t - K.flyEnd, base = HOUSE.glass_gramps.position.clone().add(V3(0, 0.09, 0));
  SPL.forEach(m => { m.visible = a > 0 && a < 0.6; if (m.visible) m.position.copy(base).addScaledVector(m.userData.v, a * 0.6).add(V3(0, -4.9 * (a * 0.6) ** 2, 0)); });
}
function animateAnatomy(t, s) {
  const s_ = YOU.s, A = ANAT;
  // the epiglottis: open (breathing), closes for the swallow, wide open while laughing
  A.epiHinge.rotation.x = lerp(0.35, -1.25, win(t, 9.3, 9.6, 11.9, 12.2)) + 0.25 * win(t, K.cuela, K.cuela + 0.1, 15.6, 16.0);
  // water: drops down the oesophagus (5.3–7.2)
  A.water.forEach((m, i) => { const p = (t - 5.25) / 1.6 - i * 0.045; m.visible = p > 0 && p < 1 && t < 7.4; if (m.visible) A.eso.userData.curve.getPointAt(p, m.position); });
  // a normal swallow (the rewind): the bite goes into the oesophagus while the lid is shut
  { const p = (t - 9.4) / 2.6; A.bite.visible = p > 0 && p < 1 && t < 12.3;
    if (A.bite.visible) { if (p < 0.35) A.pharynx.userData.curve.getPointAt(p / 0.35, A.bite.position); else A.eso.userData.curve.getPointAt((p - 0.35) / 0.65 * 0.9, A.bite.position); } }
  // the meat: in the windpipe; slipping in; blasted out
  const stuckAt = V3(0, 0.215 * s_, -0.035 * s_), topAt = V3(0, 0.3 * s_, -0.03 * s_);
  if (t < K.pop + 0.45) {
    let lp = stuckAt.clone(), vis = t > 4.7;
    if (t > 8.8 && t < K.cuela) vis = false;                                   // the rewind shows an empty windpipe
    else if (t >= K.cuela && t < K.stuck) { const u = ss(K.cuela + 0.3, K.stuck, t); A.pharynx.userData.curve.getPointAt(Math.min(0.999, 0.5 + 0.5 * u), lp); lp.lerp(stuckAt, ss(0.5, 1, u)); }
    else if (t >= K.pop && t < K.pop + 0.25) lp.lerpVectors(stuckAt, topAt, clamp((t - K.pop) / 0.25));
    else if (t >= K.pop + 0.25) A.pharynx.userData.curve.getPointAt(1 - clamp((t - K.pop - 0.25) / 0.2) * 0.999, lp);
    A.meat.position.copy(YOU.chest.localToWorld(lp)); A.meat.visible = vis; A.meat.rotation.set(0, 0, 0); A.meat.scale.setScalar(1);
  }
  A.meatM.emissiveIntensity = 0.4 + 0.8 * (0.5 + 0.5 * Math.sin(t * 9)) * win(t, 7.2, 7.4, 8.6, 8.8) + 1.2 * win(t, K.stuck, K.stuck + 0.05, 16.6, 17.0);
  A.traM.emissive.setRGB(lerp(0.6, 1.0, ss(K.stuck, 17, t)) * 0.2, 0.15 * (1 - ss(K.stuck, 17, t)), 0.25 * (1 - ss(K.stuck, 17, t)));
  // air: bouncing off the meat (16.5–17.5); trapped in the lungs (19.6–23.8); the blast (26.6 → pop)
  A.air.forEach((m, i) => {
    const ph = (i * 0.137) % 1; let vis = false;
    if (t > K.noAir && t < 17.5) { const p = ((t - K.noAir) * 1.6 + ph) % 1; m.position.set(Math.sin(i * 7.1) * 0.008 * s_, lerp(0.07, 0.2, p < 0.7 ? p / 0.7 : 1 - (p - 0.7) / 0.3) * s_, -0.034 * s_); vis = true; }
    if (t > K.lungs && t < K.hug + 0.2) { const sd = i % 2 ? 1 : -1, a = t * (1.5 + (i % 5) * 0.3) + i; m.position.set((sd * 0.078 + Math.cos(a) * 0.035) * s_, Math.sin(a * 1.3) * 0.08 * s_, (Math.sin(a) * 0.03 - 0.005) * s_); vis = true;
      if (t > K.salida) { const p = clamp((t - K.salida) * 0.9 - ph * 0.5); if (p > 0) m.position.lerp(V3(0, (0.07 + 0.13 * p) * s_, -0.034 * s_), ss(0, 0.4, p)); } }
    if (t > 26.6 && t < K.pop + 0.5) { const p = clamp((t - (t < K.pop ? 26.6 : K.pop)) * (t < K.pop ? 0.5 : 3) + ph * 0.3); m.position.set(Math.sin(i * 3.1) * 0.01 * s_, lerp(0.02, 0.26, p) * s_, -0.034 * s_); vis = true; }
    m.visible = vis && s.xray > 0.05; setGlow(m.material, t > K.pop ? 6 : 3);
  });
  // the lungs glow (the reserve), are squeezed by the thrusts; the diaphragm pushes up; the heart races
  const th = pulse(t, [...thrusts1, K.pop], 0.12), glow = win(t, K.lungs, K.lungs + 0.5, 29.4, 30);
  A.lungs.forEach(l => l.scale.copy(l.userData.base).multiplyScalar(1 - 0.12 * th));
  A.airGlow.forEach(a => { a.scale.copy(a.userData.base).multiplyScalar((0.9 + 0.1 * Math.sin(t * 5)) * (1 - 0.3 * th)); setGlow(a.material, 0.5 + 2.5 * glow); });
  A.dia.position.y = A.diaY + 0.05 * s_ * th;
  A.heart.scale.set(1, 1.2, 0.9).multiplyScalar(1 + 0.08 * Math.max(0, Math.sin(t * (t > 16.5 && t < K.pop ? 14 : 8))));
}
// ── the kitchen, later that night: alone, the phone, the chair
const RELIEF_END = { brow: 0, browUp: 0.55, eyeOpen: 0.55, pupil: 1, mouthOpen: 0.35, smile: 1, flush: 0.35, pale: 0, lookX: 0, lookY: 0.1 };
function kitchenScene(t, sh) {
  const on = t >= K.alone; YOU2.g.visible = on; HOUSE.phone.visible = on && t >= K.call - 0.1;
  if (!on) { YOU2.g.position.set(0, -10, 0); return; }
  HOUSE.kchair.position.set(0.1, 0, -0.6); HOUSE.kchair.rotation.set(0, 0, 0);
  const cw = HOUSE.kitchen.localToWorld(V3(0.1, 0, -0.6));
  YOU2.g.position.set(cw.x, STAND_Y, cw.z + 0.42); YOU2.g.rotation.set(0, 0, 0);
  const th = pulse(t, thrusts2, 0.1);
  let P;
  if (t < K.call) P = panicStandPose(sh, 0.15);
  else if (t < K.chair) { P = panicStandPose(sh * 0.5, 0.15); P.hands[1] = Object.assign(hand(V3(0.15, 0.1, 0.0), V3(1, -0.8, 0.4), V3(1, 0, 0), 0.7, V3(0, 1, -0.3)), { bone: 'head' }); }
  else {
    const lean = ss(K.chair, K.chair + 0.35, t);
    YOU2.g.position.z -= 0.12 * lean + 0.05 * th; YOU2.g.position.y -= 0.04 * th;
    P = bentPose((lean * 0.55 + 0.12 * th) * (1 - 0.6 * ss(K.pop2 + 0.25, K.pop2 + 0.8, t)), t < K.pop2 ? 'neck' : 'loose');
    if (t < K.pop2) P.hands = { 1: hand(V3(0.2, 0.15, -0.35), V3(0.6, 0, 0.8), V3(0, 1, 0), 0.9, V3(0, -0.6, -1)), [-1]: hand(V3(-0.2, 0.15, -0.35), V3(-0.6, 0, 0.8), V3(0, 1, 0), 0.9, V3(0, -0.6, -1)) };
  }
  poseToon(YOU2, P);
  faceToon(YOU2, t < K.pop2 + 0.15 ? Object.assign({}, FACE.panic, { pale: 0.5, flush: 0.5 }) : mixFace(FACE.shock, RELIEF_END, ss(K.pop2 + 0.15, 42.85, t)));
  if (t < K.chair) { HOUSE.phone.matrixAutoUpdate = false; HOUSE.phone.matrix.copy(HOUSE.kitchen.matrixWorld).invert().multiply(YOU2.g.matrixWorld).multiply(YOU2.hands[1].root.matrix).multiply(new THREE.Matrix4().makeRotationY(Math.PI / 2).setPosition(-0.03, 0, 0.05)); HOUSE.phone.matrixWorldNeedsUpdate = true; }
  else { HOUSE.phone.matrixAutoUpdate = true; HOUSE.phone.position.set(0.25, 0.47, -0.62); HOUSE.phone.rotation.set(-Math.PI / 2, 0, 0.4); }
  if (t >= K.pop2) { const u = clamp((t - K.pop2) / 0.6); ANAT.meat.position.copy(MOUTH(YOU2)).add(V3(0, 0.35 * u - 1.3 * u * u, -0.8 * u)); ANAT.meat.visible = u < 1; ANAT.meat.scale.setScalar(2.2); ANAT.meat.rotation.set(t * 7, t * 3, 0); }
  else ANAT.meat.visible = false;
}

// ───────────────────────────── camera: one drone, few cuts ─────────────────────────────
const nz2 = (t, k) => Math.sin(t * 1.7 + k) * 0.5 + Math.sin(t * 3.1 + k * 2.3) * 0.3 + Math.sin(t * 5.3 + k * 0.7) * 0.2;
const drift = (t, a) => V3(nz2(t, 1), nz2(t, 2), nz2(t, 3)).multiplyScalar(a);
const YW = (v) => YOU.g.localToWorld(V3(...v));
const CH = (v) => YOU.chest.localToWorld(V3(...v).multiplyScalar(YOU.s));
const HD = (v) => YOU.headG.localToWorld(V3(...v));
const Y2 = (v) => YOU2.g.localToWorld(V3(...v));
const C = (pos, tgt, fov, extra = {}) => Object.assign({ pos, tgt, fov, coc: 6, roll: 0 }, extra);
// a camera move through keys ([time, pos fn, target fn]); each segment eased
function path(t, keys) {
  let i = 0; while (i < keys.length - 2 && t > keys[i + 1][0]) i++;
  const [ta, pa, qa] = keys[i], [tb, pb, qb] = keys[i + 1], u = sm(ta, tb, t);
  return [V3().lerpVectors(pa(), pb(), u), V3().lerpVectors(qa(), qb(), u)];
}
// anchors that work whether you sit or stand: chest (CH), head (HD), a point on the floor under you (FL)
const FL = (v) => { const p = YOU.g.localToWorld(V3()); p.y = 0; return p.add(V3(...v)); };
const SHOTS = [
  // 1. POV: your plate, your hands go to your throat — then the drone rips out of your head and circles the table
  { t1: K.water, f: (t) => {
      if (t < K.pov) return C(HD([0, 0.0, -0.13]).add(drift(t * 3, 0.006)), YW([0.02, 0.26 - 0.06 * ss(0.3, 0.9, t), -0.62]), 76, { pov: true, coc: 3, focus: 0.55 });
      const [p, q] = path(t, [[K.pov, () => HD([0, 0.0, -0.13]), () => YW([0, 0.3, -0.6])], [1.6, () => FL([0.55, 1.75, 1.2]), () => HD([0, -0.15, -0.2])], [2.45, () => V3(0.6, 2.25, -1.25), () => V3(0, 0.85, 0.25)], [K.water, () => HD([0.36, -0.02, -0.62]), () => HD([0, -0.03, 0])]]);
      return C(p.add(drift(t, 0.02)), q, 48, { coc: 5, roll: 0.1 * Math.sin(t * 2), pov: t < K.pov + 0.08 }); } },
  // 2. "Tomar agua…": the glass slides in; the drone pushes into the mouth and dives into the throat (X-ray)
  { t1: 8.75, f: (t) => {
      const [p, q] = path(t, [[K.water, () => HD([0.36, -0.02, -0.62]), () => HD([0, -0.03, 0])], [4.4, () => HD([0.12, -0.04, -0.4]), () => HD([0, -0.055, -0.1])], [K.xin, () => HD([0.01, -0.055, -0.16]), () => CH([0, 0.33, -0.05])],
        [6.2, () => CH([-0.42, 0.3, -0.42]), () => CH([0, 0.2, -0.01])], [K.meat, () => CH([-0.36, 0.25, -0.38]), () => CH([0, 0.21, -0.02])], [8.75, () => CH([-0.26, 0.24, -0.28]), () => CH([0, 0.215, -0.035])]]);
      return C(p.add(drift(t, 0.003)), q, t < K.xin ? 44 : 40, { coc: t < K.xin ? 7 : 6, near: 0.005 }); } },
  // 3. "Cuando tragas…": orbit the larynx, the lid closes over the windpipe (a rewind)
  { t1: K.flash, f: (t) => { const a = lerp(-1.25, -0.45, (t - 8.75) / (K.flash - 8.75)); return C(CH([Math.sin(a) * 0.4, 0.3, -Math.cos(a) * 0.4 - 0.02]), CH([0, 0.25, -0.025]), 38, { coc: 6, near: 0.005 }); } },
  // 4. flashback: laughing with the mouth full (warm, desaturated)
  { t1: K.cuela, f: (t) => { const [p, q] = path(t, [[K.flash, () => HD([-0.55, 0.05, -0.75]), () => HD([-0.1, -0.1, 0])], [K.cuela, () => HD([-0.22, 0.0, -0.5]), () => HD([0, -0.04, 0])]]); return C(p, q, 42, { coc: 5 }); } },
  // 5. "…y el pedazo se cuela" → "No entra aire": back in the throat, then out to the panic, the chair goes over
  { t1: K.lungs, f: (t) => {
      if (t < 17.45) { const a = lerp(-0.55, -1.05, (t - K.cuela) / 2.5); return C(CH([Math.sin(a) * 0.4, 0.29 - 0.04 * ss(16.4, 17.4, t), -Math.cos(a) * 0.4 - 0.02]), CH([0, 0.235, -0.03]), 38, { coc: 6, near: 0.005 }); }
      const [p, q] = path(t, [[17.45, () => CH([0.5, 0.3, -0.85]), () => CH([0, 0.25, 0])], [18.6, () => HD([0.9, 0.15, -1.1]), () => HD([0, -0.15, 0])], [K.lungs, () => HD([0.42, -0.05, -0.75]), () => HD([0, -0.06, 0])]]);
      return C(p.add(drift(t * 2, 0.025)), q, 46, { coc: 5, roll: 0.15 * Math.sin(t * 3) }); } },
  // 6. "Pero en tus pulmones…": into the chest; the trapped air; the way out runs up the windpipe
  { t1: K.hug, f: (t) => { const [p, q] = path(t, [[K.lungs, () => HD([0.42, -0.05, -0.75]), () => CH([0, 0.05, 0])], [20.3, () => CH([0.08, 0.05, -0.5]), () => CH([0, 0.02, 0])], [K.salida, () => CH([-0.05, 0.0, -0.46]), () => CH([0, 0.0, 0])], [K.hug, () => CH([-0.12, 0.25, -0.36]), () => CH([0, 0.2, -0.03])]]);
      return C(p.add(drift(t, 0.004)), q, 40, { coc: 6, near: 0.005 }); } },
  // 7. the manoeuvre: out of the chest, mom behind you, the fist above the navel, in and up; the meat flies into grandpa's glass
  { t1: K.rule, f: (t) => {
      if (t < K.pop) { const [p, q] = path(t, [[K.hug, () => FL([-1.7, 1.65, -1.55]), () => FL([0, 1.05, 0.2])], [K.fist, () => FL([-1.0, 1.3, -0.8]), () => FL([0, 1.05, 0.15])], [K.push, () => FL([-1.2, 1.3, -1.05]), () => FL([0, 1.0, 0.05])], [K.pop, () => FL([-1.4, 1.5, -1.3]), () => FL([0, 1.1, 0.05])]]);
        return C(p.add(drift(t, 0.01)), q, 46, { coc: 6 }); }
      if (t < K.pop + 0.45) return C(CH([-0.3, 0.27, -0.24]), CH([0, 0.27, -0.03]), 38, { coc: 6, near: 0.005 });
      const m = ANAT.meat.position, u = ss(K.pop + 0.45, K.flyEnd, t);
      return C(V3().lerpVectors(FL([-0.95, 1.2, -1.05]), V3(0.2, 1.3, -0.8), u), m.clone(), 36, { coc: 4, focus: 1.0 }); } },
  // 8. the rule: the family scene, instructional
  { t1: K.alone, f: (t) => { const a = lerp(0.6, -0.55, (t - K.rule) / (K.alone - K.rule)); return C(FL([Math.sin(a) * 1.8, 1.6, -Math.cos(a) * 1.7]), FL([0, 1.1, 0.15]), 56, { coc: 3 }); } },
  // 9. alone in the kitchen: through the doorway, the phone, the chair
  { t1: 99, f: (t) => { const k2 = (v) => { const p = YOU2.g.localToWorld(V3()); p.y = 0; return p.add(V3(...v)); };
      const [p, q] = path(t, [[K.alone, () => k2([-0.9, 1.7, -1.1]), () => k2([0, 1.3, -0.2])], [K.call, () => k2([0.75, 1.5, -0.95]), () => k2([0.05, 1.4, -0.1])], [K.chair - 0.2, () => k2([0.6, 1.55, -0.8]), () => k2([0.08, 1.45, -0.05])], [K.pop2, () => k2([1.0, 1.35, -1.15]), () => k2([0, 1.0, -0.3])], [K.end, () => k2([0.35, 1.6, -0.75]), () => k2([0, 1.5, -0.2])]]);
      return C(p.add(drift(t, 0.01)), q, 48, { coc: 4 }); } },
];
SHOTS.forEach((s, i) => s.t0 = i ? SHOTS[i - 1].t1 : -1);
const shotAt = (t) => SHOTS.findIndex(s => t < s.t1);
let CAM_OVERRIDE = null;
function cameraAt(t, s, si) {
  const c = SHOTS[si].f(t);
  if (typeof c.focus !== 'number') c.focus = c.pos.distanceTo(c.tgt);
  return c;
}
function onCamera(t, s, cam) {
  YOU.headG.visible = !cam.pov; YOU.torso.mesh.visible = !cam.pov;
  camera.near = cam.near ?? 0.03; camera.updateProjectionMatrix();
  POST.desat = s.desat; POST.dark = s.dark; POST.tint = s.tint;
  drawHud(t, s);
}

// ───────────────────────────── HUD: labels on the anatomy, the rule cards ─────────────────────────────
const POST = { desat: 0, dark: 0, tint: [1, 1, 1] };
const HUD = {};
function hudInit() {
  HUD.cv = document.createElement('canvas'); HUD.cv.width = 1080; HUD.cv.height = 1920; HUD.c = HUD.cv.getContext('2d');
  HUD.tex = new THREE.CanvasTexture(HUD.cv); HUD.tex.colorSpace = THREE.NoColorSpace;
}
function label(c, text, world, color, k) {
  if (k <= 0.01) return;
  const p = world.clone().project(camera); if (p.z > 1) return;
  const x = (p.x * 0.5 + 0.5) * 1080, y = (1 - (p.y * 0.5 + 0.5)) * 1920;
  c.globalAlpha = Math.min(1, k); c.font = '800 52px Inter, "Helvetica Neue", Arial, sans-serif'; c.textAlign = 'left';
  const lx = Math.min(x + 70, 1080 - c.measureText(text).width - 40), ly = y - 60, w = c.measureText(text).width;
  c.strokeStyle = color; c.lineWidth = 5; c.beginPath(); c.moveTo(x, y); c.lineTo(lx - 10, ly + 10); c.stroke();
  c.fillStyle = color; c.beginPath(); c.arc(x, y, 9, 0, 7); c.fill();
  c.fillStyle = 'rgba(10,12,16,0.78)'; c.fillRect(lx - 14, ly - 46, w + 28, 64);
  c.fillStyle = color; c.fillText(text, lx, ly); c.globalAlpha = 1;
}
function card(c, parts, k, y = 300) {   // parts: [[text, colour], ...] on one line, top of frame
  if (k <= 0.01) return;
  c.globalAlpha = Math.min(1, k); c.font = '900 70px Inter, "Helvetica Neue", Arial, sans-serif'; c.textAlign = 'left';
  const w = parts.reduce((a, [tx]) => a + c.measureText(tx).width, 0), sc = Math.min(1, 980 / (w + 68)) * (0.9 + 0.1 * k);
  c.save(); c.translate(540, y); c.scale(sc, sc); c.translate(-540, -y);
  let x = 540 - w / 2;
  c.fillStyle = 'rgba(10,12,16,0.82)'; c.fillRect(x - 34, y - 70, w + 68, 100);
  for (const [tx, col] of parts) { c.fillStyle = col; c.fillText(tx, x, y); x += c.measureText(tx).width; }
  c.restore(); c.globalAlpha = 1;
}
function drawHud(t, s) {
  const c = HUD.c; c.clearRect(0, 0, 1080, 1920);
  const X = s.xray, Y = '#ffd84a', B = '#6ac8ff', G = '#5aff8a', R = '#ff5a4a', Wt = '#ffffff';
  label(c, 'ESÓFAGO', CH([0, 0.16, 0.005]), '#ffb0b0', X * win(t, 5.3, 5.5, 7.1, 7.3));
  label(c, 'TRÁQUEA', CH([0, 0.17, -0.05]), B, X * (win(t, 7.3, 7.5, 8.6, 8.8) + win(t, 11.3, 11.5, 12.2, 12.35)));
  label(c, 'EPIGLOTIS', CH([0, 0.285, -0.05]), Y, X * win(t, 10.4, 10.6, 12.2, 12.35));
  label(c, 'AIRE ATRAPADO', CH([0.078, 0.02, -0.06]), B, X * win(t, 20.9, 21.1, 22.0, 22.2));
  label(c, 'TU SALIDA', CH([0, 0.2, -0.05]), G, X * win(t, 22.4, 22.6, 23.75, 23.9));
  label(c, 'PUÑO ARRIBA DEL OMBLIGO', YOU.spine.localToWorld(V3(0, 0.05, -0.16)), G, win(t, 25.5, 25.7, 26.7, 26.8));
  if (t > 32.2 && t < K.blows) card(c, [['MANOS AL CUELLO ', Wt], ['= ', Y], ['NO RESPIRA', R]], ss(32.2, 32.4, t) * (1 - ss(34.9, 35.04, t)));
  if (t > K.blows && t < K.alone) {
    const nb = countBefore(t, blows), nc = countBefore(t, comps);
    card(c, [['5 GOLPES', nb ? G : Wt], [' + ', Wt], ['5 COMPRESIONES', nc ? G : Wt]], ss(K.blows, K.blows + 0.2, t));
    const big = t < K.comps ? nb : t < K.repeat ? nc : 0;
    c.textAlign = 'center';
    if (big) { c.font = '900 220px Inter, Arial, sans-serif'; c.fillStyle = 'rgba(10,12,16,0.6)'; c.fillText(String(big), 548, 1528); c.fillStyle = G; c.fillText(String(big), 540, 1520); }
    if (t >= K.repeat) { c.font = '900 150px Inter, Arial, sans-serif'; c.fillStyle = G; c.globalAlpha = ss(K.repeat, K.repeat + 0.15, t); c.fillText('↻', 540, 1520); c.globalAlpha = 1; }
  }
  if (t > 40.95) card(c, [['¿SOLO? ', Wt], ['→ ', Y], ['SILLA', G]], ss(40.95, 41.15, t));
  HUD.tex.needsUpdate = true;
}
