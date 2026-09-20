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

/* ⚠️ 15.9 — חותמת זמן גלויה, **זמנית**, לבקשת גיא: הוא לא יכול היה לדעת
   אם מה שהוא רואה הוא הגרסה החדשה, ובזבזנו על זה סבבים שלמים. היא
   מתעדכנת בכל הרצה של הסקריפט הזה — כלומר בכל פריסה.

   ⚠️ **להסיר לפני השקה לציבור.** החיפוש: `data-build-stamp`. */
const now = new Date();
const STAMP = new Intl.DateTimeFormat('he-IL', {
  day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  timeZone: 'Asia/Jerusalem',
}).format(now).replace(',', ' ·');

/* ⚠️ החותמת והבודק מוזרקים כיחידה אחת ומחפשים באותו `data-build-stamp`,
   כדי ששניהם יימחקו יחד לפני השקה לציבור. החותמת לבדה היא פסיבית —
   היא עוזרת רק למי שחשב לבדוק אותה; `version-check.js` הוא מה שהופך
   אותה לפעילה (הנימוק המלא בראש הקובץ ההוא). */
const STAMP_HTML = `<div data-build-stamp class="build-stamp" aria-hidden="true">עודכן ${STAMP}</div>`
  + `\n<script src="/version-check.js" defer></script>`;

let changed = 0;
const missing = [];
let stamped = 0;

for (const page of pages) {
  const file = join(ROOT, page);
  const src = readFileSync(file, 'utf8');

  /* ⚠️ 21.9 — **בלוק החותמת מוחלף לפני מעבר החותמות, לא אחריו.**
     בסדר ההפוך הסקריפט מחק בעצמו את מה שהוסיף: מעבר החותמות הוסיף
     `?v=<hash>` גם ל-`/version-check.js`, ואז ה-block-replace דרס את
     כל הבלוק ב-`STAMP_HTML` הקשיח — שאין בו `?v=`. התוצאה: `--check`
     נכשל על הנכס הזה **בכל 26 הדפים, בכל הרצה**, וזה נראה כמו סחף
     ישן שאי-אפשר לתקן. כאן הבלוק נכנס קודם, ומעבר החותמות שאחריו
     חותם גם אותו — כלומר `version-check.js` מקבל סוף-סוף מבטל-מטמון
     כמו כל נכס אחר. */
  let base = src;
  if (!CHECK) {
    // ⚠️ הרג'קס בולע גם את תגית הסקריפט, **כולל `?v=<hash>`** שהוסף
    // בהרצה קודמת. בלעדיו היא שוכפלה בכל הרצה (נתפס בהרצה השנייה).
    const re = /<div data-build-stamp[\s\S]*?<\/div>\n?(?:\s*<script src="\/version-check\.js(?:\?v=[a-f0-9]+)?" defer><\/script>\n?)*/;
    base = re.test(src)
      ? src.replace(re, STAMP_HTML + '\n')
      : src.replace(/(<body[^>]*>\n?)/i, `$1${STAMP_HTML}\n`);
    if (base !== src) stamped++;
  }

  const out = base.replace(
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
  /* ⚠️ מקור האמת ש-`version-check.js` משווה מולו. הוא חייב להיכתב
     באותה הרצה ובאותו פורמט בדיוק כמו החותמת שבדפים — אחרת ההשוואה
     מדווחת "יש גרסה חדשה" לנצח. */
  writeFileSync(join(ROOT, 'version.txt'), STAMP + '\n', 'utf8');

  console.log(`  ✓ ${changed} הפניות · חותמת "${STAMP}" ב-${stamped} דפים.`);
}
