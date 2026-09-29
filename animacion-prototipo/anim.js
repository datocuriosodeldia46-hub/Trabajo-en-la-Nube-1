// Prototipo: animación 2D estilo ilustración plana con textura de impresión.
// Todo se dibuja con código en un <canvas> de 1080x1920. renderFrame(t) es determinista,
// así que el mismo t siempre produce el mismo fotograma (necesario para exportar a MP4).

const W = 1080, H = 1920, DUR = 15;
const C = {
  paper: '#F4EDE3', cream: '#FBF6EE', ink: '#1E2235',
  teal: '#1E9CB8', tealLight: '#6CC3DD', deep: '#1B5E8C',
  mustard: '#F2B13B', mustardD: '#D8952A',
  coral: '#E8553E', coralD: '#C43F2C',
  denim: '#3553A5', skin: '#F6BE9E', nose: '#EE8F78',
  hairDark: '#1F2340', hairHi: '#3C4478', hairRed: '#D9582B', hairRedHi: '#F07B45',
  mouth: '#7B2233', tongue: '#EE7F77', bird: '#2E95D3',
};

let BOIL = 0; // cambia 8 veces por segundo: hace "hervir" las líneas como en animación dibujada a mano

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
const eInOutCubic = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const eOutBack = t => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };

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
const FINE = [makeGrain(7, 1, .10, .05, 60), makeGrain(8, 1, .10, .05, 60)];
const PAPER = (() => {
  const c = mk(), g = c.getContext('2d'), r = mulberry(99);
  g.fillStyle = C.paper; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 40; i++) {
    const x = r() * W, y = r() * H, rr = 80 + r() * 280;
    const gr = g.createRadialGradient(x, y, 0, x, y, rr);
    gr.addColorStop(0, 'rgba(190,150,110,0.07)'); gr.addColorStop(1, 'rgba(190,150,110,0)');
    g.fillStyle = gr; g.fillRect(x - rr, y - rr, rr * 2, rr * 2);
  }
  for (let i = 0; i < 2600; i++) {
    const x = r() * W, y = r() * H, a = r() * Math.PI, l = 4 + r() * 18;
    g.strokeStyle = r() < .5 ? 'rgba(120,90,60,0.08)' : 'rgba(255,255,255,0.4)';
    g.lineWidth = 1 + r() * 1.5;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
  }
  return c;
})();

// ---------- trazos "a mano" ----------
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
function tube(g, pts, w, color, seed = 1) {
  const p = jit(pts, seed, 2);
  g.lineCap = 'round'; g.lineJoin = 'round';
  g.beginPath(); openPath(g, p);
  g.strokeStyle = C.ink; g.lineWidth = w + 11; g.stroke();
  g.strokeStyle = color; g.lineWidth = w; g.stroke();
}

