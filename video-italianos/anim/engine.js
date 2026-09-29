// Motor de dibujo: estilo ilustración plana con textura de impresión, líneas que "hierven",
// personajes con manos articuladas, utilería y textos animados. Todo determinista por tiempo.

const W = 1080, H = 1920, FPS = 30;
const C = {
  paper: '#F4EDE3', cream: '#FBF6EE', ink: '#1E2235', white: '#FFFDF8',
  teal: '#1E9CB8', tealLight: '#6CC3DD', deep: '#1B5E8C', sky: '#A9DCEB',
  mustard: '#F2B13B', mustardD: '#D8952A', sun: '#F7C75E',
  coral: '#E8553E', coralD: '#C43F2C', peach: '#F6A77E',
  denim: '#3553A5', navy: '#1C2447', night: '#233064',
  violet: '#8E6BBF', violetD: '#6E4FA0', lilac: '#C7B2E6',
  pink: '#F28DA6', pinkD: '#D96C88', mint: '#9ED6B0', green: '#2F8F5B', greenD: '#23704A',
  red: '#D8413A', nose: '#EE8F78', mouth: '#7B2233', tongue: '#EE7F77',
};
const SKIN = { light: '#F6C9AA', fair: '#F6BE9E', tan: '#E8A57E', brown: '#C98B62', deep: '#8D5A3B' };

let BOIL = 0;
const cv = document.getElementById('c');
const X = cv.getContext('2d');
function mk(w = W, h = H) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
const bufB = mk(), layer = mk();
const BX = bufB.getContext('2d'), LX = layer.getContext('2d');

// ---------- utilidades ----------
function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function rnd(n) { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const eOutCubic = t => 1 - Math.pow(1 - t, 3);
const eInCubic = t => t * t * t;
const eInOutCubic = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const eOutBack = t => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
const eOutElastic = t => t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - .75) * (2 * Math.PI / 3)) + 1;
const prog = (t, t0, d) => clamp((t - t0) / d);
const stepT = t => Math.floor(t * 12) / 12; // movimiento "en dos" (12 fps)

// ---------- texturas ----------
function makeGrain(seed, scale, dark, light, darkA = 90) {
  const w = Math.ceil(W / scale), h = Math.ceil(H / scale);
  const c = mk(w, h), g = c.getContext('2d');
  const id = g.createImageData(w, h), d = id.data, r = mulberry(seed);
  for (let i = 0; i < w * h; i++) {
    const v = r(), o = i * 4;
    if (v < dark) { d[o] = 25; d[o + 1] = 25; d[o + 2] = 45; d[o + 3] = 30 + r() * darkA; }
    else if (v > 1 - light) { d[o] = 255; d[o + 1] = 250; d[o + 2] = 238; d[o + 3] = 50 + r() * 110; }
  }
  g.putImageData(id, 0, 0);
  if (scale === 1) return c;
  const big = mk(), bg = big.getContext('2d');
  bg.imageSmoothingEnabled = true; bg.drawImage(c, 0, 0, W, H);
  return big;
}
const GRAIN = [makeGrain(1, 2, .22, .07), makeGrain(2, 2, .22, .07), makeGrain(3, 2, .22, .07)];
const FINE = [makeGrain(7, 1, .09, .05, 55), makeGrain(8, 1, .09, .05, 55)];
function makePaper(base, seed) {
  const c = mk(), g = c.getContext('2d'), r = mulberry(seed);
  g.fillStyle = base; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 40; i++) {
    const x = r() * W, y = r() * H, rr = 80 + r() * 280;
    const gr = g.createRadialGradient(x, y, 0, x, y, rr);
    gr.addColorStop(0, 'rgba(150,110,70,0.06)'); gr.addColorStop(1, 'rgba(150,110,70,0)');
    g.fillStyle = gr; g.fillRect(x - rr, y - rr, rr * 2, rr * 2);
  }
  for (let i = 0; i < 2600; i++) {
    const x = r() * W, y = r() * H, a = r() * Math.PI, l = 4 + r() * 18;
    g.strokeStyle = r() < .5 ? 'rgba(100,80,60,0.07)' : 'rgba(255,255,255,0.3)';
    g.lineWidth = 1 + r() * 1.5;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
  }
  return c;
}
const PAPER = makePaper(C.paper, 99);

