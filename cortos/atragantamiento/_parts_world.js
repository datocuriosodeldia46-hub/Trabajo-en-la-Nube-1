// ───────────────────────────── people: simple, expressive "toons" ─────────────────────────────
// Same procedural skin as Lucas (lofted torso and limbs, two-bone IK), but chunky proportions, a big head
// and a face that acts: eyes, lids, brows, a mouth that opens, and skin that flushes or goes pale.
const MAT = {};
const PEOPLE = {};
function paintBand(stops) {   // a 256×512 colour map along a tube: stops = [[v0, v1, css], ...] (v = 0 bottom → 1 top)
  return canvasTex(64, 512, (c, w, h) => { for (const [a, b, col] of stops) { c.fillStyle = col; c.fillRect(0, (1 - b) * h, w, (b - a) * h + 1); } });
}
function buildToon(o) {
  const s = o.s ?? 1, R = rng(o.seed ?? 1);
  const T = { s, o, BODY: { upper: 0.27 * s, fore: 0.25 * s, thigh: 0.42 * s, shin: 0.4 * s, shoulder: V3(0.17 * s * (o.wide ?? 1), 0.18 * s, 0), hip: V3(0.09 * s * (o.wide ?? 1), -0.01 * s, 0) } };
  const g = new THREE.Group(); scene.add(g); T.g = g;
  const skinM = new THREE.MeshPhysicalMaterial({ color: o.skin, roughness: 0.55, sheen: 0.4, sheenColor: new THREE.Color(0xffc8b0) }); T.skinM = skinM; T.skinBase = new THREE.Color(o.skin);
  const fab = (col, sheen) => new THREE.MeshPhysicalMaterial({ map: col, roughness: 0.82, sheen: 1, sheenRoughness: 0.6, sheenColor: new THREE.Color(sheen) });
  const torsoMap = paintBand([[0, 0.16, o.pants], [0.16, 0.9, o.shirt], [0.86, 0.9, o.collar ?? o.shirt], [0.9, 1, '#' + T.skinBase.getHexString()]]);
  const skinHex = '#' + T.skinBase.getHexString();
  const sleeveMap = o.shortSleeve ? paintBand([[0, 1, skinHex], [0, 0.42, o.shirt]]) : paintBand([[0, 1, o.shirt], [0.93, 1, o.cuff ?? o.shirt]]);
  T.mTorso = fab(torsoMap, 0x8a8a90); T.mSleeve = fab(sleeveMap, 0x8a8a90); T.mLeg = fab(paintBand([[0, 1, o.pants]]), 0x6a7aa0);
  const J = (parent, pos) => { const j = new THREE.Group(); j.position.copy(pos); parent.add(j); return j; };
  T.pelvis = J(g, V3(0, 0.1 * s, 0)); T.spine = J(T.pelvis, V3(0, 0.1 * s, 0)); T.chest = J(T.spine, V3(0, 0.19 * s, 0)); T.neck = J(T.chest, V3(0, 0.23 * s, 0)); T.head = J(T.neck, V3(0, 0.08 * s, 0));
  T.torso = new Loft(30, 32, T.mTorso, g);
  T.arms = { 1: new Loft(28, 18, T.mSleeve, g), [-1]: new Loft(28, 18, T.mSleeve, g) };
  T.legs = { 1: new Loft(30, 18, T.mLeg, g), [-1]: new Loft(30, 18, T.mLeg, g) };
  { const b = mesh(new THREE.SphereGeometry(1, 24, 16), std(new THREE.Color(o.pants), 0.85), T.pelvis, [0, -0.025 * s, 0.015 * s]); b.scale.set(0.17 * s * (o.wide ?? 1), 0.1 * s, 0.13 * s); }
  // head: big and round, the face carries the story
  const hs = 0.135 * s * (o.head ?? 1), F = T.face = {};
  const hg = J(T.head, V3(0, 0.1 * s, -0.01 * s)); T.headG = hg;
  const skull = mesh(new THREE.SphereGeometry(hs, 40, 30), skinM, hg); skull.scale.set(0.93, 1.0, 0.96); T.skull = skull;
  for (const sx of [-1, 1]) mesh(new THREE.SphereGeometry(hs * 0.22, 14, 10), skinM, hg, [sx * hs * 0.92, -hs * 0.05, 0]).scale.set(0.5, 1, 0.8);   // ears
  mesh(new THREE.SphereGeometry(hs * 0.16, 16, 12), skinM, hg, [0, -hs * 0.08, -hs * 0.93]).scale.set(0.85, 1, 1.05);    // nose
  const white = std(0xf6f4f0, 0.25), black = std(0x141210, 0.2);
  F.eyes = []; F.pupils = []; F.lids = []; F.brows = [];
  for (const sx of [-1, 1]) {
    const ex = sx * hs * 0.36, ey = hs * 0.16, ez = -hs * 0.78;
    const eye = mesh(new THREE.SphereGeometry(hs * 0.22, 24, 16), white, hg, [ex, ey, ez]); eye.scale.set(1, 1.15, 1); F.eyes.push(eye);
    const pup = mesh(new THREE.SphereGeometry(hs * 0.11, 16, 12), black, eye, [0, 0, -0.9 * hs * 0.22]); pup.scale.set(1, 1, 0.45); F.pupils.push(pup);
    mesh(new THREE.SphereGeometry(hs * 0.03, 8, 6), hdr(0xffffff, 1.6), pup, [hs * 0.04, hs * 0.05, -hs * 0.06], [0, 0, 0], false);   // catch-light
    const lp = J(hg, V3(ex, ey, ez)); const lid = mesh(new THREE.SphereGeometry(hs * 0.235, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), skinM, lp); lid.scale.set(1, 1.15, 1); F.lids.push(lp);
    const brow = mesh(new THREE.CapsuleGeometry(hs * 0.045, hs * 0.26, 4, 8), std(new THREE.Color(o.hair), 0.8), hg, [ex, ey + hs * 0.36, ez - hs * 0.02], [0, 0, Math.PI / 2]); F.brows.push(brow);
  }
  // mouth: a dark opening that stretches (gasp, choke), a smile arc, lips
  F.mouth = J(hg, V3(0, -hs * 0.42, -hs * 0.86));
  F.open = mesh(new THREE.SphereGeometry(hs * 0.2, 20, 14), std(0x1e0608, 0.8), F.mouth); F.open.scale.set(1, 0.2, 0.35);
  F.smile = mesh(new THREE.TorusGeometry(hs * 0.2, hs * 0.035, 8, 20, Math.PI), std(0x5a1a1a, 0.6), F.mouth, [0, hs * 0.08, 0], [0, 0, Math.PI]);
  // hair
  const hairM = std(new THREE.Color(o.hair), 0.75);
  if (o.hairStyle !== 'bald') { const cap = mesh(new THREE.SphereGeometry(hs * 1.04, 32, 20, 0, Math.PI * 2, 0, Math.PI * 0.5), hairM, hg, [0, hs * 0.02, hs * 0.04]); cap.scale.set(0.95, 1.0, 1.0); cap.rotation.x = 0.42; }
  if (o.hairStyle === 'long') { mesh(new THREE.SphereGeometry(hs * 0.9, 24, 16), hairM, hg, [0, -hs * 0.35, hs * 0.45]).scale.set(1.05, 1.3, 0.7); mesh(new THREE.SphereGeometry(hs * 0.3, 16, 12), hairM, hg, [0, hs * 0.55, hs * 0.75]); }
  if (o.hairStyle === 'spiky') for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2; mesh(new THREE.ConeGeometry(hs * 0.18, hs * 0.4, 8), hairM, hg, [Math.cos(a) * hs * 0.45, hs * 0.92, Math.sin(a) * hs * 0.45 + hs * 0.1], [Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5]); }
  if (o.hairStyle === 'bald') { for (const sx of [-1, 1]) mesh(new THREE.SphereGeometry(hs * 0.42, 16, 12), hairM, hg, [sx * hs * 0.72, 0, hs * 0.3]).scale.set(0.5, 0.8, 1); }
  if (o.mustache) mesh(new THREE.CapsuleGeometry(hs * 0.06, hs * 0.32, 4, 8), hairM, hg, [0, -hs * 0.28, -hs * 0.9], [0, 0, Math.PI / 2]);
  if (o.glasses) for (const sx of [-1, 1]) mesh(new THREE.TorusGeometry(hs * 0.25, hs * 0.025, 6, 20), std(0x222222, 0.3, 0.6), hg, [sx * hs * 0.36, hs * 0.16, -hs * 0.98]);
  // hands: skin mittens with fingers (thumb on +X for the right hand)
  const hand = (side) => {
    const root = new THREE.Group(); root.matrixAutoUpdate = false; g.add(root);
    const k = s * 1.15;
    mesh(new THREE.CylinderGeometry(0.036 * k, 0.034 * k, 0.05 * k, 14), skinM, root, [0, 0, -0.02 * k], [Math.PI / 2, 0, 0]);
    mesh(rbox(0.08 * k, 0.03 * k, 0.085 * k, 0.014 * k), skinM, root, [0, 0, 0.04 * k]);
    const fingers = [];
    [0.028, 0.009, -0.01, -0.027].forEach((x, i) => {
      let par = J(root, V3(x * side * k, 0, 0.08 * k)); const f = [];
      [0.035, 0.025, 0.02].forEach((l0, kk) => { const l = l0 * k * (i === 3 ? 0.8 : 1); const seg = new THREE.Group(); par.add(seg); f.push(seg); const cg = new THREE.CapsuleGeometry(0.0095 * k, l, 4, 8); cg.rotateX(Math.PI / 2); cg.translate(0, 0, l / 2); mesh(cg, skinM, seg); par = J(seg, V3(0, 0, l)); });
      fingers.push(f);
    });
    const th = J(root, V3(0.04 * side * k, -0.01 * k, 0.025 * k)); th.rotation.set(0.5, 0.75 * side, 0);
    const tg = new THREE.CapsuleGeometry(0.011 * k, 0.04 * k, 4, 8); tg.rotateX(Math.PI / 2); tg.translate(0, 0, 0.026 * k); mesh(tg, skinM, th);
    return { root, fingers, thumb: th };
  };
  T.hands = { 1: hand(1), [-1]: hand(-1) };
  // joint caps: a sphere at each elbow and knee hides the inner fold of a sharply bent tube
  const capM = std(new THREE.Color(o.shirt), 0.82), capL = std(new THREE.Color(o.pants), 0.85);
  T.elbowCap = { 1: mesh(new THREE.SphereGeometry(0.052 * s, 16, 12), o.shortSleeve ? skinM : capM, g), [-1]: mesh(new THREE.SphereGeometry(0.052 * s, 16, 12), o.shortSleeve ? skinM : capM, g) };
  T.kneeCap = { 1: mesh(new THREE.SphereGeometry(0.064 * s * (o.wide ?? 1), 16, 12), capL, g), [-1]: mesh(new THREE.SphereGeometry(0.064 * s * (o.wide ?? 1), 16, 12), capL, g) };
  const shoeM = std(new THREE.Color(o.shoes ?? '#2a2a2e'), 0.6);
  const shoe = () => { const r = new THREE.Group(); r.matrixAutoUpdate = false; g.add(r); mesh(rbox(0.1 * s, 0.08 * s, 0.24 * s, 0.035 * s), shoeM, r, [0, -0.04 * s, 0.06 * s]); mesh(rbox(0.105 * s, 0.02 * s, 0.25 * s, 0.008 * s), std(0xe8e4dc, 0.7), r, [0, -0.08 * s, 0.06 * s]); return r; };
  T.feet = { 1: shoe(), [-1]: shoe() };
  T.expr = { brow: 0, browUp: 0, eyeOpen: 1, pupil: 1, mouthOpen: 0, smile: 0, flush: 0, pale: 0, lookX: 0, lookY: 0 };
  PEOPLE[o.name] = T;
  return T;
}
// face: brow (−1 angry … +1 worried), browUp (surprise), eyeOpen (0 closed … 1.3 wide), pupil size, mouthOpen 0..1, smile −1..1, flush (red), pale (blue-grey)
function faceToon(T, e) {
  const F = T.face, hs = 0.135 * T.s * (T.o.head ?? 1);
  F.brows.forEach((b, i) => { const sx = i ? 1 : -1; b.rotation.z = Math.PI / 2 + sx * e.brow * 0.45; b.position.y = hs * 0.16 + hs * 0.25 + hs * 0.09 * e.browUp - hs * 0.04 * Math.max(0, -e.brow); });
  F.lids.forEach(l => l.rotation.x = -1.25 + 1.8 * e.eyeOpen);   // 1 = relaxed, 0 = shut, 1.3 = wide
  F.pupils.forEach(p => { p.scale.set(e.pupil, e.pupil, 0.5 * e.pupil); p.position.x = e.lookX * hs * 0.06; p.position.y = e.lookY * hs * 0.06; });
  F.open.scale.set(lerp(0.9, 1.0, e.mouthOpen), lerp(0.18, 1.05, e.mouthOpen), 0.4);
  F.smile.visible = Math.abs(e.smile) > 0.05; F.smile.scale.set(1, Math.max(0.15, Math.abs(e.smile)), 1); F.smile.rotation.z = e.smile > 0 ? Math.PI : 0; F.smile.position.y = (e.smile > 0 ? 0.08 : -0.12) * hs;
  T.skinM.color.copy(T.skinBase).lerp(new THREE.Color(0xd04a4a), e.flush * 0.45).lerp(new THREE.Color(0x7a8aa8), e.pale * 0.45);
}
// the pose (FK torso + IK limbs), as for Lucas; targets are in toon-local space (origin = seat/pelvis contact)
function poseToon(T, P) {
  const g = T.g, B = T.BODY, s = T.s;
  T.pelvis.position.set(...P.pelvisPos.map(v => v * s)); T.pelvis.rotation.set(...P.pelvis); T.spine.rotation.set(...P.spine);
  T.chest.rotation.set(...P.chest); T.neck.rotation.set(...P.neck); T.head.rotation.set(...P.head);
  g.updateMatrixWorld(true);
  const inv = _m4.copy(g.matrixWorld).invert();
  const loc = (obj, v) => obj.localToWorld(v.clone()).applyMatrix4(inv);
  const dir = (obj, v) => loc(obj, v).sub(loc(obj, V3()));
  const tp = filletPath([loc(T.pelvis, V3(0, -0.02 * s, 0)), loc(T.spine, V3()), loc(T.chest, V3()), loc(T.neck, V3()), loc(T.head, V3(0, 0.04 * s, 0))], 0.09 * s);
  const fP = dir(T.pelvis, V3(0, 0, -1)), fC = dir(T.chest, V3(0, 0, -1)), fwd = (v) => V3().lerpVectors(fP, fC, ss(0.1, 0.6, v));
  const wd = T.o.wide ?? 1, bel = T.o.belly ?? 0;
  const Wd = kf([[0, 0.165], [0.1, 0.17], [0.22, 0.158 + bel * 0.03], [0.4, 0.165 + bel * 0.02], [0.55, 0.178], [0.66, 0.188], [0.76, 0.19], [0.84, 0.18], [0.89, 0.11], [0.94, 0.062], [1, 0.055]]);
  const Dp = kf([[0, 0.115], [0.1, 0.118], [0.22, 0.108 + bel * 0.05], [0.4, 0.112 + bel * 0.03], [0.55, 0.118], [0.66, 0.122], [0.76, 0.112], [0.84, 0.096], [0.89, 0.07], [0.94, 0.058], [1, 0.052]]);
  const PW = kf([[0, 2.2], [0.6, 2.4], [0.8, 2.8], [0.9, 2.2], [1, 2]]);
  const OF = kf([[0, 0], [0.3, -0.006 - bel * 0.02], [0.62, -0.004], [0.8, 0.01], [1, 0.012]]);
  T.torso.build(tp, fwd, (v) => ({ n: Dp(v) * s, b: Wd(v) * s * wd, on: OF(v) * s, p: PW(v) }));
  for (const sd of [1, -1]) {
    const S = loc(T.chest, V3(sd * B.shoulder.x, B.shoulder.y, B.shoulder.z)), S0 = loc(T.chest, V3(sd * (B.shoulder.x - 0.05 * s), B.shoulder.y + 0.02 * s, 0));
    const res = (h) => h.mixA ? V3().lerpVectors(res(h.mixA), res(h.mixB), h.k) : h.bone ? loc(T[h.bone], h.pos.clone().multiplyScalar(s)) : h.pos.clone().multiplyScalar(s);
    const H = P.hands[sd], tgt = res(H);   // targets can ride on a bone (e.g. the neck)
    const [E, Wr] = ik2(S, tgt, B.upper, B.fore, H.pole);
    const lu = (0.05 * s + B.upper) / (0.05 * s + B.upper + B.fore), AR = kf([[0, 0.068], [0.1, 0.07], [0.32, 0.061], [lu, 0.053], [0.75, 0.05], [0.93, 0.045], [1, 0.04]]);
    const pole = H.pole.clone();
    T.arms[sd].build(filletPath([S0, S, E, Wr], 0.06 * s), () => pole, (v) => { const r = AR(v) * s; return { n: r * 0.92, b: r }; });
    T.elbowCap[sd].position.copy(E);
    const hd = T.hands[sd], fdir = H.dir ? H.dir.clone() : V3().subVectors(Wr, E).normalize();
    setBasis(hd.root, Wr, H.up, fdir);
    hd.fingers.forEach((f) => f.forEach((seg, j) => { seg.rotation.x = H.curl * [0.9, 1.25, 0.9][j] + 0.08; }));
    hd.thumb.rotation.set(0.4 + 0.6 * H.curl, 0.75 * sd, 0);
  }
  for (const sd of [1, -1]) {
    const Hp = loc(T.pelvis, V3(sd * B.hip.x, B.hip.y, B.hip.z)), Fo = P.feet[sd];
    const [K, A] = ik2(Hp, Fo.pos.clone().multiplyScalar(s), B.thigh, B.shin, Fo.pole);
    const top = loc(T.pelvis, V3(sd * 0.07 * s, 0.06 * s, 0)), lk = (0.073 * s + B.thigh) / (0.073 * s + B.thigh + B.shin);
    const pole = Fo.pole.clone();
    T.legs[sd].build(filletPath([top, Hp, K, A], 0.07 * s), () => pole, (v) => { const r = kf([[0, 0.09], [0.12, 0.092], [0.4, 0.076], [lk, 0.064], [0.62, 0.064], [0.75, 0.06], [0.92, 0.054], [1, 0.052]])(v) * s * wd; return { n: r, b: r * 0.94 }; });
    T.kneeCap[sd].position.copy(K);
    setBasis(T.feet[sd], A, V3().subVectors(K, A), Fo.toe);
  }
}
const P_ = (o) => Object.assign({ pelvisPos: [0, 0.1, 0], pelvis: [0, 0, 0], spine: [0, 0, 0], chest: [0, 0, 0], neck: [0, 0, 0], head: [0, 0, 0] }, o);
const hand = (pos, pole, up, curl, dir = null) => ({ pos, pole, up, curl, dir });
const foot = (pos, pole, toe) => ({ pos, pole, toe });
function mixPose(A, B, k) {
  if (k <= 0) return A; if (k >= 1) return B;
  const m = (a, b) => a.map((x, i) => lerp(x, b[i], k)), mv = (a, b) => V3().lerpVectors(a, b, k);
  const limb = (a, b) => ({ pos: mv(a.pos, b.pos), pole: mv(a.pole, b.pole), up: a.up && mv(a.up, b.up), toe: a.toe && mv(a.toe, b.toe), curl: lerp(a.curl ?? 0, b.curl ?? 0, k), dir: a.dir && b.dir ? mv(a.dir, b.dir) : (k < 0.5 ? a.dir : b.dir),
    ...((a.bone || b.bone || a.mixA || b.mixA) ? { mixA: a, mixB: b, k } : {}) });   // targets in different spaces are resolved, then blended, in poseToon
  const o = {}; for (const key of ['pelvisPos', 'pelvis', 'spine', 'chest', 'neck', 'head']) o[key] = m(A[key], B[key]);
  o.hands = { 1: limb(A.hands[1], B.hands[1]), [-1]: limb(A.hands[-1], B.hands[-1]) };
  o.feet = { 1: limb(A.feet[1], B.feet[1]), [-1]: limb(A.feet[-1], B.feet[-1]) };
  return o;
}
const mixFace = (a, b, k) => { const o = {}; for (const key in a) o[key] = lerp(a[key], b[key] ?? a[key], k); return o; };
const FACE = {
  calm: { brow: 0, browUp: 0, eyeOpen: 1, pupil: 1, mouthOpen: 0.1, smile: 0.3, flush: 0, pale: 0, lookX: 0, lookY: 0 },
  laugh: { brow: 0.2, browUp: 0.3, eyeOpen: 0.45, pupil: 1, mouthOpen: 0.7, smile: 1, flush: 0.1, pale: 0, lookX: 0, lookY: 0 },
  choke: { brow: 0.9, browUp: 0.6, eyeOpen: 1.3, pupil: 0.6, mouthOpen: 0.75, smile: -0.4, flush: 0.8, pale: 0, lookX: 0, lookY: 0.2 },
  panic: { brow: 1, browUp: 0.9, eyeOpen: 1.3, pupil: 0.5, mouthOpen: 0.55, smile: -0.8, flush: 0.4, pale: 0.7, lookX: 0, lookY: 0 },
  relief: { brow: 0.4, browUp: 0.2, eyeOpen: 0.7, pupil: 1, mouthOpen: 0.45, smile: 0.6, flush: 0.3, pale: 0, lookX: 0, lookY: 0 },
  focus: { brow: -0.5, browUp: 0, eyeOpen: 0.9, pupil: 1, mouthOpen: 0.15, smile: -0.2, flush: 0, pale: 0, lookX: 0, lookY: 0 },
  phone: { brow: 0.1, browUp: 0.1, eyeOpen: 0.75, pupil: 1, mouthOpen: 0.3, smile: 0.7, flush: 0, pale: 0, lookX: 0, lookY: -0.8 },
  shock: { brow: 1, browUp: 1, eyeOpen: 1.3, pupil: 0.55, mouthOpen: 0.9, smile: -0.3, flush: 0, pale: 0.2, lookX: 0, lookY: 0 },
};

