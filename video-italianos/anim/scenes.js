// Escenas del video "Nombres italianos para niña". Los tiempos vienen de la voz (data.js -> window.TL).
const B = window.TL.blocks;
const VENV = window.VENV;
const DUR = window.TL.duration;
const vis0 = k => k === 0 ? 0 : B[k].start - 0.42;
const talk = t => VENV[Math.min(VENV.length - 1, Math.max(0, Math.floor(t * FPS)))] || 0;

// ---------- utilería extra ----------
function pizza(g, x, y, s, rot) {
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(s, s);
  shape(g, [[-60, -70], [60, -70], [0, 90]], C.sun, { seed: 301 });
  shape(g, [[-66, -78], [66, -78], [60, -56], [-60, -56]], C.mustardD, { seed: 302 });
  [[-20, -30], [22, -20], [0, 25]].forEach(([a, b], i) => shape(g, ell(a, b, 13, 13, 8, 303 + i), C.red, { seed: 303 + i, lw: 3.5 }));
  g.restore();
}
function gelato(g, x, y, s, rot) {
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(s, s);
  shape(g, [[-45, 0], [45, 0], [0, 130]], C.mustard, { seed: 311 });
  line(g, [[-25, 20], [10, 70]], C.mustardD, 4, 312, 1); line(g, [[20, 15], [-8, 80]], C.mustardD, 4, 313, 1);
  shape(g, curlyCloud(0, -10, 58, 44, 5, Math.PI, Math.PI * 2, 30).concat([[55, 8], [-55, 8]]), C.mint, { seed: 314 });
  shape(g, ell(0, -62, 44, 40, 14, 315, .1), C.pink, { seed: 315 });
  dot(g, 0, -108, 12, C.red);
  g.restore();
}
function bunting(g, y, t, cols, seed) {
  const n = 9, sag = 60;
  const pts = [];
  for (let i = 0; i <= n; i++) { const x = -40 + i * (W + 80) / n; pts.push([x, y + Math.sin(i / n * Math.PI) * sag]); }
  line(g, pts, C.ink, 5, seed, 1);
  for (let i = 0; i < n; i++) {
    const [x1, y1] = pts[i], [x2, y2] = pts[i + 1];
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, sw = Math.sin(stepT(t) * 3 + i) * .12;
    g.save(); g.translate(mx, my); g.rotate(sw);
    shape(g, [[-50, 0], [50, 0], [0, 95]], cols[i % cols.length], { seed: seed + i, lw: 4.5 });
    g.restore();
  }
}
function alarmClock(g, x, y, ringing, t) {
  const sh = ringing ? Math.sin(t * 60) * .18 : 0;
  g.save(); g.translate(x, y); g.rotate(sh);
  for (const sx of [-1, 1]) shape(g, ell(sx * 62, -92, 34, 26, 12, 320 + sx, 0, sx * .5), C.mustardD, { seed: 320 + sx });
  line(g, [[-40, 80], [-58, 112]], C.ink, 9, 323, 1); line(g, [[40, 80], [58, 112]], C.ink, 9, 324, 1);
  shape(g, ell(0, 0, 105, 105, 22, 325, .02), C.coral, { seed: 325 });
  shape(g, ell(0, 0, 80, 80, 20, 326, .02), C.cream, { seed: 326, lw: 4 });
  line(g, [[0, 0], [0, -55]], C.ink, 8, 327, .5); line(g, [[0, 0], [38, 10]], C.ink, 8, 328, .5);
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; dot(g, Math.cos(a) * 66, Math.sin(a) * 66, 4, C.ink); }
  g.restore();
  if (ringing) for (let i = 0; i < 3; i++) {
    const r = 150 + i * 35 + (t * 200 % 35);
    line(g, arcPts(x, y, r, r, -Math.PI * .85, -Math.PI * .6, 5), C.ink, 7, 330 + i, 1);
    line(g, arcPts(x, y, r, r, -Math.PI * .4, -Math.PI * .15, 5), C.ink, 7, 333 + i, 1);
  }
}
function bulb(g, x, y, s, on, t) {
  g.save(); g.translate(x, y); g.scale(s, s); g.rotate(Math.sin(t * 2) * .08);
  if (on) {
    const gr = g.createRadialGradient(0, -20, 10, 0, -20, 190);
    gr.addColorStop(0, 'rgba(255,230,140,0.9)'); gr.addColorStop(1, 'rgba(255,230,140,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(0, -20, 190, 0, 7); g.fill();
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + t * .5; line(g, [[Math.cos(a) * 110, -20 + Math.sin(a) * 110], [Math.cos(a) * 150, -20 + Math.sin(a) * 150]], C.mustardD, 8, 340 + i, 1); }
  }
  shape(g, [[-58, -40], [-70, -90], [-40, -135], [0, -148], [40, -135], [70, -90], [58, -40], [30, 10], [-30, 10]], on ? C.sun : C.cream, { seed: 350 });
  line(g, [[-18, 8], [-10, -40], [0, -60], [10, -40], [18, 8]], on ? C.coral : C.ink, 5, 351, 1);
  shape(g, [[-34, 10], [34, 10], [30, 60], [-30, 60]], '#9AA3B5', { seed: 352 });
  line(g, [[-32, 28], [32, 28]], C.ink, 4, 353, .5); line(g, [[-31, 44], [31, 44]], C.ink, 4, 354, .5);
  g.restore();
}
function flower(g, x, y, h, p, t, i) {
  if (p <= 0) return;
  const hh = h * eOutCubic(clamp(p * 1.5));
  const sw = Math.sin(stepT(t) * 2 + i) * 14;
  line(g, [[x, y], [x + sw * .3, y - hh * .5], [x + sw, y - hh]], C.greenD, 9, 360 + i, 1.5);
  if (hh > h * .5) { g.save(); g.translate(x + sw * .3, y - hh * .45); g.rotate(-.6 * (i % 2 ? 1 : -1)); shape(g, ell(22 * (i % 2 ? 1 : -1), 0, 30, 13, 10, 361 + i), C.green, { seed: 361 + i, lw: 4 }); g.restore(); }
  const q = eOutBack(clamp(p * 1.5 - .5));
  if (q <= 0) return;
  g.save(); g.translate(x + sw, y - hh); g.scale(q, q); g.rotate(t * .4 + i);
  for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2; shape(g, ell(Math.cos(a) * 34, Math.sin(a) * 34, 28, 28, 10, 370 + i * 5 + k), i % 2 ? C.violet : C.lilac, { seed: 370 + i * 5 + k, lw: 4 }); }
  shape(g, ell(0, 0, 20, 20, 10, 399 + i), C.mustard, { seed: 399 + i, lw: 4 });
  g.restore();
}
function butterfly(g, x, y, t, color, sd) {
  const f = Math.abs(Math.sin(stepT(t) * 14 + sd));
  g.save(); g.translate(x, y); g.rotate(Math.sin(t * 2 + sd) * .3);
  for (const sx of [-1, 1]) { g.save(); g.scale(sx * (.3 + .7 * f), 1); shape(g, ell(28, -10, 28, 22, 10, sd + sx), color, { seed: sd + sx, lw: 4 }); shape(g, ell(20, 20, 18, 15, 10, sd + 3 + sx), color, { seed: sd + 3 + sx, lw: 4 }); g.restore(); }
  line(g, [[0, -25], [0, 30]], C.ink, 6, sd + 7, .5);
  g.restore();
}
function shell(g, x, y, s, open, glow, t) {
  g.save(); g.translate(x, y); g.scale(s, s);
  shape(g, [[-120, 0], [120, 0], [95, 45], [0, 70], [-95, 45]], C.pink, { seed: 410 });
  for (let i = -2; i <= 2; i++) line(g, [[i * 35, 5], [i * 30, 55]], C.pinkD, 4, 411 + i, 1);
  if (open > .05) {
    const pr = 34 * (1 + glow * .15);
    if (glow > 0) { const gr = g.createRadialGradient(0, -30, 5, 0, -30, 130); gr.addColorStop(0, `rgba(255,255,255,${.7 * glow})`); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.beginPath(); g.arc(0, -30, 130, 0, 7); g.fill(); }
    shape(g, ell(0, -28, pr, pr, 14, 415), C.white, { seed: 415 });
    dot(g, -10, -40, 9, '#fff');
  }
  g.save(); g.translate(-115, 0); g.rotate(-open * .95); g.translate(115, 0);
  shape(g, [[-120, 0], [120, 0], [95, -45], [0, -75], [-95, -45]], C.pink, { seed: 420 });
  for (let i = -2; i <= 2; i++) line(g, [[i * 35, -5], [i * 30, -60]], C.pinkD, 4, 421 + i, 1);
  g.restore();
  g.restore();
}
function seaweed(g, x, y, h, t, i) {
  const pts = [];
  for (let k = 0; k <= 6; k++) pts.push([x + Math.sin(stepT(t) * 1.8 + k * .8 + i) * 22 * (k / 6), y - h * k / 6]);
  tube(g, pts, 26, i % 2 ? C.green : C.mint, 430 + i, 9);
}
function fish(g, x, y, s, dir, color, sd) {
  g.save(); g.translate(x, y); g.scale(s * dir, s);
  shape(g, [[40, 0], [20, 20], [-25, 18], [-45, 0], [-25, -18], [20, -20]], color, { seed: sd, lw: 4.5, amp: 1 });
  shape(g, [[-40, 0], [-72, -24], [-64, 0], [-72, 24]], C.coral, { seed: sd + 1, lw: 4.5, amp: 1 });
  dot(g, 20, -4, 5, C.ink);
  g.restore();
}
function wand(g, x, y, rot, t) {
  g.save(); g.translate(x, y); g.rotate(rot);
  line(g, [[0, 0], [0, -150]], C.ink, 11, 440, .5); line(g, [[0, -5], [0, -145]], C.pink, 5, 441, .5);
  starShape(g, 0, -185, 52, C.mustard, 442, Math.sin(t * 3) * .2);
  g.restore();
}
function moon(g, x, y, r) {
  shape(g, ell(x, y, r, r, 20, 450), C.sun, { seed: 450 });
  g.save(); g.fillStyle = C.night; g.beginPath(); g.arc(x + r * .45, y - r * .25, r * .85, 0, 7); g.fill(); g.restore();
}
function snowflake(g, x, y, s, rot) {
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(s, s);
  for (let i = 0; i < 3; i++) { g.rotate(Math.PI / 3); line(g, [[-22, 0], [22, 0]], C.white, 7, 460 + i, .5); }
  g.restore();
}
function balloonHeart(g, x, y, s, color, hx, hy, sd) {
  line(g, [[x, y + 40 * s], [lerp(x, hx, .5) + 15, lerp(y, hy, .5)], [hx, hy]], C.ink, 3.5, sd, 1.5);
  heart(g, x, y, s * 2.4, Math.sin(sd) * .1, color);
  dot(g, x - 20 * s, y - 25 * s, 8 * s, 'rgba(255,255,255,0.7)');
}
function trophy(g, x, y, s, t) {
  g.save(); g.translate(x, y); g.scale(s, s); g.rotate(Math.sin(t * 4) * .06);
  for (const sx of [-1, 1]) line(g, arcPts(sx * 60, -120, 40, 40, sx > 0 ? -Math.PI * .5 : -Math.PI * .5, sx > 0 ? Math.PI * .5 : Math.PI * 1.5, 8).map(p => p), C.ink, 12, 470 + sx, 1);
  for (const sx of [-1, 1]) line(g, arcPts(sx * 60, -120, 40, 40, sx > 0 ? -Math.PI * .5 : Math.PI * .5, sx > 0 ? Math.PI * .5 : Math.PI * 1.5, 8), C.mustardD, 6, 472 + sx, 1);
  shape(g, [[-75, -180], [75, -180], [60, -90], [25, -50], [-25, -50], [-60, -90]], C.mustard, { seed: 474 });
  shape(g, [[-14, -50], [14, -50], [18, -10], [-18, -10]], C.mustardD, { seed: 475 });
  shape(g, [[-50, -12], [50, -12], [50, 16], [-50, 16]], C.coral, { seed: 476 });
  starShape(g, 0, -125, 26, C.cream, 477, 0);
  g.restore();
}
function commentIcon(g, x, y, s) {
  g.save(); g.translate(x, y); g.scale(s, s);
  shape(g, [[-90, -70], [90, -70], [100, 40], [20, 45], [-30, 95], [-20, 45], [-100, 40]], C.cream, { seed: 480 });
  for (let i = -1; i <= 1; i++) dot(g, i * 42, -12, 12, C.ink);
  g.restore();
}
function bookmarkIcon(g, x, y, s) {
  g.save(); g.translate(x, y); g.scale(s, s);
  shape(g, ell(0, 0, 105, 105, 20, 482), C.cream, { seed: 482 });
  shape(g, [[-45, -65], [45, -65], [45, 65], [0, 32], [-45, 65]], C.mustard, { seed: 481 });
  g.restore();
}
function hint(g, txt, x, y, t, t0) {
  const p = prog(t, t0, .4);
  if (p <= 0) return;
  g.save(); g.globalAlpha = p;
  sticker(g, txt, x, y + (1 - p) * 20, 'Caveat', 60, C.ink, { rot: -.06 });
  g.restore();
}

