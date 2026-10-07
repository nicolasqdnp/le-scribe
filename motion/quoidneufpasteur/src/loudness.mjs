// Mesure de sonie ITU-R BS.1770-4 / EBU R128 (LUFS intégré, court terme, momentané)
// + crête vraie (sur-échantillonnage ×4) + limiteur « brick-wall » à anticipation,
// puis normalisation itérative à la cible (−14 LUFS intégrés, crête vraie ≤ −1 dBTP).

function biquad(x, b, a) {
  const y = new Float64Array(x.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const v = b[0] * x[i] + b[1] * x1 + b[2] * x2 - a[1] * y1 - a[2] * y2;
    x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v;
  }
  return y;
}

// Coefficients BS.1770-4 pour 48 kHz
const SHELF = { b: [1.53512485958697, -2.69169618940638, 1.19839281085285], a: [1, -1.69065929318241, 0.73248077421585] };
const RLB = { b: [1, -2, 1], a: [1, -1.99004745483398, 0.99007225036621] };

export const kWeight = (x) => biquad(biquad(x, SHELF.b, SHELF.a), RLB.b, RLB.a);

export function measure(left, right, sr = 48000, withTruePeak = true) {
  const kl = kWeight(left);
  const kr = kWeight(right);
  const n = kl.length;
  // énergie par fenêtre de 400 ms, pas de 100 ms (75 % de recouvrement)
  const win = Math.round(0.4 * sr);
  const hop = Math.round(0.1 * sr);
  const cs = new Float64Array(n + 1);
  for (let i = 0; i < n; i++) cs[i + 1] = cs[i] + kl[i] * kl[i] + kr[i] * kr[i];
  const blocks = [];
  for (let s = 0; s + win <= n; s += hop) blocks.push((cs[s + win] - cs[s]) / win);
  const lufs = (z) => -0.691 + 10 * Math.log10(Math.max(z, 1e-12));
  const mean = (a) => a.reduce((p, c) => p + c, 0) / Math.max(1, a.length);
  const abs = blocks.filter((z) => lufs(z) > -70);
  const rel = lufs(mean(abs)) - 10;
  const integrated = lufs(mean(abs.filter((z) => lufs(z) > rel)));
  const swin = Math.round(3 * sr);
  let st = -Infinity;
  for (let s = 0; s + swin <= n; s += hop) st = Math.max(st, lufs((cs[s + swin] - cs[s]) / swin));
  return {
    integrated,
    shortTermMax: st,
    momentaryMax: Math.max(...blocks.map(lufs)),
    samplePeakDb: peakDb(left, right),
    truePeakDb: withTruePeak ? truePeakDb(left, right) : NaN,
  };
}

export function peakDb(l, r) {
  let p = 0;
  for (let i = 0; i < l.length; i++) p = Math.max(p, Math.abs(l[i]), Math.abs(r[i]));
  return 20 * Math.log10(Math.max(p, 1e-9));
}

// Crête vraie : FIR sinc fenêtré, 3 phases intermédiaires (×4)
const TP_TAPS = 24;
const TP_KERNELS = [1, 2, 3].map((ph) => {
  const k = new Float64Array(TP_TAPS * 2);
  for (let i = 0; i < k.length; i++) {
    const x = i - TP_TAPS + 1 - ph / 4;
    const sinc = Math.abs(x) < 1e-9 ? 1 : Math.sin(Math.PI * x) / (Math.PI * x);
    k[i] = sinc * 0.5 * (1 + Math.cos((Math.PI * x) / TP_TAPS));
  }
  return k;
});
export function truePeakDb(l, r) {
  let p = 0;
  for (const ch of [l, r]) {
    for (let i = 0; i < ch.length; i++) {
      const a = Math.abs(ch[i]);
      if (a > p) p = a;
      if (a < 0.5 * p) continue; // seules les zones proches de la crête peuvent la dépasser
      for (const k of TP_KERNELS) {
        let acc = 0;
        for (let j = 0; j < k.length; j++) {
          const idx = i - TP_TAPS + 1 + j;
          if (idx >= 0 && idx < ch.length) acc += ch[idx] * k[j];
        }
        if (Math.abs(acc) > p) p = Math.abs(acc);
      }
    }
  }
  return 20 * Math.log10(Math.max(p, 1e-9));
}

