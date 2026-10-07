// Typographie en WebGL : chaque lettre est une petite texture (Canvas 2D) mise en page
// avec les vraies métriques de la police (crénage inclus) ⇒ animation lettre par lettre.
import { M4 } from './gfx.js';

export const FONTS = {
  anton: { css: (s) => `400 ${s}px Anton`, ref: 300, track: 0.012 },
  play: { css: (s) => `italic 700 ${s}px Playfair`, ref: 220, track: 0.0 },
  playLight: { css: (s) => `italic 400 ${s}px Playfair`, ref: 220, track: 0.0 },
  inter: { css: (s) => `800 ${s}px InterX`, ref: 120, track: 0.12 },
};

export async function loadFonts() {
  await Promise.all([
    document.fonts.load('300px Anton', 'ABCÉ'),
    document.fonts.load('italic 700 100px Playfair', 'ABCÉ'),
    document.fonts.load('italic 400 100px Playfair', 'ABCÉ'),
    document.fonts.load('800 100px InterX', 'ABC@'),
    document.fonts.load('700 100px InterX', 'ABC@'),
  ]);
}

const mctx = document.createElement('canvas').getContext('2d');

export class TextSystem {
  constructor(renderer) {
    this.r = renderer;
    this.cache = new Map();
    this.layoutCache = new Map();
  }

  setFont(ctx, key) {
    const f = FONTS[key];
    ctx.font = f.css(f.ref);
    ctx.letterSpacing = `${(f.track * f.ref).toFixed(2)}px`;
  }

  glyph(key, ch, stroke = false) {
    const id = `${key}|${ch}|${stroke ? 's' : 'f'}`;
    let g = this.cache.get(id);
    if (g) return g;
    const f = FONTS[key];
    this.setFont(mctx, key);
    const adv = mctx.measureText(ch).width;
    const pad = Math.ceil(f.ref * 0.14) + 6;
    const w = Math.ceil(adv + pad * 2);
    const h = Math.ceil(f.ref * 1.75);
    const base = Math.ceil(f.ref * 1.28);
    const cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    const c = cv.getContext('2d');
    c.font = f.css(f.ref);
    c.letterSpacing = `${(f.track * f.ref).toFixed(2)}px`;
    c.textBaseline = 'alphabetic';
    c.fillStyle = '#fff';
    c.strokeStyle = '#fff';
    c.lineJoin = 'round';
    c.lineWidth = Math.max(3, f.ref * 0.018);
    if (stroke) c.strokeText(ch, pad, base);
    else c.fillText(ch, pad, base);
    const t = this.r.textureFromCanvas(cv);
    g = { ...t, w, h, base, pad, adv };
    this.cache.set(id, g);
    return g;
  }

