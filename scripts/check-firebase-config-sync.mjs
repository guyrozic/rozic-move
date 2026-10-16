#!/usr/bin/env node
/**
 * כל קונפיג Firebase מוטבע בדף חייב להיות זהה שדה-שדה ל-`app/firebase.js`.
 *
 * ## למה (16.10)
 * `index.html` יוצר את אפליקציית ה-Firebase ברירת-המחדל בסקריפט מוטבע עם 4
 * שדות, ו-`analytics.js` מייבא אחר כך את `firebase.js` וקורא ל-
 * `initializeApp` עם 7. אפשרויות שונות על אותו שם = `app/duplicate-app`,
 * שנבלע ב-catch של analytics.js. המדידה בדף הבית מתה בשקט.
 * שדה אחד שנשכח מספיק כדי להפיל אותה — לכן הבדיקה משווה את כל השדות.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..');
const fields = (block) => Object.fromEntries([...block.matchAll(/(\w+):\s*(?:'([^']*)'|(MEASUREMENT_ID))/g)].map((m) => [m[1], m[2] ?? m[3]]));

const fb = readFileSync(join(ROOT, 'app/firebase.js'), 'utf8');
const mid = fb.match(/MEASUREMENT_ID\s*=\s*'([^']*)'/)[1];
const ref = fields(fb.match(/const firebaseConfig = \{([\s\S]*?)\n\};/)[1]);
if (mid) ref.measurementId = mid;
delete ref['...(MEASUREMENT_ID'];
for (const k of Object.keys(ref)) if (ref[k] === 'MEASUREMENT_ID') delete ref[k];

const pages = [...readdirSync(ROOT).filter((f) => f.endsWith('.html')), ...readdirSync(join(ROOT, 'app')).filter((f) => f.endsWith('.html')).map((f) => `app/${f}`)];
const bad = [];
let n = 0;
for (const p of pages) {
  const src = readFileSync(join(ROOT, p), 'utf8');
  if (!/initializeApp\(CONFIG\)/.test(src)) continue;
  n++;
  const m = src.match(/const CONFIG = \{([\s\S]*?)\n\s*\};/);
  if (!m) { bad.push(`${p}: לא נמצא CONFIG`); continue; }
  const got = fields(m[1].replace(/\/\*[\s\S]*?\*\//g, ''));
  for (const k of new Set([...Object.keys(ref), ...Object.keys(got)])) {
    if (ref[k] !== got[k]) bad.push(`${p}: ${k} = ${got[k]} (ב-firebase.js: ${ref[k]})`);
  }
}
if (bad.length) { console.error('  ✗ קונפיג Firebase מוטבע שונה מ-app/firebase.js:\n    ' + bad.join('\n    ')); process.exit(1); }
console.log(`  ✓ קונפיג Firebase מוטבע זהה ל-firebase.js ב-${n} דף(ים).`);
