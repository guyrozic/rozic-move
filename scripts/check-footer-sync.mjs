#!/usr/bin/env node
/**
 * מסנכרן ומאמת שהפוטר זהה בכל דפי האתר — index.html הוא מקור האמת.
 *
 * ## ⚠️ למה זה קיים (25.9.2026)
 * גיא שלח שני צילומים: בדף הבית הפוטר מלא (ארבע עמודות + פרטי העסק),
 * ובדפי האשף הוא חתוך (רק "משפטי", בלי "שירותים"/"חברה"/"יצירת קשר"
 * ובלי שורת פרטי העסק). ההיסטוריה (32d5999) מראה שזו לא הייתה החלטת
 * עיצוב — זה פוטר-המינימום שנוסף כשדרשו קישור להצהרת הנגישות מכל דף,
 * ומעולם לא הושלם לגרסה המלאה.
 *
 * גיא ביקש שכולם יהיו זהים ל"אזור הראשון של דף הבית, באופן מלא". העתק-
 * הדבק ל-22 קבצים הוא בדיוק המנגנון שמייצר מחדש את הפער הזה בפעם הבאה
 * שהפוטר ישתנה (ראו את התקדים: `check-app-web-const-sync.mjs`). לכן
 * `index.html` הוא **מקור האמת היחיד**: הסקריפט קורא את הפוטר משם
 * בזמן ריצה ומייצר ממנו את הגרסה הנכונה לכל דף אחר, בלי עותק שני
 * מקודד כאן שעלול להתיישן משל עצמו.
 *
 * ההבדל היחיד בין דף לדף הוא לאן מצביעים הקישורים:
 *   - "משפטי" ו"יצירת קשר" — קישורים יחסיים/אבסולוטיים, לפי המוסכמה
 *     שכל דף כבר משתמש בה (`legalPrefix`).
 *   - "שירותים" ו"חברה" — עוגנים על דף הבית (`#features` וכו'). בכל
 *     דף שאינו index.html עצמו צריך prefix של הנתיב לדף הבית
 *     (`homePrefix`), אחרת העוגן לא מצביע לשום מקום.
 *
 * ## שימוש
 *   node scripts/check-footer-sync.mjs           # מתקן בפועל
 *   node scripts/check-footer-sync.mjs --check    # רק בודק, לא כותב
 *
 * יציאה 0 = כל הדפים זהים למקור (עד prefix הקישורים). יציאה 1 = נמצא
 * דף שהפוטר בו לא סונכרן — להריץ בלי --check כדי לתקן.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CHECK = process.argv.includes('--check');

const SOURCE_FILE = 'index.html';

/* כל דף אחר שצריך לשאת את אותו פוטר, ואיך לתרגם את הקישורים שלו.
 * legalPrefix — מוצמד לפני privacy.html / terms.html / accessibility.html.
 * homePrefix  — מוצמד לפני #features / #how-it-works / #for-movers /
 *               #faq / #download (העוגנים חיים רק בדף הבית).
 * /delete-account.html תמיד אבסולוטי, גם במקור — לא נוגעים בו. */