// ---------- personaje ----------
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
function hairBack(g, o, sd) {
  if (o.hair === 'bun') {
    shape(g, ell(18, -372, 66, 62, 16, sd + 50, .12), o.hairColor, { seed: sd + 50 });
    line(g, [[-22, -372], [0, -400], [40, -392], [48, -362]], o.hairHi, 6, sd + 51);
  } else if (o.hair === 'pigtails') {
    for (const sx of [-1, 1]) shape(g, ell(sx * 172, -190, 78, 84, 18, sd + 52 + sx, .2), o.hairColor, { seed: sd + 52 + sx });
  } else if (o.hair === 'curly') {
    shape(g, curlyCloud(0, -215, 190, 178, 11, Math.PI * 0.72, Math.PI * 2.28, 90).concat([[60, -60], [-60, -60]]), o.hairColor, { seed: sd + 60, amp: 1.5 });
    const spots = [[-150, -250], [-95, -330], [-10, -372], [85, -345], [150, -270], [-170, -160], [170, -165]];
    spots.forEach(([x, y], i) => curl(g, x, y, 22, o.hairHi, sd + 61 + i));
  }
}
function hairFront(g, o, sd) {
  if (o.hair === 'bun' || o.hair === 'pigtails') {
    const cap = arcPts(0, -180, 140, 148, Math.PI * 0.93, Math.PI * 2.07, 14);
    const fringe = o.hair === 'bun'
      ? [[122, -175], [95, -222], [40, -250], [5, -222], [-45, -240], [-100, -212], [-128, -168]]
      : [[122, -175], [80, -238], [18, -268], [0, -290], [-18, -268], [-80, -238], [-128, -168]];
    shape(g, cap.concat(fringe), o.hairColor, { seed: sd + 70 });
    line(g, [[-70, -280], [-20, -300], [30, -296]], o.hairHi, 6, sd + 71);
    if (o.hair === 'bun') {
      line(g, [[-30, -318], [-58, -342], [-44, -364]], o.hairColor, 4, sd + 72, 2);
      line(g, [[52, -312], [84, -330], [80, -352]], o.hairColor, 4, sd + 73, 2);
    }
    if (o.hair === 'pigtails') for (const sx of [-1, 1]) shape(g, ell(sx * 128, -208, 18, 18, 10, sd + 74 + sx), C.coral, { seed: sd + 74 + sx, lw: 4 });
    if (o.hair === 'bun') shape(g, ell(16, -318, 36, 13, 10, sd + 76), C.coral, { seed: sd + 76, lw: 4 });
  } else if (o.hair === 'curly') {
    const fr = curlyCloud(0, -250, 132, 62, 5, Math.PI * 0.98, Math.PI * 2.02, 50);
    shape(g, fr.concat([[128, -205], [60, -225], [0, -212], [-60, -225], [-128, -205]]), o.hairColor, { seed: sd + 90, amp: 1.5 });
    [[-80, -262], [0, -282], [78, -262]].forEach(([x, y], i) => curl(g, x, y, 18, o.hairHi, sd + 95 + i));
  }
}
function face(g, o, t, sd) {
  for (const sx of [-1, 1]) {
    const cx = sx * 78, cy = -118;
    const gr = g.createRadialGradient(cx, cy, 0, cx, cy, 44);
    gr.addColorStop(0, 'rgba(236,98,82,0.85)'); gr.addColorStop(.55, 'rgba(236,98,82,0.5)'); gr.addColorStop(1, 'rgba(236,98,82,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, 44, 0, 7); g.fill();
  }
  const ey = -168;
  for (const sx of [-1, 1]) {
    const ex = sx * 52;
    if (o.eyes === 'happy') {
      line(g, [[ex - 25, ey + 8], [ex, ey - 13], [ex + 25, ey + 8]], C.ink, 8, sd + 20 + sx);
    } else {
      const blink = ((t + (o.blinkOff || 0)) % 2.7) < 0.12 ? 0.12 : 1;
      const lx = (o.look || 0) * 6;
      g.fillStyle = C.ink; g.beginPath(); g.ellipse(ex + lx, ey, 13, 18 * blink, 0, 0, 7); g.fill();
      if (blink > .5) { g.fillStyle = '#fff'; g.beginPath(); g.arc(ex + lx + 4, ey - 6, 4.5, 0, 7); g.fill(); }
    }
    line(g, [[ex - 22, ey - 44], [ex, ey - 52], [ex + 22, ey - 46]], C.ink, 7, sd + 24 + sx);
  }
  shape(g, [[0, -160], [17, -128], [0, -119], [-15, -127]], C.nose, { lw: 3.5, seed: sd + 30, amp: 1.2 });
  const h = o.mouth, y0 = -100;
  const mp = jit([[-52, y0], [0, y0 + 7], [52, y0], [38, y0 + h * .65], [0, y0 + h], [-38, y0 + h * .65]], sd + 31, 1.5);
  g.save(); g.beginPath(); closedPath(g, mp); g.fillStyle = C.mouth; g.fill(); g.clip();
  g.fillStyle = '#fff'; g.fillRect(-60, y0 - 12, 120, 24);
  g.fillStyle = C.tongue; g.beginPath(); g.ellipse(0, y0 + h, 32, 17, 0, 0, 7); g.fill();
  g.restore();
  g.beginPath(); closedPath(g, mp); g.strokeStyle = C.ink; g.lineWidth = 5; g.stroke();
}
function hand(g, x, y, a, sd) {
  shape(g, ell(x, y, 33, 37, 12, sd, .1, a), C.skin, { seed: sd, lw: 4.5 });
  shape(g, ell(x + Math.cos(a + 1.3) * 30, y + Math.sin(a + 1.3) * 30, 12, 16, 8, sd + 1, 0, a), C.skin, { seed: sd + 1, lw: 4 });
}
function drawChar(g, o, t) {
  const tq = Math.floor(t * 12) / 12; // el cuerpo se mueve "en dos" (12 fps) como la animación tradicional
  const sd = o.seed || 10;
  g.save(); g.translate(o.x, o.y); g.scale(o.s, o.s);
  const br = Math.sin(tq * 2.4) * 3;

  shape(g, [[-26, -60], [26, -60], [25, 20], [-25, 20]], C.skin, { seed: sd + 1, lw: 4.5 });

  const body = jit([[-58, -4 + br * .3], [58, -4 + br * .3], [152, 38], [190, 150], [198, 480], [-198, 480], [-190, 150], [-152, 38]], sd + 2, 2.2);
  g.save(); g.beginPath(); closedPath(g, body); g.fillStyle = o.sweater; g.fill(); g.clip();
  if (o.stripes) {
    g.fillStyle = o.stripes;
    for (let y = 60; y < 500; y += 78) {
      const w = (rnd(sd + y + BOIL) - .5) * 5;
      g.beginPath(); g.moveTo(-260, y + w); g.quadraticCurveTo(0, y + 10 + w, 260, y + w);
      g.lineTo(260, y + 36); g.quadraticCurveTo(0, y + 46, -260, y + 36); g.fill();
    }
  } else {
    for (let x = -150; x <= 150; x += 50) line(g, [[x, 110], [x * 1.05, 300], [x * 1.08, 480]], o.sweaterD, 6, sd + x, 2.5);
  }
  g.globalAlpha = .16; g.fillStyle = C.ink; g.beginPath(); g.ellipse(-235, 300, 120, 330, 0, 0, 7); g.fill(); g.globalAlpha = 1;
  g.restore();
  g.beginPath(); closedPath(g, body); g.strokeStyle = C.ink; g.lineWidth = 5; g.stroke();
  shape(g, [[-52, -26], [52, -26], [56, 12], [-56, 12]], o.collar, { seed: sd + 3, lw: 4.5 });
  for (let x = -36; x <= 36; x += 18) line(g, [[x, -18], [x, 6]], 'rgba(0,0,0,0.25)', 4, sd + 4 + x, 1);

  tube(g, [[-150, 60], [-208, 220], [-165, 372], [-100, 398]], 80, o.sweater, sd + 5);
  hand(g, -80, 396, 0.3, sd + 6);
  if (!o.wave) {
    tube(g, [[150, 60], [208, 220], [165, 372], [100, 398]], 80, o.sweater, sd + 7);
    hand(g, 80, 396, 2.8, sd + 8);
  }

  const tilt = (o.tiltAmp ?? 0.05) * Math.sin(tq * 1.7) + (o.tilt || 0);
  g.save(); g.translate(0, -40 + br * .6); g.rotate(tilt); g.translate(0, 40);
  hairBack(g, o, sd);
  for (const sx of [-1, 1]) {
    shape(g, ell(sx * 124, -162, 27, 33, 12, sd + 40 + sx), C.skin, { seed: sd + 40 + sx, lw: 4.5 });
    line(g, [[sx * 118, -175], [sx * 132, -165], [sx * 122, -150]], C.ink, 3.5, sd + 42 + sx);
  }
  shape(g, ell(0, -176, 126, 140, 22, sd + 44, .03), C.skin, { seed: sd + 44 });
  face(g, o, t, sd);
  hairFront(g, o, sd);
  g.restore();

  if (o.wave) {
    const a = -1.5 + Math.sin(tq * 10) * 0.38;
    const E = [248, -30];
    const Wr = [E[0] + 125 * Math.cos(a), E[1] + 125 * Math.sin(a)];
    const Hd = [E[0] + 165 * Math.cos(a), E[1] + 165 * Math.sin(a)];
    tube(g, [[150, 60], [225, 25], E, Wr], 78, o.sweater, sd + 9);
    hand(g, Hd[0], Hd[1], a + Math.PI / 2, sd + 10);
  }
  g.restore();
}

// ---------- adornos ----------
function bird(g, x, y, s, flap, color) {
  g.save(); g.translate(x, y); g.scale(s, s);
  const f = flap * 30;
  g.beginPath(); g.moveTo(-42, 0); g.quadraticCurveTo(-22, -f, 0, 4); g.quadraticCurveTo(22, -f, 42, 0);
  g.quadraticCurveTo(20, -f * .3 + 10, 0, 14); g.quadraticCurveTo(-20, -f * .3 + 10, -42, 0);
  g.fillStyle = color; g.fill(); g.restore();
}
function leaf(g, x, y, rot, s, color) {
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(s, s);
  g.beginPath(); g.moveTo(0, -32); g.quadraticCurveTo(20, 0, 0, 32); g.quadraticCurveTo(-20, 0, 0, -32);
  g.fillStyle = color; g.fill();
  g.beginPath(); g.moveTo(0, -24); g.lineTo(0, 30); g.strokeStyle = 'rgba(30,34,53,0.5)'; g.lineWidth = 2.5; g.stroke();
  g.restore();
}
function heart(g, x, y, s, rot, color) {
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(s, s);
  g.beginPath(); g.moveTo(0, 14); g.bezierCurveTo(-34, -10, -20, -42, 0, -24); g.bezierCurveTo(20, -42, 34, -10, 0, 14);
  g.fillStyle = color; g.fill(); g.strokeStyle = C.ink; g.lineWidth = 4.5; g.lineJoin = 'round'; g.stroke();
  g.restore();
}
function sparkle(g, x, y, s, color) {
  g.save(); g.translate(x, y); g.scale(s, s);
  g.beginPath(); g.moveTo(0, -30); g.quadraticCurveTo(4, -4, 30, 0); g.quadraticCurveTo(4, 4, 0, 30); g.quadraticCurveTo(-4, 4, -30, 0); g.quadraticCurveTo(-4, -4, 0, -30);
  g.fillStyle = color; g.fill(); g.restore();
}

// ---------- texto ----------
function sticker(g, txt, x, y, font, size, color, o = {}) {
  const { rot = 0, scale = 1, border = C.cream } = o;
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(scale, scale);
  g.font = `${font === 'Caveat' ? 700 : 700} ${size}px ${font}`;
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
  const bw = size * .16;
  g.fillStyle = C.ink; g.strokeStyle = C.ink; g.lineWidth = bw + 9;
  g.strokeText(txt, 7, 9); g.fillText(txt, 7, 9);
  g.strokeText(txt, 0, 0);
  g.strokeStyle = border; g.lineWidth = bw; g.strokeText(txt, 0, 0);
  g.fillStyle = color; g.fillText(txt, 0, 0);
  g.restore();
}
function popWord(g, txt, x, y, size, color, lt, t0, rot = 0) {
  const p = clamp((lt - t0) / 0.4);
  if (p <= 0) return;
  const e = eOutBack(p);
  sticker(g, txt, x, y + (1 - p) * 40, 'Fredoka', size, color, { scale: Math.max(.01, e), rot: rot + (1 - e) * .25 + (rnd(BOIL + size) - .5) * .02 });
}
function lettersIn(g, txt, x, y, size, color, lt, t0, o = {}) {
  const chars = [...txt];
  g.save(); g.font = `700 ${size}px Fredoka`;
  const ws = chars.map(ch => g.measureText(ch).width);
  g.restore();
  const track = o.track ?? 6;
  let cx = x - (ws.reduce((a, b) => a + b, 0) + track * (chars.length - 1)) / 2;
  chars.forEach((ch, i) => {
    const p = clamp((lt - t0 - i * 0.08) / 0.5);
    if (p > 0) {
      const e = eOutBack(p);
      const bob = o.wave ? Math.sin(lt * 3.4 - i * 0.8) * 16 : 0;
      const rot = (rnd(i * 7 + BOIL) - .5) * .06 + (1 - e) * -.5;
      sticker(g, ch, cx + ws[i] / 2, y + (1 - e) * 110 + bob, 'Fredoka', size, color, { rot, scale: Math.max(.01, e) });
    }
    cx += ws[i] + track;
  });
}
function pill(g, txt, x, y, lt, t0, bg) {
  const p = clamp((lt - t0) / 0.35);
  if (p <= 0) return;
  const e = eOutBack(p);
  g.save(); g.translate(x, y); g.rotate(-.04); g.scale(e, e);
  g.font = '600 50px Fredoka';
  const w = g.measureText(txt).width + 76, h = 88;
  g.beginPath(); g.roundRect(-w / 2 + 7, -h / 2 + 9, w, h, 44); g.fillStyle = C.ink; g.fill();
  g.beginPath(); g.roundRect(-w / 2, -h / 2, w, h, 44); g.fillStyle = bg; g.fill();
  g.strokeStyle = C.ink; g.lineWidth = 5; g.stroke();
  g.fillStyle = C.cream; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, 0, 3);
  g.restore();
}
function writeOn(g, txt, x, y, size, color, lt, t0, dur, lineColor) {
  const p = clamp((lt - t0) / dur);
  if (p <= 0) return;
  g.save();
  g.font = `700 ${size}px Caveat`;
  const w = g.measureText(txt).width;
  g.beginPath(); g.rect(x - w / 2 - 40, y - size, (w + 80) * p, size * 2.2); g.clip();
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
  g.lineWidth = size * .2; g.strokeStyle = C.cream; g.strokeText(txt, x, y);
  g.fillStyle = color; g.fillText(txt, x, y);
  g.restore();
  const q = clamp((lt - t0 - dur * .8) / .45);
  if (q > 0) {
    const pts = [];
    for (let i = 0; i <= 10; i++) pts.push([x - w / 2 + w * i / 10, y + size * .55 + Math.sin(i * 1.7) * 6]);
    g.save(); g.setLineDash([w * 1.2 * eOutCubic(q), 99999]);
    line(g, pts, lineColor, 10, 300, 1.2);
    g.restore();
  }
}