// ---------- plantilla de escena de nombre ----------
const NAME_COLORS = [C.coral, C.teal, C.violet, C.coral, C.teal, C.mustard, C.teal, C.coral, C.pinkD, C.mustard];
function nameScene(g, t, k, cfg) {
  const b = B[k], lt = t - vis0(k);
  fillBg(g, cfg.bg);
  const L = beginLayer();
  cam(L, lt, b.t_name - vis0(k), cfg.shake ? cfg.shake(t, b) : 0);
  if (cfg.back) cfg.back(L, t, b, lt);
  const enter = eOutBack(prog(t, vis0(k) + .05, .6));
  const o = Object.assign({ x: 540, y: 1400, s: 1.5, seed: 20 + k * 10, blinkOff: k * .37 }, cfg.char(t, b, lt));
  o.y += (1 - enter) * 800;
  const hands = drawChar(L, o, t);
  if (cfg.front) cfg.front(L, t, b, hands, lt);
  const name = b.name;
  const size = fitSize(L, name, 230, 900);
  badge(L, `${b.index}/10`, 120, 225, t, vis0(k) + .25, cfg.badge || C.teal);
  lettersIn(L, name, 540, 380, size, cfg.nameColor || NAME_COLORS[k - 1], t, b.t_name - .05, { wave: cfg.waveText });
  if (cfg.hint) hint(L, cfg.hint, 760, 240, t, b.t_name + .5);
  pill(L, 'significa', 540, 575, t, b.t_meaning, cfg.pill || C.teal);
  const mt = `“${b.meaning}”`;
  writeOn(L, mt, 540, 685, fitSize(L, mt, 100, 950, 'Caveat'), C.ink, t, (b.t_meaning_text || b.t_meaning + .35), .7, cfg.underline || C.coral);
  if (cfg.over) cfg.over(L, t, b, lt);
  endLayer(g);
}

