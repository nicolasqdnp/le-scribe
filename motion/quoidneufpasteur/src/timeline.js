// ─────────────────────────────────────────────────────────────────────────────
//  TIMELINE UNIQUE — source de vérité partagée par l'image ET le son.
//
//  • visual.js lit CAPTIONS / CUES / SECTIONS pour décider quoi afficher à t.
//  • audio.js lit les MÊMES CUES / SCORE pour décider quoi jouer à t.
//  Aucun temps n'est écrit ailleurs : tout est dérivé de BPM (120) ⇒ 1 temps =
//  0,5 s = 30 images exactement à 60 fps. Les cues « sync » tombent donc pile
//  sur une image, et sur un échantillon audio entier (0,5 s × 48 000 = 24 000).
// ─────────────────────────────────────────────────────────────────────────────

export const FPS = 60;
export const W = 1080;
export const H = 1920;
export const BPM = 120;
export const BEAT = 60 / BPM; // 0.5 s
export const BAR = BEAT * 4; // 2 s
export const DURATION = 30; // 15 mesures
export const TOTAL_FRAMES = FPS * DURATION; // 1800
export const SAMPLE_RATE = 48000;

export const beat = (n) => n * BEAT;
export const frameTime = (f) => f / FPS;

// ── Zone sûre Instagram Reels (1080×1920, origine en haut à gauche) ──────────
// Meta recommande de laisser ~14 % en haut, ~35 % en bas (légende, titre audio,
// bouton « s'abonner ») et ~6 % sur les côtés ; la colonne de boutons à droite
// (like / commentaires / partage) mord jusqu'à x≈960 dès y≈1100. On garde donc
// tout texte / logo / bouton dans ce rectangle, centré sur x = 540.
export const SAFE = { left: 120, right: 960, top: 270, bottom: 1248 };
export const SAFE_CX = 540;
export const SAFE_CY = (SAFE.top + SAFE.bottom) / 2; // 759
export const SAFE_W = SAFE.right - SAFE.left; // 840

// ── Palette (reprend l'or / crème / noir chaud de la marque Le Scribe) ───────
export const COLORS = {
  black: '#07060a',
  gold: '#c9a77d',
  gold2: '#e6c493',
  goldHot: '#ffd58f',
  flame: '#ff7a2a',
  cream: '#f2ece1',
  red: '#ff2b3d',
  white: '#ffffff',
};

// ── PRNG déterministe (jamais Math.random) ───────────────────────────────────
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Sections ─────────────────────────────────────────────────────────────────
export const SECTIONS = [
  { id: 'hook', t0: 0.0, t1: 3.5 }, // accroche choc
  { id: 'cut', t0: 3.5, t1: 4.0 }, // coupure : noir + silence numérique
  { id: 'drop', t0: 4.0, t1: 5.0 }, // « C'EST FAUX. »
  { id: 'demo', t0: 5.0, t1: 14.0 }, // démonstration au beat
  { id: 'manifesto', t0: 14.0, t1: 24.0 }, // manifeste
  { id: 'logo', t0: 24.0, t1: 30.0 }, // logo + s'abonner
];
export const sectionAt = (t) => SECTIONS.find((s) => t >= s.t0 && t < s.t1) || SECTIONS[SECTIONS.length - 1];

// Fenêtres de silence numérique absolu (le master est « gaté » à zéro).
export const MUTE_WINDOWS = [
  { t0: 3.5, t1: 4.0 }, // la coupure
  { t0: 23.9, t1: 24.0 }, // le souffle avant le logo
];

