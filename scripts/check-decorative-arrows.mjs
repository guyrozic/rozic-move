#!/usr/bin/env node
/*
 * ============================================================================
 *  check-decorative-arrows.mjs — חץ דקורטיבי בטקסט של קישור/כפתור
 * ============================================================================
 *
 *      node scripts/check-decorative-arrows.mjs
 *
 *  יציאה 0 = נקי. יציאה 1 = נמצא חץ קישוטי, או חץ חזרה בכיוון הפוך.
 *  בלי תלויות — Node בלבד, כמו שאר הבדיקות כאן.
 *
 *  למה הקובץ הזה קיים
 *  -------------------
 *  גיא (25.9), על "לרשימה המלאה ←" באפליקציה: **"אני כבר הגדרתי לך שזה חץ
 *  שמזוהה עם עיצובי AI — יש להסיר אותו מייד."** הוא צדק שהגדיר — הכלל נאמר
 *  בצ'אט שלוש פעמים ומעולם לא נכתב, ולכן נמחק וחזר שלוש פעמים בריפו
 *  האפליקציה (`385f678`, `a785917`, `adf3a67`).
 *
 *  ⚠️ **והאתר היה חמור יותר מהאפליקציה, לא פחות.** כשנסרק נמצאו בו תשעה
 *  כפתורי "חזרה" עם חץ — **בשני כיוונים סותרים**: חמישה דפי תוכן כתבו
 *  `← חזרה לעמוד הבית` ושלושה דפי app כתבו `→ חזרה לפריטים`. ב-RTL הזרימה
 *  מימין לשמאל, כלומר "אחורה" היא ימינה — חמשת הראשונים הצביעו לכיוון
 *  ההפוך מהמילה שלצדם. חץ שסותר את הטקסט שלידו גרוע מאין חץ.
 *
 *  הכיוון נמדד ולא הונח, בשתי דרכים בלתי תלויות:
 *    1. `←` (U+2190) ו-`→` (U+2192) הם `Bidi_Mirrored = 0` — הם **אינם**
 *       מתהפכים ב-RTL, ולכן מה שכתוב במקור הוא מה שנראה על המסך. (`‹`/`›`
 *       **כן** mirrored, ולכן מהם אין להסיק כיוון חזותי מקריאת קוד.)
 *    2. התקן בפועל: `.step-back` באתר (`app/flow.css`) מצייר chevron ימינה
 *       (`M6 3.5 10.5 8 6 12.5`), וכך גם 62 כפתורי החזרה באפליקציה
 *       (`arrow-forward`) — מול כפתור השליחה בצ'אט שמצביע שמאלה.
 *
 *  מה מותר — ולמה זו הבחנה ולא רשימת היתרים
 *  -----------------------------------------
 *  לא כל חץ הוא קישוט, וכאן זה קריטי: הסרה גורפת הייתה שוברת מידע.
 *
 *    1. **מפריד מסלול** — `"פרופיל והגדרות" ← תמיכה`. יש טקסט משני צידי
 *       החץ, והוא מסביר איך להגיע. להסיר אותו שובר הוראה.
 *    2. **מפריד מוצא-יעד** — `רמת גן ← תל אביב`. החץ **הוא** הנתון.
 *    3. **אייקון של כפתור** — `<button class="chat-send-btn">←</button>`.
 *       החץ הוא כל תוכן הכפתור, לא זנב של משפט.
 *    4. **כפתור "חזרה"** — מותר, בהכרעת גיא (תזכיר 107.3), אבל **חייב
 *       להצביע ימינה**. זה מה שהבדיקה אוכפת כאן.
 *
 *  ההבחנה מבנית: קישוט הוא חץ שיש טקסט רק בצד **אחד** שלו. אין רשימת
 *  קבצים מוחרגים לתחזק.
 *
 *  ⚠️ מה זה לא בודק: SVG. ה-chevron של `.step-back`/`.back-link` הוא
 *  `<path>`, ובדיקת כיוון שלו דורשת פענוח גאומטריה. מה שכן נאכף הוא
 *  שהוא לא **הוחלף** בתו טקסט בכיוון הלא נכון — וזה מה שנשבר בפועל.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** תווי חץ שנצפו בפועל בשימוש דקורטיבי בשני המאגרים. */
const ARROWS = '←→›»▸➜⟶';
const RTL_BACK_ARROW = '→';