// ───────────────────────────── the house: dining room and kitchen ─────────────────────────────
const HOUSE = {};
function buildHouse() {
  const R = rng(3);
  const g = new THREE.Group(); scene.add(g); HOUSE.g = g;
  // floor: warm wood planks
  const wood = canvasTex(512, 512, (c, w, h) => { for (let y = 0; y < h; y += 64) { const v = 140 + R() * 40 | 0; c.fillStyle = `rgb(${v},${v * 0.66 | 0},${v * 0.42 | 0})`; c.fillRect(0, y, w, 64); c.fillStyle = 'rgba(40,20,10,0.5)'; c.fillRect(0, y, w, 2); for (let i = 0; i < 40; i++) { c.strokeStyle = `rgba(60,30,15,${0.1 + R() * 0.15})`; c.beginPath(); const yy = y + R() * 64; c.moveTo(0, yy); c.bezierCurveTo(w / 3, yy + R() * 6 - 3, w * 2 / 3, yy + R() * 6 - 3, w, yy); c.stroke(); } const x = R() * w; c.fillStyle = 'rgba(40,20,10,0.5)'; c.fillRect(x, y, 2, 64); } });
  wood.wrapS = wood.wrapT = THREE.RepeatWrapping; wood.repeat.set(3, 3);
  mesh(new THREE.PlaneGeometry(12, 12), std(0xffffff, 0.45, 0, { map: wood }), g, [0, 0, 0], [-Math.PI / 2, 0, 0], false);
  // walls (dining room 5 × 5 m, kitchen behind a wide opening at −z)
  const wallM = std(0xe9d9c0, 0.9), wallK = std(0xdfe6e2, 0.85);
  mesh(new THREE.PlaneGeometry(12, 3), wallM, g, [0, 1.5, 2.6], [0, Math.PI, 0], false);               // behind the camera side
  mesh(new THREE.PlaneGeometry(6, 3), wallM, g, [-2.6, 1.5, 0], [0, Math.PI / 2, 0], false);           // left: window
  mesh(new THREE.PlaneGeometry(6, 3), wallM, g, [2.6, 1.5, 0], [0, -Math.PI / 2, 0], false);           // right: TV wall
  for (const x of [-1.95, 1.95]) mesh(new THREE.PlaneGeometry(1.3, 3), wallM, g, [x, 1.5, -2.6], [0, 0, 0], false);   // kitchen opening frame
  mesh(new THREE.PlaneGeometry(2.6, 0.6), wallM, g, [0, 2.7, -2.6], [0, 0, 0], false);
  mesh(new THREE.PlaneGeometry(12, 12), std(0xf2ece2, 0.95), g, [0, 3, 0], [Math.PI / 2, 0, 0], false);   // ceiling
  mesh(new THREE.BoxGeometry(12, 0.1, 0.02), std(0x7a5a3a, 0.6), g, [0, 0.05, 2.59], [0, 0, 0], false);
  // window with the night city
  const night = canvasTex(256, 256, (c, w, h) => { const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#0a1024'); gr.addColorStop(1, '#2a2240'); c.fillStyle = gr; c.fillRect(0, 0, w, h); for (let i = 0; i < 120; i++) { c.fillStyle = R() < 0.7 ? 'rgba(255,210,140,0.9)' : 'rgba(170,200,255,0.8)'; const x = R() * w, y = h * 0.45 + R() * h * 0.55; c.fillRect(x, y, 3, 4); } });
  mesh(new THREE.PlaneGeometry(1.4, 1.2), new THREE.MeshBasicMaterial({ map: night, color: new THREE.Color(1.3, 1.3, 1.3) }), g, [-2.59, 1.6, 0.3], [0, Math.PI / 2, 0], false);
  for (const [dy, dz, w_, h_] of [[0, 0.72, 0.06, 1.3], [0, -0.12, 0.06, 1.3], [0.62, 0.3, 1.5, 0.06], [-0.62, 0.3, 1.5, 0.06], [0, 0.3, 0.04, 1.2]]) mesh(new THREE.BoxGeometry(0.06, h_, w_), std(0xf4f0e8, 0.5), g, [-2.57, 1.6 + dy, dz], [0, 0, 0], false);
  // curtains
  for (const z of [-0.45, 1.05]) mesh(new THREE.BoxGeometry(0.05, 2.3, 0.35), std(0x8a3a2a, 0.9), g, [-2.5, 1.55, z], [0, 0, 0], false);
  // TV on the right wall: cool flicker on the grandfather
  mesh(rbox(0.06, 0.7, 1.2, 0.02), std(0x111114, 0.3, 0.5), g, [2.56, 1.4, 0.4], [0, 0, 0], false);
  HOUSE.tvM = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.6, 0.8, 1.4) }); mesh(new THREE.PlaneGeometry(1.1, 0.62), HOUSE.tvM, g, [2.525, 1.4, 0.4], [0, -Math.PI / 2, 0], false);
  HOUSE.tvL = new THREE.PointLight(0x9fc4ff, 3, 4, 2); HOUSE.tvL.position.set(2.2, 1.4, 0.4); g.add(HOUSE.tvL);
  // pictures, clock, plant
  for (const [z, y, c_] of [[-1.4, 1.75, '#c97a3a'], [-0.7, 1.9, '#3a7ac9']]) { mesh(new THREE.BoxGeometry(0.03, 0.42, 0.34), std(0x3a2a1a, 0.5), g, [2.58, y, z], [0, 0, 0], false); mesh(new THREE.PlaneGeometry(0.28, 0.36), std(new THREE.Color(c_), 0.8), g, [2.56, y, z], [0, -Math.PI / 2, 0], false); }
  HOUSE.clock = new THREE.Group(); HOUSE.clock.position.set(-2.57, 2.35, -1.2); HOUSE.clock.rotation.y = Math.PI / 2; g.add(HOUSE.clock);
  mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.04, 32), std(0xf8f6f0, 0.4), HOUSE.clock, [0, 0, 0], [Math.PI / 2, 0, 0], false);
  mesh(new THREE.TorusGeometry(0.17, 0.015, 8, 32), std(0x222222, 0.4), HOUSE.clock, [0, 0, 0.01], [0, 0, 0], false);
  HOUSE.hands = [0.12, 0.08].map((l, i) => { const p = new THREE.Group(); HOUSE.clock.add(p); p.position.z = 0.03; mesh(new THREE.BoxGeometry(0.012, l, 0.005), std(0x111111, 0.5), p, [0, l / 2, 0], [0, 0, 0], false); return p; });
  mesh(new THREE.CylinderGeometry(0.18, 0.14, 0.38, 20), std(0xb86a3a, 0.8), g, [-2.2, 0.19, 2.1], [0, 0, 0], true);
  for (let i = 0; i < 7; i++) mesh(new THREE.IcosahedronGeometry(0.18 + R() * 0.08, 1), std(0x3a7a3a, 0.8), g, [-2.2 + (R() - 0.5) * 0.3, 0.6 + R() * 0.5, 2.1 + (R() - 0.5) * 0.3], [0, 0, 0], true);
  // the table: tablecloth, plates of carne asada with rice, glasses, a jug of agua de jamaica
  const TB = HOUSE.table = V3(0, 0.76, 0);
  const cloth = canvasTex(256, 256, (c, w, h) => { c.fillStyle = '#f4efe6'; c.fillRect(0, 0, w, h); c.strokeStyle = 'rgba(200,60,50,0.55)'; c.lineWidth = 6; for (let x = 16; x < w; x += 32) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); c.beginPath(); c.moveTo(0, x); c.lineTo(w, x); c.stroke(); } });
  cloth.wrapS = cloth.wrapT = THREE.RepeatWrapping; cloth.repeat.set(3, 2);
  mesh(rbox(1.7, 0.05, 1.0, 0.02), new THREE.MeshPhysicalMaterial({ map: cloth, roughness: 0.85, sheen: 0.6, sheenColor: new THREE.Color(0xffffff) }), g, [TB.x, TB.y - 0.025, TB.z], [0, 0, 0], true);
  mesh(new THREE.BoxGeometry(1.72, 0.18, 1.02), new THREE.MeshPhysicalMaterial({ map: cloth, roughness: 0.85 }), g, [TB.x, TB.y - 0.12, TB.z], [0, 0, 0], true);
  for (const [x, z] of [[-0.75, -0.42], [0.75, -0.42], [-0.75, 0.42], [0.75, 0.42]]) mesh(new THREE.CylinderGeometry(0.03, 0.025, TB.y - 0.2, 10), std(0x5a3a22, 0.5), g, [x, (TB.y - 0.2) / 2, z], [0, 0, 0], true);
  const plateM = std(0xfbfbf8, 0.2), meatM = std(0x6a3a22, 0.55), riceM = std(0xf2ead8, 0.7), greenM = std(0x4a8a3a, 0.6), glassM = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.05, transmission: 0.0, transparent: true, opacity: 0.25, metalness: 0 });
  HOUSE.seats = { you: V3(0, 0, 0.78), mom: V3(-0.98, 0, 0), kid: V3(0, 0, -0.78), gramps: V3(0.98, 0, 0) };
  HOUSE.plates = {};
  for (const [k, p] of Object.entries(HOUSE.seats)) {
    const dir = V3(-p.x, 0, -p.z).normalize(), pp = V3(TB.x, TB.y, TB.z).add(V3(p.x * 0.42, 0, p.z * 0.42 / 0.78 * 0.3));
    const pl = new THREE.Group(); pl.position.copy(pp); g.add(pl); HOUSE.plates[k] = pl;
    mesh(new THREE.CylinderGeometry(0.13, 0.1, 0.02, 32), plateM, pl, [0, 0.01, 0], [0, 0, 0], true);
    for (let i = 0; i < 3; i++) mesh(rbox(0.07, 0.022, 0.05, 0.01), meatM, pl, [-0.03 + i * 0.035, 0.03, -0.02 + (i % 2) * 0.03], [0, R() * 2, 0], true);
    mesh(new THREE.SphereGeometry(0.05, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), riceM, pl, [0.04, 0.02, 0.04], [0, 0, 0], true).scale.set(1, 0.6, 1);
    mesh(new THREE.IcosahedronGeometry(0.025, 1), greenM, pl, [-0.05, 0.03, 0.05], [0, 0, 0], true);
    const gl = new THREE.Group(); gl.position.copy(pp).add(V3(dir.z * 0.18 + dir.x * 0.1, 0, -dir.x * 0.18 + dir.z * 0.1)); g.add(gl);
    mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.12, 20, 1, true), glassM, gl, [0, 0.06, 0], [0, 0, 0], false);
    mesh(new THREE.CylinderGeometry(0.032, 0.028, 0.08, 20), new THREE.MeshPhysicalMaterial({ color: k === 'kid' ? 0xd8a020 : 0x9a1030, roughness: 0.1, transparent: true, opacity: 0.85 }), gl, [0, 0.045, 0], [0, 0, 0], false);
    HOUSE['glass_' + k] = gl;
    for (const sd of [-1, 1]) mesh(rbox(0.012, 0.004, 0.16, 0.002), std(0xc8ccd2, 0.2, 1), g, [pp.x + dir.z * sd * 0.17, TB.y + 0.003, pp.z - dir.x * sd * 0.17], [0, Math.atan2(dir.x, dir.z), 0], true);
  }
  // the fork that falls (yours)
  HOUSE.fork = new THREE.Group(); g.add(HOUSE.fork);
  mesh(rbox(0.012, 0.005, 0.15, 0.002), std(0xc8ccd2, 0.2, 1), HOUSE.fork, [0, 0, 0.04], [0, 0, 0], true);
  for (let i = 0; i < 4; i++) mesh(new THREE.BoxGeometry(0.0025, 0.003, 0.04), std(0xc8ccd2, 0.2, 1), HOUSE.fork, [-0.0075 + i * 0.005, 0, -0.05], [0, 0, 0], true);
  mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.24, 24, 1, true), glassM, g, [0.15, TB.y + 0.12, -0.08], [0, 0, 0], false);
  mesh(new THREE.CylinderGeometry(0.066, 0.056, 0.17, 24), new THREE.MeshPhysicalMaterial({ color: 0x9a1030, roughness: 0.1, transparent: true, opacity: 0.85 }), g, [0.15, TB.y + 0.09, -0.08], [0, 0, 0], false);
  mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.07, 24), std(0xc87a3a, 0.7), g, [-0.18, TB.y + 0.035, 0.05], [0, 0, 0], true);   // tortilla basket
  mesh(new THREE.CylinderGeometry(0.095, 0.095, 0.02, 24), std(0xe8d8a8, 0.8), g, [-0.18, TB.y + 0.07, 0.05], [0, 0, 0], true);
  // chairs
  HOUSE.chairs = {};
  for (const [k, p] of Object.entries(HOUSE.seats)) {
    const c = new THREE.Group(); c.position.copy(p); c.rotation.y = Math.atan2(p.x, p.z); g.add(c); HOUSE.chairs[k] = c;
    const cw = std(0x6a4426, 0.55);
    mesh(rbox(0.44, 0.05, 0.42, 0.015), cw, c, [0, 0.46, 0], [0, 0, 0], true);
    for (const [x, z] of [[-0.19, -0.18], [0.19, -0.18], [-0.19, 0.18], [0.19, 0.18]]) mesh(new THREE.CylinderGeometry(0.02, 0.018, 0.46, 8), cw, c, [x, 0.23, z], [0, 0, 0], true);
    for (const x of [-0.19, 0.19]) mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.5, 8), cw, c, [x, 0.72, 0.19], [0, 0, 0], true);
    mesh(rbox(0.42, 0.12, 0.03, 0.01), cw, c, [0, 0.9, 0.19], [0, 0, 0], true);
    mesh(rbox(0.42, 0.06, 0.03, 0.01), cw, c, [0, 0.72, 0.19], [0, 0, 0], true);
  }
  // pendant lamp over the table
  mesh(new THREE.CylinderGeometry(0.005, 0.005, 1.1, 6), std(0x222222, 0.5), g, [0, 2.45, 0], [0, 0, 0], false);
  mesh(new THREE.ConeGeometry(0.28, 0.22, 32, 1, true), std(0x2a2a2a, 0.5, 0.3, { side: THREE.DoubleSide }), g, [0, 1.85, 0], [0, 0, 0], false);
  mesh(new THREE.SphereGeometry(0.06, 16, 12), hdr(0xffd8a0, 12), g, [0, 1.78, 0], [0, 0, 0], false);
  HOUSE.lamp = new THREE.SpotLight(0xffd2a0, 9, 6, 1.0, 0.7, 2); HOUSE.lamp.position.set(0, 1.78, 0); HOUSE.lamp.target.position.set(0, 0.7, 0); HOUSE.lamp.castShadow = true; HOUSE.lamp.shadow.mapSize.set(1024, 1024); HOUSE.lamp.shadow.bias = -0.0006; g.add(HOUSE.lamp, HOUSE.lamp.target);
  HOUSE.fill = new THREE.HemisphereLight(0xffe8d0, 0x5a4a40, 1.1); g.add(HOUSE.fill);
  // kitchen behind the opening (for the ending, at night): counter, stove, fridge, one light
  const kg = new THREE.Group(); kg.position.set(0, 0, -2.6); g.add(kg); HOUSE.kitchen = kg;
  mesh(new THREE.PlaneGeometry(5, 3), wallK, kg, [0, 1.5, -2.2], [0, 0, 0], false);
  for (const x of [-2.5, 2.5]) mesh(new THREE.PlaneGeometry(2.2, 3), wallK, kg, [x, 1.5, -1.1], [0, -Math.sign(x) * Math.PI / 2, 0], false);
  mesh(rbox(3.2, 0.9, 0.62, 0.02), std(0x3a6a5a, 0.6), kg, [-0.2, 0.45, -1.88], [0, 0, 0], true);
  mesh(rbox(3.24, 0.04, 0.66, 0.01), std(0xeae6de, 0.3), kg, [-0.2, 0.92, -1.88], [0, 0, 0], true);
  mesh(rbox(0.7, 1.8, 0.66, 0.04), std(0xeceae6, 0.35, 0.1), kg, [1.8, 0.9, -1.85], [0, 0, 0], true);
  mesh(new THREE.BoxGeometry(0.6, 0.02, 0.5), std(0x1a1a1a, 0.4), kg, [-0.9, 0.95, -1.88], [0, 0, 0], true);
  for (const x of [-1.05, -0.75]) mesh(new THREE.TorusGeometry(0.08, 0.01, 6, 20), std(0x333333, 0.4, 0.6), kg, [x, 0.965, -1.88], [Math.PI / 2, 0, 0], false);
  mesh(rbox(0.9, 0.6, 0.35, 0.02), std(0x3a6a5a, 0.6), kg, [-0.6, 2.0, -2.0], [0, 0, 0], true);
  HOUSE.kLight = new THREE.PointLight(0xdfe8ff, 0, 5, 2); HOUSE.kLight.position.set(-0.2, 2.6, -1.2); kg.add(HOUSE.kLight);
  mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.03, 24), hdr(0xeef4ff, 6), kg, [-0.2, 2.98, -1.2], [0, 0, 0], false);
  HOUSE.phone = new THREE.Group(); kg.add(HOUSE.phone); HOUSE.phone.position.set(0.3, 0.945, -1.75); HOUSE.phone.rotation.set(-Math.PI / 2, 0, 0.3);
  mesh(rbox(0.075, 0.155, 0.009, 0.008), std(0x111114, 0.3), HOUSE.phone, [0, 0, 0], [0, 0, 0], false);
  const callTex = canvasTex(128, 256, (c, w, h) => { c.fillStyle = '#0d1a2a'; c.fillRect(0, 0, w, h); c.fillStyle = '#fff'; c.font = 'bold 44px sans-serif'; c.textAlign = 'center'; c.fillText('911', w / 2, 80); c.font = '18px sans-serif'; c.fillText('llamando…', w / 2, 110); c.fillStyle = '#e03030'; c.beginPath(); c.arc(w / 2, 210, 22, 0, 7); c.fill(); });
  HOUSE.phoneScreen = mesh(new THREE.PlaneGeometry(0.068, 0.145), new THREE.MeshBasicMaterial({ map: callTex, color: new THREE.Color(1.6, 1.6, 1.6) }), HOUSE.phone, [0, 0, 0.0051], [0, 0, 0], false);
  HOUSE.kchair = new THREE.Group(); kg.add(HOUSE.kchair); HOUSE.kchair.position.set(0.1, 0, -0.9); HOUSE.kchair.rotation.y = Math.PI;
  { const c = HOUSE.kchair, cw = std(0x6a4426, 0.55); mesh(rbox(0.44, 0.05, 0.42, 0.015), cw, c, [0, 0.46, 0], [0, 0, 0], true); for (const [x, z] of [[-0.19, -0.18], [0.19, -0.18], [-0.19, 0.18], [0.19, 0.18]]) mesh(new THREE.CylinderGeometry(0.02, 0.018, 0.46, 8), cw, c, [x, 0.23, z], [0, 0, 0], true); for (const x of [-0.19, 0.19]) mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.5, 8), cw, c, [x, 0.72, 0.19], [0, 0, 0], true); mesh(rbox(0.42, 0.12, 0.03, 0.01), cw, c, [0, 0.9, 0.19], [0, 0, 0], true); }
}

