// Rend quelques images en PNG pour l'inspection : node tools/still.mjs 0 30 60 ... [--samples=N]
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, serve, launch, openPage, rawToPng } from './lib.mjs';
const args = process.argv.slice(2);
const samples = args.find((a) => a.startsWith('--samples='))?.split('=')[1];
const postArg = args.find((a) => a.startsWith('--post='))?.split('=')[1];
const frames = args.filter((a) => !a.startsWith('--')).map(Number);
const out = path.join(ROOT, 'scratch', 'stills');
fs.mkdirSync(out, { recursive: true });
const got = new Map();
const { server, port } = await serve(async (url, body) => { const m = url.match(/\/upload\/frame\/(\d+)/); if (m) got.set(+m[1], body); });
const browser = await launch();
const page = await openPage(browser, port);
await page.evaluate(() => window.initVideo());
for (const f of frames) {
  const t0 = Date.now();
  const info = await page.evaluate(([f, s, p]) => window.uploadFrame(f, { ...(s ? { samples: +s } : {}), ...(p ? { post: JSON.parse(p) } : {}) }), [f, samples, postArg]);
  const file = path.join(out, `f${String(f).padStart(4, '0')}.png`);
  await rawToPng(got.get(f), file);
  console.log(`frame ${f} (t=${(f / 60).toFixed(3)}) ${Date.now() - t0} ms, ${info.samples ?? 0} sous-images, ${info.parts ?? 0} particules`, info.report?.filter((r) => r.text).slice(0, 2).map((r) => `${r.c}:[${r.x0 | 0},${r.y0 | 0},${r.x1 | 0},${r.y1 | 0}]`).join(' '));
}
await browser.close();
server.close();
