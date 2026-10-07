// Éléments graphiques dessinés en Canvas 2D (puis envoyés en textures WebGL) :
// logo (crosse de berger = point d'interrogation + flamme), cartes-questions, bouton « S'ABONNER ».

// Chemin du « ? » en crosse de berger — repère 900×900, centre (450,450)
export const QMARK_PATH =
  'M 330 335 C 330 205 400 150 470 150 C 570 150 625 220 625 300 C 625 400 520 425 480 480 C 455 515 450 545 450 600';
export const FLAME_PATH =
  'M 450 645 C 505 712 525 742 525 768 C 525 808 491 830 450 830 C 409 830 375 808 375 768 C 375 742 395 712 450 645 Z';

function gold(ctx, y0, y1) {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, '#fff3d2');
  g.addColorStop(0.45, '#e2bd88');
  g.addColorStop(1, '#a37b46');
  return g;
}

export function drawLogoMark() {
  const S = 900;
  const cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const c = cv.getContext('2d');
  // disque sombre + anneau
  const bg = c.createRadialGradient(450, 400, 40, 450, 450, 420);
  bg.addColorStop(0, '#241a10');
  bg.addColorStop(1, '#0a0705');
  c.fillStyle = bg;
  c.beginPath();
  c.arc(450, 450, 418, 0, Math.PI * 2);
  c.fill();
  c.lineWidth = 16;
  c.strokeStyle = gold(c, 30, 870);
  c.beginPath();
  c.arc(450, 450, 418, 0, Math.PI * 2);
  c.stroke();
  c.lineWidth = 3;
  c.strokeStyle = 'rgba(230,196,147,.45)';
  c.beginPath();
  c.arc(450, 450, 385, 0, Math.PI * 2);
  c.stroke();
  // crosse / point d'interrogation
  c.lineCap = 'round';
  c.lineJoin = 'round';
  const q = new Path2D(QMARK_PATH);
  c.lineWidth = 78;
  c.strokeStyle = gold(c, 130, 620);
  c.stroke(q);
  c.lineWidth = 26;
  c.strokeStyle = 'rgba(255,248,225,.55)';
  c.save();
  c.translate(-12, -12);
  c.stroke(q);
  c.restore();
  // bille terminale de la crosse
  c.fillStyle = gold(c, 285, 385);
  c.beginPath();
  c.arc(330, 340, 50, 0, Math.PI * 2);
  c.fill();
  // flamme (le point)
  const fg = c.createLinearGradient(0, 640, 0, 830);
  fg.addColorStop(0, '#fff0b8');
  fg.addColorStop(0.5, '#ffb04a');
  fg.addColorStop(1, '#ff6a1f');
  c.fillStyle = fg;
  c.fill(new Path2D(FLAME_PATH));
  c.fillStyle = 'rgba(255,255,235,.75)';
  c.beginPath();
  c.ellipse(450, 790, 20, 32, 0, 0, Math.PI * 2);
  c.fill();
  return cv;
}

/** Échantillonne le tracé du logo (points en repère 900×900) pour les particules */
export function sampleLogoPoints(n, rnd) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  const pts = [];
  const sample = (d, count, spread) => {
    svg.setAttribute('d', d);
    const L = svg.getTotalLength();
    for (let i = 0; i < count; i++) {
      const p = svg.getPointAtLength((i / count) * L + rnd() * (L / count));
      const a = rnd() * Math.PI * 2;
      const r = Math.sqrt(rnd()) * spread;
      pts.push([p.x + Math.cos(a) * r, p.y + Math.sin(a) * r]);
    }
  };
  sample(QMARK_PATH, Math.round(n * 0.52), 36);
  sample(FLAME_PATH, Math.round(n * 0.14), 22);
  // anneau
  const ringN = Math.round(n * 0.3);
  for (let i = 0; i < ringN; i++) {
    const a = (i / ringN) * Math.PI * 2 + rnd() * 0.01;
    const r = 418 + (rnd() - 0.5) * 18;
    pts.push([450 + Math.cos(a) * r, 450 + Math.sin(a) * r]);
  }
  const ball = Math.round(n * 0.04);
  for (let i = 0; i < ball; i++) {
    const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * 48;
    pts.push([330 + Math.cos(a) * r, 340 + Math.sin(a) * r]);
  }
  return pts;
}