// ---------- trazos a mano ----------
function jit(pts, seed, amp = 2.4) {
  return pts.map((p, i) => [
    p[0] + (rnd(seed * 97.3 + i * 13.7 + BOIL * 57.1) - .5) * 2 * amp,
    p[1] + (rnd(seed * 41.9 + i * 7.3 + BOIL * 91.7 + 3.3) - .5) * 2 * amp,
  ]);
}
function closedPath(g, p) {
  const n = p.length;
  g.moveTo(p[0][0], p[0][1]);
  for (let i = 0; i < n; i++) {
    const p0 = p[(i - 1 + n) % n], p1 = p[i], p2 = p[(i + 1) % n], p3 = p[(i + 2) % n];
    g.bezierCurveTo(p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6, p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6, p2[0], p2[1]);
  }
  g.closePath();
}
function openPath(g, p) {
  const n = p.length;
  g.moveTo(p[0][0], p[0][1]);
  for (let i = 0; i < n - 1; i++) {
    const p0 = p[Math.max(i - 1, 0)], p1 = p[i], p2 = p[i + 1], p3 = p[Math.min(i + 2, n - 1)];
    g.bezierCurveTo(p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6, p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6, p2[0], p2[1]);
  }
}
function ell(cx, cy, rx, ry, k = 20, seed = 0, irr = 0, rot = 0) {
  const o = [];
  for (let i = 0; i < k; i++) {
    const a = i / k * Math.PI * 2 + rot, m = 1 + (rnd(seed * 3.1 + i * 1.7) - .5) * irr;
    o.push([cx + Math.cos(a) * rx * m, cy + Math.sin(a) * ry * m]);
  }
  return o;
}
function arcPts(cx, cy, rx, ry, a0, a1, k) {
  const o = [];
  for (let i = 0; i <= k; i++) { const a = lerp(a0, a1, i / k); o.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); }
  return o;
}
function shape(g, pts, fill, o = {}) {
  const { stroke = C.ink, lw = 5, seed = 1, amp = 2.2 } = o;
  const p = jit(pts, seed, amp);
  g.beginPath(); closedPath(g, p);
  if (fill) { g.fillStyle = fill; g.fill(); }
  if (stroke && lw > 0) { g.strokeStyle = stroke; g.lineWidth = lw; g.lineJoin = 'round'; g.stroke(); }
}
function line(g, pts, color, lw, seed = 1, amp = 1.8) {
  const p = jit(pts, seed, amp);
  g.beginPath(); openPath(g, p);
  g.strokeStyle = color; g.lineWidth = lw; g.lineCap = 'round'; g.lineJoin = 'round'; g.stroke();
}
function tube(g, pts, w, color, seed = 1, outline = 11) {
  const p = jit(pts, seed, 2);
  g.lineCap = 'round'; g.lineJoin = 'round';
  g.beginPath(); openPath(g, p);
  g.strokeStyle = C.ink; g.lineWidth = w + outline; g.stroke();
  g.strokeStyle = color; g.lineWidth = w; g.stroke();
}
function dot(g, x, y, r, color) { g.fillStyle = color; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }

// ---------- manos y brazos ----------
// Mano articulada: palma + 4 dedos + pulgar. pose: 'open' (saludando), 'fist' (sujetando), 'rest' (relajada)
function hand(g, x, y, ang, sx, pose, skin, sd, wiggle = 0) {
  g.save(); g.translate(x, y); g.rotate(ang - Math.PI / 2); g.scale(sx, 1);
  if (pose === 'open') {
    for (let i = 0; i < 4; i++) {
      const a = (-0.42 + i * 0.28) + Math.sin(wiggle + i) * 0.06;
      const len = [30, 38, 38, 32][i];
      const bx = -17 + i * 11.5, by = 44;
      tube(g, [[bx, by], [bx + Math.sin(a) * len * .55, by + Math.cos(a) * len * .55], [bx + Math.sin(a) * len, by + Math.cos(a) * len]], 14, skin, sd + i, 8);
    }
    tube(g, [[-20, 22], [-38, 32], [-50, 46]], 15, skin, sd + 5, 8);
    shape(g, ell(0, 30, 28, 27, 12, sd + 6, .05), skin, { seed: sd + 6, lw: 4 });
  } else if (pose === 'fist') {
    shape(g, ell(0, 30, 31, 29, 12, sd + 6, .05), skin, { seed: sd + 6, lw: 4.5 });
    for (let i = 0; i < 3; i++) line(g, [[-16 + i * 13, 50], [-10 + i * 13, 56]], C.ink, 3.2, sd + 10 + i, .6);
    tube(g, [[-24, 20], [-14, 38], [4, 44]], 14, skin, sd + 5, 7);
  } else {
    tube(g, [[-10, 40], [-6, 58], [2, 68]], 34, skin, sd + 3, 8);
    tube(g, [[-22, 22], [-34, 36], [-38, 48]], 14, skin, sd + 5, 7);
    shape(g, ell(0, 30, 28, 27, 12, sd + 6, .05), skin, { seed: sd + 6, lw: 4 });
    line(g, [[-2, 52], [2, 66]], C.ink, 3, sd + 7, .5);
    line(g, [[10, 50], [13, 62]], C.ink, 3, sd + 8, .5);
  }
  g.restore();
}
// Brazo con hombro-codo-muñeca. a1: ángulo del brazo desde "hacia abajo" (positivo = hacia afuera),
// a2: flexión del codo. Devuelve la posición de la mano para sujetar objetos.
function arm(g, sx, a1, a2, o, pose, sd, wiggle = 0) {
  const S = [sx * 146, 58], L1 = 152, L2 = 138;
  const E = [S[0] + sx * L1 * Math.sin(a1), S[1] + L1 * Math.cos(a1)];
  const phi = a1 + a2;
  const Wr = [E[0] + sx * L2 * Math.sin(phi), E[1] + L2 * Math.cos(phi)];
  const mid1 = [(S[0] + E[0]) / 2, (S[1] + E[1]) / 2];
  tube(g, [S, mid1, E, Wr], 78, o.sweater, sd);
  // puño del suéter
  const d = [sx * Math.sin(phi), Math.cos(phi)];
  const cuff = [Wr[0] - d[0] * 8, Wr[1] - d[1] * 8];
  line(g, [[cuff[0] - d[1] * 34, cuff[1] + d[0] * 34], [cuff[0] + d[1] * 34, cuff[1] - d[0] * 34]], o.sweaterD || C.ink, 7, sd + 1, 1);
  const ang = Math.atan2(d[1], d[0]);
  hand(g, Wr[0] + d[0] * 2, Wr[1] + d[1] * 2, ang, sx, pose, o.skin, sd + 2, wiggle);
  return [Wr[0] + d[0] * 36, Wr[1] + d[1] * 36];
}
const POSE = {
  rest: { a1: .22, a2: -.55, hand: 'rest' },
  hips: { a1: .75, a2: -1.9, hand: 'fist' },
  hold: { a1: .32, a2: -1.85, hand: 'fist' },
  holdHigh: { a1: .55, a2: -2.25, hand: 'fist' },
  wave: { a1: 2.25, a2: .55, hand: 'open' },
  up: { a1: 2.75, a2: .15, hand: 'open' },
  upFist: { a1: 2.7, a2: .2, hand: 'fist' },
  point: { a1: 2.3, a2: .6, hand: 'open' },
  wandUp: { a1: 2.5, a2: .3, hand: 'fist' },
  stretch: { a1: 2.9, a2: .1, hand: 'open' },
};
function blendPose(p1, p2, k) { return { a1: lerp(p1.a1, p2.a1, k), a2: lerp(p1.a2, p2.a2, k), hand: k < .5 ? p1.hand : p2.hand }; }