// ── Légendes (2 à 3 mots chacune) ────────────────────────────────────────────
// kind : 'hook' | 'drop' | 'slam' | 'card' | 'phrase' | 'verse' | 'cta'
export const CAPTIONS = [
  // Accroche
  { id: 'h1', t0: 0.0, t1: 1.0, text: "ON T'A DIT", kind: 'hook' },
  { id: 'h2', t0: 1.0, t1: 2.0, text: 'QUE DIEU', kind: 'hook' },
  { id: 'h3', t0: 2.0, t1: 3.5, text: 'EST MORT.', kind: 'hook' },
  // Le drop
  { id: 'd0', t0: 4.0, t1: 5.0, text: "C'EST FAUX.", kind: 'drop' },
  // Démo — 1/3 : rafale de slams dans le tunnel
  { id: 's1', t0: 5.0, t1: 5.5, text: 'TES QUESTIONS', kind: 'slam' },
  { id: 's2', t0: 5.5, t1: 6.0, text: 'SANS TABOU', kind: 'slam' },
  { id: 's3', t0: 6.0, t1: 6.5, text: 'SANS FILTRE', kind: 'slam' },
  { id: 's4', t0: 6.5, t1: 7.0, text: 'SANS JUGEMENT', kind: 'slam' },
  // Démo — 2/3 : le paquet de cartes-questions (une par temps, gamme de ré mineur)
  { id: 'c1', t0: 7.0, t1: 7.5, text: 'DIEU EXISTE ?', kind: 'card', midi: 62 },
  { id: 'c2', t0: 7.5, t1: 8.0, text: 'POURQUOI SOUFFRIR ?', kind: 'card', midi: 65 },
  { id: 'c3', t0: 8.0, t1: 8.5, text: 'COMMENT PRIER ?', kind: 'card', midi: 67 },
  { id: 'c4', t0: 8.5, t1: 9.0, text: 'ET LE DOUTE ?', kind: 'card', midi: 69 },
  { id: 'c5', t0: 9.0, t1: 9.5, text: 'FOI ET ARGENT ?', kind: 'card', midi: 72 },
  { id: 'c6', t0: 9.5, t1: 10.0, text: 'VRAIMENT PARDONNER ?', kind: 'card', midi: 74 },
  { id: 'c7', t0: 10.0, t1: 10.5, text: 'ET MOI ALORS ?', kind: 'card', midi: 77 },
  { id: 'c8', t0: 10.5, t1: 11.0, text: 'ET TOI ?', kind: 'card', midi: 81 },
  // Démo — 3/3 : « viens comme tu es »
  { id: 'p1', t0: 11.0, t1: 11.5, text: 'TON DOUTE', kind: 'phrase' },
  { id: 'p2', t0: 11.5, t1: 12.0, text: 'TA COLÈRE', kind: 'phrase' },
  { id: 'p3', t0: 12.0, t1: 12.5, text: 'TES BLESSURES', kind: 'phrase' },
  { id: 'p4', t0: 12.5, t1: 13.0, text: 'TES RÊVES', kind: 'phrase' },
  { id: 'p5', t0: 13.0, t1: 14.0, text: 'TU ES ATTENDU', kind: 'phrase' },
  // Manifeste — 10 vers, 3 mots, un mot tous les 8e de temps → mélodie
  { id: 'm1', t0: 14.0, t1: 15.0, text: 'DIEU PARLE ENCORE', kind: 'verse' },
  { id: 'm2', t0: 15.0, t1: 16.0, text: 'DANS LE SILENCE', kind: 'verse' },
  { id: 'm3', t0: 16.0, t1: 17.0, text: 'PAS DE MASQUE', kind: 'verse' },
  { id: 'm4', t0: 17.0, t1: 18.0, text: 'PAS DE PERFORMANCE', kind: 'verse' },
  { id: 'm5', t0: 18.0, t1: 19.0, text: 'JUSTE LA VÉRITÉ', kind: 'verse' },
  { id: 'm6', t0: 19.0, t1: 20.0, text: 'DITE AVEC AMOUR', kind: 'verse' },
  { id: 'm7', t0: 20.0, t1: 21.0, text: 'POUR LES FATIGUÉS', kind: 'verse' },
  { id: 'm8', t0: 21.0, t1: 22.0, text: 'POUR LES BRISÉS', kind: 'verse' },
  { id: 'm9', t0: 22.0, t1: 23.0, text: 'UNE PORTE OUVERTE', kind: 'verse' },
  { id: 'm10', t0: 23.0, t1: 23.9, text: 'UNE LUMIÈRE ALLUMÉE', kind: 'verse' },
  // Appel à l'action (le logo et le handle sont des éléments de marque, pas des légendes)
  { id: 'x1', t0: 27.0, t1: 30.0, text: 'REJOINS LA CONVERSATION', kind: 'cta' },
];

// Gamme (ré mineur naturel) pour la mélodie du manifeste : une note / mot.
// Chaque vers a 3 notes (hauteurs MIDI) choisies dans l'accord en cours.
const VERSE_MELODY = {
  m1: [74, 77, 81], // Dm
  m2: [76, 74, 72],
  m3: [74, 77, 79],
  m4: [77, 74, 72],
  m5: [70, 74, 77], // Bb
  m6: [79, 77, 74],
  m7: [72, 76, 79], // C / Cmaj
  m8: [77, 76, 72],
  m9: [74, 77, 81],
  m10: [81, 84, 86],
};

