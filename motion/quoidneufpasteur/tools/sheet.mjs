// Planche contact depuis des PNG déjà rendus (scratch/stills) : node tools/sheet.mjs out.png cols f1 f2 f3 ...
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { ROOT } from './lib.mjs';
const [out, cols, ...frames] = process.argv.slice(2);
const dir = path.join(ROOT, 'scratch', 'stills');
const font = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';
const inputs = frames.flatMap((f) => ['-i', path.join(dir, `f${String(f).padStart(4, '0')}.png`)]);
const filters = frames.map((f, i) => `[${i}:v]scale=270:480,drawtext=fontfile=${font}:text='${(f / 60).toFixed(2)}s':x=8:y=8:fontsize=26:fontcolor=white:box=1:boxcolor=black@0.6[v${i}]`);
const rows = Math.ceil(frames.length / cols);
const layout = frames.map((_, i) => `${(i % cols) * 270}_${Math.floor(i / cols) * 480}`).join('|');
const fc = filters.join(';') + ';' + frames.map((_, i) => `[v${i}]`).join('') + `xstack=inputs=${frames.length}:layout=${layout}[o]`;
execFileSync('ffmpeg', ['-v', 'error', '-y', ...inputs, '-filter_complex', fc, '-map', '[o]', '-frames:v', '1', out]);
console.log('→', out);