// ---------- pelo ----------
function curlyCloud(cx, cy, rx, ry, bumps, a0, a1, k) {
  const o = [];
  for (let i = 0; i <= k; i++) {
    const a = lerp(a0, a1, i / k), m = 1 + 0.09 * Math.abs(Math.sin((a - a0) / (a1 - a0) * Math.PI * bumps));
    o.push([cx + Math.cos(a) * rx * m, cy + Math.sin(a) * ry * m]);
  }
  return o;
}
function curl(g, x, y, s, color, sd) {
  const pts = [];
  for (let i = 0; i <= 10; i++) { const a = i / 10 * Math.PI * 1.6 + 2.2, r = s * (1 - i / 14); pts.push([x + Math.cos(a) * r, y + Math.sin(a) * r]); }
  line(g, pts, color, 5, sd, 1);
}
function hairBack(g, o, sd, sway) {
  const hc = o.hairColor, hi = o.hairHi;
  switch (o.hair) {
    case 'bun':
      shape(g, ell(18, -372, 66, 62, 16, sd + 50, .12), hc, { seed: sd + 50 });
      line(g, [[-22, -372], [0, -400], [40, -392], [48, -362]], hi, 6, sd + 51);
      break;
    case 'pigtails':
      for (const sx of [-1, 1]) shape(g, ell(sx * 172 + sway * 8, -190, 78, 84, 18, sd + 52 + sx, .2), hc, { seed: sd + 52 + sx });
      break;
    case 'puffs':
      for (const sx of [-1, 1]) {
        shape(g, curlyCloud(sx * 150, -300, 88, 84, 7, 0, Math.PI * 2, 60), hc, { seed: sd + 53 + sx, amp: 1.5 });
        curl(g, sx * 150 - 20, -310, 18, hi, sd + 55 + sx); curl(g, sx * 150 + 25, -280, 15, hi, sd + 57 + sx);
      }
      break;
    case 'curly':
      shape(g, curlyCloud(0, -215, 190, 178, 11, Math.PI * 0.72, Math.PI * 2.28, 90).concat([[60, -60], [-60, -60]]), hc, { seed: sd + 60, amp: 1.5 });
      [[-150, -250], [-95, -330], [-10, -372], [85, -345], [150, -270], [-170, -160], [170, -165]].forEach(([x, y], i) => curl(g, x, y, 22, hi, sd + 61 + i));
      break;
    case 'bob':
      shape(g, [[-150, -250], [-120, -320], [0, -345], [120, -320], [150, -250], [165, -120], [150, -70], [100, -80], [-100, -80], [-150, -70], [-165, -120]], hc, { seed: sd + 62 });
      break;
    case 'long': {
      const s2 = sway * 10;
      shape(g, [[-150, -260], [-110, -330], [0, -350], [110, -330], [150, -260], [170, -80], [185 + s2, 60], [175 + s2, 190], [120 + s2, 200], [110, 20], [-110, 20], [-120 - s2, 200], [-175 - s2, 190], [-185 - s2, 60], [-170, -80]], hc, { seed: sd + 63 });
      line(g, [[150, -120], [160 + s2, 40], [150 + s2, 160]], hi, 6, sd + 64);
      line(g, [[-150, -120], [-160 - s2, 40], [-150 - s2, 160]], hi, 6, sd + 65);
      break;
    }
    case 'braids':
      for (const sx of [-1, 1]) {
        for (let i = 0; i < 6; i++) {
          const bx = sx * (128 + i * 6) + sway * 6 * (i / 6), by = -150 + i * 46;
          shape(g, ell(bx, by, 30 - i * 1.5, 30, 10, sd + 66 + i + sx * 10, .1), hc, { seed: sd + 66 + i + sx * 10, lw: 4.5 });
        }
        shape(g, ell(sx * (164) + sway * 6, 132, 18, 12, 8, sd + 90 + sx), C.coral, { seed: sd + 90 + sx, lw: 4 });
        shape(g, [[sx * 164 + sway * 6, 140], [sx * 150 + sway * 6, 185], [sx * 178 + sway * 6, 185]], hc, { seed: sd + 92 + sx, lw: 4 });
      }
      break;
    case 'ponytail': {
      const s3 = sway * 18;
      shape(g, [[40, -320], [140 + s3 * .3, -360], [230 + s3, -300], [255 + s3, -180], [230 + s3, -80], [200 + s3, -150], [170, -240], [110, -300]], hc, { seed: sd + 94 });
      shape(g, ell(95, -325, 22, 16, 10, sd + 95), C.coral, { seed: sd + 95, lw: 4 });
      break;
    }
  }
}
function hairFront(g, o, sd) {
  const hc = o.hairColor, hi = o.hairHi;
  const cap = arcPts(0, -180, 140, 148, Math.PI * 0.93, Math.PI * 2.07, 14);
  if (o.hair === 'curly') {
    const fr = curlyCloud(0, -250, 132, 62, 5, Math.PI * 0.98, Math.PI * 2.02, 50);
    shape(g, fr.concat([[128, -205], [60, -225], [0, -212], [-60, -225], [-128, -205]]), hc, { seed: sd + 90, amp: 1.5 });
    [[-80, -262], [0, -282], [78, -262]].forEach(([x, y], i) => curl(g, x, y, 18, hi, sd + 95 + i));
    return;
  }
  let fringe;
  if (o.hair === 'bob') fringe = [[124, -170], [120, -210], [80, -222], [40, -214], [0, -224], [-40, -214], [-80, -222], [-120, -210], [-126, -170]];
  else if (o.hair === 'bun' || o.hair === 'ponytail') fringe = [[122, -175], [95, -222], [40, -250], [5, -222], [-45, -240], [-100, -212], [-128, -168]];
  else fringe = [[122, -175], [80, -238], [18, -268], [0, -290], [-18, -268], [-80, -238], [-128, -168]];
  shape(g, cap.concat(fringe), hc, { seed: sd + 70 });
  line(g, [[-70, -280], [-20, -300], [30, -296]], hi, 6, sd + 71);
  if (o.hair === 'bob') for (let i = 0; i < 4; i++) line(g, [[-75 + i * 50, -265], [-72 + i * 50, -228]], hi, 4, sd + 80 + i, 1);
  if (o.hair === 'pigtails') for (const sx of [-1, 1]) shape(g, ell(sx * 128, -208, 18, 18, 10, sd + 74 + sx), C.coral, { seed: sd + 74 + sx, lw: 4 });
  if (o.hair === 'bun') {
    shape(g, ell(16, -318, 36, 13, 10, sd + 76), C.coral, { seed: sd + 76, lw: 4 });
    line(g, [[-30, -318], [-58, -342], [-44, -364]], hc, 4, sd + 72, 2);
  }
}

