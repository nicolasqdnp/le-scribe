// Assemble vidéo (H.264) + bande-son normalisée (WAV −14 LUFS) → build/final.mp4 (AAC 256 kb/s, 48 kHz)
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { ROOT } from './lib.mjs';
const b = (f) => path.join(ROOT, 'build', f);
execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', b('video.mp4'), '-i', b('audio.wav'),
  '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-ar', '48000', '-ac', '2',
  '-af', 'aresample=async=1:first_pts=0', '-t', '30', '-movflags', '+faststart', b('final.mp4')], { stdio: 'inherit' });
console.log('→ build/final.mp4');
