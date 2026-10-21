// Offline renderer: headless Chromium loads index.html, the CDN imports are served from
// node_modules, and every frame is drawn with renderAt(t) and piped to ffmpeg.
//
//   node render.mjs --stills 0.4,3.8,9.21          → render/stills/t*.png
//   node render.mjs --sheet 24                     → render/stills/contact24.png (24 evenly spaced stills)
//   node render.mjs --qa                           → render/qa_intersections.json
//   node render.mjs --audio                        → audio/stems/*.f32 (Web Audio stems for master.py)
//   node render.mjs --video [--sub 3] [--from 0 --to 20] [--w 1920]   → render/frames chunks + MP4
import http from 'node:http';
import { spawn, execFileSync } from 'node:child_process';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { chromium } from 'playwright';

const ROOT = resolve(new URL('.', import.meta.url).pathname);
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const flag = (k) => process.argv.includes(`--${k}`);

const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.png': 'image/png' };
const server = http.createServer(async (req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const file = join(ROOT, p === '/' ? 'index.html' : p);
  if (!file.startsWith(ROOT)) { res.writeHead(403).end(); return; }
  try { res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream' }).end(await readFile(file)); }
  catch { res.writeHead(404).end(); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
page.on('console', (m) => { if (!m.text().includes('GPU stall')) console.log('[page]', m.text()); });
page.on('pageerror', (e) => console.log('[error]', e.message));
// serve the pinned CDN modules from node_modules
await page.route('https://cdn.jsdelivr.net/npm/**', async (route) => {
  const u = new URL(route.request().url());
  const m = u.pathname.match(/^\/npm\/(three|cannon-es)@[^/]+\/(.*)$/);
  if (!m) return route.abort();
  route.fulfill({ status: 200, contentType: 'text/javascript', body: await readFile(join(ROOT, 'node_modules', m[1], m[2])) });
});
const sub = +arg('sub', 1);
await page.goto(`http://127.0.0.1:${port}/index.html?render=1&sub=${sub}`);
await page.waitForFunction(() => window.ready === true, null, { timeout: 300000 });
await mkdir(join(ROOT, 'render', 'stills'), { recursive: true });

async function frameRGBA(t) {
  return await page.evaluate((t) => {
    window.renderAt(t);
    const gl = document.getElementById('c').getContext('webgl2');
    const px = new Uint8Array(1920 * 1080 * 4);
    gl.readPixels(0, 0, 1920, 1080, gl.RGBA, gl.UNSIGNED_BYTE, px);
    // flip rows and pack as base64
    const row = 1920 * 4, out = new Uint8Array(px.length);
    for (let y = 0; y < 1080; y++) out.set(px.subarray((1079 - y) * row, (1080 - y) * row), y * row);
    let s = ''; const CH = 0x8000;
    for (let i = 0; i < out.length; i += CH) s += String.fromCharCode.apply(null, out.subarray(i, i + CH));
    return btoa(s);
  }, t).then((b64) => Buffer.from(b64, 'base64'));
}
async function frameJPEG(t) {
  const url = await page.evaluate((t) => { window.renderAt(t); return document.getElementById('c').toDataURL('image/jpeg', 0.96); }, t);
  return Buffer.from(url.split(',')[1], 'base64');
}
async function png(t, file) {
  const url = await page.evaluate((t) => { window.renderAt(t); return document.getElementById('c').toDataURL('image/png'); }, t);
  await writeFile(file, Buffer.from(url.split(',')[1], 'base64'));
}

if (arg('cam')) await page.evaluate((c) => window.qa.setCam(c.split(',').map(Number)), arg('cam'));
if (arg('stills')) {
  for (const t of arg('stills').split(',').map(Number)) {
    const f = join(ROOT, 'render', 'stills', `t${t.toFixed(2).padStart(5, '0')}.png`);
    const t0 = Date.now(); await png(t, f); console.log('still', f, `${Date.now() - t0} ms`);
  }
}
if (arg('sheet')) {
  const n = +arg('sheet'), cols = 6, rows = Math.ceil(n / cols), tw = 480, th = 270;
  const ts = arg('times') ? arg('times').split(',').map(Number) : Array.from({ length: n }, (_, i) => (i + 0.5) * 20 / n);
  const dir = join(ROOT, 'render', 'stills', 'sheet'); await mkdir(dir, { recursive: true });
  const files = [];
  for (const t of ts) { const f = join(dir, `s${t.toFixed(2).padStart(5, '0')}.png`); await png(t, f); files.push(f); console.log('sheet', t.toFixed(2)); }
  const ff = 'ffmpeg';
  const inputs = files.flatMap((f) => ['-i', f]);
  const filters = files.map((_, i) => `[${i}:v]scale=${tw}:${th},drawtext=text='${ts[i].toFixed(2)}s':x=8:y=8:fontsize=22:fontcolor=white:box=1:boxcolor=black@0.5[v${i}]`).join(';');
  const layout = files.map((_, i) => `${(i % cols) * tw}_${Math.floor(i / cols) * th}`).join('|');
  execFileSync(ff, ['-v', 'error', '-y', ...inputs, '-filter_complex', `${filters};${files.map((_, i) => `[v${i}]`).join('')}xstack=inputs=${files.length}:layout=${layout}:fill=black`, join(ROOT, 'render', 'stills', `contact${n}.png`)]);
  console.log('contact sheet', join(ROOT, 'render', 'stills', `contact${n}.png`));
}
if (flag('qa')) {
  const t0 = +arg('from', 0), t1 = +arg('to', 20);
  const log = await page.evaluate(([a, b]) => window.qa.intersections(a, b), [t0, t1]);
  await writeFile(join(ROOT, 'render', 'qa_intersections.json'), JSON.stringify(log, null, 1));
  const pairs = {};
  for (const e of log) { const k = [e.a.replace(/\.\d+$/, ''), e.b.replace(/\.\d+$/, '')].sort().join(' × '); (pairs[k] ??= []).push(e); }
  console.log(`${log.length} penetrating samples, ${Object.keys(pairs).length} pairs`);
  for (const [k, v] of Object.entries(pairs)) console.log(`  ${k}: ${v.length} frames, t ${v[0].t}–${v[v.length - 1].t}, max ${Math.max(...v.map(e => e.pen)).toFixed(4)} m`);
}
if (flag('events')) {
  const ev = await page.evaluate(() => window.qa.events());
  await writeFile(join(ROOT, 'render', 'events.json'), JSON.stringify(ev, null, 1));
  console.log(ev.filter(e => e.type !== 'thump' || e.v > 0.6).map(e => `${e.t.toFixed(3)} ${e.type} ${e.i ?? ''} ${e.v ? e.v.toFixed(2) : ''}`).join('\n'));
}
if (flag('audio')) {
  await mkdir(join(ROOT, 'audio', 'stems'), { recursive: true });
  const names = await page.evaluate(async () => { window.__stems = await window.synthStems(48000); return Object.keys(window.__stems); });
  for (const n of names) {
    for (const ch of [0, 1]) {
      const b64 = await page.evaluate(([n, ch]) => { const a = new Uint8Array(window.__stems[n][ch].buffer.slice(0)); let s = ''; for (let i = 0; i < a.length; i += 0x8000) s += String.fromCharCode.apply(null, a.subarray(i, i + 0x8000)); return btoa(s); }, [n, ch]);
      await writeFile(join(ROOT, 'audio', 'stems', `${n}_${ch}.f32`), Buffer.from(b64, 'base64'));
    }
    console.log('stem', n);
  }
}
if (flag('video')) {
  const from = +arg('from', 0), to = +arg('to', 20), fps = 60;
  const out = arg('out', join(ROOT, 'render', 'claw_machine.mp4'));
  const wav = join(ROOT, 'audio', 'mix.wav');
  const withAudio = existsSync(wav) && !flag('mute');
  const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-c:v', 'mjpeg', '-framerate', String(fps), '-i', '-',
    ...(withAudio ? ['-ss', String(from), '-t', String(to - from), '-i', wav] : []),
    '-c:v', 'libx264', '-profile:v', 'high', '-preset', 'slow', '-b:v', '25M', '-maxrate', '30M', '-bufsize', '50M', '-pix_fmt', 'yuv420p', '-r', String(fps),
    ...(withAudio ? ['-c:a', 'aac', '-b:a', '256k', '-shortest'] : []), '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const n0 = Math.round(from * fps), n1 = Math.round(to * fps);
  const t0 = Date.now();
  for (let f = n0; f < n1; f++) {
    const buf = await frameJPEG(f / fps);
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    if ((f - n0) % 30 === 0) { const s = (Date.now() - t0) / 1000; console.log(`frame ${f}/${n1}  ${(s / Math.max(f - n0, 1)).toFixed(2)} s/frame  eta ${((n1 - f) * s / Math.max(f - n0, 1) / 60).toFixed(1)} min`); }
  }
  ff.stdin.end(); await new Promise((r) => ff.on('close', r));
  console.log('video', out);
}
await browser.close(); server.close();