// ---------- cara ----------
function face(g, o, t, sd) {
  for (const sx of [-1, 1]) {
    const cx = sx * 80, cy = -116;
    const gr = g.createRadialGradient(cx, cy, 0, cx, cy, 46);
    gr.addColorStop(0, 'rgba(236,98,82,0.8)'); gr.addColorStop(.55, 'rgba(236,98,82,0.45)'); gr.addColorStop(1, 'rgba(236,98,82,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, 46, 0, 7); g.fill();
  }
  const ey = -168, eyes = o.eyes || 'open';
  for (const sx of [-1, 1]) {
    const ex = sx * 52 + (o.look || 0) * 5;
    if (eyes === 'happy') line(g, [[ex - 25, ey + 8], [ex, ey - 13], [ex + 25, ey + 8]], C.ink, 8, sd + 20 + sx);
    else if (eyes === 'closed') {
      line(g, [[ex - 24, ey - 2], [ex, ey + 12], [ex + 24, ey - 2]], C.ink, 7, sd + 20 + sx);
      line(g, [[ex + sx * 22, ey], [ex + sx * 32, ey - 8]], C.ink, 4, sd + 26 + sx, .6);
    } else if (eyes === 'wide') {
      g.fillStyle = C.white; g.beginPath(); g.ellipse(ex, ey, 26, 30, 0, 0, 7); g.fill();
      g.strokeStyle = C.ink; g.lineWidth = 5; g.stroke();
      dot(g, ex + sx * 3, ey + 4, 12, C.ink); dot(g, ex + sx * 3 + 4, ey - 1, 4, '#fff');
    } else {
      const blink = ((t + (o.blinkOff || 0)) % 2.9) < 0.12 ? 0.12 : 1;
      g.fillStyle = C.ink; g.beginPath(); g.ellipse(ex, ey, 13, 18 * blink, 0, 0, 7); g.fill();
      if (blink > .5) {
        dot(g, ex + 4, ey - 6, 4.5, '#fff');
        line(g, [[ex + sx * 10, ey - 14], [ex + sx * 20, ey - 22]], C.ink, 4, sd + 28 + sx, .5);
      }
    }
    const br = o.brow || 0; // >0 cejas arriba (sorpresa), <0 enojo
    line(g, [[ex - 22, ey - 44 - br * 10], [ex, ey - 52 - br * 14], [ex + 22, ey - 46 - br * 10]], C.ink, 7, sd + 24 + sx);
  }
  if (o.glasses) {
    for (const sx of [-1, 1]) {
      g.beginPath(); g.ellipse(sx * 55, -166, 42, 38, 0, 0, 7);
      g.fillStyle = 'rgba(255,255,255,0.18)'; g.fill(); g.strokeStyle = C.ink; g.lineWidth = 7; g.stroke();
    }
    line(g, [[-14, -170], [0, -176], [14, -170]], C.ink, 6, sd + 33, .5);
  }
  shape(g, [[0, -160], [17, -128], [0, -119], [-15, -127]], C.nose, { lw: 3.5, seed: sd + 30, amp: 1.2 });
  const m = o.mouth;
  if (m === 'smile') {
    line(g, [[-40, -104], [0, -80], [40, -104]], C.ink, 7, sd + 31);
  } else if (m === 'o') {
    shape(g, ell(0, -88, 18, 22, 12, sd + 31), C.mouth, { seed: sd + 31, lw: 5 });
  } else {
    const h = typeof m === 'number' ? m : 36, y0 = -100;
    if (h < 6) { line(g, [[-40, -104], [0, -84], [40, -104]], C.ink, 7, sd + 31); return; }
    const mp = jit([[-50, y0], [0, y0 + 7], [50, y0], [38, y0 + h * .65], [0, y0 + h], [-38, y0 + h * .65]], sd + 31, 1.5);
    g.save(); g.beginPath(); closedPath(g, mp); g.fillStyle = C.mouth; g.fill(); g.clip();
    g.fillStyle = '#fff'; g.fillRect(-60, y0 - 12, 120, 22);
    g.fillStyle = C.tongue; g.beginPath(); g.ellipse(0, y0 + h, 30, 16, 0, 0, 7); g.fill();
    g.restore();
    g.beginPath(); closedPath(g, mp); g.strokeStyle = C.ink; g.lineWidth = 5; g.stroke();
  }
}

// ---------- accesorios de cabeza ----------
function hat(g, o, sd, t) {
  if (o.hat === 'party') {
    g.save(); g.translate(40, -330); g.rotate(.25);
    const pts = [[-70, 20], [70, 20], [0, -170]];
    g.save(); g.beginPath(); closedPath(g, jit(pts, sd + 1, 2)); g.fillStyle = C.teal; g.fill(); g.clip();
    for (let i = 0; i < 5; i++) { g.fillStyle = i % 2 ? C.mustard : C.coral; g.beginPath(); g.arc(0, -150 + i * 40, 14, 0, 7); g.fill(); }
    g.restore();
    shape(g, pts, null, { seed: sd + 1 });
    shape(g, ell(0, -178, 22, 22, 10, sd + 2, .3), C.mustard, { seed: sd + 2, lw: 4.5 });
    g.restore();
  } else if (o.hat === 'beret') {
    g.save(); g.translate(20, -318); g.rotate(-.18);
    shape(g, ell(0, 0, 150, 52, 18, sd + 3, .05), C.red, { seed: sd + 3 });
    line(g, [[0, -50], [4, -72]], C.ink, 8, sd + 4, 1);
    line(g, [[-90, 10], [0, 22], [90, 10]], C.coralD, 5, sd + 5, 1);
    g.restore();
  } else if (o.hat === 'crown') {
    g.save(); g.translate(0, -330 + Math.sin(t * 3) * 3);
    const pts = [[-100, 30], [-110, -60], [-55, -15], [0, -85], [55, -15], [110, -60], [100, 30]];
    shape(g, pts, C.mustard, { seed: sd + 6 });
    [[-110, -60], [0, -85], [110, -60]].forEach(([x, y], i) => shape(g, ell(x, y, 14, 14, 8, sd + 7 + i), [C.coral, C.teal, C.coral][i], { seed: sd + 7 + i, lw: 4 }));
    dot(g, -40, 5, 9, C.coral); dot(g, 0, 8, 10, C.teal); dot(g, 40, 5, 9, C.coral);
    g.restore();
  }
}
function sunglasses(g, p, sd) {
  if (p <= 0) return;
  const y = lerp(-520, -168, eOutBack(clamp(p))) ;
  g.save(); g.translate(0, y - -168); g.rotate((1 - clamp(p)) * .4);
  for (const sx of [-1, 1]) {
    g.beginPath(); g.roundRect(sx * 55 - 45, -200, 90, 66, 24);
    g.fillStyle = C.ink; g.fill();
    g.fillStyle = 'rgba(255,255,255,0.7)'; g.beginPath(); g.moveTo(sx * 55 - 25, -190); g.lineTo(sx * 55 - 5, -190); g.lineTo(sx * 55 - 30, -150); g.lineTo(sx * 55 - 40, -160); g.fill();
  }
  line(g, [[-12, -178], [12, -178]], C.ink, 8, sd, .3);
  g.restore();
}

// ---------- personaje completo ----------
function drawChar(g, o, t) {
  const tq = stepT(t);
  const sd = o.seed || 10;
  g.save(); g.translate(o.x, o.y + (o.bounce || 0)); g.scale(o.s * (1 + (o.squash || 0)), o.s * (1 - (o.squash || 0)));
  if (o.rot) g.rotate(o.rot);
  const br = Math.sin(tq * 2.4) * 3;
  const sway = Math.sin(tq * 2.1 + sd);
  shape(g, [[-26, -60], [26, -60], [25, 20], [-25, 20]], o.skin, { seed: sd + 1, lw: 4.5 });
  const body = jit([[-58, -4 + br * .3], [58, -4 + br * .3], [152, 38], [190, 150], [198, 520], [-198, 520], [-190, 150], [-152, 38]], sd + 2, 2.2);
  g.save(); g.beginPath(); closedPath(g, body); g.fillStyle = o.sweater; g.fill(); g.clip();
  if (o.stripes) {
    g.fillStyle = o.stripes;
    for (let y = 60; y < 540; y += 78) {
      const w = (rnd(sd + y + BOIL) - .5) * 5;
      g.beginPath(); g.moveTo(-260, y + w); g.quadraticCurveTo(0, y + 10 + w, 260, y + w);
      g.lineTo(260, y + 36); g.quadraticCurveTo(0, y + 46, -260, y + 36); g.fill();
    }
  } else {
    for (let x = -150; x <= 150; x += 50) line(g, [[x, 110], [x * 1.05, 300], [x * 1.08, 520]], o.sweaterD, 6, sd + x, 2.5);
  }
  if (o.pattern === 'star') starShape(g, 0, 230, 70, C.mustard, sd + 40, .1);
  if (o.pattern === 'heart') heart(g, 0, 250, 2.2, 0, C.coral);
  if (o.pattern === 'moons') for (let i = 0; i < 6; i++) { const px = -120 + (i % 3) * 120, py = 140 + Math.floor(i / 3) * 150; starShape(g, px, py, 22, C.cream, sd + 50 + i, 0); }
  g.globalAlpha = .15; g.fillStyle = C.ink; g.beginPath(); g.ellipse(-235, 300, 120, 340, 0, 0, 7); g.fill(); g.globalAlpha = 1;
  g.restore();
  g.beginPath(); closedPath(g, body); g.strokeStyle = C.ink; g.lineWidth = 5; g.stroke();
  shape(g, [[-52, -26], [52, -26], [56, 12], [-56, 12]], o.collar || o.sweaterD, { seed: sd + 3, lw: 4.5 });
  for (let x = -36; x <= 36; x += 18) line(g, [[x, -18], [x, 6]], 'rgba(0,0,0,0.22)', 4, sd + 4 + x, 1);

  const armsBehind = [];
  const L = o.armL || POSE.rest, R = o.armR || POSE.rest;
  const handsPos = {};
  // brazos bajos se dibujan antes de la cabeza, brazos arriba después
  const drawArm = (sx, P, sdd) => { handsPos[sx] = arm(g, sx, P.a1, P.a2, o, P.hand, sdd, tq * 9); };
  if (L.a1 < 1.4) drawArm(-1, L, sd + 5); else armsBehind.push([-1, L, sd + 5]);
  if (R.a1 < 1.4) drawArm(1, R, sd + 7); else armsBehind.push([1, R, sd + 7]);

  const tilt = (o.tiltAmp ?? 0.05) * Math.sin(tq * 1.7) + (o.tilt || 0);
  g.save(); g.translate(0, -40 + br * .6); g.rotate(tilt); g.translate(0, 40);
  hairBack(g, o, sd, sway);
  for (const sx of [-1, 1]) {
    shape(g, ell(sx * 124, -162, 27, 33, 12, sd + 40 + sx), o.skin, { seed: sd + 40 + sx, lw: 4.5 });
    line(g, [[sx * 118, -175], [sx * 132, -165], [sx * 122, -150]], C.ink, 3.5, sd + 42 + sx);
    if (o.earrings) dot(g, sx * 128, -126, 9, C.mustard);
  }
  shape(g, ell(0, -176, 126, 140, 22, sd + 44, .03), o.skin, { seed: sd + 44 });
  face(g, o, t, sd);
  hairFront(g, o, sd);
  hat(g, o, sd, t);
  sunglasses(g, o.sunglasses || 0, sd + 200);
  g.restore();
  armsBehind.forEach(([sx, P, sdd]) => { handsPos[sx] = arm(g, sx, P.a1, P.a2, o, P.hand, sdd, tq * 9); });
  // posiciones de las manos en coordenadas del lienzo (para sujetar objetos)
  const out = {};
  for (const k of Object.keys(handsPos)) {
    const [hx, hy] = handsPos[k];
    out[k] = [o.x + hx * o.s, o.y + (o.bounce || 0) + hy * o.s];
  }
  g.restore();
  return out;
}

// ---------- utilería ----------
function starShape(g, x, y, r, color, sd, rot = 0, stroke = true) {
  const pts = [];
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5 + rot; const rr = i % 2 ? r * .45 : r; pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]); }
  g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
  jit(pts, sd, 1.5).forEach(p => g.lineTo(p[0], p[1])); g.closePath();
  g.fillStyle = color; g.fill();
  if (stroke) { g.strokeStyle = C.ink; g.lineWidth = 4.5; g.lineJoin = 'round'; g.stroke(); }
}
function heart(g, x, y, s, rot, color, stroke = true) {
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(s, s);
  g.beginPath(); g.moveTo(0, 14); g.bezierCurveTo(-34, -10, -20, -42, 0, -24); g.bezierCurveTo(20, -42, 34, -10, 0, 14);
  g.fillStyle = color; g.fill();
  if (stroke) { g.strokeStyle = C.ink; g.lineWidth = 4.5 / s; g.lineJoin = 'round'; g.stroke(); }
  g.restore();
}
function sparkle(g, x, y, s, color) {
  g.save(); g.translate(x, y); g.scale(s, s);
  g.beginPath(); g.moveTo(0, -30); g.quadraticCurveTo(4, -4, 30, 0); g.quadraticCurveTo(4, 4, 0, 30); g.quadraticCurveTo(-4, 4, -30, 0); g.quadraticCurveTo(-4, -4, 0, -30);
  g.fillStyle = color; g.fill(); g.restore();
}
function bird(g, x, y, s, flap, color) {
  g.save(); g.translate(x, y); g.scale(s, s);
  const f = flap * 30;
  g.beginPath(); g.moveTo(-42, 0); g.quadraticCurveTo(-22, -f, 0, 4); g.quadraticCurveTo(22, -f, 42, 0);
  g.quadraticCurveTo(20, -f * .3 + 10, 0, 14); g.quadraticCurveTo(-20, -f * .3 + 10, -42, 0);
  g.fillStyle = color; g.fill(); g.restore();
}
function cloud(g, x, y, s, color, sd) {
  g.save(); g.translate(x, y); g.scale(s, s);
  shape(g, curlyCloud(0, 0, 150, 70, 5, Math.PI, Math.PI * 2, 40).concat([[150, 30], [-150, 30]]), color, { seed: sd, lw: 5 / s });
  g.restore();
}
function confettiField(g, t, t0, n, seed, area = [0, W, -100, H]) {
  if (t < t0) return;
  const cols = [C.coral, C.mustard, C.teal, C.pink, C.green, C.violet];
  for (let i = 0; i < n; i++) {
    const r1 = rnd(seed + i), r2 = rnd(seed + i * 3.3), r3 = rnd(seed + i * 7.7);
    const lt = t - t0 - r3 * 1.5;
    if (lt < 0) continue;
    const x = area[0] + r1 * (area[1] - area[0]) + Math.sin(lt * 3 + i) * 30;
    const y = area[2] + ((lt * (220 + r2 * 200) + r2 * 300) % (area[3] - area[2] + 200));
    g.save(); g.translate(x, y); g.rotate(lt * (3 + r2 * 4) + i); g.scale(1, Math.cos(lt * 6 + i) * .9 + .1);
    g.fillStyle = cols[i % cols.length]; g.fillRect(-11, -6, 22, 12); g.restore();
  }
}
function burst(g, x, y, p, color, n = 10, r0 = 60, r1 = 220, seed = 1) {
  if (p <= 0 || p >= 1) return;
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2 + rnd(seed + i) * .3;
    const ra = r0 + (r1 - r0) * eOutCubic(p), rb = ra + 60 * (1 - p);
    line(g, [[x + Math.cos(a) * ra, y + Math.sin(a) * ra], [x + Math.cos(a) * rb, y + Math.sin(a) * rb]], color, 9, seed + i, 1);
  }
}
function rays(g, x, y, r0, r1, n, rot, color, alpha = 1) {
  g.save(); g.globalAlpha = alpha; g.fillStyle = color;
  for (let i = 0; i < n; i++) {
    const a = rot + i / n * Math.PI * 2, w = Math.PI / n * .6;
    g.beginPath(); g.moveTo(x + Math.cos(a - w) * r0, y + Math.sin(a - w) * r0);
    g.lineTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1); g.lineTo(x + Math.cos(a + w) * r0, y + Math.sin(a + w) * r0); g.fill();
  }
  g.restore();
}