/** Limiteur brick-wall à anticipation : minimum glissant centré + boxcar + release exponentiel */
export function limit(left, right, sr, ceilingDb = -1.5, lookMs = 4, releaseMs = 90) {
  const n = left.length;
  const C = Math.pow(10, ceilingDb / 20);
  const L = Math.round((lookMs / 1000) * sr);
  const r = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const p = Math.max(Math.abs(left[i]), Math.abs(right[i]));
    r[i] = p > C ? C / p : 1;
  }
  const m = new Float32Array(n);
  const dq = new Int32Array(n + 1);
  let h = 0, t = 0;
  for (let i = 0; i < n + L; i++) {
    if (i < n) {
      while (t > h && r[dq[t - 1]] >= r[i]) t--;
      dq[t++] = i;
    }
    const c = i - L;
    if (c >= 0) {
      while (dq[h] < c - L) h++;
      m[c] = r[dq[h]];
    }
  }
  const cs = new Float64Array(n + 1);
  for (let i = 0; i < n; i++) cs[i + 1] = cs[i] + m[i];
  const alpha = 1 - Math.exp(-1 / ((releaseMs / 1000) * sr));
  let prev = 1;
  const outL = new Float32Array(n), outR = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const a = Math.max(0, i - L), b = Math.min(n - 1, i + L);
    const g = (cs[b + 1] - cs[a]) / (b - a + 1);
    const v = g < prev ? g : prev + (g - prev) * alpha;
    prev = v;
    outL[i] = left[i] * v;
    outR[i] = right[i] * v;
  }
  return { left: outL, right: outR };
}

/** Normalise à targetLufs (intégré) avec crête vraie ≤ tpMaxDb. */
export function normalize(left, right, sr = 48000, targetLufs = -14, tpMaxDb = -1.0) {
  let gainDb = targetLufs - measure(left, right, sr, false).integrated;
  let ceiling = tpMaxDb - 0.35;
  let best = null;
  for (let it = 0; it < 16; it++) {
    const g = Math.pow(10, gainDb / 20);
    const l = new Float32Array(left.length), r = new Float32Array(right.length);
    for (let i = 0; i < l.length; i++) { l[i] = left[i] * g; r[i] = right[i] * g; }
    const lim = limit(l, r, sr, ceiling);
    const rep = measure(lim.left, lim.right, sr, true);
    best = { ...lim, gainDb, report: rep, ceiling, iterations: it + 1 };
    const err = targetLufs - rep.integrated;
    const tpOver = rep.truePeakDb - tpMaxDb;
    if (Math.abs(err) < 0.04 && tpOver <= 0.0) break;
    if (tpOver > 0.0) ceiling -= tpOver + 0.03;
    gainDb += err * 0.9;
  }
  return best;
}

/** WAV float32 stéréo */
export function wavFloat32(left, right, sr) {
  const n = left.length;
  const buf = Buffer.alloc(44 + n * 8);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 8, 4); buf.write('WAVE', 8);
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(3, 20); buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(sr, 24); buf.writeUInt32LE(sr * 8, 28); buf.writeUInt16LE(8, 32); buf.writeUInt16LE(32, 34);
  buf.write('data', 36); buf.writeUInt32LE(n * 8, 40);
  for (let i = 0; i < n; i++) { buf.writeFloatLE(left[i], 44 + i * 8); buf.writeFloatLE(right[i], 48 + i * 8); }
  return buf;
}

export function readWavFloat(buf) {
  // lit un WAV PCM16/24/float32 simple (utilisé par verify)
  const fmt = buf.readUInt16LE(20), ch = buf.readUInt16LE(22), sr = buf.readUInt32LE(24), bits = buf.readUInt16LE(34);
  let off = 12;
  while (buf.toString('ascii', off, off + 4) !== 'data') off += 8 + buf.readUInt32LE(off + 4);
  const size = buf.readUInt32LE(off + 4);
  const bps = bits / 8;
  const n = Math.floor(size / (bps * ch));
  const out = [new Float32Array(n), new Float32Array(n)];
  for (let i = 0; i < n; i++) {
    for (let c = 0; c < 2; c++) {
      const p = off + 8 + (i * ch + Math.min(c, ch - 1)) * bps;
      out[c][i] = fmt === 3 ? buf.readFloatLE(p) : bits === 16 ? buf.readInt16LE(p) / 32768 : buf.readIntLE(p, 3) / 8388608;
    }
  }
  return { sr, left: out[0], right: out[1] };
}
