#!/usr/bin/env node
/*
 * ============================================================================
 *  check-a11y.selftest.mjs — מוכיח שכל כלל ב-check-a11y.mjs באמת נופל
 * ============================================================================
 *
 *      node scripts/check-a11y.selftest.mjs
 *
 *  ⚠️ בדיקה שלא הוכחה בנטרול היא בדיקה שלא נכתבה. הקובץ הזה מנטרל, בזה
 *  אחר זה, בדיוק את מה שכל כלל אמור לתפוס — מוודא שהבדיקה יוצאת בכשל
 *  ושהכלל **הנכון** הוא זה שנתפס — ומחזיר את הקובץ למצבו.
 *
 *  ⚠️ הוא כותב לקבצים אמיתיים בריפו לרגע אחד. השחזור יושב ב-finally, כך
 *  שגם קריסה באמצע מחזירה הכול. אחרי ריצה, `git status` חייב להיות נקי —
 *  אם אינו, השחזור נכשל וזה עצמו ממצא.
 *
 *  יציאה 0 = כל הכללים הוכחו. יציאה 1 = כלל אחד או יותר לא נפל כשהיה צריך.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CHECK = join(ROOT, 'scripts', 'check-a11y.mjs');

/** [כלל, קובץ, המחרוזת המקורית, המחרוזת המנוטרלת] */
const MUTATIONS = [
  ['img-alt', 'app/marketplace.html',
    '<img class="listing-photo" src="${esc(l.photos[0])}" alt="${esc(l.title)}">',
    '<img class="listing-photo" src="${esc(l.photos[0])}">'],

  ['control-name', 'index.html',
    '<button tabindex="0" class="nav-toggle" id="nav-toggle" aria-label="תפריט" aria-expanded="false" aria-controls="mobile-menu">',
    '<button tabindex="0" class="nav-toggle" id="nav-toggle" aria-expanded="false" aria-controls="mobile-menu">'],

  ['field-label', 'app/apartment.html',
    '<input type="text" id="ai-chat-input" placeholder="כתבו כאן..." aria-label="הודעה לעוזר ה-AI">',
    '<input type="text" id="ai-chat-input" placeholder="כתבו כאן...">'],

  ['svg-name', 'index.html',
    '<svg aria-hidden="true" class="logo-arrow" width="18" height="18" viewBox="0 0 18 18" fill="none">',
    '<svg class="logo-arrow" width="18" height="18" viewBox="0 0 18 18" fill="none">'],

  ['page-h1', '404.html', '<h1>', '<h2>'],

  ['heading-skip', 'privacy.html', '<h2>', '<h3>'],

  ['viewport-zoom', 'terms.html',
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
    '<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">'],

  ['raw-color', 'style.css',
    '.card p, .card li { color: var(--text-body); font-size: 0.95rem; }',
    '.card p, .card li { color: #7A8B7A; font-size: 0.95rem; }'],

  ['unresolved-var', 'app/index.html',
    '.app-body button:focus-visible { outline: 3px solid var(--green); outline-offset: 2px; }',
    '.app-body button:focus-visible { outline: 3px solid var(--green-ring); outline-offset: 2px; }'],
];

function runCheck() {
  try {
    execFileSync('node', [CHECK], { cwd: ROOT, encoding: 'utf8' });
    return { code: 0, out: '' };
  } catch (e) {
    return { code: e.status, out: (e.stdout || '') + (e.stderr || '') };
  }
}

const base = runCheck();
if (base.code !== 0) {
  console.error('✗ הריפו אינו נקי לפני הנטרולים — אין טעם לבדוק נפילות:\n' + base.out);
  process.exit(1);
}
console.log('בסיס: הבדיקה עוברת על הריפו כפי שהוא.\n');
console.log('| כלל | קובץ שנוטרל | יציאה | הכלל שנתפס | חזר נקי |');
console.log('|---|---|---|---|---|');

let allOk = true;
for (const [rule, file, from, to] of MUTATIONS) {
  const path = join(ROOT, file);
  const original = readFileSync(path, 'utf8');
  if (!original.includes(from)) {
    console.log(`| \`${rule}\` | ⚠️ העוגן ב-${file} לא נמצא | – | – | – |`);
    allOk = false;
    continue;
  }
  let mutated, restored;
  try {
    writeFileSync(path, original.replace(from, to), 'utf8');
    mutated = runCheck();
  } finally {
    writeFileSync(path, original, 'utf8');
  }
  restored = runCheck();
  const caught = mutated.out.includes('[' + rule + ']');
  const ok = mutated.code === 1 && caught && restored.code === 0;
  allOk &&= ok;
  console.log(`| \`${rule}\` | ${file} | ${mutated.code === 1 ? '1 ✓' : mutated.code + ' ✗'} | ${caught ? '✓' : '✗'} | ${restored.code === 0 ? '✓' : '✗'} |`);
}

console.log(allOk
  ? `\n  ✓ כל ${MUTATIONS.length} הכללים נופלים כשמנטרלים את מה שהם בודקים.`
  : '\n  ✗ כלל אחד או יותר לא נפל — בדוק אותו לפני שסומכים עליו.');
process.exit(allOk ? 0 : 1);
