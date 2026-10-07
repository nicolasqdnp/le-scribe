// Auto-vérification de la vidéo finale (le fichier MP4 réellement livré, pas les sources) :
//   1. conteneur : 1080×1920, 60 fps constant, 1800 images, 30,000 s, flux audio/vidéo alignés
//   2. sonie : EBU R128 via ffmpeg (−14 LUFS intégrés, crête vraie ≤ −1 dBTP)
//   3. synchro : pour chaque cue « sync » de la timeline, début de l'attaque audio (décodé du MP4)
//      vs. première image où l'écran change nettement (décodée du MP4)
//   4. photosensibilité : flashs par seconde (WCAG 2.3.1, ≤ 3 / s)
//   5. planches contact (build/contact_*.png)
//   node tools/verify.mjs [build/final.mp4]
import fs from 'node:fs';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { ROOT } from './lib.mjs';
import * as T from '../src/timeline.js';

const file = path.resolve(ROOT, process.argv[2] || 'build/final.mp4');
const out = (...a) => console.log(...a);
const report = { file };

function collect(args) {
  return new Promise((res, rej) => {
    const p = spawn('ffmpeg', ['-v', 'error', ...args], { stdio: ['ignore', 'pipe', 'inherit'] });
    const chunks = [];
    p.stdout.on('data', (c) => chunks.push(c));
    p.on('close', (c) => (c ? rej(new Error('ffmpeg ' + c)) : res(Buffer.concat(chunks))));
  });
}

// ── 1. conteneur ─────────────────────────────────────────────────────────────
{
  const j = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-count_frames', '-show_streams', '-show_format', '-of', 'json', file]).toString());
  const v = j.streams.find((s) => s.codec_type === 'video'), a = j.streams.find((s) => s.codec_type === 'audio');
  const ok = (c) => (c ? '✔' : '✘');
  report.container = { w: v.width, h: v.height, fps: v.r_frame_rate, frames: +v.nb_read_frames, vdur: +v.duration, adur: +a.duration, vstart: +v.start_time, astart: +a.start_time, vcodec: v.codec_name, pix: v.pix_fmt, acodec: a.codec_name, abr: +a.bit_rate, size: +j.format.size, br: +j.format.bit_rate };
  const c = report.container;
  out('── 1. Conteneur');
  out(`${ok(c.w === 1080 && c.h === 1920)} ${c.w}×${c.h}   ${ok(c.fps === '60/1')} ${c.fps} fps   ${ok(c.frames === 1800)} ${c.frames} images   ${c.vcodec}/${c.pix}`);
  out(`${ok(Math.abs(c.vdur - 30) < 0.001)} vidéo ${c.vdur.toFixed(3)} s   ${ok(Math.abs(c.adur - 30) < 0.05)} audio ${c.adur.toFixed(3)} s (${c.acodec} ${(c.abr / 1000) | 0} kb/s)   début vidéo ${c.vstart}  début audio ${c.astart}`);
  out(`  taille ${(c.size / 1e6).toFixed(1)} Mo, débit ${(c.br / 1e6).toFixed(1)} Mb/s`);
}

// ── 2. sonie ────────────────────────────────────────────────────────────────
{
  const txt = await new Promise((res) => {
    const p = spawn('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-vn', '-af', 'ebur128=peak=true', '-f', 'null', '-'], { stdio: ['ignore', 'ignore', 'pipe'] });
    let s = '';
    p.stderr.on('data', (d) => (s += d));
    p.on('close', () => res(s));
  });
  const sum = txt.slice(txt.lastIndexOf('Summary:'));
  const num = (re) => parseFloat((sum.match(re) || [])[1]);
  const I = num(/I:\s+(-?[\d.]+) LUFS/), LRA = num(/LRA:\s+(-?[\d.]+) LU/), TP = num(/Peak:\s+(-?[\d.]+) dBFS/);
  report.loudness = { integrated: I, lra: LRA, truePeak: TP };
  out('── 2. Sonie (ffmpeg ebur128, sur l\'AAC livré)');
  out(`${Math.abs(I + 14) <= 0.5 ? '✔' : '✘'} intégrée ${I} LUFS (cible −14 ±0,5)   ${TP <= -1 ? '✔' : '✘'} crête vraie ${TP} dBTP (≤ −1)   LRA ${LRA} LU`);
}