// ---------- narradora ----------
function narrator(t, extra) {
  const m = talk(t);
  return Object.assign({
    hair: 'long', hairColor: '#3A2A22', hairHi: '#5A4034', skin: SKIN.tan, glasses: true, earrings: true,
    sweater: C.teal, sweaterD: '#157A93', collar: C.cream, eyes: 'open', mouth: 4 + m * 46, brow: m * .4, seed: 5,
  }, extra);
}

// ---------- escenas ----------
function sceneHook(g, t) {
  const lt = t;
  fillBg(g);
  const L = beginLayer(); cam(L, lt, 0);
  shape(L, ell(540, 1120, 470, 470, 26, 5, .05, lt * .1), C.mint, { lw: 0, amp: 5, seed: 40 });
  shape(L, ell(540, 1120, 330, 330, 22, 6, .05, -lt * .1), C.cream, { lw: 0, amp: 4, seed: 41 });
  bunting(L, 790, t, [C.green, C.white, C.red], 500);
  pizza(L, 150 + Math.sin(t * 1.5) * 20, 1050 + Math.sin(t * 2) * 30, 1.1, Math.sin(t) * .3 - .2);
  gelato(L, 930 + Math.sin(t * 1.7) * 15, 1080 + Math.cos(t * 2) * 30, 1.0, Math.sin(t * 1.3) * .2 + .15);
  const enter = eOutBack(prog(t, .05, .7));
  const waving = t < 2.6 || t > 6.8;
  const pose = waving ? { armR: POSE.wave, armL: POSE.rest } : t < 4.4 ? { armR: POSE.hips, armL: POSE.hips } : { armR: POSE.point, armL: POSE.rest };
  drawChar(L, narrator(t, Object.assign({ x: 540, y: 1420 + (1 - enter) * 800, s: 1.5, eyes: t > 3.7 && t < 4.3 ? 'happy' : 'open' }, pose)), t);
  popWord(L, 'Nombres', 540, 215, 130, C.teal, t, .35, -.03);
  popWord(L, 'ITALIANOS', 540, 370, 165, C.green, t, .75, .02);
  const fl = prog(t, 1.1, .5);
  if (fl > 0) {
    const w = 640 * eOutCubic(fl);
    [[C.green, -1], [C.white, 0], [C.red, 1]].forEach(([c, i]) => { L.fillStyle = C.ink; L.fillRect(540 - w / 2 + (i + 1) * w / 3 - 4, 448, w / 3 + 8, 30); L.fillStyle = c; L.fillRect(540 - w / 2 + (i + 1) * w / 3, 452, w / 3, 22); });
  }
  popWord(L, 'para niña', 540, 545, 120, C.coral, t, 1.3, -.02);
  pill(L, '¡Quédate hasta el final!', 540, 680, t, 4.4, C.mustardD, 46);
  if (t > 5.6) {
    const p = eOutBack(prog(t, 5.7, .45));
    L.save(); L.translate(850, 690); L.scale(p, p); L.rotate(.2 + Math.sin(t * 4) * .1);
    shape(L, [[-60, 30], [-66, -35], [-30, -5], [0, -50], [30, -5], [66, -35], [60, 30]], C.mustard, { seed: 510 });
    L.restore();
  }
  if (t > 1.2) for (let i = 0; i < 3; i++) sparkle(L, [120, 960, 900][i], [370, 250, 520][i], .6 + .4 * Math.sin(t * 5 + i * 2), [C.mustard, C.coral, C.teal][i]);
  endLayer(g);
}

