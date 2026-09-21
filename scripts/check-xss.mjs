/**
 * הזרקת HTML — כל ערך שמגיע ממשתמש ונכנס ל-`innerHTML` חייב לעבור בריחה.
 *
 * ## למה זה נוסף (21.9)
 * באתר יש 218 שימושים ב-`innerHTML`, רובם עם template literal שמזריק
 * נתונים. ביקורת אבטחה עברה עליהם ומצאה אותם נקיים — **אבל ביקורת
 * חד-פעמית אינה מונעת את הבא.** מספיק `innerHTML` אחד שמזריק שם
 * שמישהו בחר לעצמו, וכל מי שרואה את המודעה מריץ את הקוד שלו.
 *
 * ⚠️ **וזה לא תיאורטי כאן:** הלוח `allow read: if true`, כלומר תוכן
 * שמשתמש כתב מוצג לכל גולש — גם אנונימי. ה-CSP שנוסף ב-21.9 **אינו
 * מגן על זה**: הוא חייב `'unsafe-inline'` בגלל הסקריפטים המוטבעים,
 * ולכן JS מוטבע שהוזרק ירוץ. הבריחה היא ההגנה היחידה.
 *
 * ## מה נחשב הפרה
 * `innerHTML = ` (או `+=`) עם `${...}` שאינו עטוף באחת מפונקציות
 * הבריחה של הפרויקט. **מותר** כשהערך הוא מספר, קבוע, או תוצאה של
 * פונקציה שידוע שהיא מייצרת HTML בטוח.
 *
 * ## ⚠️ מה הבדיקה הזו לא עושה
 * היא סטטית ואינה עוקבת אחרי זרימת נתונים. ערך שעבר דרך משתנה ביניים
 * ייראה לה "בטוח" גם אם מקורו במשתמש. היא **רצפה, לא תקרה** — היא
 * תופסת את הדפוס הנפוץ (הזרקה ישירה), ואינה מחליפה קריאה.
 */
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(import.meta.dirname, '..');

/** פונקציות הבריחה של הפרויקט — כל אחת מהן הופכת ביטוי לבטוח. */
const SAFE = ['escHtml', 'esc(', 'encodeURIComponent', 'formatPrice'];

/**
 * ⚠️ **קריאה לפונקציית בריחה שאינה מוגדרת גרועה מאי-בריחה בכלל.**
 *
 * זה לא חשש: ב-21.9 עטפתי שלוש הזרקות ב-`escHtml`, והבדיקה הזו עברה
 * בירוק — כי היא חיפשה את **השם** ולא שאלה אם יש לו הגדרה. באחד
 * משלושת הקבצים לא הייתה, ו-`renderListingChat` היה נופל
 * ב-`ReferenceError` שמשאיר את כל הצ'אט ריק. כלומר הבדיקה **אישרה**
 * את הבאג שהיא נועדה למנוע.
 *
 * `esc` ו-`escHtml` מוגדרות מקומית בכל דף (אין מודול בריחה משותף),
 * ולכן ההגדרה נבדקת בקובץ עצמו. `encodeURIComponent` הוא מובנה.
 */
const LOCAL_HELPERS = ['escHtml', 'esc'];
const BUILTINS = new Set(['encodeURIComponent', 'formatPrice']);

/**
 * ⚠️ **הבדיקה מכוונת לווקטור אחד, בכוונה: תוכן שמשתמש אחר כתב.**
 *
 * הגרסה הראשונה סימנה כל הזרקה ל-`innerHTML` שאינה עטופה — 35 ממצאים,
 * ורובם המכריע קבועים של הפרויקט (`FULL_NAME_ERROR`, `MAX_SCAN_PHOTOS`),
 * מספרים, ומחרוזות ש**הקוד עצמו בנה** (`friendlyAIError`, `whatsappBtn`).
 * בדיקה שרובה רעש נזרקת אחרי הפעם השנייה, וזה גרוע מאין בדיקה.
 *
 * מה שבאמת מסוכן הוא שדה שמשתמש **אחר** מילא ומוצג למישהו: שם מפרסם,
 * כותרת מודעה, תיאור, הודעת צ'אט, טלפון. הרשימה הזו נגזרת מהשדות
 * האלה בשמם, ולכן יש לה מעט מאוד אזעקות שווא — והיא תופסת בדיוק את
 * המקרה שבו ה-CSP **אינו** מגן (הוא חייב `unsafe-inline`).
 *
 * ⚠️ מה שהיא לא עושה: אינה עוקבת אחרי זרימת נתונים. ערך שעבר דרך
 * משתנה ביניים בשם אחר ייראה לה בטוח. **רצפה, לא תקרה.**
 */