// ---------- texto ----------
function sticker(g, txt, x, y, font, size, color, o = {}) {
  const { rot = 0, scale = 1, border = C.cream, weight = 700 } = o;
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(scale, scale);
  g.font = `${weight} ${size}px ${font}`;
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
  const bw = size * .16;
  g.fillStyle = C.ink; g.strokeStyle = C.ink; g.lineWidth = bw + 9;
  g.strokeText(txt, 7, 9); g.fillText(txt, 7, 9);
  g.strokeText(txt, 0, 0);
  g.strokeStyle = border; g.lineWidth = bw; g.strokeText(txt, 0, 0);
  g.fillStyle = color; g.fillText(txt, 0, 0);
  g.restore();
}
function popWord(g, txt, x, y, size, color, t, t0, rot = 0, font = 'Fredoka') {
  const p = prog(t, t0, .4);
  if (p <= 0) return;
  const e = eOutBack(p);
  sticker(g, txt, x, y + (1 - p) * 40, font, size, color, { scale: Math.max(.01, e), rot: rot + (1 - e) * .25 + (rnd(BOIL + size) - .5) * .02 });
}
function fitSize(g, txt, size, maxW, font = 'Fredoka', weight = 700) {
  g.save(); g.font = `${weight} ${size}px ${font}`; const w = g.measureText(txt).width; g.restore();
  return w > maxW ? size * maxW / w : size;
}
function lettersIn(g, txt, x, y, size, color, t, t0, o = {}) {
  const chars = [...txt];
  g.save(); g.font = `700 ${size}px Fredoka`;
  const ws = chars.map(ch => g.measureText(ch).width);
  g.restore();
  const track = o.track ?? 4;
  let cx = x - (ws.reduce((a, b) => a + b, 0) + track * (chars.length - 1)) / 2;
  chars.forEach((ch, i) => {
    const p = prog(t, t0 + i * 0.06, .45);
    if (p > 0) {
      const e = eOutBack(p);
      const bob = o.wave ? Math.sin(t * 3.4 - i * 0.8) * 12 : Math.sin(t * 2 - i * .6) * 4;
      const rot = (rnd(i * 7 + BOIL) - .5) * .05 + (1 - e) * -.5;
      sticker(g, ch, cx + ws[i] / 2, y + (1 - e) * 110 + bob, 'Fredoka', size, color, { rot, scale: Math.max(.01, e) });
    }
    cx += ws[i] + track;
  });
}
function pill(g, txt, x, y, t, t0, bg, fs = 50) {
  const p = prog(t, t0, .35);
  if (p <= 0) return;
  const e = eOutBack(p);
  g.save(); g.translate(x, y); g.rotate(-.04); g.scale(e, e);
  g.font = `600 ${fs}px Fredoka`;
  const w = g.measureText(txt).width + fs * 1.5, h = fs * 1.76;
  g.beginPath(); g.roundRect(-w / 2 + 7, -h / 2 + 9, w, h, h / 2); g.fillStyle = C.ink; g.fill();
  g.beginPath(); g.roundRect(-w / 2, -h / 2, w, h, h / 2); g.fillStyle = bg; g.fill();
  g.strokeStyle = C.ink; g.lineWidth = 5; g.stroke();
  g.fillStyle = C.cream; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, 0, 3);
  g.restore();
}
function writeOn(g, txt, x, y, size, color, t, t0, dur, lineColor) {
  const p = prog(t, t0, dur);
  if (p <= 0) return;
  g.save();
  g.font = `700 ${size}px Caveat`;
  const w = g.measureText(txt).width;
  g.beginPath(); g.rect(x - w / 2 - 40, y - size, (w + 80) * p, size * 2.2); g.clip();
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
  g.lineWidth = size * .22; g.strokeStyle = C.cream; g.strokeText(txt, x, y);
  g.fillStyle = color; g.fillText(txt, x, y);
  g.restore();
  const q = prog(t, t0 + dur * .8, .45);
  if (q > 0) {
    const pts = [];
    for (let i = 0; i <= 10; i++) pts.push([x - w / 2 + w * i / 10, y + size * .55 + Math.sin(i * 1.7) * 6]);
    g.save(); g.setLineDash([w * 1.2 * eOutCubic(q), 99999]);
    line(g, pts, lineColor, 10, 300, 1.2);
    g.restore();
  }
}
function badge(g, txt, x, y, t, t0, color) {
  const p = prog(t, t0, .4);
  if (p <= 0) return;
  const e = eOutBack(p);
  g.save(); g.translate(x, y); g.scale(e, e); g.rotate(Math.sin(t * 2) * .05);
  shape(g, ell(0, 0, 78, 78, 18, 900, .06), color, { seed: 900 });
  g.font = '700 50px Fredoka'; g.fillStyle = C.cream; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(txt, 0, 4);
  g.restore();
}

