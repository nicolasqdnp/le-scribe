// ─────────────────────────────────────────────────────────────────────────────
//  FILM — mise en scène. state(t) est une fonction PURE du temps : aucune
//  variable d'animation n'est conservée d'une image à l'autre, ce qui permet de
//  rendre n'importe quelle image (ou sous-image de flou de mouvement) isolément,
//  en parallèle, et de la recaler à la milliseconde sur la bande-son.
// ─────────────────────────────────────────────────────────────────────────────
import * as T from './timeline.js';
import { M4, FOCAL, PROJ } from './gfx.js';
import { blockSprites } from './text.js';
import { drawLogoMark, sampleLogoPoints, drawCard, drawButton } from './art.js';

const { W, H, FPS, mulberry32, pulse, lastCue, captionById, CAPTIONS } = T;

// ── maths d'animation ────────────────────────────────────────────────────────
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const eoc = (x) => 1 - Math.pow(1 - clamp(x), 3);
const eoq = (x) => 1 - Math.pow(1 - clamp(x), 5);
const eoe = (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * clamp(x)));
const eio = (x) => { x = clamp(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const backOut = (x, s = 1.9) => { x = clamp(x) - 1; return x * x * ((s + 1) * x + s) + 1; };
/** ressort amorti : 0 → 1 avec dépassement */
const spring = (u, freq = 14, damp = 9) => (u <= 0 ? 0 : 1 - Math.exp(-damp * u) * Math.cos(freq * u));
const fr = (x) => x - Math.floor(x);
const hsh = (n) => fr(Math.sin(n * 127.1 + 311.7) * 43758.5453);
const snoise = (t, s) => Math.sin(t * 37.1 + s) * 0.5 + Math.sin(t * 61.7 + s * 2.1) * 0.3 + Math.sin(t * 97.3 + s * 3.7) * 0.2;
const WY = (top) => H / 2 - top; // y d'écran (haut=0) → y monde (haut=+)
const CYW = WY(T.SAFE_CY); // centre vertical de la zone sûre en coordonnées monde
const rgb = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; };
const CREAM = [1, 0.93, 0.82];
const GOLD = [1, 0.74, 0.42];
const GOLDH = [1, 0.86, 0.55];
const FLAME = [1, 0.46, 0.16];
const RED = [1, 0.1, 0.1];
const WHITE = [1, 1, 1];

export class Film {
  constructor(r, ts) {
    this.r = r;
    this.ts = ts;
    this.parts = new Float32Array(12 * 9000);
    this.pc = 0;
    const gl = r.gl;
    // ── textures artistiques ──
    this.logoTex = r.textureFromCanvas(drawLogoMark());
    const btn = drawButton();
    this.btn = { ...btn, tex: r.textureFromCanvas(btn.canvas) };
    const scrim = document.createElement('canvas');
    scrim.width = scrim.height = 256;
    const sc = scrim.getContext('2d');
    const g = sc.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, 'rgba(0,0,0,0.78)');
    g.addColorStop(0.55, 'rgba(0,0,0,0.38)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    sc.fillStyle = g;
    sc.fillRect(0, 0, 256, 256);
    this.scrimTex = r.textureFromCanvas(scrim);
    const white = document.createElement('canvas');
    white.width = white.height = 4;
    const wc = white.getContext('2d');
    wc.fillStyle = '#fff';
    wc.fillRect(0, 0, 4, 4);
    this.whiteTex = r.textureFromCanvas(white);

    // ── blocs de texte ──
    this.blocks = {};
    this.cards = {};
    const A = 'anton';
    const stack = (id, words, tints, maxSize, opts = {}) => {
      const size = Math.min(maxSize, ...words.map((w) => ts.fit(A, w, 700, 999)));
      this.blocks[id] = ts.block(words.map((w, i) => ({ text: w, font: A, size, tint: tints[i % tints.length], glow: opts.glow ?? 1.9, stroke: opts.stroke?.[i] })), { lineGap: opts.gap ?? 0.13 });
    };
    stack('h1', ['ON', "T'A", 'DIT'], [WHITE], 250);
    stack('h2', ['QUE', 'DIEU'], [WHITE], 330);
    stack('h3', ['EST', 'MORT.'], [WHITE], 330);
    stack('d0', ["C'EST", 'FAUX.'], [GOLDH], 330, { glow: 2.4 });
    stack('s1', ['TES', 'QUESTIONS'], [CREAM, GOLD], 300);
    stack('s2', ['SANS', 'TABOU'], [CREAM, GOLD], 320);
    stack('s3', ['SANS', 'FILTRE'], [CREAM, GOLD], 320, { stroke: [true, false] });
    stack('s4', ['SANS', 'JUGEMENT'], [CREAM, GOLD], 300);
    stack('p1', ['TON', 'DOUTE'], [CREAM, GOLDH], 330);
    stack('p2', ['TA', 'COLÈRE'], [CREAM, FLAME], 330);
    stack('p3', ['TES', 'BLESSURES'], [CREAM, GOLD], 300);
    stack('p4', ['TES', 'RÊVES'], [CREAM, GOLDH], 330);
    stack('p5', ['TU ES', 'ATTENDU'], [CREAM, WHITE], 300, { glow: 2.3 });
    // cartes-questions
    CAPTIONS.filter((c) => c.kind === 'card').forEach((c, i) => {
      const hero = c.id === 'c8';
      const toks = c.text.replace(' ?', ' ?').split(' ');
      const lines = [];
      let cur = '';
      for (const tk of toks) {
        const cand = cur ? cur + ' ' + tk : tk;
        if (cur && ts.measure(A, cand.replace(' ', ' ')).width * (150 / ts.measure(A, 'A').ref) > 640) { lines.push(cur); cur = tk; } else cur = cand;
      }
      lines.push(cur);
      const ls = lines.map((s) => s.replace(' ', ' '));
      const size = Math.min(hero ? 250 : 150, ...ls.map((s) => ts.fit(A, s, hero ? 600 : 640, 999)));
      const blk = ts.block(ls.map((s) => ({ text: s, font: A, size, tint: hero ? [0.09, 0.055, 0.02] : CREAM, glow: hero ? 1 : 1.5 })), { lineGap: 0.14 });
      const cw = 680;
      const ch = Math.round(blk.h + 92 + 120);
      const art = drawCard(cw, ch, hero ? 'gold' : 'dark');
      this.cards[c.id] = { blk, cw, ch, tex: r.textureFromCanvas(art.canvas), art, hero };
    });
    // manifeste : lignes d'italique + mot-clé en capitales dorées
    CAPTIONS.filter((c) => c.kind === 'verse').forEach((c) => {
      const words = c.text.split(' ');
      const lead = words.slice(0, -1).join(' ');
      const key = words[words.length - 1];
      const ls = Math.min(175, ts.fit('play', lead, 720, 999));
      const ks = Math.min(290, ts.fit(A, key, 720, 999));
      this.blocks[c.id] = ts.block([
        { text: lead, font: 'play', size: ls, tint: CREAM, glow: 1.5 },
        { text: key, font: A, size: ks, tint: GOLD, tint2: GOLDH, glow: 2.0, gap: ls * 0.3 },
      ]);
    });
    // marque
    this.blocks.mark1 = ts.block([{ text: 'QUOI DE NEUF,', font: A, size: 92, tint: CREAM, glow: 1.7 }]);
    this.blocks.mark2 = ts.block([{ text: 'PASTEUR ?', font: A, size: Math.min(150, ts.fit(A, 'PASTEUR ?', 760, 999)), tint: GOLD, tint2: GOLDH, glow: 2.2 }]);
    this.blocks.handle = ts.block([{ text: '@quoidneufpasteur', font: 'inter', size: Math.min(50, ts.fit('inter', '@quoidneufpasteur', 760, 999)), tint: [0.95, 0.84, 0.62], glow: 1.5 }]);
    {
      const l1 = 'TES QUESTIONS', l2 = 'ONT DES RÉPONSES';
      const sz = Math.min(66, ts.fit(A, l2, 700, 999), ts.fit(A, l1, 700, 999));
      this.blocks.cta = ts.block([{ text: l1, font: A, size: sz, tint: CREAM, glow: 1.6 }, { text: l2, font: A, size: sz, tint: GOLDH, glow: 1.7 }], { lineGap: 0.2 });
    }

    // ── particules : graines déterministes ──
    const rnd = mulberry32(2024);
    this.dust = Array.from({ length: 360 }, () => ({ x: rnd() * 2400 - 1200, y: rnd() * 3000, z: rnd() * 1500 - 800, s: 4 + rnd() * 16, sp: 18 + rnd() * 60, ph: rnd() * 6.28, hot: rnd() }));
    this.bokeh = Array.from({ length: 36 }, () => ({ x: rnd() * 1800 - 900, y: rnd() * 3200, z: rnd() * 1200 - 900, s: 90 + rnd() * 240, sp: 10 + rnd() * 28, ph: rnd() * 6.28 }));
    this.stars = Array.from({ length: 170 }, () => ({ a: rnd() * Math.PI * 2, o: rnd(), sp: 0.45 + rnd() * 0.8, w: rnd() }));
    this.sparks = Array.from({ length: 420 }, () => ({ a: rnd() * Math.PI * 2, v: 500 + Math.pow(rnd(), 1.6) * 3200, s: 6 + rnd() * 14, w: rnd(), l: 0.5 + rnd() * 0.8 }));
    this.embers = Array.from({ length: 150 }, () => ({ x: rnd() * 1800 - 900, y: rnd() * 2800, z: rnd() * 800 - 300, s: 5 + rnd() * 20, sp: 40 + rnd() * 120, ph: rnd() * 6.28 }));
    // marque : particules qui convergent vers le logo
    this.MARK = { size: 340, cy: 462 };
    const pts = sampleLogoPoints(5200, mulberry32(77));
    const ks = this.MARK.size / 900;
    this.convergers = pts.map(([px, py], i) => {
      const a = rnd() * Math.PI * 2;
      const R = 1000 + rnd() * 1500;
      return {
        tx: (px - 450) * ks, ty: WY(this.MARK.cy) + (450 - py) * ks,
        sx: Math.cos(a) * R, sy: Math.sin(a) * R * 1.35 + 200, sz: rnd() * 1200 - 600,
        d: rnd() * 0.3, sw: 1.8 + rnd() * 1.6, s: 2.6 + rnd() * 4.2, hot: rnd(), tw: rnd() * 6.28,
      };
    });
    this.confetti = Array.from({ length: 140 }, () => ({ a: rnd() * Math.PI * 2, v: 300 + rnd() * 1600, s: 6 + rnd() * 12, k: rnd() < 0.5 ? 2 : 4, w: rnd(), hot: rnd() }));
  }

  // ── particules ──────────────────────────────────────────────────────────────
  part(x, y, z, size, c, a, kind = 0, angle = 0, stretch = 1) {
    if (this.pc >= 9000) return;
    const o = this.pc++ * 12, p = this.parts;
    p[o] = x; p[o + 1] = y; p[o + 2] = z; p[o + 3] = size;
    p[o + 4] = c[0]; p[o + 5] = c[1]; p[o + 6] = c[2]; p[o + 7] = a;
    p[o + 8] = kind; p[o + 9] = angle; p[o + 10] = stretch; p[o + 11] = 0;
  }

  // ── caméra ──────────────────────────────────────────────────────────────────
  view(c) {
    let V = M4.translate(0, 0, -(FOCAL - (c.dz || 0)));
    if (c.roll) V = M4.mul(V, M4.rotZ(c.roll));
    if (c.pitch) V = M4.mul(V, M4.rotX(c.pitch));
    if (c.yaw) V = M4.mul(V, M4.rotY(c.yaw));
    return M4.mul(V, M4.translate(-(c.dx || 0), -(c.dy || 0), 0));
  }

  /** voile sombre sous le texte : calculé dans le fond (une seule fois par image) */
  scrim(S, alpha, w = 1500, h = 1250, y = CYW) {
    S.bg.scrim = [Math.min(alpha * 1.25, 0.92), 0, y / (H / 2), h / H];
  }

  /** État complet de l'image à l'instant t. */
  state(t) {
    this.pc = 0;
    const S = {
      bg: {}, sprites: [], warp: {}, post: {}, cam: {}, blackout: false, fast: false,
    };
    const sec = T.sectionAt(t).id;
    // pulsations dérivées de la timeline (mêmes cues que l'audio)
    const kick = pulse(t, ['kick'], 0.11);
    const boom = pulse(t, ['boom'], 0.2);
    const hit = pulse(t, ['hit', 'pop', 'click'], 0.09);
    const beatPos = t / T.BEAT;
    S.p = { kick, boom, hit };
    S.post = { ca: 0.0035, bloom: 0.6, streak: 0.22, grain: 0.05, vig: 0.55, exposure: 1.0, flash: 0, flashCol: [1, 1, 1], fade: 0, sat: 1.06, bloomThr: 0.85 };
    S.cam = { dx: 0, dy: 0, dz: 0, roll: 0, yaw: 0, pitch: 0 };

    if (sec === 'hook') this.hook(t, S);
    else if (sec === 'cut') { S.blackout = true; }
    else if (sec === 'drop') this.drop(t, S);
    else if (sec === 'demo') {
      if (t < 7.0) this.slams(t, S);
      else if (t < 11.0) this.cardsScene(t, S);
      else this.phrases(t, S);
    } else if (sec === 'manifesto') this.manifesto(t, S);
    else this.logo(t, S);

    S.view = this.view(S.cam);
    S.partCount = this.pc;
    return S;
  }

  // ═══ ACCROCHE ══════════════════════════════════════════════════════════════
  hook(t, S) {
    const cap = T.captionAt(t);
    const u = t - cap.t0;
    const boom = pulse(t, ['boom'], 0.2);
    const thump = pulse(t, ['thump'], 0.09);
    const heart = pulse(t, ['thump'], 0.16);
    // fond : nuit + lueur rouge qui bat
    const redAmt = 0.05 + 0.5 * heart * sstep(2.4, 2.6, t) + (cap.id === 'h3' ? 0.12 : 0);
    S.bg = { base: [0.003, 0.002, 0.003], glow: [redAmt, 0, 0.18, 1.1], tint: [0.9, 0.04, 0.05], tint2: [1, 0.3, 0.2] };
    // poussée lente + secousses sur les impacts
    const sh = snoise(t, 1) * 18 * boom + snoise(t, 5) * 9 * thump;
    S.cam = { dz: 140 * (t / 3.5) + 70 * boom, dx: sh, dy: snoise(t, 9) * 18 * boom + snoise(t, 3) * 8 * thump, roll: snoise(t, 11) * 0.012 * boom };
    // texte : slam depuis l'écran (grossi → net), tremblements RGB, rougeoiement sur « MORT »
    const blk = this.blocks[cap.id];
    const slam = 1 + 0.2 * Math.exp(-u / 0.05);
    const tilt = [-0.045, 0.035, -0.02][['h1', 'h2', 'h3'].indexOf(cap.id)];
    const red = cap.id === 'h3' ? sstep(0.25, 1.1, u) : 0;
    const base = M4.mul(M4.mul(M4.translate(0, CYW, 0), M4.rotZ(tilt * (1 - 0.3 * eoc(u / 0.5)))), M4.scale(slam * (1 + 0.035 * u), slam * (1 + 0.035 * u), 1));
    const jit = Math.exp(-u / 0.11);
    blockSprites(blk, base, (g) => {
      const fl = u > 0.35 && hsh(Math.floor(t * 60) * 1.7 + g.idx * 3.1) > 0.985 ? 0.25 : 1;
      const tint = [1, lerp(1, 0.1, red), lerp(1, 0.08, red)];
      return {
        dx: (hsh(g.idx * 7 + Math.floor(t * 30)) - 0.5) * 70 * jit, dy: (hsh(g.idx * 5 + 2) - 0.5) * 30 * jit,
        split: 6 * jit + 1.5 + 4 * thump, alpha: fl * sstep(0, 0.012, u), tint, glow: 1.9 + 1.3 * red * (0.4 + heart) + 1.2 * jit,
      };
    }, S.sprites, { caption: cap.id, exiting: u < 0.04 });
    this.scrim(S, 0.55, 1500, 1300);
    // braises
    for (const e of this.embers) {
      const y = ((e.y + t * e.sp) % 2800) - 1400;
      this.part(e.x + Math.sin(t * 0.7 + e.ph) * 30, y, e.z, e.s, [1, 0.25, 0.12], 0.35 * (0.5 + 0.5 * Math.sin(t * 2 + e.ph)) * (cap.id === 'h3' ? 1.5 : 0.8), 0);
    }
    // éclats : à la fin, fissures puis explosion de l'image (maillage d'éclats)
    const crack = sstep(2.35, 3.0, t);
    const p = t > 3.0 ? Math.pow(clamp((t - 3.0) / 0.5), 1.8) : 0;
    S.warp.shatter = { p, seed: 3.7, reveal: crack };
    S.warp.crack = crack > 0 ? 0.9 * (1 - 0.5 * p) : 0;
    S.warp.glitch = [0.6 * jit + (hsh(Math.floor(t * 24)) > 0.97 ? 0.25 : 0) + (t > 3.0 ? 0.5 * p : 0), Math.floor(t * 60), 14 * jit + 3];
    // post : grain dur, vignette lourde, flash sur chaque impact
    const f = pulse(t, ['boom'], 0.05);
    S.post = { ca: 0.005 + 0.02 * jit + 0.02 * p, bloom: 0.6, streak: 0.3, grain: 0.1, vig: 0.85, exposure: 1.0, flash: 0.22 * f, flashCol: [1, 0.9 - 0.4 * red, 0.85 - 0.5 * red], fade: 0, sat: 1.0, bloomThr: 0.8, shadow: [-0.3, 0.0, 0.2] };
    S.fast = true;
  }

  // ═══ DROP « C'EST FAUX. » ═══════════════════════════════════════════════════
  drop(t, S) {
    const u = t - 4.0;
    const boom = pulse(t, ['boom'], 0.22);
    S.bg = {
      base: [0.004, 0.003, 0.004], burst: [1, u, 0, 0.18], tint: [1, 0.68, 0.3], tint2: [1, 0.95, 0.8],
      rays: [0.55 * (1 - sstep(0.8, 1.0, u)), 0, 0.2, 9], glow: [0.7 * Math.exp(-u / 0.5) + 0.12, 0, 0.2, 0.9],
    };
    const fly = Math.pow(clamp((u - 0.78) / 0.22), 3);
    S.cam = { dz: 330 * Math.exp(-u / 0.12) + 50 * u + 2600 * fly, dx: snoise(t, 2) * 30 * boom, dy: snoise(t, 8) * 30 * boom, roll: snoise(t, 4) * 0.02 * boom };
    const base = M4.translate(0, CYW, 0);
    blockSprites(this.blocks.d0, base, (g) => ({
      split: 6 * Math.exp(-u / 0.2) + 1, glow: 2.4 + 2 * Math.exp(-u / 0.15), alpha: (1 - sstep(0.9, 1.0, u)) * sstep(0.02, 0.1, u),
    }), S.sprites, { caption: 'd0', exiting: fly > 0.01 || u < 0.08 });
    this.scrim(S, 0.4 * sstep(0.1, 0.3, u));
    // gerbe d'étincelles
    for (const s of this.sparks) {
      const k = 2.2 / s.l;
      const d = (1 - Math.exp(-k * u)) / k * s.v;
      const v = s.v * Math.exp(-k * u);
      const life = 1 - sstep(0.4 * s.l, 1.2 * s.l, u);
      if (life <= 0) continue;
      const x = Math.cos(s.a) * d, y = CYW + Math.sin(s.a) * d - 300 * u * u * s.w;
      const ang = Math.atan2(Math.sin(s.a) * v - 600 * u * s.w, Math.cos(s.a) * v);
      this.part(x, y, 60 * s.w, s.s * (1 + Math.min(v / 1200, 3)), s.w > 0.7 ? [1, 0.9, 0.65] : [1, 0.6, 0.2], life, 2, ang, 1 + Math.min(v / 500, 8));
    }
    // onde de choc (anneau en particule)
    this.part(0, CYW, -30, 2600 * eoe(u / 0.6), [1, 0.8, 0.45], 0.6 * Math.exp(-u / 0.35), 3, 0, 1);
    // le glitch d'après-coupure : bref décalage
    S.warp.shatter = { p: Math.pow(clamp(1 - u / 0.3), 2), seed: 9.2 };
    S.warp.crack = 0.5 * clamp(1 - u / 0.3);
    S.warp.glitch = [0.6 * Math.exp(-u / 0.12), Math.floor(t * 60), 10];
    S.post = { ca: 0.004 + 0.022 * Math.exp(-u / 0.14), bloom: 0.8, streak: 0.4, grain: 0.06, vig: 0.7, exposure: 1.0, flash: 1.0 * Math.exp(-u / 0.1) + 0.5 * boom * 0, flashCol: [1, 0.93, 0.78], fade: 0, sat: 1.1, bloomThr: 0.75 };
    S.fast = true;
  }

  // ═══ DÉMO 1 : rafale de slams dans le tunnel ═══════════════════════════════
  slams(t, S) {
    const cap = T.captionAt(t);
    const u = t - cap.t0;
    const idx = ['s1', 's2', 's3', 's4'].indexOf(cap.id);
    const b = t / T.BEAT;
    const step = Math.floor(b) + eoq(b - Math.floor(b));
    const kick = pulse(t, ['kick'], 0.11);
    S.bg = {
      base: [0.004, 0.003, 0.004], tunnel: [1, step * 0.95, 0.14 * step * (idx % 2 ? -1 : 1) + 0.1 * Math.sin(t), t],
      tint: [1, 0.58, 0.2], tint2: [1, 0.85, 0.6], glow: [0.18 + 0.2 * kick, 0, 0.1, 0.7],
    };
    S.cam = {
      dz: 60 * kick + 100 * (t - 5) / 2, dx: snoise(t, 3) * 14 * kick, dy: snoise(t, 6) * 12 * kick, roll: snoise(t, 2) * 0.012 * kick + (idx % 2 ? 0.03 : -0.03) * Math.exp(-u / 0.3),
    };
    const blk = this.blocks[cap.id];
    const exit = clamp((u - 0.4) / 0.1);
    const base = M4.translate(0, CYW, 0);
    const n = blk.glyphs.length;
    blockSprites(blk, base, (g) => {
      const o = { split: 8 * Math.exp(-u / 0.1) + 1, alpha: 1 - exit * exit };
      const gu = u - g.idx * 0.012;
      if (idx === 0) { // vol depuis le fond du tunnel
        o.dz = -2600 * Math.exp(-u / 0.055) + 1500 * exit * exit;
        o.alpha *= sstep(0, 0.03, u);
        o.glow = 1.9 + 1.5 * Math.exp(-u / 0.12);
      } else if (idx === 1) { // retournement lettre à lettre
        o.rx = (1 - backOut(gu / 0.2)) * 1.57 * (g.line ? -1 : 1);
        o.alpha *= sstep(0, 0.04, gu);
        o.dz = 1500 * exit * exit;
        o.glow = 1.9 + 1.2 * Math.exp(-gu / 0.1);
      } else if (idx === 2) { // glissement croisé
        o.dx = (g.line ? 1 : -1) * 1300 * (1 - eoq(u / 0.16)) + (g.line ? -1 : 1) * 700 * exit * exit;
        o.glow = 1.9 + 1.1 * Math.exp(-u / 0.12);
      } else { // zoom-arrière avec rotation, lettres en cascade
        const k = backOut(gu / 0.2, 2.4);
        o.s = lerp(3.2, 1, clamp(k)); o.rz = (1 - clamp(k)) * 0.5 * (g.line ? -1 : 1);
        o.alpha *= sstep(0, 0.04, gu);
        o.dz = 1500 * exit * exit;
        o.glow = 1.9 + 1.4 * Math.exp(-gu / 0.1);
      }
      return o;
    }, S.sprites, { caption: cap.id, exiting: exit > 0.02 });
    this.scrim(S, 0.45);
    // étoiles filantes radiales (sensation de vitesse)
    for (const s of this.stars) {
      const rho = Math.pow(fr(s.o + t * s.sp), 2.2) * 1900;
      const a = s.a + 0.06 * step;
      this.part(Math.cos(a) * rho, Math.sin(a) * rho * 1.3 + 40, 0, 7 + rho * 0.012, s.w > 0.6 ? [1, 0.9, 0.7] : [1, 0.6, 0.25], 0.9 * sstep(60, 400, rho), 2, a, 1 + rho * 0.014);
    }
    S.post = { ca: 0.003 + 0.005 * kick + 0.006 * hit(t), bloom: 0.75, streak: 0.35, grain: 0.05, vig: 0.65, exposure: 1.0, flash: 0.2 * pulse(t, ['hit'], 0.05), flashCol: [1, 0.85, 0.6], fade: 0, sat: 1.08, bloomThr: 0.8 };
    S.warp.glitch = [0.35 * Math.exp(-u / 0.06), Math.floor(t * 60), 8];
    S.fast = true;
  }

  // ═══ DÉMO 2 : le paquet de cartes-questions ═════════════════════════════════
  cardsScene(t, S) {
    const ids = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8'];
    const kick = pulse(t, ['kick'], 0.11);
    const pop = pulse(t, ['pop'], 0.1);
    const tt = t - 7;
    S.bg = {
      base: [0.004, 0.003, 0.004], liquid: [0.95, 1.05, 0.17, 7.5], tint: [1, 0.66, 0.28], tint2: [1, 0.4, 0.12], glow: [0.16 + 0.18 * kick, 0, 0.15, 0.8],
      par: [0.05 * Math.sin(t * 0.8), 0.03 * Math.cos(t * 0.6)],
    };
    S.cam = { yaw: 0.13 * Math.sin(tt * 1.1), pitch: 0.07 * Math.cos(tt * 0.9), dz: 40 * kick + 30 * tt, dx: snoise(t, 1) * 8 * kick, dy: snoise(t, 7) * 8 * kick, roll: 0.02 * Math.sin(tt * 0.7) };
    const heroT = CAPTIONS.find((c) => c.id === 'c8').t0;
    const V = this.view(S.cam);
    const out = clamp((t - heroT) / 0.25);
    ids.forEach((id, k) => {
      const cap = captionById(id);
      const u = t - cap.t0;
      if (u < 0) return;
      const cd = this.cards[id];
      // nombre de cartes plus récentes (lissé)
      let a = 0;
      for (let j = k + 1; j < ids.length; j++) a += sstep(0, 0.16, t - captionById(ids[j]).t0);
      const tilt = (k % 2 ? 1 : -1) * (0.045 + 0.02 * ((k * 5) % 3));
      const fly = 1 - eoe(u / 0.12);
      const sp = spring(u - 0.0, 20, 12);
      const hero = cd.hero;
      let alpha = sstep(0, 0.04, u) * Math.max(0, 1 - 0.3 * a);
      let z = 1500 * fly - 190 * a, y = 34 * a + (hero ? 30 : 0), x = (k % 2 ? 1 : -1) * 22 * a;
      let rx = -0.6 * fly + 0.1 * a, ry = (k % 2 ? 1 : -1) * 0.9 * fly + (k % 2 ? -1 : 1) * 0.05 * a, rz = tilt * (1 - 0.4 * fly) + (k % 2 ? 0.035 : -0.035) * a;
      let lod = a * 1.1;
      let sc = 1 + 0.12 * (sp - 1) * 0 + 0.06 * Math.exp(-u / 0.08);
      if (!hero && t >= heroT) { // les anciennes cartes explosent vers l'extérieur
        const d = (k % 2 ? 1 : -1);
        x += d * 1700 * out * out; y += 600 * out * out * (k % 3 - 1); rz += d * 0.6 * out; z += 900 * out; alpha *= 1 - out;
      }
      if (hero) sc *= 1.0 + 0.05 * sstep(0, 0.5, u);
      const M = M4.mul(M4.mul(M4.mul(M4.mul(M4.translate(x, CYW + y, z), M4.rotZ(rz)), M4.rotY(ry)), M4.rotX(rx)), M4.scale(sc, sc, 1));
      const ph = cd.ch + 80; // taille de la texture (avec marge d'ombre)
      const cz = M4.mul(V, M)[14];
      S.sprites.push({ sortZ: cz, tex: cd.tex, w: cd.art.canvas.width, h: cd.art.canvas.height, matrix: M, alpha, glow: 1.15 + (hero ? 0.7 : 1.5) * Math.exp(-u / 0.1), lod, split: 5 * fly + 0.8, caption: id, kind: 'carte', safeRect: [cd.cw / 2, cd.ch / 2], exiting: fly > 0.08 || (!hero && t >= heroT) });
      // texte posé sur la carte (sous l'en-tête)
      const tM = M4.mul(M, M4.translate(0, -(92 / 2) + 0 + 0, 6));
      const tb = M4.mul(tM, M4.translate(0, 0, 0));
      const n = cd.blk.glyphs.length;
      blockSprites(cd.blk, M4.mul(M, M4.translate(0, -46 + 0, 8)), (g) => {
        const gu = u - g.idx * 0.011 - 0.03;
        return {
          alpha: alpha * sstep(0, 0.03, gu) * (1 - 0.0), lod: lod + 2.6 * (1 - sstep(0, 0.08, gu)), s: 1 + 0.35 * Math.exp(-Math.max(gu, 0) / 0.05) * (gu > 0 ? 1 : 0),
          glow: (cd.hero ? 1 : 1.5) + 1.3 * Math.exp(-Math.max(gu, 0) / 0.08), dy: -18 * (1 - eoc(gu / 0.12)),
        };
      }, S.sprites, { caption: id, sortZ: cz + 1, exiting: fly > 0.08 || (!hero && t >= heroT) });
      // étincelles à l'impact
      if (u < 0.5) {
        const e = Math.exp(-u / 0.14);
        this.part(x, CYW + y, z + 30, 1500 * eoe(u / 0.4), GOLDH, 0.5 * e, 3, 0, 1);
        if (!hero || u < 0.4) for (let i = 0; i < 7; i++) {
          const s = this.sparks[(k * 17 + i * 5) % this.sparks.length];
          const d = (1 - Math.exp(-3 * u)) / 3 * (300 + s.v * 0.45);
          this.part(x + Math.cos(s.a) * d * 0.9, CYW + y + Math.sin(s.a) * d * 0.7, z + 40, 14, [1, 0.8, 0.45], e * 0.9, 4, 0, 1);
        }
      }
    });
    this.scrim(S, 0.35, 1600, 1500, CYW, -400);
    this.motes(t, S, 0.55);
    S.post = { ca: 0.003 + 0.006 * pop + 0.004 * kick, bloom: 0.7, streak: 0.3, grain: 0.05, vig: 0.65, exposure: 1.0, flash: 0.14 * pulse(t, ['pop'], 0.05) + 0.18 * pulse(t, ['pop'], 0.05) * (t >= heroT ? 1 : 0), flashCol: [1, 0.88, 0.62], fade: 0, sat: 1.08, bloomThr: 0.8 };
    S.fast = true;
  }

  motes(t, S, amt = 1) {
    for (const d of this.dust) {
      const y = ((d.y + t * d.sp) % 3000) - 1500;
      const tw = 0.55 + 0.45 * Math.sin(t * (1 + d.hot * 2) + d.ph);
      this.part(d.x + Math.sin(t * 0.4 + d.ph) * 40, y, d.z, d.s, d.hot > 0.8 ? [1, 0.7, 0.35] : [1, 0.9, 0.72], 0.34 * tw * amt, 0);
    }
    for (const b of this.bokeh) {
      const y = ((b.y + t * b.sp) % 3400) - 1700;
      this.part(b.x, y, b.z, b.s, [1, 0.72, 0.38], 0.1 * amt * (0.6 + 0.4 * Math.sin(t * 0.8 + b.ph)), 1);
    }
  }

  // ═══ DÉMO 3 : « viens comme tu es » ════════════════════════════════════════
  phrases(t, S) {
    const cap = T.captionAt(t);
    const u = t - cap.t0;
    const idx = ['p1', 'p2', 'p3', 'p4', 'p5'].indexOf(cap.id);
    const kick = pulse(t, ['kick'], 0.11);
    const hit = pulse(t, ['hit'], 0.08);
    const lastP = cap.id === 'p5';
    const warm = idx / 4;
    const build = sstep(13.0, 13.95, t);
    S.bg = {
      base: [0.004, 0.003, 0.004], liquid: [0.55, 0.95, 0.2, 7], rays: [0.55 + 0.9 * build, 0.0, 0.7, 10],
      tint: [1, lerp(0.62, 0.78, warm), lerp(0.25, 0.5, warm)], tint2: [1, 0.9, 0.7], glow: [0.2 + 0.2 * hit + 0.9 * build, 0, 0.2, 0.8 + 0.5 * build],
    };
    S.cam = { yaw: (idx % 2 ? -1 : 1) * 0.12 * (1 - eoc(u / 0.5)) + 0.04 * Math.sin(t), dz: 40 * idx + 80 * hit + 70 * build, dx: snoise(t, 3) * 12 * kick, dy: snoise(t, 5) * 12 * kick, roll: (idx % 2 ? 1 : -1) * 0.04 * Math.exp(-u / 0.25) };
    const blk = this.blocks[cap.id];
    const exit = lastP ? 0 : clamp((u - 0.4) / 0.1);
    blockSprites(blk, M4.translate(0, CYW, 0), (g) => {
      const gu = u - g.idx * 0.012 - (g.line ? 0.05 : 0);
      const k = backOut(gu / 0.24, 2.2);
      const o = {
        dy: -330 * (1 - k) + 40 * exit * exit, rx: (1 - clamp(k)) * 1.2 * (g.line ? 1 : -1),
        alpha: sstep(0, 0.05, gu) * (1 - exit * exit), lod: 3 * (1 - sstep(0, 0.12, gu)), split: 6 * Math.exp(-gu / 0.12) + 0.8,
        glow: (lastP ? 2.3 : 1.9) + 1.8 * Math.exp(-gu / 0.12) + (lastP ? 2.2 * build : 0), s: 1 + 0.05 * exit,
      };
      if (lastP) o.s = 1 + 0.015 * u;
      return o;
    }, S.sprites, { caption: cap.id });
    this.scrim(S, 0.4);
    for (const s of this.sparks.slice(0, 120)) {
      const y = ((s.v * 0.3 + t * (120 + s.w * 260)) % 2600) - 1300;
      this.part(Math.cos(s.a * 3) * 700, y, s.w * 400 - 200, 5 + s.s * 0.5, s.w > 0.5 ? GOLDH : FLAME, 0.5, 4, 0, 1);
    }
    S.post = { ca: 0.003 + 0.006 * hit + 0.004 * kick, bloom: 0.8 + 0.5 * build, streak: 0.35 + 0.3 * build, grain: 0.05, vig: 0.6, exposure: 1.0 + 0.05 * build, flash: 0.1 * pulse(t, ['hit'], 0.05) + 0.5 * sstep(13.6, 13.98, t) * (t < 14 ? 1 : 0), flashCol: [1, 0.9, 0.7], fade: 0, sat: 1.1, bloomThr: 0.8 };
    S.warp.glitch = [0.25 * Math.exp(-u / 0.06), Math.floor(t * 60), 6];
    S.fast = true;
  }

  // ═══ MANIFESTE ════════════════════════════════════════════════════════════
  manifesto(t, S) {
    const u0 = t - 14;
    const boom = pulse(t, ['boom'], 0.3);
    const build = sstep(20.5, 23.9, t);
    S.bg = {
      base: [0.005, 0.004, 0.005], rays: [0.9 + 0.8 * build, 0.2 + 0.1 * Math.sin(t * 0.3), 1.0, 9 + 4 * build],
      tint: [1, 0.7, 0.36], tint2: [1, 0.93, 0.8], glow: [0.1 + 0.55 * build + 0.4 * boom, 0, 0.25, 1.0 + 0.4 * build],
      liquid: [0.07, 0.9, 0.06, 8], par: [0.03 * Math.sin(t * 0.3), 0.02 * Math.sin(t * 0.21)],
    };
    S.cam = { dz: -200 + 20 * u0 + 90 * boom, dx: 30 * Math.sin(t * 0.33) + snoise(t, 2) * 18 * boom, dy: 14 * Math.sin(t * 0.27) + snoise(t, 4) * 16 * boom, roll: 0.01 * Math.sin(t * 0.25) + snoise(t, 8) * 0.012 * boom, yaw: 0.05 * Math.sin(t * 0.2), pitch: 0.02 * Math.cos(t * 0.23) };
    const cap = T.captionAt(t);
    if (cap && cap.kind === 'verse') {
      const blk = this.blocks[cap.id];
      const words = cap.text.split(' ');
      const offs = T.verseWordOffsets(words.length);
      const exit = clamp((t - (cap.t1 - 0.14)) / 0.14);
      const exitF = cap.id === 'm10' ? 0 : exit;
      blockSprites(blk, M4.translate(0, CYW + 10, 0), (g) => {
        const w = Math.min(g.word, offs.length - 1);
        const uw = t - (cap.t0 + offs[w]) - (g.idx % 7) * 0.004;
        if (uw < 0) return { alpha: 0 };
        const e = eoc(uw / 0.45);
        return {
          alpha: sstep(0, 0.1, uw) * (1 - exitF), lod: 3.6 * (1 - sstep(0, 0.26, uw)) + 2.4 * exitF, dy: -38 * (1 - e) + 22 * exitF,
          s: 1 + 0.1 * (1 - e) + 0.02 * exitF, glow: (g.line ? 1.5 : 1.3) + 1.6 * Math.exp(-uw / 0.12) + (cap.id === 'm10' ? 1.2 * sstep(23.2, 23.9, t) : 0),
        };
      }, S.sprites, { caption: cap.id });
      this.scrim(S, 0.3, 1500, 1100);
    }
    this.motes(t, S, 1 + 0.5 * build);
    // étincelles sur les mots (une petite poussière dorée qui monte)
    CAPTIONS.filter((c) => c.kind === 'verse').forEach((c) => {
      const offs = T.verseWordOffsets(c.text.split(' ').length);
      offs.forEach((o, wi) => {
        const u = t - (c.t0 + o);
        if (u < 0 || u > 0.9) return;
        for (let i = 0; i < 6; i++) {
          const s = this.sparks[(c.t0 * 13 + wi * 29 + i * 7 | 0) % this.sparks.length];
          const d = (1 - Math.exp(-2.5 * u)) / 2.5 * (180 + s.v * 0.15);
          this.part(Math.cos(s.a) * 260 * (wi - 0.8) + Math.cos(s.a) * d * 0.5, CYW + 30 + Math.abs(Math.sin(s.a)) * d, 40, 10 + s.s * 0.4, GOLDH, 0.8 * (1 - u / 0.9), 4, 0, 1);
        }
      });
    });
    const white = sstep(22.9, 23.9, t) * 0.8 + (t >= 23.9 ? 0.2 : 0);
    S.post = { ca: 0.0025 + 0.012 * boom, bloom: 0.85 + 0.6 * build, streak: 0.4 + 0.3 * build, grain: 0.045, vig: 0.6 - 0.2 * build, exposure: 1.0, flash: white * white * 0.9 + (t >= 23.9 ? 0.1 : 0) + 0.22 * pulse(t, ['boom'], 0.06) * (t < 14.3 ? 1 : 0), flashCol: [1, 0.93, 0.8], fade: 0, sat: 1.12, bloomThr: 0.7, shadow: [-0.2, 0.1, 0.5] };
    if (t >= 23.9) { S.post.flash = 2.4; S.bg.glow[0] = 1.5; }
  }

  // ═══ LOGO + S'ABONNER ═══════════════════════════════════════════════════════
  logo(t, S) {
    const u = t - 24;
    const boom = pulse(t, ['boom'], 0.25);
    const lockU = u - 1.0;
    const MS = this.MARK.size;
    const cyW = WY(this.MARK.cy);
    const kick = pulse(t, ['kick'], 0.11);
    const endU = t - 29.0;
    const endPump = t >= 29 ? Math.exp(-endU / 0.28) * Math.cos(endU * 14) : 0;
    const tapU = t - 28.0;
    S.bg = {
      base: [0.005, 0.004, 0.005], rays: [0.62, 0.0, 0.55, 9], tint: [1, 0.7, 0.36], tint2: [1, 0.93, 0.8],
      glow: [0.22 + 0.3 * sstep(0.9, 1.1, u) * Math.exp(-Math.max(lockU, 0) / 1.0) + 0.12 * boom, 0, cyW / 960, 0.9],
      burst: [(lockU > 0 && lockU < 1.2 ? 0.4 : 0) + (endU > 0 && endU < 1 ? 0.35 : 0), lockU > 0 && lockU < 1.2 ? lockU : endU, 0, cyW / 960],
      liquid: [0.12, 0.9, 0.05, 8], gain: 0.11,
    };
    this.scrim(S, 0.5 * sstep(1.2, 1.8, u), 1500, 1250, WY(990));
    S.cam = { dz: 24 * boom, dx: snoise(t, 2) * 14 * boom, dy: snoise(t, 4) * 14 * boom, roll: snoise(t, 6) * 0.012 * boom, yaw: 0.03 * Math.sin(t * 0.5) };
    this.motes(t, S, 0.8);
    // — particules qui convergent vers la marque (24.0 → 25.0)
    if (u < 2.2) {
      const dt = 0.004;
      const pos = (c, uu) => {
        const e = eoq(clamp((uu - c.d) / 0.72));
        const sw = (1 - e) * c.sw;
        const sx = c.sx * (1 - e), sy = c.sy * (1 - e);
        const cs = Math.cos(sw), sn = Math.sin(sw);
        return [c.tx + sx * cs - sy * sn, c.ty + sx * sn + sy * cs, c.sz * (1 - e)];
      };
            for (const c of this.convergers) {
        const p0 = pos(c, u), p1 = pos(c, u + dt);
        const vx = (p1[0] - p0[0]) / dt, vy = (p1[1] - p0[1]) / dt;
        const sp = Math.hypot(vx, vy);
        const settled = sp < 40;
        const tw = 0.5 + 0.5 * Math.sin(t * 6 + c.tw);
        const alpha = u < 1 ? 0.3 + 0.7 * sstep(0, 0.45, u) : lerp(1, 0.18 + 0.5 * tw * (c.hot > 0.8 ? 1 : 0.4), sstep(1.0, 1.5, u)) * (1 - sstep(1.7, 2.2, u));
        const col = c.hot > 0.82 ? [1, 0.55, 0.2] : c.hot > 0.4 ? [1, 0.82, 0.5] : [1, 0.95, 0.8];
        if (settled) this.part(p0[0], p0[1], p0[2], c.s * (1 + 0.8 * (c.hot > 0.9 ? 1 : 0)), col, alpha * 0.9, 0, 0, 1);
        else this.part(p0[0], p0[1], p0[2], c.s * 1.3, col, alpha * 0.95, 2, Math.atan2(vy, vx), 1 + Math.min(sp / 260, 22));
      }
    }
    // — marque (apparition au « lock » 25.0)
    if (lockU > -0.02) {
      const pop = 1 + 0.09 * Math.exp(-Math.max(lockU, 0) / 0.1) * Math.cos(Math.max(lockU, 0) * 22) + 0.04 * endPump + 0.008 * kick;
      const a = sstep(-0.02, 0.06, lockU);
      const M = M4.mul(M4.translate(0, cyW + 5 * Math.sin(t * 1.5), 0), M4.scale(pop, pop, 1));
      const sweep = lockU > 0.5 && lockU < 1.2 ? lerp(-1.1, 1.3, (lockU - 0.5) / 0.7) : 5;
      S.sprites.push({ tex: this.logoTex, w: MS, h: MS, matrix: M, alpha: a, glow: 1.1 + 1.6 * Math.exp(-Math.max(lockU, 0) / 0.16) + 0.5 * pulse(t, ['boom'], 0.1) * (t > 28.9 ? 1 : 0), sheen: 0.6, sheenPos: sweep, split: 2 * Math.exp(-Math.max(lockU, 0) / 0.2), caption: 'logo', kind: 'marque', safeRect: [MS / 2, MS / 2] });
      // halo doux derrière
      this.part(0, cyW, -40, MS * 2.1, [1, 0.72, 0.38], 0.2 * a * (1 + endPump), 0, 0, 1);
      if (lockU > 0) {
        this.part(0, cyW, -20, 3000 * eoe(lockU / 0.8), [1, 0.85, 0.55], 0.45 * Math.exp(-lockU / 0.3), 3, 0, 1);
        this.part(0, cyW, -20, 2000 * eoe(lockU / 0.6), [1, 0.95, 0.8], 0.3 * Math.exp(-lockU / 0.25), 3, 0, 1);
      }
    }
    // — marque verbale
    const m1u = t - 25.5, m2u = t - 26.0;
    if (m1u > 0) {
      blockSprites(this.blocks.mark1, M4.translate(0, WY(692), 0), (g) => {
        const gu = m1u - g.idx * 0.018;
        const e = eoq(gu / 0.3);
        return { dy: -55 * (1 - e), alpha: sstep(0, 0.08, gu), lod: 2.5 * (1 - sstep(0, 0.14, gu)), glow: 1.7 + 1.2 * Math.exp(-Math.max(gu, 0) / 0.15) };
      }, S.sprites, { caption: 'logo' });
    }
    if (m2u > 0) {
      blockSprites(this.blocks.mark2, M4.translate(0, WY(802), 0), (g) => {
        const gu = m2u - g.idx * 0.014;
        const k = 1 + 1.1 * Math.exp(-Math.max(gu, 0) / 0.05);
        return { s: k, alpha: sstep(0, 0.02, gu), split: 8 * Math.exp(-Math.max(gu, 0) / 0.12) + 0.5, glow: 2.2 + 2.2 * Math.exp(-Math.max(gu, 0) / 0.12), dz: 0 };
      }, S.sprites, { caption: 'logo' });
    }
    const hu = t - 26.5;
    if (hu > 0) {
      blockSprites(this.blocks.handle, M4.translate(0, WY(908), 0), (g) => {
        const gu = hu - g.idx * 0.01;
        return { alpha: sstep(0, 0.12, gu), dy: -22 * (1 - eoc(gu / 0.3)), lod: 2 * (1 - sstep(0, 0.14, gu)), glow: 1.5 + 0.9 * Math.exp(-Math.max(gu, 0) / 0.15) };
      }, S.sprites, { caption: 'handle' });
    }
    const cu = t - 27.0;
    if (cu > 0) {
      blockSprites(this.blocks.cta, M4.translate(0, WY(1014), 0), (g) => {
        const gu = cu - g.word * 0.11 - g.idx * 0.004;
        const k = backOut(gu / 0.25, 2.2);
        return { alpha: sstep(0, 0.05, gu), s: lerp(1.5, 1, clamp(k)), dy: -30 * (1 - eoc(gu / 0.3)), glow: 1.6 + 1.5 * Math.exp(-Math.max(gu, 0) / 0.12), split: 5 * Math.exp(-Math.max(gu, 0) / 0.1) };
      }, S.sprites, { caption: 'x1' });
    }
    // — bouton « S'ABONNER »
    const bu = t - 27.5;
    let btnCenter = [0, WY(1160)];
    if (bu > 0) {
      const press = tapU > 0 ? (tapU < 0.07 ? tapU / 0.07 : 1 - spring(tapU - 0.07, 16, 8)) : 0;
      const sc0 = spring(bu + 0.03, 16, 9);
      const idle = 1 + 0.012 * Math.sin(t * 4) * sstep(28.4, 28.8, t);
      const sc = Math.max(0.001, sc0) * (1 - 0.07 * clamp(tapU > 0 ? (tapU < 0.07 ? tapU / 0.07 : Math.max(0, 1 - (tapU - 0.07) / 0.18)) : 0)) * idle * (1 + 0.04 * endPump);
      const M = M4.mul(M4.translate(btnCenter[0], btnCenter[1], 0), M4.scale(sc, sc, 1));
      const sw = tapU > 0.05 && tapU < 0.6 ? lerp(-1.3, 1.5, (tapU - 0.05) / 0.55) : 5;
      S.sprites.push({ tex: this.btn.tex, w: this.btn.w, h: this.btn.h, matrix: M, alpha: 1, glow: 0.82 + 1.4 * Math.exp(-bu / 0.12) + 1.0 * Math.exp(-Math.max(tapU, 0) / 0.18) * (tapU > 0 ? 1 : 0), sheen: 0.8, sheenPos: sw, caption: 'bouton', kind: 'bouton', exiting: bu < 0.4, safeRect: [this.btn.bw / 2, this.btn.bh / 2] });
      if (bu < 0.5) this.part(btnCenter[0], btnCenter[1], 10, 500 + 1500 * eoe(bu / 0.4), [1, 0.85, 0.5], 0.5 * Math.exp(-bu / 0.2), 3, 0, 1);
      this.part(btnCenter[0], btnCenter[1], -10, 900, [1, 0.7, 0.3], 0.3 * sstep(0, 0.2, bu) * (1 + 1.2 * Math.exp(-Math.max(tapU, 0) / 0.3) * (tapU > 0 ? 1 : 0)), 0, 0, 1.9);
    }
    // — doigt (indicateur de tap) + ondulations + gerbe
    if (t > 27.55 && t < 28.7) {
      const mv = eio(clamp((t - 27.62) / 0.36));
      const sx = 250, sy = WY(1160) - 330;
      const px = lerp(sx, btnCenter[0] + 20, mv), py = lerp(sy, btnCenter[1] - 4, mv);
      const sz = 150 * (tapU > 0 && tapU < 0.2 ? 0.78 : 1) * (1 - sstep(28.45, 28.7, t));
      this.part(px, py, 30, sz, [1, 0.97, 0.9], 0.55, 3, 0, 1);
      this.part(px, py, 30, sz * 0.5, [1, 1, 1], 0.7, 0, 0, 1);
    }
    if (tapU > 0 && tapU < 1.2) {
      for (let i = 0; i < 3; i++) {
        const uu = tapU - i * 0.1;
        if (uu > 0) this.part(btnCenter[0] + 20, btnCenter[1], 20, 1800 * eoe(uu / 0.9), [1, 0.82, 0.5], 0.55 * Math.exp(-uu / 0.35), 3, 0, 1);
      }
      for (const c of this.confetti) {
        const k = 2.6;
        const d = (1 - Math.exp(-k * tapU)) / k * c.v;
        const v = c.v * Math.exp(-k * tapU);
        const life = 1 - sstep(0.5, 1.2, tapU * (0.8 + c.w * 0.4));
        const vy = Math.sin(c.a) * v - 500 * tapU * c.w;
        this.part(btnCenter[0] + 20 + Math.cos(c.a) * d, btnCenter[1] + Math.sin(c.a) * d - 250 * tapU * tapU * c.w, 40, c.s * (c.k === 4 ? 1.6 : 1.2), c.hot > 0.5 ? [1, 0.85, 0.5] : [1, 0.95, 0.85], life, c.k, c.k === 2 ? Math.atan2(vy, Math.cos(c.a) * v) : 0, c.k === 2 ? 1 + Math.min(v / 260, 9) : 1);
      }
    }
    if (endU > 0 && endU < 1.0) {
      this.part(0, cyW, -20, 3200 * eoe(endU / 0.8), [1, 0.85, 0.55], 0.6 * Math.exp(-endU / 0.3), 3, 0, 1);
    }
    const f = 0.55 * pulse(t, ['boom'], 0.06) * (t < 24.5 ? 1.2 : 1) + 0.25 * pulse(t, ['click'], 0.06);
    S.post = { ca: 0.003 + 0.016 * boom + 0.012 * pulse(t, ['click'], 0.12), bloom: 0.65, streak: 0.3, grain: 0.045, vig: 0.6, exposure: 1.0, flash: f, flashCol: [1, 0.93, 0.8], fade: 0, sat: 1.12, bloomThr: 0.95, shadow: [-0.2, 0.1, 0.5] };
    if (u < 0.12) { S.post.flash = Math.max(S.post.flash, 0.3 * Math.exp(-u / 0.05)); }
    S.fast = (u < 2.2) || (t > 27.4 && t < 28.6) || (t > 28.95 && t < 29.4);
  }
}

function hit(t) { return pulse(t, ['hit'], 0.08); }
