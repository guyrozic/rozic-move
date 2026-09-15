#!/usr/bin/env node
/**
 * חותם גרסה על נכסים מקומיים — `style.css?v=<hash>`.
 *
 * ## ⚠️ למה זה קיים (15.9.2026)
 * גיא דיווח שוב ושוב "לא רואה שינוי באתר", ולפעמים כן ולפעמים לא.
 * הסיבה לא הייתה סבלנות ולא מטמון דפדפן רגיל אלא הרכב מדויק:
 *
 *   - `cache-control: max-age=600` על כל הנכסים (עשר דקות).
 *   - ה-HTML נטען מחדש בכל ניווט, ולכן **שינוי בטקסט נראה מיד**.
 *   - `<link href="style.css">` **בלי פרמטר**, ולכן הדפדפן ממשיך
 *     להשתמש בגיליון השמור — ו**שינוי עיצובי לא נראה עד עשר דקות**.
 *
 * כלומר שינוי ב-HTML נראה ושינוי ב-CSS לא, באותו רענון בדיוק. זה גם
 * הסביר למה `?v=` על כתובת הדף לא עזר: הוא עוקף את המטמון של המסמך,
 * לא של הנכסים שבתוכו.
 *
 * הפתרון: `?v=<8 תווים מ-sha1 של תוכן הקובץ>`. התוכן משתנה ⇒ הכתובת
 * משתנה ⇒ הדפדפן מוכרח להוריד. התוכן לא משתנה ⇒ הכתובת זהה ⇒ המטמון
 * עובד כרגיל. ⚠️ **חשוב שזה יהיה hash ולא תאריך** — תאריך היה מבטל את
 * המטמון בכל פריסה, גם כשדבר לא זז.
 *
 * ## שימוש
 *   node scripts/stamp-assets.mjs           # חותם
 *   node scripts/stamp-assets.mjs --check   # נכשל אם חסרה חותמת
 *
 * ⚠️ **להריץ לפני קומיט שנוגע ב-CSS או ב-JS.** מצב `--check` רץ בבדיקות
 * ונופל אם שכחו — בלעדיו התקלה חוזרת בשקט, וזה בדיוק מה שקרה.
 *
 * נכסים חיצוניים (fonts.googleapis) לא נוגעים — אין לנו את התוכן שלהם.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { globSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CHECK = process.argv.includes('--check');

const pages = globSync('*.html', { cwd: ROOT })
  .concat(globSync('app/*.html', { cwd: ROOT }));

/** hash של תוכן הנכס, או null אם אינו קיים על הדיסק. */
const hashCache = new Map();
function hashOf(assetPath) {
  if (hashCache.has(assetPath)) return hashCache.get(assetPath);
  const full = join(ROOT, assetPath);
  const h = existsSync(full)
    ? createHash('sha1').update(readFileSync(full)).digest('hex').slice(0, 8)
    : null;
  hashCache.set(assetPath, h);
  return h;
}

/** ממיר נתיב יחסי לדף לנתיב מתוך שורש האתר. */
function resolveAsset(href, pageFile) {
  if (/^(https?:)?\/\//.test(href)) return null;      // חיצוני
  if (href.startsWith('/')) return href.slice(1);
  const dir = pageFile.includes('/') ? dirname(pageFile) : '';
  return dir ? join(dir, href) : href;
}

let changed = 0;
const missing = [];

for (const page of pages) {
  const file = join(ROOT, page);
  const src = readFileSync(file, 'utf8');
  const out = src.replace(
    /(\s(?:href|src)=")([^"]+\.(?:css|js))(\?v=[0-9a-f]{8})?(")/g,
    (full, pre, href, oldStamp, post) => {
      const asset = resolveAsset(href, page);
      if (!asset) return full;
      const h = hashOf(asset);
      if (!h) return full;                            // לא על הדיסק — לא נוגעים
      const want = `${pre}${href}?v=${h}${post}`;
      if (full !== want) {
        if (CHECK) missing.push(`${page} → ${href}`);
        else changed++;
      }
      return want;
    },
  );
  if (!CHECK && out !== src) writeFileSync(file, out);
}

if (CHECK) {
  if (missing.length) {
    console.error(`\n  ✗ ${missing.length} נכסים בלי חותמת גרסה עדכנית:`);
    for (const m of missing.slice(0, 12)) console.error(`      ${m}`);
    console.error('\n  התיקון:  node scripts/stamp-assets.mjs\n');
    process.exit(1);
  }
  console.log(`  ✓ כל הנכסים ב-${pages.length} דפים נושאים חותמת גרסה עדכנית.`);
} else {
  console.log(changed
    ? `  ✓ ${changed} הפניות עודכנו ב-${pages.length} דפים.`
    : `  ✓ הכול כבר מעודכן (${pages.length} דפים).`);
}