const USER_FIELDS = [
  'title', 'description', 'name', 'fullName', 'userName', 'phone', 'userPhone',
  'text', 'label', 'address', 'fromAddress', 'toAddress', 'notes', 'reason',
  'city', 'senderName', 'displayName', 'code',
];
const USER_FIELD_RE = new RegExp(`\\.(${USER_FIELDS.join('|')})\\b`);

const findings = [];
const undefinedHelpers = [];

function scan(rel) {
  const src = readFileSync(join(ROOT, rel), 'utf8');
  const lines = src.split('\n');

  // עוטפת שנקראת בקובץ אך אינה מוגדרת בו — ראו ההערה על LOCAL_HELPERS.
  for (const name of LOCAL_HELPERS) {
    const used = new RegExp(`\\b${name}\\(`).test(src);
    const defined = new RegExp(`(const|let|var|function)\\s+${name}\\b`).test(src);
    if (used && !defined) undefinedHelpers.push({ file: rel, name });
  }

  lines.forEach((line, i) => {
    if (!/innerHTML\s*\+?=/.test(line)) return;
    // ⚠️ רק השורה עצמה: template literal רב-שורתי נסרק שורה-שורה,
    // וזה מכוון — כל שורה שמזריקה ערך נבדקת בזכות עצמה.
    for (const m of line.matchAll(/\$\{([^}]*)\}/g)) {
      const expr = m[1];
      if (SAFE.some(f => expr.includes(f))) continue;
      // רק ביטוי שקורא שדה תוכן-משתמש. ראו ההערה על USER_FIELDS.
      if (!USER_FIELD_RE.test(expr)) continue;
      findings.push({ file: rel, line: i + 1, expr: expr.trim().slice(0, 60) });
    }
  });
}

for (const f of readdirSync(join(ROOT, 'app')).filter(f => /\.(html|js)$/.test(f))) scan(`app/${f}`);
for (const f of readdirSync(ROOT).filter(f => f.endsWith('.html') && !f.startsWith('preview-'))) scan(f);

if (undefinedHelpers.length) {
  console.error(`\n  ✗ ${undefinedHelpers.length} קריאות לפונקציית בריחה שאינה מוגדרת בקובץ:`);
  for (const u of undefinedHelpers) console.error(`      ${u.file} — \`${u.name}\``);
  console.error('\n  ⚠️ זה נופל ב-ReferenceError ומשאיר את הרכיב ריק לגמרי.');
  console.error('  להגדיר את העוטפת בקובץ, לא רק לקרוא לה.\n');
  process.exit(1);
}

if (findings.length) {
  console.error(`\n  ✗ ${findings.length} הזרקות ל-innerHTML בלי בריחה:`);
  let last = '';
  for (const f of findings.slice(0, 30)) {
    if (f.file !== last) { console.error(`\n  ${f.file}`); last = f.file; }
    console.error(`      ${String(f.line).padStart(5)}  \${${f.expr}}`);
  }
  console.error('\n  ⚠️ ה-CSP אינו מגן כאן — הוא חייב `unsafe-inline`.');
  console.error('  הבריחה היא ההגנה היחידה. לעטוף ב-`escHtml`/`esc`.\n');
  process.exit(1);
}
console.log('  ✓ אין הזרקה ל-innerHTML בלי בריחה.');