// ---------- cámara y capas ----------
function cam(g, lt, punchAt) {
  const z = 1 + 0.03 * lt / 5 + 0.07 * (1 - eOutCubic(clamp((lt - punchAt) / 0.55)));
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.translate(W / 2, H / 2); g.scale(z, z); g.translate(-W / 2, -H / 2);
}
function beginLayer() { LX.setTransform(1, 0, 0, 1, 0, 0); LX.clearRect(0, 0, W, H); return LX; }
function endLayer(g) {
  LX.setTransform(1, 0, 0, 1, 0, 0);
  LX.globalCompositeOperation = 'source-atop'; LX.globalAlpha = .42;
  LX.drawImage(GRAIN[BOIL % 3], 0, 0);
  LX.globalCompositeOperation = 'source-over'; LX.globalAlpha = 1;
  g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(layer, 0, 0);
}

// ---------- escenas ----------
function scene1(g, lt) {
  g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(PAPER, 0, 0);
  const L = beginLayer(); cam(L, lt, 0);
  shape(L, ell(560, 1070, 440, 440, 26, 5, .06, lt * .15), C.coral, { lw: 0, amp: 5, seed: 40 });
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * Math.PI * 2 + lt * .35;
    L.fillStyle = i % 2 ? C.mustard : C.teal;
    L.beginPath(); L.arc(560 + Math.cos(a) * 520, 1070 + Math.sin(a) * 520, 11, 0, 7); L.fill();
  }
  for (let i = 0; i < 3; i++) {
    const x = -120 + ((lt * 190 + i * 330) % 1400), y = 860 + i * 70 + Math.sin(lt * 2 + i) * 22;
    bird(L, x, y, .9 - i * .12, Math.sin(Math.floor(lt * 12) / 12 * 14 + i * 2), C.bird);
  }
  for (let i = 0; i < 8; i++) {
    const x = rnd(i + 1) * W + Math.sin(lt * 1.3 + i) * 40, y = ((lt * 130 + rnd(i + 9) * 1500) % 1600) + 200;
    leaf(L, x, y, lt * 1.6 + i, .9 + rnd(i) * .5, [C.mustard, C.coral, C.teal][i % 3]);
  }
  const enter = eOutBack(clamp((lt - .1) / .8));
  drawChar(L, { x: 540, y: 1350 + (1 - enter) * 800, s: 1.6, hair: 'bun', hairColor: C.hairDark, hairHi: C.hairHi, sweater: C.mustard, sweaterD: C.mustardD, collar: C.mustardD, eyes: 'happy', mouth: 42, wave: lt > .8, seed: 10 }, lt);
  popWord(L, 'Nombres para', 540, 225, 118, C.teal, lt, .5, -.03);
  popWord(L, 'niña', 540, 385, 175, C.coral, lt, .85, .02);
  popWord(L, 'con', 385, 560, 96, C.ink, lt, 1.25, -.05);
  popWord(L, 'M', 620, 555, 250, C.mustard, lt, 1.45, .06);
  const sp = clamp((lt - 1.65) / .45);
  if (sp > 0 && sp < 1) {
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2, r1 = 130 + sp * 90, r2 = r1 + 50 * (1 - sp);
      line(L, [[620 + Math.cos(a) * r1, 555 + Math.sin(a) * r1], [620 + Math.cos(a) * r2, 555 + Math.sin(a) * r2]], C.coral, 9, 500 + i, 1);
    }
  }
  if (lt > 1.9) for (let i = 0; i < 3; i++) {
    const tw = .6 + .4 * Math.sin(lt * 5 + i * 2);
    sparkle(L, [800, 290, 880][i], [520, 470, 330][i], tw * .9, [C.mustard, C.teal, C.coral][i]);
  }
  endLayer(g);
}

