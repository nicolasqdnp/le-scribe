import fs from 'node:fs';
import { readWavFloat, kWeight } from '../src/loudness.mjs';
const file = process.argv[2] || 'build/audio.wav';
const { sr, left, right } = readWavFloat(fs.readFileSync(file));
// niveaux par demi-seconde : crête, RMS, LUFS momentané approx
const kl = kWeight(left), kr = kWeight(right);
const rows = [];
for (let s = 0; s < 30; s += 0.5) {
  const a = Math.round(s * sr), b = Math.round((s + 0.5) * sr);
  let pk = 0, ms = 0, k = 0;
  for (let i = a; i < b; i++) { pk = Math.max(pk, Math.abs(left[i]), Math.abs(right[i])); ms += left[i] ** 2 + right[i] ** 2; k += kl[i] ** 2 + kr[i] ** 2; }
  rows.push(`${s.toFixed(1).padStart(4)}s  peak ${(20 * Math.log10(pk + 1e-9)).toFixed(1).padStart(6)} dBFS  rms ${(10 * Math.log10(ms / (b - a) / 2 + 1e-12)).toFixed(1).padStart(6)} dB  loud ${(-0.691 + 10 * Math.log10(k / (b - a) + 1e-12)).toFixed(1).padStart(6)} LUFS`);
}
console.log(rows.join('\n'));