function rr(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

/** Carte « sticker question » façon story : bandeau doré + corps sombre. */
export function drawCard(w, h, variant = 'dark') {
  const pad = 40;
  const cv = document.createElement('canvas');
  cv.width = w + pad * 2;
  cv.height = h + pad * 2;
  const c = cv.getContext('2d');
  c.translate(pad, pad);
  const R = 46;
  // ombre portée douce
  c.save();
  c.shadowColor = 'rgba(0,0,0,.65)';
  c.shadowBlur = 40;
  c.shadowOffsetY = 18;
  c.fillStyle = '#000';
  rr(c, 0, 0, w, h, R);
  c.fill();
  c.restore();
  // corps
  if (variant === 'gold') {
    const g = c.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#fff0c6');
    g.addColorStop(0.5, '#e8c590');
    g.addColorStop(1, '#b88f58');
    c.fillStyle = g;
  } else {
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#1d1710');
    g.addColorStop(1, '#0c0907');
    c.fillStyle = g;
  }
  rr(c, 0, 0, w, h, R);
  c.fill();
  c.save();
  rr(c, 0, 0, w, h, R);
  c.clip();
  // bandeau d'en-tête
  const hh = 92;
  const hg = c.createLinearGradient(0, 0, w, 0);
  if (variant === 'gold') {
    hg.addColorStop(0, '#20160c');
    hg.addColorStop(1, '#3a2a17');
  } else {
    hg.addColorStop(0, '#f5d9a0');
    hg.addColorStop(0.55, '#d7ad74');
    hg.addColorStop(1, '#b5884f');
  }
  c.fillStyle = hg;
  c.fillRect(0, 0, w, hh);
  // avatar + barres (squelette d'UI, sans texte)
  c.fillStyle = variant === 'gold' ? '#f5d9a0' : '#1b130a';
  c.beginPath();
  c.arc(62, hh / 2, 26, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = variant === 'gold' ? 'rgba(245,217,160,.8)' : 'rgba(27,19,10,.75)';
  rr(c, 106, hh / 2 - 16, 190, 12, 6);
  c.fill();
  rr(c, 106, hh / 2 + 6, 120, 10, 5);
  c.fill();
  // reflet
  const sh = c.createLinearGradient(0, hh, 0, hh + 120);
  sh.addColorStop(0, 'rgba(255,255,255,.07)');
  sh.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = sh;
  c.fillRect(0, hh, w, 120);
  c.restore();
  // liseré
  const bg = c.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, '#ffe7ad');
  bg.addColorStop(0.5, '#c9a77d');
  bg.addColorStop(1, '#ffe7ad');
  c.lineWidth = 4;
  c.strokeStyle = bg;
  rr(c, 2, 2, w - 4, h - 4, R - 2);
  c.stroke();
  return { canvas: cv, pad, bodyTop: 92 };
}

/** Bouton « + S'ABONNER » : pastille dorée */
export function drawButton() {
  const w = 660, h = 132, pad = 40;
  const cv = document.createElement('canvas');
  cv.width = w + pad * 2;
  cv.height = h + pad * 2;
  const c = cv.getContext('2d');
  c.translate(pad, pad);
  c.save();
  c.shadowColor = 'rgba(255,170,60,.55)';
  c.shadowBlur = 36;
  const g = c.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#fff0c4');
  g.addColorStop(0.5, '#e6c08a');
  g.addColorStop(1, '#bb915a');
  c.fillStyle = g;
  rr(c, 0, 0, w, h, h / 2);
  c.fill();
  c.restore();
  const hi = c.createLinearGradient(0, 0, 0, h * 0.5);
  hi.addColorStop(0, 'rgba(255,255,255,.55)');
  hi.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = hi;
  rr(c, 6, 6, w - 12, h * 0.48, h / 2 - 6);
  c.fill();
  // « + » + libellé, centrés dans la pastille
  c.font = '400 70px Anton';
  c.letterSpacing = '5px';
  const label = "S'ABONNER";
  const tw = c.measureText(label).width - 5;
  const content = 52 + 34 + tw;
  const x0 = (w - content) / 2;
  c.fillStyle = '#1a1209';
  const cx = x0 + 26, cy = h / 2;
  rr(c, cx - 26, cy - 5, 52, 10, 5);
  c.fill();
  rr(c, cx - 5, cy - 26, 10, 52, 5);
  c.fill();
  c.textBaseline = 'alphabetic';
  c.textAlign = 'left';
  c.fillText(label, x0 + 52 + 34, h / 2 + 25);
  return { canvas: cv, w: w + pad * 2, h: h + pad * 2, pad, bw: w, bh: h };
}