function scene2(g, lt) {
  g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(PAPER, 0, 0);
  const L = beginLayer(); cam(L, lt, .6);
  const arch = arcPts(540, 1320, 420, 420, Math.PI, Math.PI * 2, 14).concat([[960, 2100], [120, 2100]]);
  shape(L, arch, C.teal, { lw: 0, seed: 41, amp: 3 });
  L.save(); L.setLineDash([2, 26]); line(L, arcPts(540, 1320, 380, 380, Math.PI * 1.02, Math.PI * 1.98, 14), C.cream, 9, 42, 1); L.restore();
  for (let i = 0; i < 4; i++) shape(L, ell([170, 930, 120, 960][i], [1080, 1180, 1500, 1620][i], 26, 26, 10, 43 + i), [C.mustard, C.coral, C.coral, C.mustard][i], { lw: 4, seed: 43 + i });
  for (let i = 0; i < 8; i++) {
    const x = 540 + (rnd(i + 20) - .5) * 760 + Math.sin(lt * 2 + i) * 25;
    const y = 1700 - ((lt * 170 + rnd(i + 30) * 1000) % 1150);
    heart(L, x, y, .8 + rnd(i) * .7, Math.sin(lt * 2 + i) * .2, i % 3 ? C.coral : C.mustard);
  }
  drawChar(L, { x: 540, y: 1400, s: 1.55, hair: 'pigtails', hairColor: C.hairDark, hairHi: C.hairHi, sweater: C.cream, stripes: C.coral, collar: C.ink, eyes: 'open', look: Math.sin(lt * .9), mouth: 34, blinkOff: .4, seed: 30 }, lt);
  lettersIn(L, 'Mía', 540, 430, 290, C.coral, lt, .7);
  pill(L, 'significa', 540, 650, lt, 1.3, C.teal);
  writeOn(L, '“mía o amada”', 540, 772, 112, C.ink, lt, 1.55, .9, C.coral);
  if (lt > 1.2) for (let i = 0; i < 3; i++) {
    const tw = .6 + .4 * Math.sin(lt * 5 + i * 2);
    sparkle(L, [160, 910, 870][i], [360, 300, 560][i], tw, [C.mustard, C.teal, C.mustard][i]);
  }
  endLayer(g);
}