// ── 3. synchro ──────────────────────────────────────────────────────────────
const SR = 48000;
const pcm = await collect(['-i', file, '-vn', '-ac', '1', '-ar', String(SR), '-f', 'f32le', '-']);
const audio = new Float32Array(pcm.buffer, pcm.byteOffset, pcm.byteLength / 4);
const gw = 108, gh = 192;
const gray = await collect(['-i', file, '-an', '-vf', `scale=${gw}:${gh}:flags=area,format=gray`, '-f', 'rawvideo', '-']);
const nF = gray.length / (gw * gh);
const frames = (k) => gray.subarray(k * gw * gh, (k + 1) * gw * gh);
const delta = new Float32Array(nF), lum = new Float32Array(nF);
for (let k = 0; k < nF; k++) {
  const f = frames(k);
  let s = 0;
  for (let i = 0; i < f.length; i++) s += f[i];
  lum[k] = Math.pow(s / f.length / 255, 2.2);
  if (k) { const g = frames(k - 1); let d = 0; for (let i = 0; i < f.length; i++) d += Math.abs(f[i] - g[i]); delta[k] = d / f.length; }
}
// énergie audio en dB, résolution 1 ms (fenêtre 2 ms), puis pente maximale = début d'attaque
// détection sur la bande grave (< ~180 Hz, deux pôles) : le « thump » des impacts, kicks et pops,
// insensible aux bruits de fond (risers, réverbération) qui masquent l'attaque en large bande
{
  const a = 1 - Math.exp(-2 * Math.PI * 180 / SR);
  let y1 = 0, y2 = 0;
  for (let i = 0; i < audio.length; i++) { y1 += a * (audio[i] - y1); y2 += a * (y1 - y2); audio[i] = y2; }
}
const ms = SR / 1000;
const nMs = Math.floor(audio.length / ms);
const eDb = new Float32Array(nMs);
for (let m = 0; m < nMs; m++) {
  let s = 0;
  const a = Math.max(0, (m - 1) * ms), b = Math.min(audio.length, (m + 1) * ms);
  for (let i = a; i < b; i++) s += audio[i] * audio[i];
  eDb[m] = 10 * Math.log10(s / (b - a) + 1e-12);
}
function audioOnset(tc) {
  // « saut » d'énergie : niveau à m (fenêtre 2 ms) moins le maximum des 25 ms précédentes
  const a = Math.max(30, Math.round((tc - 0.03) * 1000)), b = Math.min(nMs - 3, Math.round((tc + 0.05) * 1000));
  const jump = (m) => { let mx = -200; for (let j = m - 25; j <= m - 3; j++) mx = Math.max(mx, eDb[j]); return eDb[m + 1] - mx; };
  let best = -1e9;
  for (let m = a; m <= b; m++) best = Math.max(best, jump(m));
  let at = a;
  for (let m = a; m <= b; m++) if (jump(m) >= 0.8 * best) { at = m; break; }
  return { t: at / 1000, rise: best };
}
function visualOnset(tc) {
  const kc = Math.round(tc * T.FPS);
  let best = -1, kb = kc;
  // première image, à partir de la cue, dont la variation atteint 50 % du pic de la fenêtre [kc, kc+4]
  for (let k = Math.max(1, kc); k <= Math.min(nF - 1, kc + 4); k++) if (delta[k] > best) best = delta[k];
  for (let k = Math.max(1, kc); k <= Math.min(nF - 1, kc + 4); k++) if (delta[k] >= 0.5 * best) { kb = k; break; }
  const base = [...delta.slice(Math.max(1, kc - 18), Math.max(2, kc - 5))].sort((x, y) => x - y);
  const med = base.length ? base[base.length >> 1] : 0;
  return { k: kb, d: best, med, ok: best > med * 2.2 + 0.6, around: [...delta.slice(Math.max(0, kc - 2), kc + 5)].map((x) => +x.toFixed(1)) };
}
const rows = [];
for (const c of T.CUES.filter((c) => c.sync)) {
  const a = audioOnset(c.t), v = visualOnset(c.t);
  rows.push({ id: c.id || c.type, type: c.type, t: c.t, audioMs: Math.round((a.t - c.t) * 1000), frameK: v.k, frameT: v.k / T.FPS, visOk: v.ok, offsetMs: Math.round((a.t - v.k / T.FPS) * 1000), rise: +a.rise.toFixed(1), delta: +v.d.toFixed(1), around: v.around });
}
const measured = rows.filter((r) => r.visOk && r.rise > 6);
const offs = measured.map((r) => r.offsetMs);
const mean = offs.reduce((p, c) => p + c, 0) / Math.max(1, offs.length);
const worst = Math.max(0, ...offs.map(Math.abs));
report.sync = { rows, measured: measured.length, total: rows.length, meanMs: mean, worstMs: worst };
out('── 3. Synchro image / son (décodés du MP4)');
out('   cue            t(s)   attaque audio − t   1re image changée   décalage son−image');
for (const r of rows) {
  out(`   ${(r.id + '').padEnd(12)} ${r.t.toFixed(3).padStart(7)}   ${String(r.audioMs).padStart(4)} ms        ${r.visOk ? 'k=' + String(r.frameK).padStart(4) + ' (' + r.frameT.toFixed(3) + ' s)' : '— progressif —   '}   ${r.visOk && r.rise > 6 ? String(r.offsetMs).padStart(4) + ' ms' : '   n/m'}`);
}
out(`${worst <= 17 ? '✔' : '✘'} ${measured.length}/${rows.length} cues mesurables (changement visuel net) ; décalage moyen ${mean.toFixed(1)} ms, pire cas ${worst} ms (tolérance : 1 image = 16,7 ms)`);
// corrélation globale : force d'attaque audio (60 Hz) × variation d'image
{
  const n = nF;
  const aEnv = new Float32Array(n);
  for (let k = 0; k < n; k++) {
    let mx = 0;
    for (let m = Math.round(k * 1000 / 60); m < Math.round((k + 1) * 1000 / 60) && m + 2 < nMs; m++) mx = Math.max(mx, eDb[m + 2] - eDb[m - 1 < 0 ? 0 : m - 1]);
    aEnv[k] = Math.max(0, mx);
  }
  const z = (x) => { const m = x.reduce((p, c) => p + c, 0) / x.length; const sd = Math.sqrt(x.reduce((p, c) => p + (c - m) ** 2, 0) / x.length) || 1; return x.map((v) => (v - m) / sd); };
  const A = z([...aEnv]), V = z([...delta]);
  let bestLag = 0, bestR = -2;
  const curve = {};
  for (let lag = -6; lag <= 6; lag++) {
    let s = 0, c = 0;
    for (let k = 6; k < n - 6; k++) { s += A[k + lag] * V[k]; c++; }
    curve[lag] = +(s / c).toFixed(3);
    if (s / c > bestR) { bestR = s / c; bestLag = lag; }
  }
  report.sync.xcorr = { bestLagFrames: bestLag, r: bestR, curve };
  out(`${bestLag === 0 ? '✔' : '✘'} corrélation croisée attaques audio × changements d'image sur tout le film : pic à ${bestLag} image(s), r=${bestR.toFixed(2)}   (lags −6…+6 : ${Object.entries(curve).map(([l, r]) => `${l}:${r}`).join(' ')})`);
}