  /** Mesure une ligne : positions de chaque lettre (à la taille de référence) */
  measure(key, text) {
    const id = key + '|' + text;
    let m = this.layoutCache.get(id);
    if (m) return m;
    const f = FONTS[key];
    this.setFont(mctx, key);
    const glyphs = [];
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      const upto = mctx.measureText(text.slice(0, i + 1)).width;
      const adv = mctx.measureText(ch).width;
      glyphs.push({ ch, x: upto - adv, adv });
    }
    const width = mctx.measureText(text).width - f.track * f.ref; // sans l'espacement final
    const capH = mctx.measureText('H').actualBoundingBoxAscent;
    m = { glyphs, width, capH, ref: f.ref };
    this.layoutCache.set(id, m);
    return m;
  }

  /** Taille (px) pour que `text` tienne dans maxW, plafonnée */
  fit(key, text, maxW, maxSize) {
    const m = this.measure(key, text);
    return Math.min(maxSize, (maxW / m.width) * m.ref);
  }

  /**
   * Bloc de texte multi-lignes centré. lines: [{text, font, size, tint, glow, stroke, gap}]
   * → { glyphs:[{g, gx, gy, k, line, word, idx, tint, glow}], w, h, lines }
   * Origine = centre du bloc, y vers le haut.
   */
  block(lines, { lineGap = 0.08 } = {}) {
    const placed = [];
    let totalH = 0;
    const metrics = lines.map((l) => {
      const m = this.measure(l.font, l.text);
      const k = l.size / m.ref;
      const h = m.capH * k;
      return { l, m, k, h };
    });
    metrics.forEach((x, i) => {
      totalH += x.h + (i ? (x.l.gap ?? lineGap * x.l.size) : 0);
    });
    let y = totalH / 2; // haut du bloc
    let wordCounter = 0;
    let maxW = 0;
    metrics.forEach((x, li) => {
      if (li) y -= x.l.gap ?? lineGap * x.l.size;
      const baseline = y - x.h; // y-up
      y -= x.h;
      const lw = x.m.width * x.k;
      maxW = Math.max(maxW, lw);
      let wordIdx = wordCounter;
      x.m.glyphs.forEach((gl, i) => {
        if (gl.ch === ' ') {
          wordIdx++;
          return;
        }
        const g = this.glyph(x.l.font, gl.ch, !!x.l.stroke);
        const cx = (gl.x + gl.adv / 2) * x.k - lw / 2;
        const cy = baseline + (g.base - g.h / 2) * x.k;
        placed.push({
          g, gx: cx, gy: cy, k: x.k, line: li, word: wordIdx, idx: placed.length, ch: gl.ch,
          tint: x.l.tint || [1, 1, 1], tint2: x.l.tint2, glow: x.l.glow ?? 1, capH: x.h,
          // zone d'encre (relative au centre du glyphe) pour la vérification de la zone sûre
          ink: [-gl.adv * x.k * 0.5, baseline - cy - 0.0, gl.adv * x.k * 0.5, baseline - cy + x.h * 1.0],
        });
      });
      wordCounter = wordIdx + 1;
      x.baseline = baseline;
    });
    return { glyphs: placed, w: maxW, h: totalH, words: wordCounter };
  }
}

/**
 * Convertit un bloc en sprites. `xf(g, ctx)` renvoie la transformation par lettre :
 * {dx,dy,dz,rx,ry,rz,s,alpha,lod,split,glow,tint}  (undefined ⇒ identité)
 */
export function blockSprites(block, base, xf, out, meta = {}) {
  for (const gl of block.glyphs) {
    const a = (xf && xf(gl)) || {};
    if (a.alpha !== undefined && a.alpha <= 0.002) continue;
    const s = (a.s ?? 1) * gl.k;
    let M = M4.mul(base, M4.translate(gl.gx + (a.dx || 0), gl.gy + (a.dy || 0), a.dz || 0));
    if (a.rz) M = M4.mul(M, M4.rotZ(a.rz));
    if (a.ry) M = M4.mul(M, M4.rotY(a.ry));
    if (a.rx) M = M4.mul(M, M4.rotX(a.rx));
    out.push({
      tex: gl.g, w: gl.g.w * s, h: gl.g.h * s, matrix: M,
      alpha: a.alpha ?? 1, glow: (a.glow ?? 1) * gl.glow, lod: a.lod || 0, split: a.split || 0,
      tint: a.tint || gl.tint, tint2: a.tint2 || gl.tint2,
      text: true, ink: gl.ink.map((v) => v * (a.s ?? 1)), inkScale: 1, caption: meta.caption, uv: a.uv, add: a.add, sortZ: meta.sortZ, exiting: a.exiting ?? (meta.exiting || Math.abs(a.dx || 0) > 40 || Math.abs(a.dy || 0) > 90 || Math.abs(a.dz || 0) > 250 || (a.s ?? 1) > 1.14 || Math.abs(a.rx || 0) > 0.7 || Math.abs(a.rz || 0) > 0.35),
    });
  }
}