// Début de chaque mot d'un vers (en secondes depuis t0) : 8es de temps.
export const verseWordOffsets = (n) => (n === 3 ? [0, 0.25, 0.5] : n === 2 ? [0, 0.375] : [0]);

// ── Harmonie : une mesure = un accord (accords de 2 temps en fin de section) ─
// [t0, t1, nom, racine MIDI (grave), tierce m/M, quinte]
const chord = (t0, t1, name, root, third, fifth, ext) => ({ t0, t1, name, root, notes: [root, root + third, root + fifth, ...(ext ? [root + ext] : [])] });
export const CHORDS = [
  chord(0, 4, 'Dm', 38, 3, 7), // hook : bourdon sur ré
  chord(4, 6, 'Dm', 38, 3, 7),
  chord(6, 8, 'Bb', 34, 4, 7),
  chord(8, 10, 'F', 41, 4, 7),
  chord(10, 12, 'C', 36, 4, 7),
  chord(12, 13, 'Dm', 38, 3, 7),
  chord(13, 14, 'A', 45, 4, 7), // dominante : tension avant le manifeste
  chord(14, 16, 'Dm', 38, 3, 7, 10),
  chord(16, 18, 'Bb', 34, 4, 7, 11),
  chord(18, 20, 'F', 41, 4, 7, 11),
  chord(20, 22, 'C', 36, 4, 7, 11),
  chord(22, 23, 'Gm', 43, 3, 7),
  chord(23, 24, 'A', 45, 4, 7),
  chord(24, 26, 'Dm', 38, 3, 7, 10),
  chord(26, 28, 'Bb', 34, 4, 7, 11),
  chord(28, 29, 'F', 41, 4, 7),
  chord(29, 30, 'C', 36, 4, 7),
];
export const chordAt = (t) => CHORDS.find((c) => t >= c.t0 && t < c.t1) || CHORDS[CHORDS.length - 1];

// ── CUES : événements synchrones image + son ─────────────────────────────────
// type : boom | hit | kick | clap | snare | hat | ohat | shaker | thump | glitch |
//        whoosh | riser | revcrash | crash | pop | word | sparkle | click | stab
// sync : true ⇒ l'image doit montrer un changement net à t (vérifié par verify.mjs)
export const CUES = [];
const cue = (type, t, props = {}) => CUES.push({ type, t: Math.round(t * 48000) / 48000, ...props });

