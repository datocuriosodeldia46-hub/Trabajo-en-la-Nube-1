// Offline renderer (vertical 1080×1920): headless Chromium + ffmpeg. CDN imports are served from node_modules.
//   node render.mjs --stills 1,4.6,15,21        → render/stills/t*.png
//   node render.mjs --cam x,y,z,tx,ty,tz,fov --stills 1
//   node render.mjs --video [--sub 2] [--from 0 --to 35.5] [--out file] [--mute]
import http from 'node:http';
import { spawn } from 'node:child_process';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { chromium } from 'playwright';

const ROOT = resolve(new URL('.', import.meta.url).pathname);
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const flag = (k) => process.argv.includes(`--${k}`);
const W = 1080, H = 1920;
const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json' };
const server = http.createServer(async (req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const file = join(ROOT, p === '/' ? 'index.html' : p);
  if (!file.startsWith(ROOT)) { res.writeHead(403).end(); return; }
  try { res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream' }).end(await readFile(file)); } catch { res.writeHead(404).end(); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: W, height: H } });
page.on('console', (m) => { if (!m.text().includes('GPU stall')) console.log('[page]', m.text()); });
page.on('pageerror', (e) => console.log('[error]', e.message));
await page.route('https://cdn.jsdelivr.net/npm/**', async (route) => {
  const m = new URL(route.request().url()).pathname.match(/^\/npm\/(three)@[^/]+\/(.*)$/);
  if (!m) return route.abort();
  route.fulfill({ status: 200, contentType: 'text/javascript', body: await readFile(join(ROOT, 'node_modules', m[1], m[2])) });
});
await page.goto(`http://127.0.0.1:${server.address().port}/index.html?render=1&sub=${arg('sub', 1)}`);
await page.waitForFunction(() => window.ready === true, null, { timeout: 300000 });
await mkdir(join(ROOT, 'render', 'stills'), { recursive: true });
const shot = async (t, type = 'image/png', q) => Buffer.from((await page.evaluate(([t, type, q]) => { window.renderAt(t); return document.getElementById('c').toDataURL(type, q); }, [t, type, q])).split(',')[1], 'base64');
if (arg('cam')) await page.evaluate((c) => window.qa.setCam(c.split(',').map(Number)), arg('cam'));
if (arg('stills')) for (const t of arg('stills').split(',').map(Number)) {
  const f = join(ROOT, 'render', 'stills', `t${t.toFixed(2).padStart(5, '0')}.png`); const t0 = Date.now();
  await writeFile(f, await shot(t)); console.log('still', f, `${Date.now() - t0} ms`);
}
if (flag('video')) {
  const fps = 30, from = +arg('from', 0), to = +arg('to', await page.evaluate(() => window.duration));
  const out = arg('out', join(ROOT, 'render', 'lucas.mp4')), wav = join(ROOT, 'audio', 'mix.wav'), withAudio = existsSync(wav) && !flag('mute');
  const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-c:v', 'mjpeg', '-framerate', String(fps), '-i', '-',
    ...(withAudio ? ['-ss', String(from), '-t', String(to - from), '-i', wav] : []),
    '-c:v', 'libx264', '-profile:v', 'high', '-preset', 'slow', '-b:v', '20M', '-maxrate', '25M', '-bufsize', '40M', '-pix_fmt', 'yuv420p', '-r', String(fps),
    ...(withAudio ? ['-c:a', 'aac', '-b:a', '256k', '-shortest'] : []), '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const n0 = Math.round(from * fps), n1 = Math.round(to * fps), t0 = Date.now();
  for (let f = n0; f < n1; f++) {
    const buf = await shot(f / fps, 'image/jpeg', 0.96);
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    if ((f - n0) % 30 === 0) { const s = (Date.now() - t0) / 1000; console.log(`frame ${f}/${n1}  ${(s / Math.max(f - n0, 1)).toFixed(2)} s/frame`); }
  }
  ff.stdin.end(); await new Promise((r) => ff.on('close', r)); console.log('video', out);
}
await browser.close(); server.close();