// ── 4. photosensibilité ─────────────────────────────────────────────────────
{
  const trans = [];
  let ext = lum[0], dir = 0;
  for (let k = 1; k < nF; k++) {
    const d = lum[k] - ext;
    if (dir >= 0 && d < -0.1) { trans.push(k); ext = lum[k]; dir = -1; }
    else if (dir <= 0 && d > 0.1) { trans.push(k); ext = lum[k]; dir = 1; }
    else if ((dir >= 0 && lum[k] > ext) || (dir <= 0 && lum[k] < ext)) ext = lum[k];
  }
  let maxIn1s = 0;
  for (let i = 0; i < trans.length; i++) { let c = 0; for (let j = i; j < trans.length && trans[j] - trans[i] < T.FPS; j++) c++; maxIn1s = Math.max(maxIn1s, c); }
  const flashes = Math.ceil(maxIn1s / 2);
  report.flash = { maxTransitionsPerSecond: maxIn1s, flashesPerSecond: flashes };
  out('── 4. Photosensibilité');
  out(`${flashes <= 3 ? '✔' : '✘'} au plus ${flashes} flash(s) par seconde glissante (${maxIn1s} transitions de luminance ≥ 10 %) — limite WCAG 2.3.1 : 3`);
}

// ── 5. planches contact ─────────────────────────────────────────────────────
{
  const dir = path.join(ROOT, 'build');
  const names = [];
  for (let s = 0; s < 3; s++) {
    const name = path.join(dir, `contact_${s * 10}-${s * 10 + 10}s.png`);
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-ss', String(s * 10), '-t', '10', '-i', file, '-an', '-vf', `fps=4,scale=216:384:flags=lanczos,drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:text='%{pts\\:hms}':x=6:y=6:fontsize=20:fontcolor=white:box=1:boxcolor=black@0.55,tile=8x5:padding=4:color=black`, '-frames:v', '1', name]);
    names.push(name);
  }
  out('── 5. Planches contact :', names.map((n) => path.relative(ROOT, n)).join(', '));
}
fs.writeFileSync(path.join(ROOT, 'build', 'verify_report.json'), JSON.stringify(report, null, 2));
