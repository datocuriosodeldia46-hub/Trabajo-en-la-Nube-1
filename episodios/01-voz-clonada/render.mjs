// Render determinista de la escena: Chromium sin interfaz dibuja cada cuadro con
// window.cuadro(t) y los JPEG van directo a ffmpeg junto con audio/mezcla.wav.
//
//   node render.mjs                       → render/ep01.mp4 (1080×1920, 30 fps)
//   node render.mjs --w 540 --h 960       → versión preliminar más rápida
//   node render.mjs --stills 0,3.5,16.5   → PNG sueltos en render/stills/ para revisar
//   node render.mjs --desde 10 --hasta 20 → solo un tramo
import http from 'node:http';
import { spawn } from 'node:child_process';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { chromium } from 'playwright';

const RAIZ = resolve(new URL('.', import.meta.url).pathname);
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const W = +arg('w', 1080), H = +arg('h', 1920), FPS = +arg('fps', 30);
const stills = arg('stills', null);
const salidaMp4 = arg('salida', join(RAIZ, 'render', W === 1080 ? 'ep01.mp4' : `ep01_${W}x${H}.mp4`));

const tipos = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2' };
const servidor = http.createServer(async (req, res) => {
  const ruta = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const archivo = join(RAIZ, ruta === '/' ? 'escena/index.html' : ruta);
  if (!archivo.startsWith(RAIZ)) { res.writeHead(403).end(); return; }
  try {
    const datos = await readFile(archivo);
    res.writeHead(200, { 'Content-Type': tipos[extname(archivo)] || 'application/octet-stream' }).end(datos);
  } catch { res.writeHead(404).end(); }
});
await new Promise((r) => servidor.listen(0, '127.0.0.1', r));
const puerto = servidor.address().port;

const ffmpegBin = (await import('node:child_process')).execSync('python3 -c "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())"').toString().trim();
const navegador = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pagina = await navegador.newPage({ viewport: { width: W, height: H } });
pagina.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('[página]', m.text()); });
pagina.on('pageerror', (e) => console.log('[error]', e.message));
await pagina.goto(`http://127.0.0.1:${puerto}/escena/index.html?w=${W}&h=${H}`);
await pagina.waitForFunction(() => window.listo === true, null, { timeout: 120000 });
const duracion = await pagina.evaluate(() => window.duracion);

async function capturar(t, calidad = 0.92, formato = 'image/jpeg') {
  const url = await pagina.evaluate(([t, f, q]) => { window.cuadro(t); return document.getElementById('salida').toDataURL(f, q); }, [t, formato, calidad]);
  return Buffer.from(url.split(',')[1], 'base64');
}

if (stills) {
  await mkdir(join(RAIZ, 'render', 'stills'), { recursive: true });
  for (const t of stills.split(',').map(Number)) {
    const ruta = join(RAIZ, 'render', 'stills', `t${t.toFixed(2).padStart(6, '0')}.jpg`);
    await writeFile(ruta, await capturar(t, 0.9));
    console.log('still', ruta);
  }
} else {
  const desde = +arg('desde', 0), hasta = Math.min(+arg('hasta', duracion), duracion);
  await mkdir(join(RAIZ, 'render'), { recursive: true });
  const ff = spawn(ffmpegBin, ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
    '-ss', String(desde), '-t', String(hasta - desde), '-i', join(RAIZ, 'audio', 'mezcla.wav'),
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k',
    '-shortest', '-movflags', '+faststart', salidaMp4], { stdio: ['pipe', 'inherit', 'inherit'] });
  const total = Math.round((hasta - desde) * FPS);
  const inicio = Date.now();
  for (let f = 0; f < total; f++) {
    const buf = await capturar(desde + f / FPS);
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    if (f % 60 === 0) {
      const s = (Date.now() - inicio) / 1000;
      console.log(`cuadro ${f}/${total} · ${(s / Math.max(f, 1)).toFixed(2)} s/cuadro`);
    }
  }
  ff.stdin.end();
  await new Promise((r) => ff.on('close', r));
  console.log('listo:', salidaMp4);
}
await navegador.close();
servidor.close();