// 1) Accroche : trois impacts à t=0, 1, 2 + battement de cœur qui s'emballe
cue('boom', 0.0, { v: 1.0, sync: true, id: 'hook0' });
cue('boom', 1.0, { v: 1.1, sync: true, id: 'hook1' });
cue('boom', 2.0, { v: 1.3, sync: true, id: 'hook2' });
cue('riser', 0.0, { dur: 3.5, id: 'hookRiser' });
cue('whoosh', 0.78, { dur: 0.22, dir: 1 });
cue('whoosh', 1.78, { dur: 0.22, dir: 1 });
[2.5, 2.75, 3.0, 3.125, 3.25, 3.375].forEach((t, i) => cue('thump', t, { v: 0.6 + i * 0.07 }));
[3.0, 3.125, 3.1875, 3.25, 3.3125, 3.375, 3.4375, 3.46875].forEach((t, i) => cue('glitch', t, { v: 0.6 + i * 0.05, id: 'g' + i }));
// 2) Coupure 3.5 → 4.0 : rien (voir MUTE_WINDOWS)
// 3) Drop
cue('boom', 4.0, { v: 1.6, sync: true, id: 'drop' });
cue('crash', 4.0, { v: 1.0 });
// 4) Démo — batterie « four on the floor » + contretemps
for (let b = 8; b < 28; b++) {
  const t = beat(b);
  cue('kick', t, { v: b === 8 ? 1.0 : 0.95, sync: false });
  if (b % 4 === 1 || b % 4 === 3) cue('clap', t, { v: 0.9 });
  cue('hat', t + BEAT / 2, { v: 0.55 });
  if (b >= 18) {
    cue('hat', t + BEAT / 4, { v: 0.28 });
    cue('hat', t + (3 * BEAT) / 4, { v: 0.3 });
  }
}
// slams (tunnel) : whoosh 0.18 s avant, impact sur le temps
CAPTIONS.filter((c) => c.kind === 'slam').forEach((c, i) => {
  cue('whoosh', c.t0 - 0.16, { dur: 0.16, dir: i % 2 ? -1 : 1 });
  cue('hit', c.t0, { v: 0.8 + i * 0.05, sync: true, id: c.id });
});
// cartes : pop mélodique (une note de la gamme par carte)
CAPTIONS.filter((c) => c.kind === 'card').forEach((c) => cue('pop', c.t0, { midi: c.midi, v: 0.9, sync: true, id: c.id }));
// phrases : hit + whoosh ; la dernière monte en riser
CAPTIONS.filter((c) => c.kind === 'phrase').forEach((c, i) => {
  cue('whoosh', c.t0 - 0.12, { dur: 0.12, dir: 1 });
  cue('hit', c.t0, { v: 0.85 + i * 0.04, sync: true, id: c.id });
});
cue('riser', 12.0, { dur: 1.9, id: 'demoRiser' });
cue('revcrash', 12.5, { dur: 1.5 });
// roulement de caisse claire qui accélère (12.5 → 13.9) puis silence net
{
  let t = 12.5;
  let step = 0.25;
  while (t < 13.9) {
    cue('snare', t, { v: 0.45 + (t - 12.5) * 0.4 });
    t += step;
    if (t > 13.0) step = 0.125;
    if (t > 13.5) step = 0.0625;
    if (t > 13.75) step = 0.03125;
  }
}
// 5) Manifeste
cue('boom', 14.0, { v: 1.15, sync: true, id: 'manifesto', soft: true });
cue('crash', 14.0, { v: 0.7 });
CAPTIONS.filter((c) => c.kind === 'verse').forEach((c) => {
  const words = c.text.split(' ');
  const offs = verseWordOffsets(words.length);
  const mel = VERSE_MELODY[c.id];
  offs.forEach((o, i) => cue('word', c.t0 + o, { midi: mel[i], v: i === 0 ? 1 : 0.85, id: c.id + '_' + i, verse: c.id, wi: i, sync: i === 0 }));
});
// battement sourd (cœur) puis shaker, puis tension
for (let b = 28; b < 48; b++) {
  const t = beat(b);
  if (b % 4 === 0) cue('thump', t, { v: 0.9, soft: true });
  if (b >= 36 && b % 4 === 2) cue('thump', t, { v: 0.6, soft: true });
  if (b >= 32) cue('shaker', t + BEAT / 2, { v: 0.5 });
  if (b >= 36) cue('shaker', t, { v: 0.35 });
}
cue('riser', 20.5, { dur: 3.4, id: 'manifestoRiser' });
cue('revcrash', 22.0, { dur: 1.9 });
{
  let t = 21.0;
  while (t < 23.9) {
    cue('snare', t, { v: 0.3 + (t - 21) * 0.2, soft: true });
    t += t < 22 ? 0.5 : t < 23 ? 0.25 : t < 23.5 ? 0.125 : t < 23.75 ? 0.0625 : 0.03125;
  }
}
// 6) Logo + s'abonner
cue('boom', 24.0, { v: 1.7, sync: true, id: 'logo0' });
cue('crash', 24.0, { v: 1.2 });
for (let b = 48; b < 58; b++) {
  const t = beat(b);
  cue('kick', t, { v: 1.0 });
  if (b % 4 === 1 || b % 4 === 3) cue('clap', t, { v: 0.85 });
  cue('hat', t + BEAT / 2, { v: 0.55 });
  cue('hat', t + BEAT / 4, { v: 0.28 });
  cue('hat', t + (3 * BEAT) / 4, { v: 0.3 });
}
cue('boom', 25.0, { v: 1.2, sync: true, id: 'lock' }); // le logo se verrouille
cue('sparkle', 25.0, { v: 1.0, midi: 86 });
cue('whoosh', 25.7, { dur: 0.3, dir: 1 });
cue('hit', 26.0, { v: 0.9, sync: true, id: 'wordmark' }); // PASTEUR ?
cue('pop', 26.5, { midi: 81, v: 0.8, sync: true, id: 'handle' });
cue('whoosh', 26.84, { dur: 0.16, dir: 1 });
cue('hit', 27.0, { v: 0.9, sync: true, id: 'cta' });
cue('pop', 27.5, { midi: 86, v: 0.8, sync: true, id: 'button' });
cue('click', 28.0, { v: 1.0, sync: true, id: 'tap' }); // le tap sur « S'ABONNER »
cue('sparkle', 28.0, { v: 1.0, midi: 93 });
cue('boom', 29.0, { v: 1.4, sync: true, id: 'end' });
cue('crash', 29.0, { v: 0.9 });

CUES.sort((a, b) => a.t - b.t || a.type.localeCompare(b.type));

