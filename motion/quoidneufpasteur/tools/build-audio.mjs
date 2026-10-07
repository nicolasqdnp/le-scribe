// Rend la musique + bruitages (Web Audio hors-ligne dans Chromium), normalise à −14 LUFS,
// écrit build/audio_raw.wav (non normalisé), build/audio.wav (normalisé) et un rapport JSON.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, serve, launch, openPage } from './lib.mjs';
import { measure, normalize, wavFloat32 } from '../src/loudness.mjs';

const OUT = path.join(ROOT, 'build');
fs.mkdirSync(OUT, { recursive: true });
let raw = null;
const { server, port } = await serve(async (url, body) => { if (url === '/upload/audio') raw = body; });
const browser = await launch();
const page = await openPage(browser, port);
const t0 = Date.now();
const info = await page.evaluate(() => window.renderAudio());
console.log('audio rendu en', ((Date.now() - t0) / 1000).toFixed(1), 's', info);
await browser.close();
server.close();

const f = new Float32Array(raw.buffer, raw.byteOffset, raw.byteLength / 4);
const n = info.n;
const left = f.slice(0, n), right = f.slice(n, 2 * n);
fs.writeFileSync(path.join(OUT, 'audio_raw.wav'), wavFloat32(left, right, info.sr));
const before = measure(left, right, info.sr);
console.log('avant normalisation :', before);
const res = normalize(left, right, info.sr, -14, -1.0);
fs.writeFileSync(path.join(OUT, 'audio.wav'), wavFloat32(res.left, res.right, info.sr));
console.log(`gain ${res.gainDb.toFixed(2)} dB, plafond limiteur ${res.ceiling.toFixed(2)} dBFS, ${res.iterations} itérations`);
console.log('après :', res.report);
fs.writeFileSync(path.join(OUT, 'audio_report.json'), JSON.stringify({ before, after: res.report, gainDb: res.gainDb }, null, 2));