const TARGETS = [
  // דפי שורש — משפטי יחסי (כבר המוסכמה הקיימת בקבצים האלה)
  { file: 'accessibility.html', legalPrefix: '', homePrefix: 'index.html' },
  { file: 'terms.html', legalPrefix: '', homePrefix: 'index.html' },
  { file: 'privacy.html', legalPrefix: '', homePrefix: 'index.html' },
  // 25.9 — גיא בחר גרסה A מתוך שלוש חלופות; B ו-C נמחקו מהריפו ומכאן.
  { file: 'preview-movers-a.html', legalPrefix: '', homePrefix: 'index.html' },
  // דפי שורש — משפטי אבסולוטי (המוסכמה הקיימת בקבצים האלה)
  { file: '404.html', legalPrefix: '/', homePrefix: '/index.html' },
  { file: 'delete-account.html', legalPrefix: '/', homePrefix: '/index.html' },
  // דפי app/ — כולם אבסולוטיים, כי GitHub Pages משרת גם מתחת ל-app
  // ונתיב יחסי שם נשבר (ראו הנמקה זהה ב-32d5999).
  { file: 'app/index.html', legalPrefix: '/', homePrefix: '/index.html' },
  { file: 'app/order-status.html', legalPrefix: '/', homePrefix: '/index.html' },
  { file: 'app/apartment.html', legalPrefix: '/', homePrefix: '/index.html' },
  { file: 'app/small-move.html', legalPrefix: '/', homePrefix: '/index.html' },
  { file: 'app/marketplace-create.html', legalPrefix: '/', homePrefix: '/index.html' },
  { file: 'app/account.html', legalPrefix: '/', homePrefix: '/index.html' },
  { file: 'app/marketplace.html', legalPrefix: '/', homePrefix: '/index.html' },
  { file: 'app/login.html', legalPrefix: '/', homePrefix: '/index.html' },
  { file: 'app/support-chat.html', legalPrefix: '/', homePrefix: '/index.html' },
  { file: 'app/order-chat.html', legalPrefix: '/', homePrefix: '/index.html' },
  { file: 'app/order-rate.html', legalPrefix: '/', homePrefix: '/index.html' },
  { file: 'app/settings.html', legalPrefix: '/', homePrefix: '/index.html' },
  { file: 'app/saved-addresses.html', legalPrefix: '/', homePrefix: '/index.html' },
  { file: 'app/feedback.html', legalPrefix: '/', homePrefix: '/index.html' },
  { file: 'app/order-track.html', legalPrefix: '/', homePrefix: '/index.html' },
  { file: 'app/edit-profile.html', legalPrefix: '/', homePrefix: '/index.html' },
];

/** בונה את הערת "אל תערוך ביד" בהזחה של indent, כדי לשבת נכון בכל קובץ. */
function noteFor(indent) {
  return `${indent}<!-- פוטר משותף — מקור האמת הוא index.html. אל תערוך כאן ביד:\n` +
    `${indent}     node scripts/check-footer-sync.mjs מייצר את הבלוק הזה מחדש\n` +
    `${indent}     מהמקור, וכל עריכה ידנית תידרס או תיתפס כפער בבדיקה. -->\n`;
}
const NOTE_RE = /[ \t]*<!-- פוטר משותף[\s\S]*?-->\n/;
// ⚠️ קבוע ולא נגזר מהקובץ: אחרי תיקון עקב באג הזחה, אי-אפשר לגזור
// הזחה נכונה מקובץ ששבור. כל 22 המופעים בריפו כבר עומדים על שני
// רווחים, כולל index.html עצמו — זו המוסכמה, לא ניחוש.
const FOOTER_INDENT = '  ';

/** מוצא את בלוק ה-footer.footer (כולל התגית הפותחת), או null אם אין. */
function extractFooter(src) {
  const m = /<footer\b[^>]*class="[^"]*\bfooter\b[^"]*"[^>]*>/.exec(src);
  if (!m) return null;
  const start = m.index;
  const closeTag = '</footer>';
  const end = src.indexOf(closeTag, start);
  if (end === -1) return null;
  return { start, end: end + closeTag.length, text: src.slice(start, end + closeTag.length) };
}

/** ההזחה שכבר יושבת על תחילת השורה שבה נמצא idx. */
function indentOf(src, idx) {
  const lineStart = src.lastIndexOf('\n', idx - 1) + 1;
  return src.slice(lineStart, idx);
}