function wave(g, baseY, amp, lambda, phase, color, seed) {
  const pts = [];
  for (let x = -120; x <= W + 120; x += 40) pts.push([x, baseY + amp * Math.sin(x / lambda * Math.PI * 2 + phase)]);
  const p = jit(pts, seed, 2);
  g.beginPath(); openPath(g, p); g.lineTo(W + 200, H + 200); g.lineTo(-200, H + 200); g.closePath();
  g.fillStyle = color; g.fill();
  g.beginPath(); openPath(g, p); g.strokeStyle = C.ink; g.lineWidth = 5; g.stroke();
  for (let k = 0; k < 6; k++) {
    const cx = ((k * lambda - phase / (Math.PI * 2) * lambda) % (W + 200) + W + 200) % (W + 200) - 60;
    const cy = baseY + amp * Math.sin(cx / lambda * Math.PI * 2 + phase) + 18;
    line(g, [[cx - 40, cy + 6], [cx - 10, cy - 6], [cx + 30, cy + 4]], C.cream, 7, seed + k, 1.5);
  }
}
function fish(g, x, y, rot) {
  g.save(); g.translate(x, y); g.rotate(rot);
  shape(g, [[34, 0], [36, 18], [-20, 18], [-44, 0], [-20, -18], [36, -18]].map(([a, b]) => [a * .9, b]), C.mustard, { seed: 400, lw: 4.5, amp: 1 });
  shape(g, [[-40, 0], [-72, -26], [-66, 0], [-72, 26]], C.coral, { seed: 401, lw: 4.5, amp: 1 });
  g.fillStyle = C.ink; g.beginPath(); g.arc(18, -4, 5, 0, 7); g.fill();
  g.restore();
}
function scene3(g, lt) {
  g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(PAPER, 0, 0);
  const L = beginLayer(); cam(L, lt, .65);
  const rays = [];
  for (let i = 0; i < 28; i++) {
    const a = i / 28 * Math.PI * 2 + lt * .2, r = i % 2 ? 360 : 450;
    rays.push([540 + Math.cos(a) * r, 1080 + Math.sin(a) * r]);
  }
  shape(L, rays, C.mustard, { lw: 0, seed: 44, amp: 3 });
  shape(L, ell(540, 1080, 330, 330, 24, 45, .03), '#F7C75E', { lw: 0, seed: 45 });
  for (let i = 0; i < 2; i++) {
    const x = W + 120 - ((lt * 160 + i * 500) % 1500), y = 870 + i * 90 + Math.sin(lt * 2.2 + i) * 20;
    bird(L, x, y, .8, Math.sin(Math.floor(lt * 12) / 12 * 12 + i), C.ink);
  }
  drawChar(L, { x: 540, y: 1400, s: 1.55, hair: 'curly', hairColor: C.hairRed, hairHi: C.hairRedHi, sweater: C.cream, stripes: C.denim, collar: C.denim, eyes: 'happy', mouth: 40, wave: true, seed: 50 }, lt);
  const ph = lt * 2.2;
  wave(L, 1545, 22, 300, ph, C.tealLight, 600);
  const fp = clamp((lt - 2.0) / 1.2);
  if (fp > 0 && fp < 1) {
    const fx = lerp(150, 430, fp), fy = 1640 - Math.sin(fp * Math.PI) * 300;
    fish(L, fx, fy, Math.atan2(-Math.cos(fp * Math.PI) * 300 * Math.PI, 280));
  }
  wave(L, 1650, 20, 280, -ph * 1.1 + 1, C.teal, 610);
  for (let i = 0; i < 7; i++) {
    const x = 80 + rnd(i + 70) * 920 + Math.sin(lt * 3 + i) * 12, y = 1920 - ((lt * 120 + rnd(i + 80) * 300) % 300);
    L.beginPath(); L.arc(x, y, 8 + rnd(i) * 10, 0, 7); L.strokeStyle = C.cream; L.lineWidth = 4; L.stroke();
  }
  wave(L, 1780, 18, 320, ph * .9 + 2, C.deep, 620);
  lettersIn(L, 'Marina', 540, 360, 215, C.teal, lt, .75, { wave: true });
  pill(L, 'significa', 540, 572, lt, 1.35, C.coral);
  writeOn(L, '“mujer que viene del mar”', 540, 688, 86, C.ink, lt, 1.6, 1.1, C.teal);
  endLayer(g);
}

