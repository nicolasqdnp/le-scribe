// ─────────────────────────────────────────────────────────────────────────────
//  AUDIO — musique + bruitages 100 % synthétisés (Web Audio, OfflineAudioContext)
//  Tout est planifié depuis timeline.js (CUES + SCORE) : zéro temps en dur ici.
//  Rendu hors-ligne ⇒ déterministe, échantillon-exact, bien plus rapide que le
//  temps réel. La normalisation −14 LUFS est faite ensuite par loudness.mjs.
// ─────────────────────────────────────────────────────────────────────────────
import * as T from './timeline.js';

const { midiToHz, mulberry32 } = T;

export async function renderAudio(OfflineCtx) {
  const sr = T.SAMPLE_RATE;
  const ctx = new OfflineCtx(2, Math.round(sr * T.DURATION), sr);

  // ── Matériaux déterministes ────────────────────────────────────────────────
  const noiseBuf = (() => {
    const b = ctx.createBuffer(2, sr * 4, sr);
    for (let c = 0; c < 2; c++) {
      const r = mulberry32(100 + c);
      const d = b.getChannelData(c);
      for (let i = 0; i < d.length; i++) d[i] = r() * 2 - 1;
    }
    return b;
  })();
  let noiseCounter = 0;
  function noise(t, dur) {
    const s = ctx.createBufferSource();
    s.buffer = noiseBuf;
    s.loop = true;
    s.start(t, (noiseCounter++ * 0.731) % 3);
    s.stop(t + dur);
    return s;
  }

  // Réponse impulsionnelle synthétique (bruit stéréo × decay exponentiel, filtre passe-bas qui se ferme)
  function makeIR(seconds, tau, seed, bright = 0.55, dark = 0.03, pre = 0.012) {
    const n = Math.round(sr * seconds);
    const b = ctx.createBuffer(2, n, sr);
    for (let c = 0; c < 2; c++) {
      const r = mulberry32(seed + c * 17);
      const d = b.getChannelData(c);
      let y = 0;
      const p = Math.round(pre * sr);
      for (let i = p; i < n; i++) {
        const x = i / sr;
        const k = Math.min(1, x / (seconds * 0.8));
        const a = bright * (1 - k) + dark * k;
        y += a * ((r() * 2 - 1) - y);
        d[i] = y * Math.exp(-(x - pre) / tau) * (i < p + 400 ? (i - p) / 400 : 1);
      }
      // réflexions précoces
      for (const [ms, g] of [[19, 0.5], [31, 0.35], [47, 0.28], [67, -0.22]]) {
        const j = Math.round((ms + c * 3) * 0.001 * sr);
        if (j < n) d[j] += g;
      }
    }
    return b;
  }

  // ── Bus & effets ───────────────────────────────────────────────────────────
  const master = ctx.createGain();
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 24;
  hp.Q.value = 0.5;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -16;
  comp.knee.value = 10;
  comp.ratio.value = 3.2;
  comp.attack.value = 0.006;
  comp.release.value = 0.18;
  const sat = ctx.createWaveShaper();
  {
    const n = 2048;
    const c = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1)) * 2 - 1;
      c[i] = Math.tanh(x * 1.6) / Math.tanh(1.6);
    }
    sat.curve = c;
    sat.oversample = '4x';
  }
  const gate = ctx.createGain();
  const fadeOut = ctx.createGain();
  const pre = ctx.createGain();
  pre.gain.value = 0.28;
  master.connect(pre).connect(hp).connect(comp).connect(sat).connect(gate).connect(fadeOut).connect(ctx.destination);

  // Fenêtres de silence numérique (coupure + souffle) : rampes de 1,5 ms, sans clic
  gate.gain.setValueAtTime(1, 0);
  for (const w of T.MUTE_WINDOWS) {
    gate.gain.setValueAtTime(1, w.t0 - 0.0015);
    gate.gain.linearRampToValueAtTime(0, w.t0);
    gate.gain.setValueAtTime(0, w.t1 - 0.0015);
    gate.gain.linearRampToValueAtTime(1, w.t1);
  }
  fadeOut.gain.setValueAtTime(1, 0);
  fadeOut.gain.setValueAtTime(1, T.DURATION - 0.3);
  fadeOut.gain.linearRampToValueAtTime(0, T.DURATION);

  // Réverbs : plaque (courte) et salle (longue)
  const plate = ctx.createConvolver();
  plate.buffer = makeIR(1.7, 0.42, 11, 0.6, 0.06);
  const plateIn = ctx.createGain();
  const plateOut = ctx.createGain();
  plateOut.gain.value = 0.9;
  plateIn.connect(plate).connect(plateOut).connect(master);
  const hall = ctx.createConvolver();
  hall.buffer = makeIR(4.2, 1.05, 29, 0.4, 0.015, 0.028);
  const hallIn = ctx.createGain();
  const hallOut = ctx.createGain();
  hallOut.gain.value = 0.85;
  hallIn.connect(hall).connect(hallOut).connect(master);

  // Delay ping-pong (croche pointée)
  const delIn = ctx.createGain();
  {
    const dl = ctx.createDelay(1);
    const dr = ctx.createDelay(1);
    dl.delayTime.value = T.BEAT * 0.75;
    dr.delayTime.value = T.BEAT * 0.75;
    const fbl = ctx.createGain();
    const fbr = ctx.createGain();
    fbl.gain.value = 0.42;
    fbr.gain.value = 0.42;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 3200;
    const pl = ctx.createStereoPanner();
    pl.pan.value = -0.7;
    const pr = ctx.createStereoPanner();
    pr.pan.value = 0.7;
    delIn.connect(lp).connect(dl);
    dl.connect(fbl).connect(dr);
    dr.connect(fbr).connect(dl);
    dl.connect(pl).connect(master);
    dr.connect(pr).connect(master);
    const send2 = ctx.createGain();
    send2.gain.value = 0.35;
    dl.connect(send2).connect(hallIn);
  }

  // Bus musique (sidechain : ducking sur chaque kick / boom)
  const musicBus = ctx.createGain();
  const duck = ctx.createGain();
  musicBus.connect(duck).connect(master);
  {
    duck.gain.setValueAtTime(1, 0);
    const times = [];
    for (const c of T.CUES) if ((c.type === 'kick' || c.type === 'boom') && !times.some((x) => Math.abs(x - c.t) < 0.01)) times.push(c.t);
    times.sort((a, b) => a - b);
    for (const t of times) {
      const deep = T.sectionAt(t).id === 'manifesto' ? 0.7 : 0.28;
      duck.gain.setValueAtTime(deep, t);
      duck.gain.linearRampToValueAtTime(1, t + 0.24);
    }
  }
  const drumBus = ctx.createGain();
  drumBus.gain.value = 1.35;
  drumBus.connect(master);
  const fxBus = ctx.createGain();
  fxBus.connect(master);

  // ── Petits helpers ─────────────────────────────────────────────────────────
  const G = (v = 0) => {
    const g = ctx.createGain();
    g.gain.value = v;
    return g;
  };
  const F = (type, f, q = 0.7) => {
    const b = ctx.createBiquadFilter();
    b.type = type;
    b.frequency.value = f;
    b.Q.value = q;
    return b;
  };
  const P = (pan) => {
    const p = ctx.createStereoPanner();
    p.pan.value = pan;
    return p;
  };
  function osc(type, freq, t, dur) {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    o.start(t);
    o.stop(t + dur);
    return o;
  }
  /** envelope AD(R) exponentielle sur un AudioParam */
  function adsr(param, t, peak, atk, dec, rel = 0, hold = 0) {
    param.setValueAtTime(0.0001, t);
    param.linearRampToValueAtTime(peak, t + atk);
    if (hold > 0) param.setValueAtTime(peak, t + atk + hold);
    param.exponentialRampToValueAtTime(0.0001, t + atk + hold + dec);
    if (rel) param.setValueAtTime(0, t + atk + hold + dec + rel);
  }
  const sends = (node, { plate: pl = 0, hall: hl = 0, delay: dl = 0 } = {}) => {
    if (pl) node.connect(G(pl)).connect(plateIn);
    if (hl) node.connect(G(hl)).connect(hallIn);
    if (dl) node.connect(G(dl)).connect(delIn);
  };

  // ── Voix batterie ──────────────────────────────────────────────────────────
  function kick(t, v = 1) {
    const o = osc('sine', 160, t, 0.6);
    o.frequency.setValueAtTime(165, t);
    o.frequency.exponentialRampToValueAtTime(52, t + 0.06);
    o.frequency.exponentialRampToValueAtTime(41, t + 0.35);
    const g = G();
    adsr(g.gain, t, 1.0 * v, 0.002, 0.46);
    const ws = ctx.createWaveShaper();
    const c = new Float32Array(512);
    for (let i = 0; i < 512; i++) c[i] = Math.tanh(((i / 511) * 2 - 1) * 2.2);
    ws.curve = c;
    o.connect(ws).connect(g).connect(drumBus);
    const n = noise(t, 0.02);
    const ng = G();
    adsr(ng.gain, t, 0.35 * v, 0.0008, 0.012);
    n.connect(F('highpass', 2500)).connect(ng).connect(drumBus);
  }
  function clap(t, v = 1) {
    const g = G();
    const bp = F('bandpass', 1500, 0.9);
    [0, 0.011, 0.023].forEach((d, i) => {
      g.gain.setValueAtTime(0.0001, t + d);
      g.gain.linearRampToValueAtTime(0.9 * v, t + d + 0.001);
      g.gain.exponentialRampToValueAtTime(i < 2 ? 0.08 : 0.0001, t + d + 0.009);
    });
    g.gain.setValueAtTime(0.5 * v, t + 0.024);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    noise(t, 0.3).connect(bp).connect(F('highpass', 600)).connect(g);
    g.connect(drumBus);
    sends(g, { plate: 0.5, hall: 0.12 });
  }
  function snare(t, v = 1, soft = false) {
    const g = G();
    adsr(g.gain, t, 0.8 * v, 0.001, soft ? 0.16 : 0.13);
    noise(t, 0.3).connect(F('bandpass', 2000, 0.7)).connect(F('highpass', 700)).connect(g);
    g.connect(drumBus);
    const o = osc('triangle', 200, t, 0.2);
    o.frequency.exponentialRampToValueAtTime(130, t + 0.08);
    const og = G();
    adsr(og.gain, t, 0.45 * v, 0.001, 0.09);
    o.connect(og).connect(drumBus);
    sends(g, { plate: soft ? 0.5 : 0.28 });
  }
  function hat(t, v = 0.5, open = false) {
    const g = G();
    adsr(g.gain, t, 0.5 * v, 0.0008, open ? 0.22 : 0.045);
    noise(t, 0.3).connect(F('highpass', 7200, 0.8)).connect(g);
    g.connect(P((Math.round(t * 8) % 2 ? 1 : -1) * 0.25)).connect(drumBus);
  }
  function shaker(t, v = 0.5) {
    const g = G();
    adsr(g.gain, t, 0.35 * v, 0.014, 0.08);
    noise(t, 0.2).connect(F('bandpass', 5200, 1.2)).connect(g).connect(drumBus);
    sends(g, { plate: 0.15 });
  }
  function thump(t, v = 0.7, soft = false) {
    const o = osc('sine', 80, t, 0.5);
    o.frequency.setValueAtTime(78, t);
    o.frequency.exponentialRampToValueAtTime(40, t + 0.14);
    const g = G();
    adsr(g.gain, t, (soft ? 0.7 : 1.0) * v, 0.004, soft ? 0.34 : 0.22);
    o.connect(g).connect(fxBus);
    sends(g, { hall: soft ? 0.25 : 0.1 });
  }

  // ── Impacts & transitions ──────────────────────────────────────────────────
  function boom(t, v = 1, soft = false) {
    // sub qui tombe
    const o = osc('sine', 120, t, 2.6);
    o.frequency.setValueAtTime(110, t);
    o.frequency.exponentialRampToValueAtTime(34, t + 0.7);
    const g = G();
    adsr(g.gain, t, 1.15 * v, 0.003, 1.9);
    const ws = ctx.createWaveShaper();
    const c = new Float32Array(512);
    for (let i = 0; i < 512; i++) c[i] = Math.tanh(((i / 511) * 2 - 1) * 1.8);
    ws.curve = c;
    o.connect(ws).connect(g).connect(fxBus);
    sends(g, { hall: 0.22 });
    // grondement
    const rn = noise(t, 1.5);
    const rf = F('lowpass', 900, 0.8);
    rf.frequency.setValueAtTime(900, t);
    rf.frequency.exponentialRampToValueAtTime(70, t + 1.2);
    const rg = G();
    adsr(rg.gain, t, 0.9 * v, 0.002, 1.3);
    rn.connect(rf).connect(rg).connect(fxBus);
    sends(rg, { hall: 0.35 });
    // claque
    const cn = noise(t, 0.2);
    const cg = G();
    adsr(cg.gain, t, (soft ? 0.25 : 0.65) * v, 0.0008, soft ? 0.12 : 0.07);
    cn.connect(F('highpass', soft ? 1500 : 2800)).connect(cg).connect(fxBus);
    sends(cg, { plate: 0.35 });
    // résonance métallique (FM) : plus agressive quand pas « soft »
    if (!soft) {
      const car = osc('sine', 196, t, 1.2);
      const mod = osc('sine', 196 * 1.414, t, 1.2);
      const mg = G(220);
      mod.connect(mg).connect(car.frequency);
      const cg2 = G();
      adsr(cg2.gain, t, 0.22 * v, 0.001, 0.9);
      car.connect(cg2).connect(fxBus);
      sends(cg2, { hall: 0.3 });
    }
  }
  function hit(t, v = 0.8) {
    const o = osc('sine', 150, t, 0.5);
    o.frequency.setValueAtTime(140, t);
    o.frequency.exponentialRampToValueAtTime(46, t + 0.18);
    const g = G();
    adsr(g.gain, t, 0.95 * v, 0.002, 0.36);
    o.connect(g).connect(fxBus);
    const n = noise(t, 0.12);
    const ng = G();
    adsr(ng.gain, t, 0.55 * v, 0.0008, 0.07);
    n.connect(F('bandpass', 2600, 0.9)).connect(ng).connect(fxBus);
    sends(ng, { plate: 0.4 });
    const tick = osc('square', 1900, t, 0.02);
    const tg = G();
    adsr(tg.gain, t, 0.12 * v, 0.0005, 0.012);
    tick.connect(tg).connect(fxBus);
  }
  function crash(t, v = 1) {
    const g = G();
    adsr(g.gain, t, 0.55 * v, 0.002, 2.2);
    const n = noise(t, 2.6);
    n.connect(F('highpass', 4200, 0.6)).connect(g).connect(fxBus);
    for (const [f, q] of [[5400, 6], [7900, 5], [10800, 4]]) {
      const pg = G();
      adsr(pg.gain, t, 0.35 * v, 0.002, 1.4);
      noise(t, 1.6).connect(F('bandpass', f, q)).connect(pg).connect(fxBus);
    }
    sends(g, { hall: 0.3, plate: 0.15 });
  }
  function revcrash(t, dur) {
    const g = G();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.7, t + dur - 0.01);
    g.gain.linearRampToValueAtTime(0, t + dur);
    const f = F('highpass', 1800, 0.7);
    f.frequency.setValueAtTime(1800, t);
    f.frequency.exponentialRampToValueAtTime(6500, t + dur);
    noise(t, dur).connect(f).connect(g).connect(fxBus);
    sends(g, { plate: 0.2 });
  }
  function riser(t, dur, id) {
    const hook = id === 'hookRiser';
    const g = G();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(hook ? 0.5 : 0.5, t + dur * 0.97);
    g.gain.linearRampToValueAtTime(0, t + dur);
    const bp = F('bandpass', 250, 1.4);
    bp.frequency.setValueAtTime(250, t);
    bp.frequency.exponentialRampToValueAtTime(hook ? 7000 : 9000, t + dur);
    noise(t, dur).connect(bp).connect(g).connect(fxBus);
    // saw qui monte (+ quinte juste : tendu mais net ; tritone pour l'accroche)
    const interval = hook ? 1.4142 : 1.5;
    for (const [mul, det] of [[1, 0], [interval, 7]]) {
      const o = osc('sawtooth', 73.4 * mul, t, dur);
      o.frequency.setValueAtTime(73.4 * mul, t);
      o.frequency.exponentialRampToValueAtTime(73.4 * mul * 8, t + dur);
      o.detune.value = det;
      const og = G();
      og.gain.setValueAtTime(0.0001, t);
      og.gain.exponentialRampToValueAtTime(hook ? 0.16 : 0.08, t + dur * 0.97);
      og.gain.linearRampToValueAtTime(0, t + dur);
      const lp = F('lowpass', 500, 1);
      lp.frequency.setValueAtTime(500, t);
      lp.frequency.exponentialRampToValueAtTime(7000, t + dur);
      o.connect(lp).connect(og).connect(fxBus);
    }
    if (hook) {
      // bourdon de basse montant + battement sous-harmonique
      const o = osc('sine', 36.7, t, dur);
      o.frequency.exponentialRampToValueAtTime(55, t + dur);
      const og = G();
      og.gain.setValueAtTime(0.0001, t);
      og.gain.exponentialRampToValueAtTime(0.35, t + dur * 0.9);
      og.gain.linearRampToValueAtTime(0, t + dur);
      o.connect(og).connect(fxBus);
    }
  }
  function whoosh(t, dur, dir = 1) {
    const g = G();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.55, t + dur * 0.7);
    g.gain.linearRampToValueAtTime(0, t + dur);
    const bp = F('bandpass', dir > 0 ? 400 : 5200, 1.1);
    bp.frequency.setValueAtTime(dir > 0 ? 400 : 5200, t);
    bp.frequency.exponentialRampToValueAtTime(dir > 0 ? 5200 : 400, t + dur);
    const pan = P(dir > 0 ? -0.8 : 0.8);
    pan.pan.setValueAtTime(dir > 0 ? -0.8 : 0.8, t);
    pan.pan.linearRampToValueAtTime(dir > 0 ? 0.8 : -0.8, t + dur);
    noise(t, dur).connect(bp).connect(g).connect(pan).connect(fxBus);
    sends(g, { plate: 0.2 });
  }
  const GLITCH_NOTES = [74, 81, 69, 86, 77, 93, 72, 98];
  function glitch(t, v, i) {
    // bip « bit-crushé » + tic : le son d'un signal qui se désagrège
    const f = midiToHz(GLITCH_NOTES[i % GLITCH_NOTES.length]);
    const o = osc('square', f, t, 0.06);
    const ws = ctx.createWaveShaper();
    const c = new Float32Array(33);
    for (let k = 0; k < 33; k++) c[k] = Math.round(((k / 32) * 2 - 1) * 5) / 5;
    ws.curve = c;
    const g = G();
    adsr(g.gain, t, 0.22 * v, 0.0005, 0.035);
    o.connect(ws).connect(g).connect(fxBus);
    const n = noise(t, 0.03);
    const ng = G();
    adsr(ng.gain, t, 0.3 * v, 0.0004, 0.02);
    n.connect(F('highpass', 4000)).connect(ng).connect(fxBus);
  }
  function pop(t, midi, v = 1) {
    const f = midiToHz(midi);
    const o = osc('sine', f * 0.8, t, 0.5);
    o.frequency.setValueAtTime(f * 0.8, t);
    o.frequency.exponentialRampToValueAtTime(f, t + 0.025);
    const g = G();
    adsr(g.gain, t, 0.5 * v, 0.002, 0.28);
    o.connect(g).connect(musicBus);
    const o2 = osc('triangle', f * 2, t, 0.3);
    const g2 = G();
    adsr(g2.gain, t, 0.18 * v, 0.002, 0.16);
    o2.connect(g2).connect(musicBus);
    const n = noise(t, 0.02);
    const ng = G();
    adsr(ng.gain, t, 0.3 * v, 0.0006, 0.012);
    n.connect(F('bandpass', 3800, 1)).connect(ng).connect(fxBus);
    sends(g, { plate: 0.4, delay: 0.22, hall: 0.12 });
    // petite poussée grave pour que la carte « tombe » dans le mix
    const sub = osc('sine', 70, t, 0.25);
    sub.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    const sg = G();
    adsr(sg.gain, t, 0.5 * v, 0.002, 0.14);
    sub.connect(sg).connect(fxBus);
  }
  function word(t, midi, v = 1) {
    // pluck « piano feutré » : fondamentale + partiels qui s'éteignent plus vite + marteau
    const f = midiToHz(midi);
    const out = G();
    [[1, 0.6, 1.5], [2, 0.28, 0.9], [3, 0.14, 0.5], [4.01, 0.07, 0.3]].forEach(([m, a, d], i) => {
      const o = osc(i === 0 ? 'triangle' : 'sine', f * m, t, d + 0.3);
      o.detune.value = (i - 1.5) * 3;
      const g = G();
      adsr(g.gain, t, a * v, 0.004, d);
      o.connect(g).connect(out);
    });
    const n = noise(t, 0.04);
    const ng = G();
    adsr(ng.gain, t, 0.08 * v, 0.001, 0.025);
    n.connect(F('bandpass', 1800, 1)).connect(ng).connect(out);
    const lp = F('lowpass', 5000, 0.5);
    lp.frequency.setValueAtTime(5500, t);
    lp.frequency.exponentialRampToValueAtTime(1500, t + 0.9);
    out.connect(lp).connect(musicBus);
    sends(lp, { hall: 0.5, delay: 0.3 });
    const sub = osc('sine', f / 2, t, 1.2);
    const sg = G();
    adsr(sg.gain, t, 0.22 * v, 0.01, 1.0);
    sub.connect(sg).connect(musicBus);
  }
  function sparkle(t, midi, v = 1) {
    const seq = [0, 4, 7, 12, 16, 19, 24];
    seq.forEach((st, i) => {
      const tt = t + i * 0.055;
      const f = midiToHz(midi - 12 + st);
      const o = osc('sine', f, tt, 1.6);
      const g = G();
      adsr(g.gain, tt, (0.22 - i * 0.015) * v, 0.003, 1.2);
      const o2 = osc('triangle', f * 2.0, tt, 0.8);
      const g2 = G();
      adsr(g2.gain, tt, 0.05 * v, 0.002, 0.5);
      o.connect(g).connect(fxBus);
      o2.connect(g2).connect(fxBus);
      sends(g, { hall: 0.6, delay: 0.5 });
    });
  }
  function click(t, v = 1) {
    const n = noise(t, 0.02);
    const g = G();
    adsr(g.gain, t, 0.7 * v, 0.0005, 0.01);
    n.connect(F('highpass', 3200)).connect(g).connect(fxBus);
    const o = osc('sine', 260, t, 0.2);
    o.frequency.exponentialRampToValueAtTime(95, t + 0.07);
    const og = G();
    adsr(og.gain, t, 0.8 * v, 0.001, 0.11);
    o.connect(og).connect(fxBus);
    const d = osc('sine', 1760, t + 0.012, 1.2);
    const dg = G();
    adsr(dg.gain, t + 0.012, 0.14 * v, 0.002, 0.9);
    d.connect(dg).connect(fxBus);
    sends(dg, { hall: 0.5, delay: 0.3 });
  }

  // ── Voix mélodiques (SCORE) ────────────────────────────────────────────────
  function pad(n) {
    const f = midiToHz(n.midi);
    const out = G();
    const dur = n.dur;
    const lp = F('lowpass', 500, 0.6);
    lp.frequency.setValueAtTime(380, n.t);
    lp.frequency.linearRampToValueAtTime(n.t < 14 ? 1400 : 2400, n.t + Math.min(dur, 1.6));
    lp.frequency.linearRampToValueAtTime(700, n.t + dur);
    [-14, -5, 5, 14].forEach((det, i) => {
      const o = osc('sawtooth', f, n.t, dur + 0.7);
      o.detune.value = det;
      const p = P([-0.7, -0.25, 0.25, 0.7][i]);
      o.connect(p).connect(out);
    });
    out.gain.setValueAtTime(0.0001, n.t);
    out.gain.linearRampToValueAtTime(0.016 * n.vel, n.t + 0.5);
    out.gain.setValueAtTime(0.016 * n.vel, n.t + dur - 0.1);
    out.gain.linearRampToValueAtTime(0.0001, n.t + dur + 0.6);
    out.connect(lp).connect(musicBus);
    sends(lp, { hall: 0.4 });
  }
  function bass(n) {
    const f = midiToHz(n.midi);
    const g = G();
    if (n.long) {
      const o = osc('sine', f, n.t, n.dur + 0.2);
      const o2 = osc('triangle', f, n.t, n.dur + 0.2);
      const g2 = G(0.35);
      g.gain.setValueAtTime(0.0001, n.t);
      g.gain.linearRampToValueAtTime(0.5 * n.vel, n.t + 0.15);
      g.gain.setValueAtTime(0.5 * n.vel, n.t + n.dur - 0.1);
      g.gain.linearRampToValueAtTime(0.0001, n.t + n.dur + 0.15);
      o.connect(g);
      o2.connect(g2).connect(g);
      g.connect(musicBus);
      return;
    }
    const lp = F('lowpass', 420, 1.1);
    lp.frequency.setValueAtTime(1500, n.t);
    lp.frequency.exponentialRampToValueAtTime(260, n.t + 0.12);
    const s = osc('sawtooth', f, n.t, n.dur + 0.05);
    const q = osc('square', f / 2, n.t, n.dur + 0.05);
    const sub = osc('sine', f / 2, n.t, n.dur + 0.05);
    const gq = G(0.5);
    const gs = G(0.9);
    s.connect(lp);
    q.connect(gq).connect(lp);
    lp.connect(g);
    sub.connect(gs).connect(g);
    g.gain.setValueAtTime(0.0001, n.t);
    g.gain.linearRampToValueAtTime(0.8 * n.vel, n.t + 0.004);
    g.gain.setValueAtTime(0.8 * n.vel, n.t + n.dur - 0.04);
    g.gain.linearRampToValueAtTime(0.0001, n.t + n.dur);
    g.connect(musicBus);
  }
  function arp(n, idx) {
    const f = midiToHz(n.midi);
    const lp = F('lowpass', 5000, 3);
    lp.frequency.setValueAtTime(5200, n.t);
    lp.frequency.exponentialRampToValueAtTime(700, n.t + 0.16);
    const g = G();
    adsr(g.gain, n.t, 0.3 * n.vel, 0.002, 0.2);
    for (const d of [-8, 8]) {
      const o = osc('sawtooth', f, n.t, 0.3);
      o.detune.value = d;
      o.connect(lp);
    }
    lp.connect(g);
    const p = P(idx % 2 ? 0.35 : -0.35);
    g.connect(p).connect(musicBus);
    sends(g, { delay: 0.32, plate: 0.18 });
  }
  function stab(n) {
    const f = midiToHz(n.midi);
    const lp = F('lowpass', 4000, 0.8);
    lp.frequency.setValueAtTime(5200, n.t);
    lp.frequency.exponentialRampToValueAtTime(900, n.t + 0.9);
    const g = G();
    adsr(g.gain, n.t, 0.16 * n.vel, 0.004, 1.1);
    [-18, -7, 0, 7, 18].forEach((d, i) => {
      const o = osc('sawtooth', f, n.t, 1.3);
      o.detune.value = d;
      o.connect(P((i - 2) * 0.35)).connect(lp);
    });
    lp.connect(g).connect(musicBus);
    sends(g, { hall: 0.5, plate: 0.2 });
  }
  function drone(n) {
    const f = midiToHz(n.midi);
    const lp = F('lowpass', 220, 0.9);
    lp.frequency.setValueAtTime(160, n.t);
    lp.frequency.exponentialRampToValueAtTime(n.midi > 55 ? 1800 : 600, n.t + n.dur);
    const g = G();
    g.gain.setValueAtTime(0.0001, n.t);
    g.gain.exponentialRampToValueAtTime(0.1 * n.vel, n.t + 1.2);
    g.gain.linearRampToValueAtTime(0.2 * n.vel, n.t + n.dur);
    for (const d of [-9, 9]) {
      const o = osc('sawtooth', f, n.t, n.dur + 0.1);
      o.detune.setValueAtTime(d, n.t);
      // dérive lente : la dissonance « respire »
      o.detune.linearRampToValueAtTime(d * 3, n.t + n.dur);
      o.connect(lp);
    }
    lp.connect(g).connect(fxBus);
    sends(g, { hall: 0.3 });
    if (n.midi < 45) {
      const s = osc('sine', f, n.t, n.dur + 0.1);
      const sg = G();
      sg.gain.setValueAtTime(0.0001, n.t);
      sg.gain.exponentialRampToValueAtTime(0.18, n.t + 1.5);
      sg.gain.linearRampToValueAtTime(0.26, n.t + n.dur);
      s.connect(sg).connect(fxBus);
    }
  }

  // ── Planification depuis la timeline ───────────────────────────────────────
  let glitchIndex = 0;
  for (const c of T.CUES) {
    switch (c.type) {
      case 'kick': kick(c.t, c.v); break;
      case 'clap': clap(c.t, c.v); break;
      case 'snare': snare(c.t, c.v, c.soft); break;
      case 'hat': hat(c.t, c.v); break;
      case 'ohat': hat(c.t, c.v, true); break;
      case 'shaker': shaker(c.t, c.v); break;
      case 'thump': thump(c.t, c.v, c.soft); break;
      case 'boom': boom(c.t, c.v, c.soft); break;
      case 'hit': hit(c.t, c.v); break;
      case 'crash': crash(c.t, c.v); break;
      case 'revcrash': revcrash(c.t, c.dur); break;
      case 'riser': riser(c.t, c.dur, c.id); break;
      case 'whoosh': whoosh(c.t, c.dur, c.dir); break;
      case 'glitch': glitch(c.t, c.v, glitchIndex++); break;
      case 'pop': pop(c.t, c.midi, c.v); break;
      case 'word': word(c.t, c.midi, c.v); break;
      case 'sparkle': sparkle(c.t, c.midi, c.v); break;
      case 'click': click(c.t, c.v); break;
      default: break;
    }
  }
  let arpIndex = 0;
  for (const n of T.SCORE) {
    if (n.voice === 'pad') pad(n);
    else if (n.voice === 'bass') bass(n);
    else if (n.voice === 'arp') arp(n, arpIndex++);
    else if (n.voice === 'stab') stab(n);
    else if (n.voice === 'drone') drone(n);
  }

  const buf = await ctx.startRendering();
  return { sampleRate: sr, left: buf.getChannelData(0), right: buf.getChannelData(1) };
}