function sceneAurora(g, t) {
  const k = 1, ring0 = B[k].segs[3][0];
  nameScene(g, t, k, {
    bg: '#FCE3C8',
    shake: (t) => (t > ring0 && t < ring0 + 1.1) ? 14 : 0,
    back: (L, t, b, lt) => {
      const sy = lerp(1250, 930, eOutCubic(prog(t, vis0(k), 3)));
      rays(L, 540, sy, 300, 620, 16, t * .15, C.sun, .55);
      shape(L, ell(540, sy, 250, 250, 24, 60, .03), C.sun, { lw: 0, seed: 60 });
      shape(L, [[-100, 1300], [200, 1130], [520, 1250], [820, 1100], [1180, 1260], [1180, 2000], [-100, 2000]], C.mint, { seed: 61 });
      shape(L, [[-100, 1420], [300, 1280], [700, 1400], [1180, 1300], [1180, 2000], [-100, 2000]], C.green, { seed: 62 });
      for (let i = 0; i < 3; i++) bird(L, (-100 + (t * 150 + i * 380) % 1350), 950 + i * 60, .8, Math.sin(stepT(t) * 14 + i * 2), C.deep);
    },
    char: (t, b) => {
      const ring = t > ring0 && t < ring0 + 1.3;
      if (t < b.t_name + .15) return { hair: 'bob', hairColor: '#5B3A29', hairHi: '#7E5640', skin: SKIN.light, sweater: C.sky, sweaterD: '#7BB9CE', collar: C.cream, pattern: 'moons', eyes: 'closed', mouth: 'o', armL: POSE.stretch, armR: POSE.stretch, tilt: -.08 };
      if (ring) return { hair: 'bob', hairColor: '#5B3A29', hairHi: '#7E5640', skin: SKIN.light, sweater: C.sky, sweaterD: '#7BB9CE', collar: C.cream, pattern: 'moons', eyes: 'wide', brow: 1, mouth: 'o', armL: POSE.up, armR: POSE.up, bounce: -Math.abs(Math.sin(t * 20)) * 25 };
      return { hair: 'bob', hairColor: '#5B3A29', hairHi: '#7E5640', skin: SKIN.light, sweater: C.sky, sweaterD: '#7BB9CE', collar: C.cream, pattern: 'moons', eyes: t > ring0 ? 'open' : 'happy', mouth: 34, armL: POSE.rest, armR: t < b.t_meaning + 1.2 ? POSE.wave : POSE.rest };
    },
    front: (L, t) => alarmClock(L, 870, 1250, t > ring0 && t < ring0 + 1.3, t),
    over: (L, t) => { if (t > ring0 && t < ring0 + 1.4) popWord(L, '¡5:00 AM!', 800, 1560, 100, C.coral, t, ring0, .1); },
    pill: C.coral, underline: C.mustardD,
  });
}

function sceneChiara(g, t) {
  const k = 2, on = B[k].segs[3][0];
  nameScene(g, t, k, {
    bg: t < on ? '#C9C3D8' : '#FFF1C9',
    back: (L, t, b) => {
      if (t >= on) { rays(L, 540, 1100, 250, 900, 18, t * .25, C.sun, .65); burst(L, 800, 860, prog(t, on, .5), C.mustardD, 12, 90, 240, 520); }
      shape(L, ell(540, 1120, 420, 420, 24, 70, .05), t < on ? '#A8A2BE' : C.sun, { lw: 0, seed: 70 });
    },
    char: (t, b) => {
      const lit = t >= on;
      return { hair: 'curly', hairColor: '#E9B949', hairHi: '#F7D57A', skin: SKIN.tan, sweater: C.teal, sweaterD: '#157A93', collar: C.mustard, eyes: lit ? 'happy' : 'open', look: lit ? 0 : 1, mouth: lit ? 42 : 'smile', armR: lit && t < on + 1 ? POSE.up : POSE.point, armL: lit && t < on + 1 ? POSE.up : POSE.rest, bounce: lit && t < on + .6 ? -Math.sin(prog(t, on, .6) * Math.PI) * 60 : 0 };
    },
    front: (L, t) => bulb(L, 830, 880, 1.05, t >= on, t),
    hint: 'se dice «Kiara»', pill: C.teal, underline: C.mustardD,
  });
}