// ---------- transiciones ----------
function irisReveal(p, cx, cy) {
  const r = eInOutCubic(p) * 2400;
  if (r < 1) return;
  X.save(); X.setTransform(1, 0, 0, 1, 0, 0);
  X.beginPath(); closedPath(X, jit(ell(cx, cy, r, r, 30, 7, .04), 700, 6)); X.clip();
  X.drawImage(bufB, 0, 0); X.restore();
  X.save(); X.setTransform(1, 0, 0, 1, 0, 0);
  const ring = jit(ell(cx, cy, r + 24, r + 24, 30, 7, .04), 701, 6);
  X.beginPath(); closedPath(X, ring); X.strokeStyle = C.ink; X.lineWidth = 60; X.stroke();
  X.strokeStyle = C.mustard; X.lineWidth = 48; X.stroke();
  X.restore();
}
function stripeWipe(p) {
  const bw = 230, n = 4, ang = -0.55;
  const f = lerp(-1300, 1300 + n * bw, eInOutCubic(p));
  X.save(); X.setTransform(1, 0, 0, 1, 0, 0);
  X.translate(W / 2, H / 2); X.rotate(ang);
  X.beginPath(); X.rect(-3000, -3000, f - n * bw + 3000, 6000); X.clip();
  X.setTransform(1, 0, 0, 1, 0, 0); X.drawImage(bufB, 0, 0);
  X.restore();
  X.save(); X.setTransform(1, 0, 0, 1, 0, 0);
  X.translate(W / 2, H / 2); X.rotate(ang);
  const cols = [C.mustard, C.coral, C.teal, C.denim];
  for (let i = 0; i < n; i++) {
    const x1 = f - (i + 1) * bw, x2 = f - i * bw;
    const pts = [];
    for (let y = -1500; y <= 1500; y += 150) pts.push([x2 + Math.sin(y * .01 + i) * 14, y]);
    for (let y = 1500; y >= -1500; y -= 150) pts.push([x1 + Math.sin(y * .01 + i + 1) * 14, y]);
    shape(X, pts, cols[i], { lw: 6, seed: 800 + i, amp: 3 });
  }
  X.restore();
}
function irisOut(p, cx, cy) {
  const r = lerp(1500, 0, eInOutCubic(p));
  X.save(); X.setTransform(1, 0, 0, 1, 0, 0);
  X.beginPath(); X.rect(0, 0, W, H);
  if (r > 2) closedPath(X, jit(ell(cx, cy, r, r, 30, 9, .04), 900, 5).reverse());
  X.fillStyle = C.ink; X.fill('evenodd');
  if (r > 2) {
    X.beginPath(); closedPath(X, jit(ell(cx, cy, r, r, 30, 9, .04), 900, 5));
    X.strokeStyle = C.coral; X.lineWidth = 22; X.stroke();
  }
  X.restore();
}

// ---------- línea de tiempo ----------
function renderFrame(t) {
  BOIL = Math.floor(t * 8);
  X.setTransform(1, 0, 0, 1, 0, 0);
  if (t < 4.3) scene1(X, t);
  else if (t < 4.95) { scene1(X, t); scene2(BX, t - 4.3); irisReveal((t - 4.3) / .65, 930, 1030); }
  else if (t < 9.6) scene2(X, t - 4.3);
  else if (t < 10.3) { scene2(X, t - 4.3); scene3(BX, t - 9.6); stripeWipe((t - 9.6) / .7); }
  else scene3(X, t - 9.6);
  if (t >= 14.25) irisOut(clamp((t - 14.25) / .7), 540, 1120);
  X.setTransform(1, 0, 0, 1, 0, 0);
  X.globalAlpha = .55; X.drawImage(FINE[BOIL % 2], 0, 0); X.globalAlpha = 1;
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
