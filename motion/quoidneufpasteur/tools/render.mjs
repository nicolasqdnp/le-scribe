// Rendu image par image : N navigateurs Chromium (WebGL2 logiciel) → images RGBA brutes
// → ré-ordonnées → un seul ffmpeg (H.264). Chaque image est une fonction pure du temps,
// donc le résultat est identique quel que soit le nombre de workers.
//   node tools/render.mjs [--workers=4] [--from=0] [--to=1800] [--out=build/video.mp4] [--crf=15]
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { ROOT, serve, launch, openPage } from './lib.mjs';

const arg = (k, d) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split('=')[1] ?? d;
const WORKERS = +arg('workers', 4);
const FROM = +arg('from', 0);
const TO = +arg('to', 1800);
const OUT = path.resolve(ROOT, arg('out', 'build/video.mp4'));
const CRF = arg('crf', '18');
const SAMPLES = arg('samples', null);
const W = 1080, H = 1920;
fs.mkdirSync(path.dirname(OUT), { recursive: true });

// ── ffmpeg : RGBA brut (lignes bas→haut) → H.264 yuv420p BT.709, 60 fps constant ──
const ff = spawn('ffmpeg', [
  '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${W}x${H}`, '-framerate', '60', '-i', '-',
  '-vf', 'vflip,scale=out_color_matrix=bt709:out_range=tv,format=yuv420p',
  '-c:v', 'libx264', '-preset', 'slow', '-crf', CRF, '-profile:v', 'high', '-level:v', '4.2',
  '-g', '60', '-bf', '3', '-x264-params', 'aq-mode=3:aq-strength=0.9:deblock=-1,-1:psy-rd=1.0,0.15',
  '-maxrate', '16M', '-bufsize', '32M',
  '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
  '-r', '60', '-movflags', '+faststart', OUT,
], { stdio: ['pipe', 'inherit', 'inherit'] });
ff.on('close', (c) => console.log('ffmpeg terminé, code', c));

// ── réordonnancement ──
const pending = new Map();
let nextWrite = FROM;
let nextJob = FROM;
const MAX_AHEAD = 20;
const t0 = Date.now();
let flushing = false;
async function flush() {
  if (flushing) return;
  flushing = true;
  while (pending.has(nextWrite)) {
    const buf = pending.get(nextWrite);
    pending.delete(nextWrite);
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    nextWrite++;
    if ((nextWrite - FROM) % 30 === 0) {
      const done = nextWrite - FROM, el = (Date.now() - t0) / 1000;
      console.log(`  ${done}/${TO - FROM} images (${(done / el).toFixed(2)} i/s) — reste ~${(((TO - nextWrite) / (done / el)) / 60).toFixed(1)} min`);
    }
  }
  flushing = false;
}
const infos = new Map();
const { server, port } = await serve(async (url, body) => {
  const m = url.match(/\/upload\/frame\/(\d+)/);
  if (m) { pending.set(+m[1], body); flush(); }
});

async function worker(id) {
  const browser = await launch();
  const page = await openPage(browser, port);
  await page.evaluate(() => window.initVideo());
  while (true) {
    while (nextJob >= nextWrite + MAX_AHEAD && nextJob < TO) await new Promise((r) => setTimeout(r, 40));
    const f = nextJob++;
    if (f >= TO) break;
    let ok = false;
    for (let attempt = 0; attempt < 3 && !ok; attempt++) {
      try {
        const info = await page.evaluate(([f, s]) => window.uploadFrame(f, s ? { samples: +s } : {}), [f, SAMPLES]);
        infos.set(f, info);
        ok = true;
      } catch (e) { console.error(`worker ${id} frame ${f}: ${e.message}`); }
    }
    if (!ok) throw new Error('image ' + f + ' impossible');
  }
  await Promise.race([browser.close(), new Promise((r) => setTimeout(r, 4000))]);
}

await Promise.all(Array.from({ length: WORKERS }, (_, i) => worker(i)));
while (nextWrite < TO) await new Promise((r) => setTimeout(r, 50));
const closed = new Promise((r) => ff.on('close', r));
ff.stdin.end();
await closed;
server.close();
// rapport (zone sûre, échantillons) pour verify.mjs
fs.writeFileSync(path.join(ROOT, 'build', `frame_report_${FROM}.json`), JSON.stringify([...infos.entries()].sort((a, b) => a[0] - b[0]).map(([f, i]) => ({ f, t: i.t, black: i.black, shatterP: i.shatterP, samples: i.samples, report: i.report }))));
console.log(`rendu terminé en ${((Date.now() - t0) / 60000).toFixed(1)} min → ${OUT}`);
process.exit(0);