function sceneViolet(g, t) {
  const k = 3, charT = B[k].segs[4][0];
  nameScene(g, t, k, {
    bg: '#EFE6F7',
    back: (L, t, b) => {
      shape(L, ell(540, 1150, 440, 440, 24, 80, .06, t * .1), C.lilac, { lw: 0, seed: 80 });
      const xs = [70, 200, 330, 750, 880, 1010];
      xs.forEach((x, i) => flower(L, x, 1650, 320 + (i % 3) * 90, prog(t, vis0(k) + .2 + i * .18, 1.2), t, i));
      butterfly(L, 200 + Math.sin(t * .9) * 120, 950 + Math.sin(t * 1.7) * 60, t, C.mustard, 490);
      butterfly(L, 860 + Math.cos(t * .8) * 100, 1000 + Math.sin(t * 1.3) * 70, t, C.pink, 495);
    },
    char: (t) => {
      const strong = t >= charT;
      return { hair: 'braids', hairColor: '#3A2A22', hairHi: '#5A4034', skin: SKIN.fair, sweater: C.violet, sweaterD: C.violetD, collar: C.lilac, eyes: strong ? 'open' : 'happy', brow: strong ? -1 : 0, mouth: strong ? 'smile' : 30, armL: strong ? POSE.hips : POSE.rest, armR: strong ? POSE.hips : POSE.hold, tilt: strong ? .1 : 0 };
    },
    front: (L, t, b, hands) => {
      if (t < charT && hands[1]) flower(L, hands[1][0], hands[1][1] + 30, 150, 1, t, 9);
      if (t >= charT) burst(L, 540, 1080, prog(t, charT, .45), C.violetD, 10, 330, 460, 530);
    },
    pill: C.violet, underline: C.mustardD,
  });
}

function sceneAllegra(g, t) {
  const k = 4, party = B[k].segs[3][0];
  nameScene(g, t, k, {
    bg: '#FFE7DA',
    shake: (t) => (t > party && t < party + .5) ? 10 : 0,
    back: (L, t) => {
      rays(L, 540, 1150, 200, 900, 20, -t * .2, C.peach, .5);
      bunting(L, 830, t, [C.teal, C.mustard, C.coral, C.pink], 540);
      confettiField(L, t, vis0(k), 25, 550);
    },
    char: (t) => {
      const p = t >= party;
      const dance = Math.sin(stepT(t) * 7);
      return { hair: 'pigtails', hairColor: '#1F2340', hairHi: '#3C4478', skin: SKIN.brown, sweater: C.coral, sweaterD: C.coralD, collar: C.mustard, hat: 'party', eyes: 'happy', mouth: p ? 46 : 36, armL: p ? POSE.up : (dance > 0 ? POSE.wave : POSE.rest), armR: p ? POSE.up : (dance > 0 ? POSE.rest : POSE.wave), bounce: -Math.abs(Math.sin(stepT(t) * (p ? 9 : 5))) * (p ? 55 : 22), tilt: dance * .07 };
    },
    front: (L, t) => {
      if (t > party) confettiField(L, t, party, 70, 560, [0, W, -200, H]);
      const hp = prog(t, party, .25), hq = prog(t, party + .6, .25);
      const ext = hp * (1 - hq);
      if (ext > 0) {
        L.save(); L.translate(540 + 20 * 1.5, 1400 + -85 * 1.5);
        const len = 260 * ext;
        L.fillStyle = C.ink; L.fillRect(0, -16, len + 6, 32);
        for (let i = 0; i < len; i += 30) { L.fillStyle = (i / 30) % 2 ? C.teal : C.mustard; L.fillRect(i, -12, Math.min(30, len - i), 24); }
        L.restore();
      }
    },
    over: (L, t) => { if (t > party) popWord(L, '¡FIESTA!', 540, 1610, 120, C.mustard, t, party, -.08); },
    pill: C.coral, underline: C.teal,
  });
}

function sceneGreta(g, t) {
  const k = 5, open0 = B[k].t_meaning, glow0 = B[k].segs[4][0];
  nameScene(g, t, k, {
    bg: '#BFE6EE',
    back: (L, t) => {
      L.save(); L.globalAlpha = .25; L.fillStyle = C.white;
      for (let i = 0; i < 4; i++) { const x = 150 + i * 260 + Math.sin(t * .6 + i) * 30; L.beginPath(); L.moveTo(x, -100); L.lineTo(x + 120, -100); L.lineTo(x + 380, 1800); L.lineTo(x + 200, 1800); L.fill(); }
      L.restore();
      [60, 170, 910, 1020].forEach((x, i) => seaweed(L, x, 1950, 520 + (i % 2) * 180, t, i));
      fish(L, -120 + (t * 170) % 1400, 960, .9, 1, C.mustard, 600);
      fish(L, 1200 - (t * 130 + 500) % 1400, 1120, .7, -1, C.coral, 610);
      for (let i = 0; i < 14; i++) { const x = rnd(i + 620) * W + Math.sin(t * 2 + i) * 15, y = 1950 - ((t * 140 + rnd(i + 640) * 1300) % 1300); L.beginPath(); L.arc(x, y, 8 + rnd(i) * 14, 0, 7); L.strokeStyle = C.white; L.lineWidth = 5; L.stroke(); }
    },
    char: (t) => {
      const opened = t > open0;
      return { hair: 'bob', hairColor: '#D9582B', hairHi: '#F07B45', skin: SKIN.light, sweater: C.cream, stripes: C.denim, collar: C.denim, eyes: t > glow0 ? 'wide' : opened ? 'happy' : 'open', brow: t > glow0 ? .8 : 0, mouth: opened ? 40 : 'smile', armL: POSE.hold, armR: POSE.hold, look: -.5 };
    },
    front: (L, t, b, hands) => {
      const op = eOutBack(prog(t, open0, .5));
      const glow = t > glow0 ? .6 + .4 * Math.sin(t * 8) : (t > open0 ? .3 : 0);
      shell(L, 540, 1640, 1.5, op, glow, t);
      if (t > glow0) for (let i = 0; i < 4; i++) sparkle(L, 540 + Math.cos(i * 1.6 + t) * 200, 1560 + Math.sin(i * 2.1 + t) * 70, .5 + .3 * Math.sin(t * 6 + i), C.white);
    },
    pill: C.deep, underline: C.coral, nameColor: C.deep,
  });
}