// ---------- cámara y capas ----------
function cam(g, lt, punchAt, shake = 0) {
  const z = 1 + 0.03 * lt / 6 + 0.07 * (1 - eOutCubic(clamp((lt - punchAt) / 0.55)));
  g.setTransform(1, 0, 0, 1, 0, 0);
  const sx = shake ? (rnd(BOIL * 3.1) - .5) * shake : 0, sy = shake ? (rnd(BOIL * 5.7) - .5) * shake : 0;
  g.translate(W / 2 + sx, H / 2 + sy); g.scale(z, z); g.translate(-W / 2, -H / 2);
}
function beginLayer() { LX.setTransform(1, 0, 0, 1, 0, 0); LX.clearRect(0, 0, W, H); return LX; }
function endLayer(g) {
  LX.setTransform(1, 0, 0, 1, 0, 0);
  LX.globalCompositeOperation = 'source-atop'; LX.globalAlpha = .4;
  LX.drawImage(GRAIN[BOIL % 3], 0, 0);
  LX.globalCompositeOperation = 'source-over'; LX.globalAlpha = 1;
  g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(layer, 0, 0);
}
function fillBg(g, color) { g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(PAPER, 0, 0); if (color) { g.globalAlpha = .9; g.fillStyle = color; g.fillRect(0, 0, W, H); g.globalAlpha = 1; } }

