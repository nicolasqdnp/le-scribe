// Vérifie la zone sûre Instagram sur les 1800 images (état seul, sans rendu) + règle « 2 à 3 mots ».
import { serve, launch, openPage } from './lib.mjs';
import { SAFE, CAPTIONS, wordCount } from '../src/timeline.js';
const TOL = 6; // px de tolérance (aberration chromatique / flou de mouvement)
const { server, port } = await serve(async () => {});
const browser = await launch();
const page = await openPage(browser, port);
await page.evaluate(() => window.initVideo());
const all = await page.evaluate(() => { const o = []; for (let f = 0; f < 1800; f++) o.push(window.safeFrame(f)); return o; });
await browser.close(); server.close();
const viol = new Map();
let worst = { d: 0 };
all.forEach((list, f) => {
  for (const r of list) {
    if (r.shatter > 0.05) continue; // éclats en vol (≤ 0,5 s avant la coupure) : le texte est déjà détruit
    const dx = Math.max(SAFE.left - r.x0, r.x1 - SAFE.right), dy = Math.max(SAFE.top - r.y0, r.y1 - SAFE.bottom);
    const d = Math.max(dx, dy);
    if (d > TOL) {
      const k = r.c + (r.text ? '' : '(forme)');
      const v = viol.get(k) || { first: f, last: f, max: 0, n: 0 };
      v.last = f; v.n++; v.max = Math.max(v.max, d);
      viol.set(k, v);
    }
    if (d > worst.d) worst = { d, f, c: r.c };
  }
});
console.log(`zone sûre : x ∈ [${SAFE.left}, ${SAFE.right}], y ∈ [${SAFE.top}, ${SAFE.bottom}] (tolérance ${TOL}px)`);
if (!viol.size) console.log('✔ aucun dépassement');
for (const [k, v] of viol) console.log(`✘ ${k}: images ${v.first}–${v.last} (${v.n}), dépassement max ${v.max.toFixed(0)}px`);
console.log('pire cas :', worst);
const bad = CAPTIONS.filter((c) => wordCount(c.text) < 2 || wordCount(c.text) > 3);
console.log(bad.length ? '✘ légendes hors 2–3 mots : ' + bad.map((c) => c.text).join(' | ') : `✔ ${CAPTIONS.length} légendes de 2 à 3 mots`);