function sceneStella(g, t) {
  const k = 6, shoot = B[k].t_joke, smug = B[k].segs[3][0];
  nameScene(g, t, k, {
    bg: C.night,
    back: (L, t) => {
      for (let i = 0; i < 45; i++) {
        const x = rnd(i + 700) * W, y = rnd(i + 760) * 1500 + 100;
        if (y > 300 && y < 760 && x > 60 && x < 1020) continue;
        sparkle(L, x, y, (.2 + rnd(i) * .35) * (.6 + .4 * Math.sin(t * 3 + i)), i % 4 ? C.cream : C.sun);
      }
      moon(L, 880, 1000, 90);
      const sp = prog(t, shoot, .9);
      if (sp > 0 && sp < 1) {
        const x = lerp(-100, 1150, sp), y = lerp(820, 1150, sp);
        L.save(); L.globalAlpha = 1 - sp * .3;
        line(L, [[x - 300, y - 80], [x - 150, y - 40], [x, y]], C.sun, 14, 720, 1);
        L.restore();
        starShape(L, x, y, 38, C.sun, 721, sp * 6);
      }
    },
    char: (t) => {
      const s = t > smug;
      return { hair: 'puffs', hairColor: '#1F1A1A', hairHi: '#3A3030', skin: SKIN.deep, sweater: C.pink, sweaterD: C.pinkD, collar: C.mustard, pattern: 'star', eyes: s ? 'happy' : 'open', look: s ? 0 : .8, mouth: s ? 'smile' : 36, tilt: s ? -.12 : 0, armR: { a1: POSE.wandUp.a1 + Math.sin(stepT(t) * 3) * .12, a2: POSE.wandUp.a2, hand: 'fist' }, armL: s ? POSE.hips : POSE.rest };
    },
    front: (L, t, b, hands) => {
      if (hands[1]) {
        L.save(); L.translate(hands[1][0], hands[1][1]); L.scale(1.35, 1.35); wand(L, 0, 0, .15 + Math.sin(stepT(t) * 3) * .2, t); L.restore();
        for (let i = 0; i < 5; i++) { const tt = t - i * .08; sparkle(L, hands[1][0] + 50 + Math.sin(tt * 3) * 70 - i * 14, hands[1][1] - 270 + i * 28, .45 - i * .07, C.sun); }
      }
      if (t > smug) { const p = prog(t, smug, .3); sparkle(L, 470, 1100, eOutBack(p) * .9 * (1 - prog(t, smug + .6, .3)), C.white); }
    },
    pill: C.coral, underline: C.sun, nameColor: C.mustard, badge: C.coral,
  });
}

function sceneSerena(g, t) {
  const k = 7, snap = B[k].segs[3][0];
  nameScene(g, t, k, {
    bg: '#D8EEF5',
    shake: (t) => (t > snap && t < snap + .45) ? 18 : 0,
    back: (L, t) => {
      shape(L, ell(540, 1130, 430, 430, 24, 90, .04, t * .05), C.sky, { lw: 0, seed: 90 });
      cloud(L, (t * 40) % 1400 - 200, 900, .9, C.white, 91);
      cloud(L, 1200 - (t * 30 + 300) % 1400, 1250, 1.1, C.white, 92);
      cloud(L, (t * 25 + 700) % 1400 - 200, 1550, .8, C.white, 93);
      if (t < snap) for (let i = 0; i < 3; i++) { const p = ((t * .5 + i / 3) % 1); L.save(); L.globalAlpha = 1 - p; sticker(L, 'z', 760 + p * 90 + i * 10, 1000 - p * 200, 'Fredoka', 60 + i * 12, C.deep, {}); L.restore(); }
    },
    char: (t) => {
      const s = t > snap;
      const float = Math.sin(t * 1.6) * 18;
      if (!s) return { hair: 'long', hairColor: '#1F2340', hairHi: '#3C4478', skin: SKIN.tan, sweater: C.mint, sweaterD: '#7CC095', collar: C.cream, eyes: 'closed', mouth: 'smile', armL: POSE.hold, armR: POSE.hold, bounce: float, tiltAmp: .02 };
      const lau = t > snap + .6;
      return { hair: 'long', hairColor: '#1F2340', hairHi: '#3C4478', skin: SKIN.tan, sweater: C.mint, sweaterD: '#7CC095', collar: C.cream, eyes: lau ? 'happy' : 'wide', brow: lau ? 0 : 1.2, mouth: lau ? 44 : 'o', armL: POSE.up, armR: POSE.up, bounce: lau ? -Math.abs(Math.sin(stepT(t) * 9)) * 20 : -30 };
    },
    over: (L, t) => { if (t > snap && t < snap + 1.2) popWord(L, '¡!', 820, 980, 150, C.coral, t, snap, .15); },
    pill: C.deep, underline: C.teal,
  });
}

