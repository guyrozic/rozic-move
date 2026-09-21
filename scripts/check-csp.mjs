/**
 * מדיניות אבטחת התוכן — אחידה בכל הדפים, ומכסה כל מארח חיצוני שבקוד.
 *
 * ## למה זה נוסף (21.9)
 * ה-CSP מוזרק כ-`<meta>` ב-26 קבצי HTML נפרדים. שתי דרכים שקטות לשבור
 * אותו, ושתיהן מסתיימות באותו מקום — **אתר שבור בייצור, או הגנה שקיימת
 * רק בחלק מהדפים**:
 *
 * 1. **דף חדש בלי המדיניות.** הוא פשוט לא מוגן, ואין שום סימן לכך.
 * 2. **מארח חיצוני חדש** (SDK, CDN, ספק תשלום) שנוסף לקוד ולא נוסף
 *    למדיניות. הוא ייחסם — ובניגוד לשגיאת JS רגילה, חסימת CSP מופיעה
 *    רק בקונסול של המשתמש, לא בשום לוג שלנו.
 *
 * ⚠️ **הבדיקה הזו סטטית בכוונה.** האכיפה עצמה נבדקת בדפדפן
 * (`csptest`/`cspreal` ב-scratchpad, כולל אימות שסקריפט ממארח זר
 * באמת נחסם) — כאן נבדקת רק **עקביות**, כדי שתרוץ לפני כל קומיט בלי
 * דפדפן ובלי רשת.
 */
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(import.meta.dirname, '..');
const pages = [
  ...readdirSync(ROOT).filter(f => f.endsWith('.html') && !f.startsWith('preview-')),
  ...readdirSync(join(ROOT, 'app')).filter(f => f.endsWith('.html')).map(f => `app/${f}`),
];

const findings = [];
const CSP_RE = /<meta http-equiv="Content-Security-Policy" content="([^"]+)">/;

// ── 1. כל דף נושא מדיניות, וכולן זהות ────────────────────────────────
let reference = null;
for (const page of pages) {
  const src = readFileSync(join(ROOT, page), 'utf8');
  const m = src.match(CSP_RE);
  if (!m) { findings.push(`${page}: אין מדיניות CSP.`); continue; }
  if (reference === null) reference = { page, csp: m[1] };
  else if (m[1] !== reference.csp) {
    findings.push(`${page}: המדיניות שונה מזו שב-${reference.page} — שני דפים, שתי רמות הגנה.`);
  }
}

// ── 2. כל מארח חיצוני שבקוד מופיע במדיניות ───────────────────────────
/**
 * ⚠️ נגזר מהמקור ולא מרשימה קשיחה: רשימה שנכתבת ביד מתיישנת בדיוק
 * כמו המדיניות שהיא אמורה לשמור עליה.
 *
 * מדלגים על מארחים שאינם נטענים לתוך הדף אלא **מנווטים אליהם** —
 * חנויות האפליקציות, WhatsApp, יומן Google, OpenStreetMap כקישור.
 * ניווט אינו כפוף ל-CSP, ורשימה שתכלול אותם תדרוש להרחיב את המדיניות
 * בלי סיבה.
 */
const NAVIGATION_ONLY = new Set([
  'play.google.com', 'apps.apple.com', 'wa.me', 'calendar.google.com',
  'www.openstreetmap.org', 'schema.org', 'rozicmove.com', 'www.w3.org',
  'developer.mozilla.org', 'evil.example',
]);

if (reference) {
  const hosts = new Set();
  for (const page of pages) {
    const src = readFileSync(join(ROOT, page), 'utf8');
    for (const m of src.matchAll(/https:\/\/([a-z0-9.-]+)/gi)) hosts.add(m[1].toLowerCase());
  }
  for (const f of readdirSync(join(ROOT, 'app')).filter(f => f.endsWith('.js'))) {
    const src = readFileSync(join(ROOT, 'app', f), 'utf8');
    for (const m of src.matchAll(/https:\/\/([a-z0-9.-]+)/gi)) hosts.add(m[1].toLowerCase());
  }
  for (const host of [...hosts].sort()) {
    if (NAVIGATION_ONLY.has(host)) continue;
    // ⚠️ התאמה גם מול תווים כלליים: `https://*.googleapis.com` מכסה
    // `firestore.googleapis.com`, וללא זה כל מארח של Firebase היה
    // מדווח כחסר.
    const covered = reference.csp.split(/\s+/).some(tok => {
      const v = tok.replace(/;$/, '');
      if (v === `https://${host}`) return true;
      if (v.startsWith('https://*.')) {
        const suffix = v.slice('https://*.'.length);
        return host === suffix || host.endsWith(`.${suffix}`);
      }
      return false;
    });
    if (!covered) findings.push(`מארח חיצוני שאינו במדיניות: ${host}`);
  }
}

if (findings.length) {
  console.error(`\n  ✗ ${findings.length} ממצאי CSP:`);
  for (const f of findings) console.error(`      ${f}`);
  console.error('\n  ⚠️ חסימת CSP מופיעה רק בקונסול של המשתמש — לא בשום לוג שלנו.\n');
  process.exit(1);
}
console.log(`  ✓ מדיניות CSP אחידה ב-${pages.length} דפים, וכל מארח חיצוני מכוסה.`);
