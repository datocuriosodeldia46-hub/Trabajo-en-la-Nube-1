// Uso:
//   node render.js                 -> exporta video_sin_audio.mp4 (70 s, 1080x1920, 30 fps)
//   node render.js --stills 1,4.6  -> guarda fotogramas sueltos en stills/ para revisar
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { chromium } = require('playwright');

const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const FPS = 30, DUR = 70;

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 540, height: 960 } });
  page.on('pageerror', e => { console.error('Error en la página:', e.message); process.exit(1); });
  await page.goto('file://' + path.join(__dirname, 'index.html') + '#render');
  await page.evaluate(() => window.ready);

  const stillsArg = process.argv.indexOf('--stills');
  if (stillsArg > -1) {
    fs.mkdirSync(path.join(__dirname, 'stills'), { recursive: true });
    for (const t of process.argv[stillsArg + 1].split(',').map(Number)) {
      const b64 = await page.evaluate(t => { window.renderFrame(t); return document.getElementById('c').toDataURL('image/jpeg', 0.9).split(',')[1]; }, t);
      fs.writeFileSync(path.join(__dirname, 'stills', `t${t.toFixed(2)}.jpg`), Buffer.from(b64, 'base64'));
    }
    await browser.close();
    return;
  }

  const out = path.join(__dirname, 'video_sin_audio.mp4');
  const ff = spawn(FFMPEG, ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-preset', 'medium', '-movflags', '+faststart', out],
    { stdio: ['pipe', 'inherit', 'inherit'] });
  const total = FPS * DUR;
  for (let i = 0; i < total; i++) {
    const b64 = await page.evaluate(t => { window.renderFrame(t); return document.getElementById('c').toDataURL('image/jpeg', 0.95).split(',')[1]; }, i / FPS);
    if (!ff.stdin.write(Buffer.from(b64, 'base64'))) await new Promise(r => ff.stdin.once('drain', r));
    if (i % 60 === 0) console.log(`fotograma ${i}/${total}`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  await browser.close();
  console.log('Listo:', out);
})();