function sceneBianca(g, t) {
  const k = 8, chic = B[k].segs[6][0], tilt0 = B[k].segs[4][0];
  nameScene(g, t, k, {
    bg: '#FBE3EA',
    back: (L, t) => {
      shape(L, ell(540, 1130, 440, 440, 24, 100, .05, t * .1), C.pink, { lw: 0, seed: 100 });
      for (let i = 0; i < 22; i++) { const x = rnd(i + 800) * W + Math.sin(t + i) * 25, y = ((t * (60 + rnd(i + 30) * 50) + rnd(i + 820) * 1800) % 1900) - 50; if (y > 280 && y < 760 && x > 80 && x < 1000) continue; snowflake(L, x, y, .8 + rnd(i) * .6, t * .5 + i); }
    },
    char: (t) => {
      const c = t > chic;
      return { hair: 'bun', hairColor: '#E9B949', hairHi: '#F7D57A', skin: SKIN.light, sweater: C.white, stripes: C.navy, collar: C.navy, hat: 'beret', eyes: 'open', look: t > tilt0 ? -.6 : 0, mouth: c ? 'smile' : 30, tilt: t > tilt0 ? .12 : 0, armL: c ? POSE.hips : POSE.rest, armR: POSE.hips, sunglasses: prog(t, chic, .5) };
    },
    over: (L, t) => {
      if (t > chic) { burst(L, 540, 1130, prog(t, chic + .35, .4), C.mustard, 12, 280, 420, 830); sparkle(L, 660, 1080, eOutBack(prog(t, chic + .4, .3)) * 1.1, C.white); popWord(L, 'chic ✦', 540, 1000, 100, C.navy, t, chic + .3, -.1); }
    },
    pill: C.navy, underline: C.pinkD, nameColor: C.navy, badge: C.pinkD,
  });
}

function sceneBeatrice(g, t) {
  const k = 9, joy = B[k].t_joke;
  nameScene(g, t, k, {
    bg: '#FFE4D6',
    back: (L, t) => {
      shape(L, ell(540, 1130, 440, 440, 24, 110, .05, -t * .1), C.peach, { lw: 0, seed: 110 });
      for (let i = 0; i < 8; i++) { const x = rnd(i + 840) * W + Math.sin(t * 1.5 + i) * 30, y = 1900 - ((t * 120 + rnd(i + 860) * 1200) % 1200); heart(L, x, y, .8 + rnd(i) * .6, Math.sin(t + i) * .2, i % 2 ? C.pink : C.coral); }
    },
    char: (t) => {
      const j = t > joy;
      return { hair: 'ponytail', hairColor: '#6B4430', hairHi: '#8A5C44', skin: SKIN.brown, sweater: C.pink, sweaterD: C.pinkD, collar: C.cream, pattern: 'heart', eyes: j ? 'happy' : 'open', mouth: j ? 46 : 34, armL: POSE.upFist, armR: j ? POSE.wave : POSE.rest, bounce: j ? -Math.abs(Math.sin(stepT(t) * 7)) * 30 : 0 };
    },
    front: (L, t, b, hands) => {
      if (!hands[-1]) return;
      const [hx, hy] = hands[-1];
      [[C.coral, 95, 905], [C.pink, 215, 835], [C.red, 320, 940]].forEach(([c, bx, by], i) => {
        const popT = joy + .15 + i * .2;
        if (i === 1 && t > popT) { burst(L, bx, by, prog(t, popT, .4), C.coral, 10, 20, 150, 850); return; }
        balloonHeart(L, bx + Math.sin(t * 1.5 + i) * 14, by + Math.cos(t * 1.8 + i) * 12, 1.05, c, hx, hy, 870 + i);
      });
      if (t > joy) for (let i = 0; i < 6; i++) { const p = ((t - joy) * .6 + i / 6) % 1; const side = i % 2 ? 1 : -1; heart(L, 540 + side * (280 + (i % 3) * 60), 1500 - p * 500, .9 * (1 - p), 0, C.coral); }
    },
    hint: 'se dice «Beatriche»', pill: C.pinkD, underline: C.coral,
  });
}

function sceneVittoria(g, t) {
  const k = 10, reveal = B[k].t_name;
  nameScene(g, t, k, {
    bg: t < reveal ? '#E6DCCB' : '#FFF0CF',
    back: (L, t) => {
      if (t >= reveal) { rays(L, 540, 1150, 250, 1100, 22, t * .3, C.sun, .8); rays(L, 540, 1150, 250, 1100, 22, t * .3 + .14, C.peach, .5); }
      else { L.save(); L.globalAlpha = .35; L.fillStyle = C.ink; L.fillRect(0, 0, W, H); L.restore(); const gr = L.createRadialGradient(540, 1150, 50, 540, 1150, 520); gr.addColorStop(0, 'rgba(255,240,200,0.8)'); gr.addColorStop(1, 'rgba(255,240,200,0)'); L.fillStyle = gr; L.fillRect(0, 0, W, H); }
      if (t >= reveal) confettiField(L, t, reveal, 70, 900, [0, W, -200, H]);
    },
    char: (t) => {
      const r = t >= reveal;
      return { hair: 'long', hairColor: '#5B3A29', hairHi: '#7E5640', skin: SKIN.fair, sweater: C.mustard, sweaterD: C.mustardD, collar: C.coral, hat: r ? 'crown' : null, eyes: r ? 'happy' : 'open', look: r ? 0 : Math.sin(t * 3), mouth: r ? 48 : 'o', armL: r ? POSE.up : POSE.rest, armR: r ? POSE.upFist : POSE.rest, bounce: r ? -Math.abs(Math.sin(stepT(t) * 6)) * 35 : 0 };
    },
    front: (L, t, b, hands) => {
      if (t >= reveal && hands[1]) trophy(L, hands[1][0], hands[1][1] - 10, 1.05, t);
      burst(L, 540, 1100, prog(t, reveal, .5), C.coral, 14, 350, 560, 910);
    },
    over: (L, t) => { if (t < reveal) popWord(L, 'mi favorito…', 540, 1000, 90, C.coral, t, B[k].segs[0][0] + .1, -.05); },
    pill: C.coral, underline: C.teal, nameColor: C.coral, badge: C.mustardD,
  });
}

