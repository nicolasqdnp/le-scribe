// Utilitaires Node : serveur statique + réception binaire, lancement de Chromium (WebGL2 logiciel).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.woff2': 'font/woff2', '.json': 'application/json' };

/** handlers : { 'POST /frame/12': (buf) => ... } via onPost(url, body) */
export function serve(onPost) {
  const server = http.createServer(async (req, res) => {
    try {
      if (req.method === 'POST') {
        const chunks = [];
        for await (const c of req) chunks.push(c);
        const out = await onPost(req.url, Buffer.concat(chunks));
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify(out ?? { ok: true }));
        return;
      }
      const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
      if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
      res.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream', 'cache-control': 'no-store' });
      fs.createReadStream(p).pipe(res);
    } catch (e) { res.writeHead(500); res.end(String(e)); }
  });
  return new Promise((r) => server.listen(0, '127.0.0.1', () => r({ server, port: server.address().port })));
}

export async function launch() {
  return chromium.launch({
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-gpu-vsync',
      '--autoplay-policy=no-user-gesture-required', '--disable-background-timer-throttling', '--disable-renderer-backgrounding'],
  });
}

export async function openPage(browser, port, query = '') {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  page.on('console', (m) => { const t = m.text(); if (!/GPU stall|GL Driver Message/.test(t)) console.log('[page]', t); });
  page.on('pageerror', (e) => console.error('[pageerror]', e.message));
  await page.goto(`http://127.0.0.1:${port}/src/index.html${query}`);
  await page.waitForFunction('window.__ready === true', null, { timeout: 60000 });
  return page;
}

import { spawn } from 'node:child_process';
/** RGBA brut (lignes de bas en haut) → PNG */
export function rawToPng(buf, file, w = 1080, h = 1920, scale = null) {
  return new Promise((res, rej) => {
    const args = ['-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${w}x${h}`, '-i', '-', '-vf', 'vflip' + (scale ? `,scale=${scale}` : ''), '-frames:v', '1', file];
    const p = spawn('ffmpeg', args);
    p.on('close', (c) => (c ? rej(new Error('ffmpeg ' + c)) : res()));
    p.stdin.end(buf);
  });
}