// ---------- transiciones ----------
function tIris(p, cx, cy, ringColor) {
  const r = eInOutCubic(p) * 2400;
  if (r < 1) return;
  X.save(); X.setTransform(1, 0, 0, 1, 0, 0);
  X.beginPath(); closedPath(X, jit(ell(cx, cy, r, r, 30, 7, .04), 700, 6)); X.clip();
  X.drawImage(bufB, 0, 0); X.restore();
  X.save(); X.setTransform(1, 0, 0, 1, 0, 0);
  X.beginPath(); closedPath(X, jit(ell(cx, cy, r + 24, r + 24, 30, 7, .04), 701, 6));
  X.strokeStyle = C.ink; X.lineWidth = 60; X.stroke(); X.strokeStyle = ringColor; X.lineWidth = 48; X.stroke();
  X.restore();
}
function tStripes(p, cols, ang = -0.55) {
  const bw = 230, n = cols.length;
  const f = lerp(-1300, 1300 + n * bw, eInOutCubic(p));
  X.save(); X.setTransform(1, 0, 0, 1, 0, 0); X.translate(W / 2, H / 2); X.rotate(ang);
  X.beginPath(); X.rect(-3000, -3000, f - n * bw + 3000, 6000); X.clip();
  X.setTransform(1, 0, 0, 1, 0, 0); X.drawImage(bufB, 0, 0); X.restore();
  X.save(); X.setTransform(1, 0, 0, 1, 0, 0); X.translate(W / 2, H / 2); X.rotate(ang);
  for (let i = 0; i < n; i++) {
    const x1 = f - (i + 1) * bw, x2 = f - i * bw, pts = [];
    for (let y = -1500; y <= 1500; y += 150) pts.push([x2 + Math.sin(y * .01 + i) * 14, y]);
    for (let y = 1500; y >= -1500; y -= 150) pts.push([x1 + Math.sin(y * .01 + i + 1) * 14, y]);
    shape(X, pts, cols[i], { lw: 6, seed: 800 + i, amp: 3 });
  }
  X.restore();
}
function tPaper(p, color) {
  // la escena nueva sube como una hoja de papel con borde ondulado
  const e = eInOutCubic(p);
  const top = lerp(H + 120, -160, e);
  const pts = [];
  for (let x = -60; x <= W + 60; x += 90) pts.push([x, top + Math.sin(x * .012 + p * 6) * 40]);
  pts.push([W + 60, H + 300], [-60, H + 300]);
  X.save(); X.setTransform(1, 0, 0, 1, 0, 0);
  X.beginPath(); closedPath(X, jit(pts, 710, 4)); X.clip(); X.drawImage(bufB, 0, 0); X.restore();
  X.save(); X.setTransform(1, 0, 0, 1, 0, 0);
  const edge = pts.slice(0, -2);
  X.beginPath(); openPath(X, jit(edge, 711, 4)); X.strokeStyle = C.ink; X.lineWidth = 34; X.stroke(); X.strokeStyle = color; X.lineWidth = 24; X.stroke();
  X.restore();
}
function tBlinds(p, cols) {
  const n = 8, bh = H / n;
  X.save(); X.setTransform(1, 0, 0, 1, 0, 0);
  for (let i = 0; i < n; i++) {
    const q = clamp(p * 1.6 - i * 0.075);
    const closeK = q < .5 ? eInOutCubic(q * 2) : 1 - eInOutCubic((q - .5) * 2);
    const y0 = i * bh;
    if (q >= .5) { X.save(); X.beginPath(); X.rect(0, y0, W, bh + 1); X.clip(); X.drawImage(bufB, 0, 0); X.restore(); }
    const w = W * closeK;
    if (w > 1) {
      const x0 = i % 2 ? W - w : 0;
      X.fillStyle = C.ink; X.fillRect(x0 - 4, y0, w + 8, bh + 1);
      X.fillStyle = cols[i % cols.length]; X.fillRect(x0, y0 + 5, w, bh - 9);
    }
  }
  X.restore();
}
function irisOut(p, cx, cy) {
  const r = lerp(1500, 0, eInOutCubic(p));
  X.save(); X.setTransform(1, 0, 0, 1, 0, 0);
  X.beginPath(); X.rect(0, 0, W, H);
  if (r > 2) closedPath(X, jit(ell(cx, cy, r, r, 30, 9, .04), 900, 5).reverse());
  X.fillStyle = C.ink; X.fill('evenodd');
  if (r > 2) { X.beginPath(); closedPath(X, jit(ell(cx, cy, r, r, 30, 9, .04), 900, 5)); X.strokeStyle = C.coral; X.lineWidth = 22; X.stroke(); }
  X.restore();
}
