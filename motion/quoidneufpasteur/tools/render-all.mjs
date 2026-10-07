// Rend la vidéo par segments de 5 s (300 images) puis les concatène sans ré-encodage.
// Un segment déjà présent est conservé : pour en refaire un, supprimer build/seg_XX.mp4
// ou passer --force=2,3 (indices). Les images étant des fonctions pures du temps, le
// résultat est identique à un rendu d'un seul tenant (aux bornes de GOP près).
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync, execFileSync } from 'node:child_process';
import { ROOT } from './lib.mjs';
const arg = (k, d) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split('=')[1] ?? d;
const force = new Set(arg('force', '').split(',').filter(Boolean).map(Number));
const workers = arg('workers', '3');
const SEG = 300, N = 1800 / SEG;
const files = [];
for (let i = 0; i < N; i++) {
  const f = path.join(ROOT, 'build', `seg_${String(i).padStart(2, '0')}.mp4`);
  files.push(f);
  if (fs.existsSync(f) && !force.has(i)) { console.log(`segment ${i} déjà rendu`); continue; }
  console.log(`── segment ${i} : images ${i * SEG}–${(i + 1) * SEG}`);
  const r = spawnSync('node', ['tools/render.mjs', `--workers=${workers}`, `--from=${i * SEG}`, `--to=${(i + 1) * SEG}`, `--out=${f}`], { cwd: ROOT, stdio: 'inherit' });
  if (r.status) throw new Error('segment ' + i + ' en échec');
}
const list = path.join(ROOT, 'build', 'segments.txt');
fs.writeFileSync(list, files.map((f) => `file '${f}'`).join('\n'));
execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', '-movflags', '+faststart', path.join(ROOT, 'build', 'video.mp4')], { stdio: 'inherit' });
console.log('→ build/video.mp4');