// ── Partition (notes) ────────────────────────────────────────────────────────
// voice : pad | bass | arp | stab
export const SCORE = [];
const note = (voice, t, dur, midi, vel = 1, extra = {}) => SCORE.push({ voice, t, dur, midi, vel, ...extra });

// Pads : un accord par entrée de CHORDS, avec entrée/sortie par section
CHORDS.forEach((c) => {
  if (c.t0 < 4) return; // la tension de l'accroche est gérée par 'drone' ci-dessous
  const vel = c.t0 < 14 ? 0.5 : c.t0 < 24 ? 0.9 : 1;
  c.notes.forEach((n, i) => note('pad', c.t0, c.t1 - c.t0 + 0.4, n + 24 + (i === 0 ? -12 : 0), vel, { chord: c.name }));
});
// Bourdon d'accroche (ré + seconde mineure qui frotte)
note('drone', 0, 3.5, 38, 1);
note('drone', 0, 3.5, 50, 0.8);
note('drone', 0, 3.5, 63, 0.5); // mib : cluster
note('drone', 0, 3.5, 62, 0.5);

// Basse : croches syncopées pendant démo et logo, tenues longues au manifeste
const bassPattern = [0, null, 0, null, 12, null, 0, 7]; // croches : degrés relatifs à la racine
function bassBars(t0, t1) {
  for (let t = t0; t < t1 - 1e-9; t += BEAT / 2) {
    const i = Math.round((t - t0) / (BEAT / 2)) % 8;
    const off = bassPattern[i];
    if (off === null) continue;
    const c = chordAt(t);
    note('bass', t, BEAT / 2 - 0.02, c.root + 12 + (off === 7 ? 7 : off === 12 ? 12 : 0), 1);
  }
}
bassBars(4.0, 13.5);
bassBars(24.0, 29.0);
// Basse tenue du manifeste
CHORDS.filter((c) => c.t0 >= 14 && c.t0 < 24).forEach((c) => note('bass', c.t0, c.t1 - c.t0, c.root + 12, 0.8, { long: true }));

// Arpège (16es) : entre dans la démo à 7.0, revient au logo
function arpBars(t0, t1, vel) {
  const shape = [0, 2, 1, 2, 3, 2, 1, 2];
  for (let t = t0; t < t1 - 1e-9; t += BEAT / 4) {
    const c = chordAt(t);
    const tones = c.notes.slice(0, 3);
    const i = Math.round((t - t0) / (BEAT / 4)) % shape.length;
    const k = shape[i];
    const midi = tones[k % 3] + 48 + (k === 3 ? 12 : 0);
    note('arp', t, BEAT / 4 - 0.01, midi, vel * (i % 4 === 0 ? 1 : 0.7));
  }
}
arpBars(7.0, 13.5, 0.8);
arpBars(24.0, 29.0, 1.0);

// Stabs d'accord (impact de drop et de logo) : accord large sur le boom
[4.0, 24.0, 26.0, 28.0].forEach((t) => chordAt(t).notes.slice(0, 3).forEach((n) => note('stab', t, 1.2, n + 36, 1)));

// ── Utilitaires de lecture de la timeline (côté image) ───────────────────────
export const cuesOf = (...types) => CUES.filter((c) => types.includes(c.type));
/** Dernier cue (parmi types) à t' ≤ t → {cue, dt} ou null */
export function lastCue(t, types, maxAge = Infinity) {
  let best = null;
  for (const c of CUES) {
    if (c.t > t + 1e-9) break;
    if (types.includes(c.type)) best = c;
  }
  if (!best) return null;
  const dt = t - best.t;
  return dt > maxAge ? null : { cue: best, dt };
}
/** Enveloppe d'impact exponentielle : 1 à l'instant du cue, ~0 après `tau`×5. */
export function pulse(t, types, tau, maxAge = tau * 8) {
  const r = lastCue(t, types, maxAge);
  return r ? Math.exp(-r.dt / tau) * (r.cue.v ?? 1) : 0;
}
export const captionAt = (t) => CAPTIONS.find((c) => t >= c.t0 && t < c.t1) || null;
export const captionById = (id) => CAPTIONS.find((c) => c.id === id);
export const midiToHz = (m) => 440 * Math.pow(2, (m - 69) / 12);

// Mots comptés pour la règle « 2 à 3 mots »
export const wordCount = (s) => s.trim().split(/\s+/).filter((w) => /[A-Za-zÀ-ÿ0-9]/.test(w)).length;