/* מה שלא נראה למשתמש יוצא מהסריקה. ⚠️ **הערות JS אינן פינוק** — בסבב
   הראשון הבדיקה נפלה על שלוש הערות JSDoc שמתארות ניתוב
   (`מחובר → mapsProxy, אורח → ...`), כלומר על תיעוד ולא על ממשק. הערות
   HTML לבדן לא מספיקות כאן, כי `app/` הוא בעיקר JS שמייצר HTML. */
const stripHtmlNoise = (s) => s
  .replace(/<!--[\s\S]*?-->/g, '')
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
  .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '');

/* ⚠️ לא מנסה לכבד מחרוזות — הסרה עודפת כאן מייצרת false negative נדיר,
   בזמן שהיעדר הסרה מייצר false positive על כל קובץ מתועד. */
const stripJsComments = (s) => s
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^[ \t]*\/\/.*$/gm, '');

const stripNoise = (s, file) =>
  /\.(js|mjs)$/.test(file) ? stripJsComments(s) : stripHtmlNoise(s);

/* חץ קישוטי = טקסט בצד **אחד** שלו בלבד, וזו כל ההבחנה:

     TRAILING  טקסט, רווח, חץ, ואז סוף-שורה או תג — `לרשימה המלאה ←`
     LEADING   תחילת-שורה או `>`, חץ, רווח, טקסט — `← חזרה`
     BACK      אותה צורה כ-LEADING אך לפני "חזרה"/"חזור" — נבדק על כיוון

   הדרישה לרווח צמוד לחץ היא מה שמוציא מפריד (`רמת גן ← תל אביב` יש לו
   טקסט בשני הצדדים) ואייקון-כפתור (`>←<` אין לו רווח בכלל). */
const TRAILING = new RegExp(`\\S[ \\t]+[${ARROWS}][ \\t]*(?:<|$)`, 'm');
const LEADING = new RegExp(`(?:^|>)[ \\t]*[${ARROWS}][ \\t]+\\S`, 'm');
const BACK = new RegExp(`(?:^|>)[ \\t]*([${ARROWS}])[ \\t]+(?:חזרה|חזור)`, 'm');

const files = [];
(function walk(dir) {
  for (const n of readdirSync(dir)) {
    if (n === 'node_modules' || n === '.git' || n === 'accessible') continue;
    const p = join(dir, n);
    if (statSync(p).isDirectory()) { walk(p); continue; }
    if (/\.(html|js|mjs)$/.test(p) && !p.includes('/scripts/')) files.push(p);
  }
})(ROOT);

const decorative = [];
const wrongDirection = [];

for (const p of files) {
  const rel = relative(ROOT, p);
  stripNoise(readFileSync(p, "utf8"), p).split('\n').forEach((line, i) => {
    const at = `${rel}:${i + 1}  ${line.trim().slice(0, 78)}`;
    const back = BACK.exec(line);
    if (back) {
      if (back[1] !== RTL_BACK_ARROW) wrongDirection.push(at);
      return;                      // כפתור חזרה — החץ מותר, הכיוון נאכף
    }
    if (TRAILING.test(line) || LEADING.test(line)) decorative.push(at);
  });
}

if (decorative.length) {
  console.error('  ✗ חץ דקורטיבי בטקסט של קישור/כפתור:\n');
  for (const f of decorative) console.error('     · ' + f);
  console.error('\n  הטקסט עצמו אומר לאן הוא מוביל — חץ שמרמז "יש המשך" מיותר.');
  console.error('  מפריד מסלול/מוצא-יעד צריך טקסט משני צידי החץ, לא רק באחד.');
}
if (wrongDirection.length) {
  console.error('\n  ✗ חץ בכפתור "חזרה" מצביע לכיוון ההפוך מהמילה שלצדו:\n');
  for (const f of wrongDirection) console.error('     · ' + f);
  console.error(`\n  ב-RTL "אחורה" היא ימינה: "${RTL_BACK_ARROW} חזרה".`);
  console.error('  כך ב-.step-back (app/flow.css) וב-62 כפתורי החזרה של האפליקציה.');
  console.error('  ועדיף chevron של SVG על תו טקסט — ראו .back-link בדפי המדיניות.');
}
if (decorative.length || wrongDirection.length) process.exit(1);

console.log(`  ✓ ${files.length} קבצים — אין חץ דקורטיבי, וכל חץ חזרה מצביע ימינה.`);
