// ───────────────────────────── cast and poses ─────────────────────────────
const LIGHTS = {};
const T_END = 43.3;
let YOU, MOM, KID, GRAMPS;
function buildAll() {
  buildHouse();
  YOU = buildToon({ name: 'you', seed: 1, skin: 0xc68a5e, shirt: '#2f6fb5', collar: '#25599a', pants: '#3a3f4a', hair: '#1c1410', hairStyle: 'short', wide: 1.05, belly: 0.4 });
  MOM = buildToon({ name: 'mom', seed: 2, skin: 0xd6a07a, shirt: '#c9405a', pants: '#2c3550', hair: '#3a2214', hairStyle: 'long', head: 0.98 });
  KID = buildToon({ name: 'kid', seed: 3, s: 0.72, head: 1.25, skin: 0xc99068, shirt: '#f2b62a', pants: '#3a5a8a', hair: '#1a120c', hairStyle: 'spiky', shortSleeve: true });
  GRAMPS = buildToon({ name: 'gramps', seed: 4, skin: 0xb88660, shirt: '#e8e4d8', pants: '#5a4a3a', hair: '#cfcac0', hairStyle: 'bald', mustache: true, glasses: true, belly: 0.6, wide: 1.05 });
}
// seated at the table: feet on the floor, hands on the table edge
function seatPose(o = {}) {
  return P_(Object.assign({ pelvis: [-0.05, 0, 0], spine: [-0.05, 0, 0], chest: [-0.03, 0, 0], neck: [0.05, 0, 0], head: [0.05, 0, 0],
    hands: { 1: hand(V3(0.2, 0.28, -0.36), V3(0.6, -0.5, 0.4), V3(0, 1, 0), 0.4, V3(-0.15, -0.2, -1)), [-1]: hand(V3(-0.2, 0.28, -0.36), V3(-0.6, -0.5, 0.4), V3(0, 1, 0), 0.4, V3(0.15, -0.2, -1)) },
    feet: { 1: foot(V3(0.13, -0.42, -0.42), V3(0.2, 0.4, -1), V3(0.1, 0, -1)), [-1]: foot(V3(-0.13, -0.42, -0.4), V3(-0.2, 0.4, -1), V3(-0.1, 0, -1)) } }, o));
}
function chokeSeatPose(k = 1, shake = 0) {   // both hands at the throat, leaning in
  const p = seatPose({ spine: [-0.15 * k, 0, 0], chest: [-0.05, shake * 0.05, 0], neck: [0.3 * k, 0, 0], head: [-0.15 * k, shake * 0.1, 0] });
  p.hands[1] = Object.assign(hand(V3(0.07, 0.03, -0.11), V3(1, -0.7, 0.1), V3(0.2, 0.3, -1), 0.75, V3(-1, 0.15, 0.25)), { bone: 'neck' });
  p.hands[-1] = Object.assign(hand(V3(-0.07, 0.01, -0.11), V3(-1, -0.7, 0.1), V3(-0.2, 0.3, -1), 0.75, V3(1, 0.15, 0.25)), { bone: 'neck' });
  return mixPose(seatPose(), p, k);
}
function phonePose() {        // looking down at a phone held in both hands
  const p = seatPose({ neck: [0.35, 0, 0], head: [0.25, 0, 0] });
  p.hands[1] = hand(V3(0.06, 0.36, -0.3), V3(0.8, -0.6, 0.3), V3(0, 0.7, 0.7), 0.6, V3(-0.4, 0.4, -1));
  p.hands[-1] = hand(V3(-0.06, 0.36, -0.3), V3(-0.8, -0.6, 0.3), V3(0, 0.7, 0.7), 0.6, V3(0.4, 0.4, -1));
  return p;
}
function placeAt(T, seat, lean = 0) {
  const p = HOUSE.seats[seat];
  T.g.position.set(p.x, 0.5, p.z); T.g.rotation.set(0, Math.atan2(p.x, p.z), 0);
}

// ───────────────────────────── per-frame state (style test) ─────────────────────────────
function applyAll(t) {
  placeAt(YOU, 'you'); placeAt(MOM, 'mom'); placeAt(KID, 'kid'); placeAt(GRAMPS, 'gramps');
  const sh = Math.sin(t * 23) * 0.5 + Math.sin(t * 37) * 0.5;
  poseToon(YOU, chokeSeatPose(1, sh)); faceToon(YOU, FACE.choke);
  poseToon(MOM, phonePose()); faceToon(MOM, FACE.phone);
  poseToon(KID, phonePose()); faceToon(KID, FACE.phone);
  { const p = seatPose({ neck: [0, -0.9, 0], head: [-0.05, -0.4, 0] }); poseToon(GRAMPS, p); faceToon(GRAMPS, FACE.laugh); }
  HOUSE.tvM.color.setRGB(0.6 + 0.3 * Math.sin(t * 7), 0.8, 1.4); HOUSE.tvL.intensity = 2.5 + Math.sin(t * 9) * 0.8;
  HOUSE.fork.position.set(0.12, HOUSE.table.y + 0.01, 0.42); HOUSE.fork.rotation.set(0, 0.3, 0);
  HOUSE.hands[0].rotation.z = -t * 0.1; HOUSE.hands[1].rotation.z = -t * 0.008;
  scene.updateMatrixWorld(true);
  return { t };
}
function onCamera(t, s, cam) {
  YOU.headG.visible = !cam.pov;
}

// ───────────────────────────── shots (style test) ─────────────────────────────
const YW = (v) => YOU.g.localToWorld(V3(...v));
const C = (pos, tgt, fov, extra = {}) => Object.assign({ pos, tgt, fov, coc: 8, roll: 0 }, extra);
const SHOTS = [
  { t1: 1, f: (t) => C(YW([0, 0.88, -0.05]), YW([0, 0.25, -0.6]), 70, { pov: true, coc: 4, focus: 0.5 }) },
  { t1: 2, f: (t) => C(YW([-0.25, 0.78, -0.75]), YW([0, 0.7, 0]), 40, { coc: 10 }) },
  { t1: 3, f: (t) => C(V3(1.6, 2.6, 2.2), V3(0, 0.8, 0), 50, { coc: 3 }) },
  { t1: 99, f: (t) => C(V3(-1.2, 1.3, 1.9), V3(0.1, 0.9, 0.2), 45, { coc: 4 }) },
];
SHOTS.forEach((s, i) => s.t0 = i ? SHOTS[i - 1].t1 : -1);
const shotAt = (t) => SHOTS.findIndex(s => t < s.t1);
let CAM_OVERRIDE = null;
function cameraAt(t, s, si) {
  const c = SHOTS[si].f(t);
  if (typeof c.focus !== 'number') c.focus = c.pos.distanceTo(c.tgt);
  return c;
}
