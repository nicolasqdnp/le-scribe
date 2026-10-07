import * as T from './timeline.js';
import { renderAudio } from './audio.js';
import { Renderer, PROJ, M4 } from './gfx.js';
import { TextSystem, loadFonts } from './text.js';
import { Film } from './film.js';

window.T = T;
let r, film;

window.renderAudio = async () => {
  const a = await renderAudio(OfflineAudioContext);
  const buf = new Float32Array(a.left.length * 2);
  buf.set(a.left, 0);
  buf.set(a.right, a.left.length);
  await fetch('/upload/audio', { method: 'POST', body: buf });
  return { n: a.left.length, sr: a.sampleRate };
};

window.initVideo = async () => {
  await loadFonts();
  r = new Renderer(document.getElementById('gl'), {});
  film = new Film(r, new TextSystem(r));
  window.film = film;
  return true;
};

// Projette la zone d'encre des sprites texte (et les rectangles des cartes/bouton/logo) en pixels écran
function safeReport(S) {
  const VP = M4.mul(PROJ, S.view);
  const out = [];
  const proj = (M, x, y) => {
    const wx = M[0] * x + M[4] * y + M[12], wy = M[1] * x + M[5] * y + M[13], wz = M[2] * x + M[6] * y + M[14];
    const c0 = VP[0] * wx + VP[4] * wy + VP[8] * wz + VP[12], c1 = VP[1] * wx + VP[5] * wy + VP[9] * wz + VP[13], cw = VP[3] * wx + VP[7] * wy + VP[11] * wz + VP[15];
    return [T.W / 2 + (c0 / cw) * (T.W / 2), T.H / 2 - (c1 / cw) * (T.H / 2)];
  };
  for (const s of S.sprites) {
    const rect = s.ink || (s.safeRect ? [-s.safeRect[0], -s.safeRect[1], s.safeRect[0], s.safeRect[1]] : null);
    if (!rect) continue;
    const vis = (s.alpha ?? 1) * 1;
    if (vis < 0.25 || (s.lod ?? 0) > 1.5 || s.exiting) continue;
    const xs = [], ys = [];
    for (const [x, y] of [[rect[0], rect[1]], [rect[2], rect[1]], [rect[2], rect[3]], [rect[0], rect[3]]]) {
      const [px, py] = proj(s.matrix, x, y);
      xs.push(px); ys.push(py);
    }
    out.push({ c: s.caption || s.kind || 'x', x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys), text: !!s.text });
  }
  return out;
}

// Estime le déplacement maximal (px) pendant l'exposition → nombre de sous-images nécessaire
function screenPt(VP, M, x, y) {
  const wx = M[0] * x + M[4] * y + M[12], wy = M[1] * x + M[5] * y + M[13], wz = M[2] * x + M[6] * y + M[14];
  const c0 = VP[0] * wx + VP[4] * wy + VP[8] * wz + VP[12], c1 = VP[1] * wx + VP[5] * wy + VP[9] * wz + VP[13], cw = VP[3] * wx + VP[7] * wy + VP[11] * wz + VP[15];
  return [(c0 / cw) * (T.W / 2), (c1 / cw) * (T.H / 2)];
}
function motionPx(A, B) {
  let mx = 0;
  if (A.sprites.length !== B.sprites.length) return 60;
  const VA = M4.mul(PROJ, A.view), VB = M4.mul(PROJ, B.view);
  for (let i = 0; i < A.sprites.length; i++) {
    const a = A.sprites[i], b = B.sprites[i];
    if (a.tex !== b.tex) return 60;
    const hw = a.w / 2, hh = a.h / 2;
    for (const [x, y] of [[0, 0], [hw, hh], [-hw, hh], [hw, -hh], [-hw, -hh]]) {
      const p = screenPt(VA, a.matrix, x, y), q = screenPt(VB, b.matrix, x * (b.w / a.w), y * (b.h / a.h));
      mx = Math.max(mx, Math.hypot(p[0] - q[0], p[1] - q[1]));
    }
    mx = Math.max(mx, Math.abs((a.alpha ?? 1) - (b.alpha ?? 1)) * 12, Math.abs((a.lod ?? 0) - (b.lod ?? 0)) * 6);
  }
  if (A.partCount !== B.partCount) mx = Math.max(mx, 30);
  else {
    const n = A.partCount;
    for (let i = 0; i < n; i++) {
      if (A.partsCopy[i * 12 + 8] === 2) continue; // les traînées portent déjà leur propre flou
      const dx = A.partsCopy[i * 12] - B.partsCopy[i * 12], dy = A.partsCopy[i * 12 + 1] - B.partsCopy[i * 12 + 1], dz = A.partsCopy[i * 12 + 2] - B.partsCopy[i * 12 + 2];
      mx = Math.max(mx, Math.hypot(dx, dy) * 0.9 + Math.abs(dz) * 0.2);
    }
  }
  const sa = A.warp.shatter ? A.warp.shatter.p : 0, sb = B.warp.shatter ? B.warp.shatter.p : 0;
  mx = Math.max(mx, Math.abs(sa - sb) * 2200);
  return mx;
}