function buildVariant(canonical, { legalPrefix, homePrefix }) {
  let out = canonical;
  // דחוף fq-footer — לא מוגדר בשום CSS, השארתו על index.html בלבד
  // הייתה שוברת את הטענה ש"כל הפוטרים זהים".
  out = out.replace('class="footer fq-footer"', 'class="footer"');
  // עוגני דף-הבית: href="#features" וכו'
  out = out.replace(/href="#(features|how-it-works|for-movers|faq|download)"/g,
    (_, anchor) => `href="${homePrefix}#${anchor}"`);
  // קישורי משפטי היחסיים (לא /delete-account.html — הוא כבר אבסולוטי במקור)
  out = out.replace(/href="(privacy\.html|terms\.html|accessibility\.html)"/g,
    (_, page) => `href="${legalPrefix}${page}"`);
  return out;
}

const sourcePath = resolve(ROOT, SOURCE_FILE);
const sourceSrc = readFileSync(sourcePath, 'utf8');
const sourceFooter = extractFooter(sourceSrc);
if (!sourceFooter) {
  console.error(`✗ לא נמצא <footer class="footer"...> ב-${SOURCE_FILE} — אין מקור אמת לסנכרן ממנו`);
  process.exit(1);
}
// מנקים גם את המקור מ-fq-footer, כדי שההצהרה "כל הפוטרים זהים" תהיה נכונה פשוטו כמשמעו.
const canonical = sourceFooter.text.replace('class="footer fq-footer"', 'class="footer"');

let mismatches = [];
let fixedCount = 0;

// המקור עצמו: מתקנים fq-footer→footer אם צריך, בלי לגעת בשאר הקובץ.
if (sourceFooter.text !== canonical) {
  if (CHECK) {
    mismatches.push(SOURCE_FILE);
  } else {
    const next = sourceSrc.slice(0, sourceFooter.start) + canonical + sourceSrc.slice(sourceFooter.end);
    writeFileSync(sourcePath, next);
    fixedCount++;
  }
}

for (const target of TARGETS) {
  const path = resolve(ROOT, target.file);
  const src = readFileSync(path, 'utf8');
  const found = extractFooter(src);
  if (!found) {
    mismatches.push(`${target.file}  (אין <footer class="footer"> בדף כלל)`);
    continue;
  }
  const expected = buildVariant(canonical, target);
  // ⚠️ ההשוואה חייבת לכלול את ההזחה שכבר יושבת על שורת ה-<footer>,
  // לא רק את תוכן התג עצמו — אחרת מקרה שבו ההזחה נשברה (למשל ריצה
  // קודמת עם באג) נחשב "תואם" כי found.text מתחיל אחרי הרווחים.
  const currentIndent = indentOf(src, found.start);
  const currentBlockStart = found.start - currentIndent.length;
  const noteMatchBefore = NOTE_RE.exec(src.slice(0, currentBlockStart));
  const hasNoteRightBefore = !!noteMatchBefore &&
    noteMatchBefore.index + noteMatchBefore[0].length === currentBlockStart;
  const spliceStart = hasNoteRightBefore ? noteMatchBefore.index : currentBlockStart;
  const currentFullBlock = src.slice(spliceStart, found.end);
  const expectedFullBlock = noteFor(FOOTER_INDENT) + FOOTER_INDENT + expected;
  if (currentIndent === FOOTER_INDENT && currentFullBlock === expectedFullBlock) continue;

  if (CHECK) {
    mismatches.push(target.file);
    continue;
  }
  const next = src.slice(0, spliceStart) + expectedFullBlock + src.slice(found.end);
  writeFileSync(path, next);
  fixedCount++;
}

if (CHECK) {
  if (mismatches.length) {
    console.log(`✗ ${mismatches.length} דפים לא תואמים לפוטר של ${SOURCE_FILE}:`);
    for (const f of mismatches) console.log(`    ${f}`);
    console.log('  להרצה: node scripts/check-footer-sync.mjs');
    process.exit(1);
  }
  console.log(`✓ הפוטר זהה למקור ב-${TARGETS.length + 1} דפים`);
  process.exit(0);
} else {
  console.log(`✓ סונכרן: ${fixedCount} דפים עודכנו, ${TARGETS.length + 1 - fixedCount} כבר היו תואמים`);
  process.exit(0);
}