function sceneCta(g, t) {
  const b = B[11], lt = t - vis0(11), s = b.segs;
  fillBg(g, '#F4EDE3');
  const L = beginLayer(); cam(L, lt, .4);
  shape(L, ell(540, 1130, 460, 460, 26, 120, .05, t * .1), C.mint, { lw: 0, seed: 120 });
  bunting(L, 830, t, [C.green, C.white, C.red], 930);
  const bye = t > s[5][0] - .2;
  const pose = bye ? { armR: POSE.wave, armL: POSE.rest } : t > s[2][0] ? { armR: POSE.point, armL: POSE.rest } : { armR: POSE.hips, armL: POSE.hips };
  const enter = eOutBack(prog(t, vis0(11) + .05, .6));
  drawChar(L, narrator(t, Object.assign({ x: 540, y: 1420 + (1 - enter) * 800, s: 1.5, eyes: bye ? 'happy' : 'open' }, pose)), t);
  popWord(L, '¿Cuál elegirías tú?', 540, 215, 100, C.teal, t, s[0][0] - .1, -.03);
  const names = B.slice(1, 11).map(x => x.name);
  names.forEach((n, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = col ? 760 : 320, y = 345 + row * 88;
    const p = prog(t, s[1][0] + i * .09, .3);
    if (p <= 0) return;
    const e = eOutBack(p);
    L.save(); L.translate(x, y); L.scale(e, e); L.rotate((col ? .03 : -.03));
    L.font = '600 46px Fredoka'; const w = L.measureText(n).width + 100;
    L.beginPath(); L.roundRect(-w / 2 + 5, -33 + 7, w, 66, 33); L.fillStyle = C.ink; L.fill();
    L.beginPath(); L.roundRect(-w / 2, -33, w, 66, 33); L.fillStyle = [C.coral, C.teal, C.violet, C.mustardD, C.deep, C.pinkD][i % 6]; L.fill(); L.strokeStyle = C.ink; L.lineWidth = 4.5; L.stroke();
    L.fillStyle = C.cream; L.textAlign = 'center'; L.textBaseline = 'middle'; L.fillText(`${i + 1}. ${n}`, 0, 3);
    L.restore();
  });
  const cp = prog(t, s[2][0], .45), bp = prog(t, s[3][0], .45);
  if (cp > 0) { commentIcon(L, 175, 1020 + Math.sin(t * 5) * 8, eOutBack(cp) * 1.05); pill(L, 'comenta', 175, 1165, t, s[2][0] + .1, C.coral, 40); }
  if (bp > 0) { bookmarkIcon(L, 905, 1020 + Math.cos(t * 5) * 8, eOutBack(bp) * 1.05); pill(L, 'guárdalo', 905, 1165, t, s[3][0] + .1, C.mustardD, 40); }
  if (bye) {
    popWord(L, '¡Ciao, ciao!', 540, 1620, 140, C.coral, t, s[5][0] - .1, -.05);
    for (let i = 0; i < 5; i++) { const p = ((t - s[5][0]) * .8 + i / 5) % 1; heart(L, 540 + Math.sin(i * 2.1) * 260, 1150 - p * 380, 1.2 * (1 - p), 0, i % 2 ? C.coral : C.pink); }
  }
  endLayer(g);
}

const SCENES = [sceneHook, sceneAurora, sceneChiara, sceneViolet, sceneAllegra, sceneGreta, sceneStella, sceneSerena, sceneBianca, sceneBeatrice, sceneVittoria, sceneCta];
const TRANS = [null, 'iris', 'stripes', 'paper', 'blinds', 'iris', 'stripes', 'paper', 'blinds', 'iris', 'stripes', 'paper'];
const TCOLS = [[C.green, C.cream, C.red, C.ink], [C.mustard, C.coral, C.teal, C.denim], [C.violet, C.lilac, C.mustard, C.ink], [C.coral, C.mustard, C.teal, C.pink], [C.deep, C.teal, C.sky, C.white], [C.night, C.mustard, C.pink, C.coral], [C.sky, C.mint, C.teal, C.white], [C.navy, C.pink, C.white, C.red], [C.pink, C.coral, C.mustard, C.red], [C.mustard, C.coral, C.teal, C.green], [C.green, C.cream, C.red, C.ink]];

function renderFrame(t) {
  BOIL = Math.floor(t * 8);
  X.setTransform(1, 0, 0, 1, 0, 0);
  let k = 0;
  for (let i = 1; i < B.length; i++) if (t >= vis0(i)) k = i;
  const tr0 = k > 0 ? vis0(k) : -1, tr1 = tr0 + .5;
  if (k > 0 && t < tr1) {
    SCENES[k - 1](X, t);
    SCENES[k](BX, t);
    const p = (t - tr0) / .5;
    const type = TRANS[k], cols = TCOLS[k - 1];
    if (type === 'iris') tIris(p, 540, 1100, cols[0]);
    else if (type === 'stripes') tStripes(p, cols);
    else if (type === 'paper') tPaper(p, cols[0]);
    else tBlinds(p, cols);
  } else SCENES[k](X, t);
  if (t >= DUR - .75) irisOut(clamp((t - (DUR - .75)) / .7), 540, 1150);
  X.setTransform(1, 0, 0, 1, 0, 0);
  X.globalAlpha = .5; X.drawImage(FINE[BOIL % 2], 0, 0); X.globalAlpha = 1;
}

window.renderFrame = renderFrame;
window.ready = Promise.all([
  document.fonts.load('700 100px Fredoka'), document.fonts.load('600 50px Fredoka'), document.fonts.load('700 100px Caveat'),
]).then(() => document.fonts.ready);
if (location.hash !== '#render') {
  window.ready.then(() => {
    const t0 = performance.now();
    const loop = () => { renderFrame(((performance.now() - t0) / 1000) % DUR); requestAnimationFrame(loop); };
    loop();
  });
}
