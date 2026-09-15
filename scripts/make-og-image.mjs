#!/usr/bin/env node
/**
 * make-og-image.mjs — ממיר את scripts/og-image.svg ל-/og-image.png (1200×630).
 *
 * הרצה:   node scripts/make-og-image.mjs
 *
 * למה בכלל: סורקי התצוגה המקדימה של פייסבוק, ווטסאפ, טוויטר ולינקדאין אינם
 * מרנדרים SVG — og:image חייב להיות PNG או JPG. ה-SVG הוא המקור לעריכה,
 * וה-PNG הוא מה שמוגש.
 *
 * איך: Chrome headless, כי הוא הדבר היחיד במק שמרנדר עברית + Heebo נכון.
 * (rsvg-convert מרנדר, אבל בלי Heebo ועם טיפול חלש יותר ב-RTL.)
 * אם אין Chrome — הסקריפט נופל עם הודעה ברורה במקום לכתוב קובץ שבור.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync, existsSync, statSync, renameSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SVG_PATH = join(ROOT, 'scripts', 'og-image.svg');
const OUT_PATH = join(ROOT, 'og-image.png');
const WIDTH = 1200;
const HEIGHT = 630;

const CHROME_CANDIDATES = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
];

const chrome = CHROME_CANDIDATES.find((p) => existsSync(p));
if (!chrome) {
  console.error('לא נמצא Chrome/Chromium. התקן אחד מהם, או המר ידנית ל-1200×630.');
  process.exit(1);
}

const svg = readFileSync(SVG_PATH, 'utf8').replace(/^<\?xml[^>]*\?>\s*/, '');
const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Heebo:wght@500;700;900&display=block" rel="stylesheet">
<style>html,body{margin:0;padding:0;width:${WIDTH}px;height:${HEIGHT}px;overflow:hidden;background:#0A4433}
svg{display:block}</style>
</head><body>${svg}
<script>document.fonts.ready.then(()=>{document.title='fonts-ready';});<\/script>
</body></html>`;

const dir = mkdtempSync(join(tmpdir(), 'rozic-og-'));
const htmlPath = join(dir, 'og.html');
writeFileSync(htmlPath, html, 'utf8');

execFileSync(chrome, [
  '--headless=new',
  '--disable-gpu',
  '--hide-scrollbars',
  '--force-device-scale-factor=1',
  '--default-background-color=00000000',
  '--virtual-time-budget=6000',
  `--window-size=${WIDTH},${HEIGHT}`,
  `--screenshot=${join(dir, 'og.png')}`,
  `file://${htmlPath}`,
], { stdio: 'inherit' });

const shot = join(dir, 'og.png');
if (!existsSync(shot) || statSync(shot).size < 5000) {
  console.error('הרינדור נכשל או יצא ריק — og-image.png לא עודכן.');
  process.exit(1);
}
renameSync(shot, OUT_PATH);
console.log(`og-image.png נכתב (${statSync(OUT_PATH).size} bytes, ${WIDTH}×${HEIGHT})`);