const AVG = ['ca', 'bloom', 'streak', 'grain', 'vig', 'exposure', 'flash', 'fade', 'sat', 'bloomThr'];

/** Rend l'image f (flou de mouvement : obturateur 180° centré sur l'intervalle d'affichage de l'image). */
window.renderFrame = (f, opts = {}) => {
  const t0 = f / T.FPS;
  const sa = film.state(t0 + 1 / 240);
  sa.partsCopy = film.parts.slice(0, sa.partCount * 12);
  const sb = film.state(t0 + 3 / 240);
  sb.partsCopy = film.parts.slice(0, sb.partCount * 12);
  const disp = motionPx(sa, sb);
  const n = opts.samples ?? Math.max(sa.fast ? 3 : 1, Math.min(16, Math.ceil(disp / 3)));
  r.clearAccum();
  const post = {};
  let center = null;
  let black = 0;
  const report = [];
  let shatterP = 0;
  // Le fond (coûteux) est calculé une seule fois par image, au centre de l'exposition ;
  // sprites, particules et déformations, eux, sont rendus à chaque sous-image.
  const bgState = film.state(t0 + 1 / 120);
  if (!bgState.blackout) r.drawBG(bgState.bg, t0 + 1 / 120);
  for (let i = 0; i < n; i++) {
    // fenêtre d'exposition : [t0 + 1/240, t0 + 3/240] → centrée sur t0 + 1/120 (milieu de l'image affichée)
    const ts = t0 + 1 / 240 + ((i + 0.5) / n) * (1 / 120);
    const S = film.state(ts);
    if (S.blackout) { black++; continue; }
    r.beginScene();
    r.drawSprites(S.sprites, S.view);
    r.drawParticles(film.parts, S.partCount, S.view);
    r.accumulate(1 / n, S.warp);
    for (const k of AVG) post[k] = (post[k] || 0) + (S.post[k] ?? 0) / n;
    center = S;
    shatterP = Math.max(shatterP, S.warp.shatter ? S.warp.shatter.p : 0);
    if (i === Math.floor(n / 2)) report.push(...safeReport(S));
  }
  if (!center) {
    r.clearFinalBlack();
    return { black: true, report: [], t: t0 };
  }
  const P = { ...center.post };
  for (const k of AVG) P[k] = post[k] * (n / (n - black));
  if (black) P.fade = black / n;
  if (opts.post) Object.assign(P, opts.post);
  r.post(P, f);
  return { black: black === n, report, shatterP, t: t0, samples: n, disp, parts: film.pc };
};

window.uploadFrame = async (f, opts) => {
  const info = window.renderFrame(f, opts);
  const px = r.read();
  await fetch(`/upload/frame/${f}`, { method: 'POST', body: px });
  return info;
};
// Analyse de zone sûre sans rendu GL (état seul) : utilisée par tools/safe.mjs
window.safeFrame = (f) => {
  const t = f / T.FPS + 1 / 120;
  const S = film.state(t);
  if (S.blackout) return [];
  return safeReport(S).map((r) => ({ ...r, shatter: S.warp.shatter ? S.warp.shatter.p : 0 }));
};
window.presentFrame = (f, opts) => { const i = window.renderFrame(f, opts); r.present(); return i; };
window.__ready = true;