// ───────────────────────────── anatomy (inside "you", seen in X-ray) ─────────────────────────────
// Stylised and readable: air = blue, food/obstruction = red-brown, the right action = green.
// Everything lives in the chest bone's space (x right, y up, −z forward); the neck/head are kept near neutral in X-ray shots.
const ANAT = {};
function buildAnatomy(T) {
  const g = new THREE.Group(); T.chest.add(g); ANAT.g = g; g.visible = false;
  const s = T.s;
  const tubeM = (c, e = 0) => new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.35, clearcoat: 0.6, emissive: c, emissiveIntensity: e, transparent: true, opacity: 0.95 });
  const tube = (pts, r, m, seg = 40) => { const cv = new THREE.CatmullRomCurve3(pts.map(p => V3(...p).multiplyScalar(s))); const ms = mesh(new THREE.TubeGeometry(cv, seg, r * s, 18), m, g, [0, 0, 0], [0, 0, 0], false); ms.userData.curve = cv; return ms; };
  // throat: mouth → pharynx; esophagus behind, trachea in front
  ANAT.pharynx = tube([[0, 0.355, -0.11], [0, 0.352, -0.06], [0, 0.33, -0.025], [0, 0.29, -0.02]], 0.018, tubeM(0xd86a78, 0.05));
  ANAT.esoM = tubeM(0xe88a8a, 0.05);
  ANAT.eso = tube([[0, 0.29, -0.012], [0, 0.22, -0.002], [0, 0.12, 0.004], [0, 0.0, 0.01], [0, -0.1, 0.0]], 0.012, ANAT.esoM);
  ANAT.traM = tubeM(0x5a9ae0, 0.15);
  ANAT.tra = tube([[0, 0.275, -0.036], [0, 0.2, -0.034], [0, 0.12, -0.03], [0, 0.07, -0.026]], 0.0155, ANAT.traM);
  for (let i = 0; i < 9; i++) { const y = 0.255 - i * 0.021; mesh(new THREE.TorusGeometry(0.0163 * s, 0.0028 * s, 8, 24), std(0xa8d0ff, 0.4), g, [0, y * s, (-0.035 + i * 0.0008) * s], [Math.PI / 2, 0, 0], false); }
  for (const sx of [-1, 1]) tube([[0, 0.07, -0.026], [sx * 0.02, 0.05, -0.022], [sx * 0.05, 0.035, -0.015], [sx * 0.07, 0.02, -0.01]], 0.01, ANAT.traM, 20);
  // epiglottis: a flap hinged at the front of the larynx — closed (over the trachea) when swallowing
  ANAT.epiHinge = new THREE.Group(); ANAT.epiHinge.position.set(0, 0.282 * s, -0.05 * s); g.add(ANAT.epiHinge);
  { const sh = new THREE.Shape(); sh.moveTo(-0.014, 0); sh.quadraticCurveTo(-0.018, 0.028, 0, 0.034); sh.quadraticCurveTo(0.018, 0.028, 0.014, 0); sh.lineTo(-0.014, 0);
    const ge = new THREE.ExtrudeGeometry(sh, { depth: 0.003, bevelEnabled: true, bevelSize: 0.0015, bevelThickness: 0.0015, bevelSegments: 2 }); ge.scale(s, s, s); ge.rotateX(-Math.PI / 2);
    ANAT.epi = mesh(ge, new THREE.MeshPhysicalMaterial({ color: 0xff7aa0, roughness: 0.3, emissive: 0xff4a80, emissiveIntensity: 0.25 }), ANAT.epiHinge, [0, 0, 0], [0, 0, 0], false); }
  // vocal cords
  ANAT.cords = [-1, 1].map(sx => mesh(new THREE.CapsuleGeometry(0.0025 * s, 0.018 * s, 4, 8), std(0xfff0e8, 0.4), g, [sx * 0.005 * s, 0.258 * s, -0.036 * s], [Math.PI / 2, 0, sx * 0.25], false));
  // lungs with the trapped air glowing inside, the diaphragm under them, the heart between
  ANAT.lungs = [-1, 1].map(sx => { const l = mesh(new THREE.SphereGeometry(1, 32, 24), new THREE.MeshPhysicalMaterial({ color: 0xf08a9a, roughness: 0.45, transparent: true, opacity: 0.55, depthWrite: false }), g, [sx * 0.078 * s, 0.0, -0.005 * s], [0, 0, sx * -0.12], false); l.scale.set(0.062 * s, 0.12 * s, 0.07 * s); l.userData.base = l.scale.clone(); return l; });
  ANAT.airGlow = [-1, 1].map(sx => { const a = mesh(new THREE.SphereGeometry(1, 24, 16), glowMat(0x3aa8ff, 1.2), g, [sx * 0.078 * s, -0.01 * s, -0.005 * s], [0, 0, 0], false); a.scale.set(0.045 * s, 0.09 * s, 0.05 * s); a.userData.base = a.scale.clone(); return a; });
  ANAT.heart = mesh(new THREE.SphereGeometry(0.03 * s, 20, 14), std(0xc0283a, 0.4, 0, { emissive: 0x801020, emissiveIntensity: 0.4 }), g, [0.018 * s, -0.01 * s, -0.045 * s], [0, 0, 0.4], false);
  ANAT.heart.scale.set(1, 1.2, 0.9);
  ANAT.dia = mesh(new THREE.SphereGeometry(0.15 * s, 32, 12, 0, Math.PI * 2, 0, Math.PI * 0.42), new THREE.MeshPhysicalMaterial({ color: 0xd04a5a, roughness: 0.5, transparent: true, opacity: 0.8, side: THREE.DoubleSide }), g, [0, -0.2 * s, 0], [0, 0, 0], false);
  ANAT.dia.scale.set(1, 0.6, 0.85); ANAT.diaY = -0.2 * s;
  // the piece of meat
  { const geo = new THREE.SphereGeometry(0.019 * s, 32, 24), p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), q = 1 / (0.019 * s); const k = 1 + 0.18 * Math.sin(x * q * 3.1 + 1) * Math.sin(y * q * 2.3) + 0.1 * Math.sin(z * q * 4.7 + 2); p.setXYZ(i, x * k * 1.15, y * k * 0.9, z * k); }   // a smooth, lumpy chunk
    geo.computeVertexNormals();
    ANAT.meatM = new THREE.MeshPhysicalMaterial({ color: 0x7a3a22, roughness: 0.5, clearcoat: 0.3, emissive: 0x501a0a, emissiveIntensity: 0.4 });
    ANAT.meat = mesh(geo, ANAT.meatM, scene, [0, 0, 0], [0, 0, 0], false); ANAT.meat.visible = false; }
  // particles: air (blue), water (white-blue), a swallowed bite (beige)
  ANAT.air = Array.from({ length: 40 }, () => { const m = mesh(new THREE.SphereGeometry(0.0035 * s, 8, 6), glowMat(0x6ac8ff, 3), g, [0, 0, 0], [0, 0, 0], false); m.visible = false; return m; });
  ANAT.water = Array.from({ length: 30 }, () => { const m = mesh(new THREE.SphereGeometry(0.005 * s, 10, 8), new THREE.MeshPhysicalMaterial({ color: 0xbfe6ff, roughness: 0.05, transmission: 0, transparent: true, opacity: 0.8, emissive: 0x4aa8ff, emissiveIntensity: 0.6 }), g, [0, 0, 0], [0, 0, 0], false); m.visible = false; return m; });
  ANAT.bite = mesh(new THREE.SphereGeometry(0.012 * s, 16, 12), std(0xe8c890, 0.6, 0, { emissive: 0x8a6a30, emissiveIntensity: 0.3 }), g, [0, 0, 0], [0, 0, 0], false); ANAT.bite.visible = false;
  // a light inside so the organs read in the dark of the body
  ANAT.light = new THREE.PointLight(0xffffff, 0.35, 0.7, 2); ANAT.light.position.set(0, 0.2 * s, -0.25 * s); g.add(ANAT.light);
  // the body that turns to hologram: torso, skull (+ ears, nose, lids share skinM), sleeves
  dual(T.torso.mesh, 0.2); dual(T.skull, 0.22);
  for (const k of ['mTorso', 'skinM', 'mSleeve']) T[k].transparent = true;
}
// X-ray amount k: the body fades to a green ghost, hair and eyes fade, the organs appear
function xrayToon(T, k) {
  for (const m of [T.mTorso, T.skinM, T.mSleeve]) { m.opacity = 1 - 0.92 * k; m.depthWrite = k < 0.5; }
  DUAL.forEach(({ solid, x }) => { if (solid === T.torso.mesh || solid === T.skull) { x.visible = k > 0.01; x.material.uniforms.uK.value = k; } });
  ANAT.g.visible = k > 0.01; ANAT.meat.visible = ANAT.meat.visible && true;
  T.headG.children.forEach(c => { if (c !== T.skull && c.material && !T.face.eyes.includes(c)) c.visible = k < 0.5; });
}
