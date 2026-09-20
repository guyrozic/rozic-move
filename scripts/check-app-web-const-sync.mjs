#!/usr/bin/env node
/*
 * ============================================================================
 *  check-app-web-const-sync.mjs — סנכרון קבועים בין Hovalot (האפליקציה)
 *  לבין rozic-move (האתר)
 * ============================================================================
 *
 *  למה הבדיקה הזו קיימת
 *  ---------------------
 *  ב-17.9 נמצא שהאתר הרשה 10 תמונות / כותרת 100 תווים / תיאור 2000 תווים
 *  במרקטפלייס, בזמן שהאפליקציה מגבילה ל-4 / 40 / 600. הסיבה: מי שבנה את
 *  האתר יישר את התקרה מול `firestore.rules` (שמגן על גודל המסמך) במקום
 *  מול הקבוע האפליקטיבי שאמור לשמש מקור אמת יחיד לממשק. שני המאגרים
 *  מחזיקים כל אחד עותק משלו של אותם ולידציות/מגבלות/ספי-זמן, ועד עכשיו
 *  שום דבר לא נפל כשהם התפצלו — הפער נמצא רק כי מישהו בדק ידנית.
 *
 *  איך מריצים
 *  ----------
 *      node scripts/check-app-web-const-sync.mjs            # כל השורות
 *      node scripts/check-app-web-const-sync.mjs --verbose  # גם מה שעבר
 *
 *  יציאה 0 = כל הערכים שיש להם מקור אמת בשני הצדדים תואמים. יציאה 1 =
 *  נמצא פער, או שדפוס החיפוש של שורה מסוימת הפסיק להתאים לקוד (=הקוד
 *  המקורי זז — יש לעדכן את הדפוס כאן, לא להתעלם). אין רשת, אין עלות.
 *
 *  ⚠️ תלות בריפו שני: קורא קבצים מ-`~/Hovalot` (או `HOVALOT_ROOT` בסביבה).
 *  אם הריפו לא נמצא בנתיב הצפוי, הבדיקה **מדלגת על צד האפליקציה ומזהירה**
 *  (יציאה 0) במקום ליפול — זו תלות סביבתית של מכונת הפיתוח, לא של האתר
 *  עצמו. חוסר-התאמה בתוך דפוס שכן נמצא, לעומת זאת, **תמיד נכשל**.
 *
 *  מבנה הבדיקה — טבלת מיפוי מפורשת, לא ניחוש
 *  --------------------------------------------
 *  כל שורה ב-ENTRIES מצביעה במפורש על קובץ+דפוס בכל צד. אין כאן מנוע
 *  שמנחש איזה קבוע "כנראה" מקביל לאיזה — מי שמוסיף ולידציה/מגבלה חדשה
 *  ששני הצדדים חולקים, מוסיף שורה. זה עומד בכוונה מול הפיתוי לכתוב
 *  רגקס גנרי שסורק את כל שני הריפואים ומנחש זוגות — ניחוש כזה שביר
 *  בדיוק במקום שהוא הכי צריך להיות אמין.
 *
 *  `kind` מבחין בין שני סוגי ערכים, כי הם דורשים התייחסות שונה:
 *    'shared-constant' — לערך יש קבוע בשם מפורש בקוד האפליקציה
 *                         (למשל `MAX_SAVED_ADDRESSES`, `LISTING_TITLE_MAX`).
 *                         שינוי עתידי בקבוע הזה *אמור* להפיל את הבדיקה.
 *    'inline-literal'   — לערך אין קבוע בשם באפליקציה, רק מספר גולמי
 *                         בתוך JSX/קוד (למשל `maxLength={600}`). עדיין
 *                         אפשר להשוות מספרים, אבל אין "מקור אמת" מוצהר —
 *                         מי שמזיז את המספר באפליקציה לא בהכרח יודע
 *                         שהאתר מצטט אותו. ⚠️ ראו ההערה ההיסטורית למטה
 *                         על התקרית שהתגלתה כאן בפועל (הערת `LISTING_TITLE_MAX`
 *                         שהצביעה על קבוע שלא היה קיים).
 *
 *  ⚠️ מלכודת שכבר נמצאה ותוקנה: ההערה ב-`app/marketplace-create.html`
 *  טענה יישור ל-"LISTING_TITLE_MAX" באפליקציה בזמן שהקבוע הזה עדיין לא
 *  היה קיים שם (ה-40 היה נגזר-UX גרידא, בלי שום מקור בקוד להצביע עליו).
 *  זה תוקן משני הצדדים: Hovalot הוסיף קבוע בשם `LISTING_TITLE_MAX`
 *  (`src/screens/marketplace/CreateGiveawayScreen.tsx`), וההערה כאן
 *  ב-ENTRIES מסמנת אותו כ-`shared-constant` ולא כ-`inline-literal`.
 *  **תיאור המרקטפלייס (600) נשאר `inline-literal` בכוונה** — אין לו
 *  קבוע-שם באפליקציה, וזו בדיוק הדוגמה החיה להבחנה בין שני הסוגים.
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';

const WEB_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const HOVALOT_ROOT = process.env.HOVALOT_ROOT || resolve(homedir(), 'Hovalot');
const HOVALOT_AVAILABLE = existsSync(HOVALOT_ROOT);

const argv = process.argv.slice(2);
const verbose = argv.includes('--verbose');

/* ------------------------------------------------------------------ *
 * עזרים
 * ------------------------------------------------------------------ */

const fileCache = new Map();
function readSrc(root, relPath) {
  const key = root + '\0' + relPath;
  if (fileCache.has(key)) return fileCache.get(key);
  const full = resolve(root, relPath);
  const text = existsSync(full) ? readFileSync(full, 'utf8') : null;
  fileCache.set(key, text);
  return text;
}

/**
 * מחלץ ערך יחיד מקובץ מקור לפי דפוס. זורק שגיאה מפורשת (לא מחזיר null
 * בשקט) כשהדפוס לא נמצא — קוד שזז חייב להפיל את הבדיקה עם הודעה שאומרת
 * בדיוק מה לתקן, לא לגרום ל"ירוק" מזויף. ראו feedback: "בדיקה ירוקה יכולה
 * להיות שבורה".
 */
function extract(root, relPath, pattern, label) {
  const src = readSrc(root, relPath);
  if (src === null) throw new SkipError(`הקובץ לא נמצא: ${relPath}`);
  const m = src.match(pattern);
  if (!m) {
    throw new Error(
      `דפוס לא נמצא עבור "${label}" בקובץ ${relPath}. הקוד המקורי זז — ` +
      `יש לעדכן את הדפוס ב-check-app-web-const-sync.mjs, לא להתעלם מהכשל.`
    );
  }
  return m;
}

class SkipError extends Error {}

/* ------------------------------------------------------------------ *
 * טבלת המיפוי — הוספת שורה חדשה = הוספת ולידציה/מגבלה משותפת חדשה
 * ------------------------------------------------------------------ */

const ENTRIES = [
  /* ⚠️ 20.9 — שני קבועים **כספיים** שהיו מסונכרנים ביד בלי שום בדיקה,
     ושתי ההערות בקוד האתר הצהירו על כך במפורש: `orders.js:324` כותב
     "check-app-web-const-sync אינו מכיר אותו היום", ו-`guest-checkout.js:429`
     כותב "שינוי כאן בלי שינוי שם — פיצול שקט בין שני המשטחים".

     ⚠️ **הכותרת של הקובץ הזה אומרת שהוא לא בודק תמחור/ביטולים**, וזה
     נכון: את מדרג הביטולים עצמו בודקת `check-web-pricing-sync` בריפו
     האפליקציה. אבל שני אלה נפלו **בין שתי הבדיקות** — הם לא בטבלת
     התמחור ולא כאן — וזו בדיוק התבנית שיצרה את שישה הפערים הכספיים
     שנמצאו ב-15.9. שניהם משנים סכום שהלקוח משלם. */
  {
    name: 'ביטול בזמן שהמוביל בדרך — שיעור החיוב',
    kind: 'inline-literal',
    app: () => Number(extract(HOVALOT_ROOT, 'src/services/cancellation.ts',
      /EN_ROUTE_CANCELLATION_RATE\s*=\s*([\d.]+)/, 'EN_ROUTE_CANCELLATION_RATE')[1]),
    web: () => Number(extract(WEB_ROOT, 'app/orders.js',
      /EN_ROUTE_CANCELLATION_RATE\s*=\s*([\d.]+)/, 'EN_ROUTE_CANCELLATION_RATE')[1]),
  },
  {
    name: 'מחיר מינימלי אחרי קופון',
    kind: 'inline-literal',
    app: () => Number(extract(HOVALOT_ROOT, 'src/services/coupons.ts',
      /MIN_ORDER_PRICE_AFTER_COUPON\s*=\s*(\d+)/, 'MIN_ORDER_PRICE_AFTER_COUPON')[1]),
    web: () => Number(extract(WEB_ROOT, 'app/guest-checkout.js',
      /MIN_ORDER_PRICE_AFTER_COUPON\s*=\s*(\d+)/, 'MIN_ORDER_PRICE_AFTER_COUPON')[1]),
  },
  {
    name: 'סיסמה — אורך מינימלי בהרשמה',
    kind: 'inline-literal',
    app: () => Number(extract(HOVALOT_ROOT, 'src/screens/auth/RegisterScreen.tsx',
      /password\.length < (\d+)/, 'password min length')[1]),
    web: () => Number(extract(WEB_ROOT, 'app/login.html',
      /id="reg-password"[\s\S]{0,60}minlength="(\d+)"/, 'reg-password minlength')[1]),
  },
  {
    name: 'סיסמה — חובה אות אנגלית + ספרה (לא רק אורך)',
    kind: 'inline-literal',
    app: () => extract(HOVALOT_ROOT, 'src/screens/auth/RegisterScreen.tsx',
      /!\/\[a-zA-Z\]\/\.test\(password\) \|\| !\/\[0-9\]\/\.test\(password\)/, 'password letter+digit check')[0],
    web: () => extract(WEB_ROOT, 'app/login.html',
      /!\/\[a-zA-Z\]\/\.test\(pw\) \|\| !\/\[0-9\]\/\.test\(pw\)/, 'password letter+digit check')[0]
      .replace(/\bpw\b/g, 'password'),
  },
  {
    name: 'שם מלא — מספר מילים מינימלי (שם פרטי + משפחה)',
    kind: 'shared-constant',
    note: 'המקור: src/utils/validation.ts (isValidFullName). האתר מחזיק עותק יד באותו שם ב-app/auth.js.',
    app: () => Number(extract(HOVALOT_ROOT, 'src/utils/validation.ts',
      /split\(' '\)\.filter\(Boolean\)\.length >= (\d+)/, 'isValidFullName word count')[1]),
    web: () => Number(extract(WEB_ROOT, 'app/auth.js',
      /split\(' '\)\.filter\(Boolean\)\.length >= (\d+)/, 'isValidFullName word count (web copy)')[1]),
  },
  {
    name: 'טלפון — אורך נדרש כשמוזן (ספרות)',
    kind: 'inline-literal',
    note: 'טלפון עצמו אופציונלי בשני הצדדים באפליקציה — ראו הדוח על "טלפון חובה באתר" בנפרד; זו רק בדיקת האורך כשיש ערך.',
    app: () => Number(extract(HOVALOT_ROOT, 'src/screens/auth/RegisterScreen.tsx',
      /phoneDigits\.length > 0 && phoneDigits\.length !== (\d+)/, 'phone digit length')[1]),
    web: () => {
      const m = extract(WEB_ROOT, 'app/login.html', /\/\^05\\d\{(\d+)\}\$\//, 'reg-phone regex /^05\\d{n}$/');
      return Number(m[1]) + 2; // "05" + N ספרות = סה"כ
    },
  },
  {
    name: 'אימייל — דפוס בדיקה (regex)',
    kind: 'inline-literal',
    app: () => extract(HOVALOT_ROOT, 'src/screens/auth/RegisterScreen.tsx',
      /\/\^\[\^\\s@\]\+@\[\^\\s@\]\+\\\.\[\^\\s@\]\+\$\//, 'email regex')[0],
    web: () => extract(WEB_ROOT, 'app/login.html',
      /\/\^\[\^\\s@\]\+@\[\^\\s@\]\+\\\.\[\^\\s@\]\+\$\//, 'email regex')[0],
  },
  {
    name: 'כתובות שמורות — תקרה למשתמש',
    kind: 'shared-constant',
    app: () => Number(extract(HOVALOT_ROOT, 'src/context/AuthContext.tsx',
      /export const MAX_SAVED_ADDRESSES = (\d+)/, 'MAX_SAVED_ADDRESSES')[1]),
    web: () => Number(extract(WEB_ROOT, 'app/account.js',
      /export const MAX_SAVED_ADDRESSES = (\d+)/, 'MAX_SAVED_ADDRESSES (web copy)')[1]),
  },
  {
    name: 'חלונות זמן להזמנה — apartment.html',
    kind: 'shared-constant',
    note: 'TIME_SLOTS משוכפל כ-literal בשני דפי האשף (apartment/small-move) — הערת תחזוקה קיימת, לא באג. הבדיקה שומרת ששלושתם לא יתפצלו.',
    app: () => extractTimeSlots(readSrc(HOVALOT_ROOT, 'src/data/timeSlots.ts'), 'timeSlots.ts'),
    web: () => extractTimeSlots(readSrc(WEB_ROOT, 'app/apartment.html'), 'apartment.html'),
  },
  {
    name: 'חלונות זמן להזמנה — small-move.html',
    kind: 'shared-constant',
    app: () => extractTimeSlots(readSrc(HOVALOT_ROOT, 'src/data/timeSlots.ts'), 'timeSlots.ts'),
    web: () => extractTimeSlots(readSrc(WEB_ROOT, 'app/small-move.html'), 'small-move.html'),
  },
  {
    name: 'מובילים בקטנה — נפח מקסימלי לרכב (MAX_VOLUME)',
    kind: 'shared-constant',
    note: 'לא מחיר — יחידת קיבולת. app/data/smallMoveItems.js מקומפל מהאפליקציה; זו בדיקת רגרסיה שהעותק לא נסחף, לא בדיקת תמחור.',
    app: () => Number(extract(HOVALOT_ROOT, 'src/data/smallMoveItems.ts',
      /export const MAX_VOLUME = (\d+)/, 'MAX_VOLUME')[1]),
    web: () => Number(extract(WEB_ROOT, 'app/data/smallMoveItems.js',
      /export const MAX_VOLUME = (\d+)/, 'MAX_VOLUME (web copy)')[1]),
  },
  {
    name: 'מרקטפלייס — כמות תמונות מקסימלית',
    kind: 'shared-constant',
    app: () => Number(extract(HOVALOT_ROOT, 'src/screens/marketplace/CreateGiveawayScreen.tsx',
      /selectionLimit:\s*(\d+)/, 'selectionLimit')[1]),
    web: () => Number(extract(WEB_ROOT, 'app/marketplace-create.html',
      /const MAX_PHOTOS = (\d+)/, 'MAX_PHOTOS')[1]),
  },
  {
    name: 'מרקטפלייס — אורך כותרת מקסימלי',
    kind: 'shared-constant',
    note: 'LISTING_TITLE_MAX — מקור: numberOfLines={2} בכרטיס הלוח, לא שרירותי. ראו ההערה בראש הקובץ על התקרית עם ההערה המטעה.',
    app: () => Number(extract(HOVALOT_ROOT, 'src/screens/marketplace/CreateGiveawayScreen.tsx',
      /const LISTING_TITLE_MAX = (\d+)/, 'LISTING_TITLE_MAX')[1]),
    web: () => Number(extract(WEB_ROOT, 'app/marketplace-create.html',
      /id="title"[\s\S]{0,60}maxlength="(\d+)"/, 'title maxlength')[1]),
  },
  {
    name: 'מרקטפלייס — אורך תיאור מקסימלי',
    kind: 'inline-literal',
    note: 'אין קבוע בשם באפליקציה עבור הערך הזה — מספר גולמי ב-JSX. הבדיקה עדיין שומרת על התאמה מספרית, אבל אין "מקור אמת" מוצהר לצטט אליו.',
    app: () => Number(extract(HOVALOT_ROOT, 'src/screens/marketplace/CreateGiveawayScreen.tsx',
      /value=\{description\}[\s\S]{0,120}?maxLength=\{(\d+)\}/, 'description maxLength')[1]),
    web: () => Number(extract(WEB_ROOT, 'app/marketplace-create.html',
      /id="description"[\s\S]{0,60}maxlength="(\d+)"/, 'description maxlength')[1]),
  },
  {
    name: 'צ׳אט תמיכה — אורך הודעה מקסימלי',
    kind: 'inline-literal',
    app: () => Number(extract(HOVALOT_ROOT, 'src/screens/shared/SupportChatScreen.tsx',
      /maxLength=\{(\d+)\}/, 'maxLength')[1]),
    web: () => Number(extract(WEB_ROOT, 'app/support-chat.html',
      /id="chat-text"[\s\S]{0,40}maxlength="(\d+)"/, 'chat-text maxlength')[1]),
  },
  {
    name: 'צ׳אט הזמנה (לקוח/מוביל) — אורך הודעה מקסימלי',
    kind: 'inline-literal',
    app: () => Number(extract(HOVALOT_ROOT, 'src/screens/shared/ChatScreen.tsx',
      /maxLength=\{(\d+)\}/, 'maxLength')[1]),
    web: () => Number(extract(WEB_ROOT, 'app/order-chat.html',
      /id="chat-text"[\s\S]{0,40}maxlength="(\d+)"/, 'chat-text maxlength')[1]),
  },
  {
    name: 'דיווח על מוביל — אורך פרטים חופשיים מקסימלי',
    kind: 'shared-constant',
    note: 'ReportModal.tsx משותף לכל סוגי הדיווח באפליקציה (מוביל/לקוח/מודעה/משתמש). נמצא פער אמיתי כאן (2000 מול 1000) ותוקן.',
    app: () => Number(extract(HOVALOT_ROOT, 'src/components/ReportModal.tsx',
      /maxLength=\{(\d+)\}/, 'maxLength')[1]),
    web: () => Number(extract(WEB_ROOT, 'app/order-status.html',
      /id="report-details"[\s\S]{0,20}maxlength="(\d+)"/, 'report-details maxlength')[1]),
  },
  {
    name: 'פנייה בנושא נגישות — שדה "מסמך אחר" (אורך)',
    kind: 'inline-literal',
    app: () => Number(extract(HOVALOT_ROOT, 'src/screens/shared/AccessibilityRequestScreen.tsx',
      /maxLength=\{160\}/, 'docOther maxLength')[0].match(/\d+/)[0]),
    web: () => Number(extract(WEB_ROOT, 'accessibility.html',
      /id="a11y-doc-other"[\s\S]{0,20}maxlength="(\d+)"/, 'a11y-doc-other maxlength')[1]),
  },
  {
    name: 'פנייה בנושא נגישות — פרטי יצירת קשר (אורך)',
    kind: 'inline-literal',
    app: () => Number(extract(HOVALOT_ROOT, 'src/screens/shared/AccessibilityRequestScreen.tsx',
      /maxLength=\{200\}/, 'contactDetail maxLength')[0].match(/\d+/)[0]),
    web: () => Number(extract(WEB_ROOT, 'accessibility.html',
      /id="a11y-contact-detail"[\s\S]{0,50}maxlength="(\d+)"/, 'a11y-contact-detail maxlength')[1]),
  },
  {
    name: 'פנייה בנושא נגישות — שם איש קשר (אורך)',
    kind: 'inline-literal',
    app: () => Number(extract(HOVALOT_ROOT, 'src/screens/shared/AccessibilityRequestScreen.tsx',
      /maxLength=\{80\}/, 'contactName maxLength')[0].match(/\d+/)[0]),
    web: () => Number(extract(WEB_ROOT, 'accessibility.html',
      /id="a11y-contact-name"[\s\S]{0,20}maxlength="(\d+)"/, 'a11y-contact-name maxlength')[1]),
  },
  {
    name: 'פנייה בנושא נגישות — הערות חופשיות (אורך)',
    kind: 'inline-literal',
    app: () => Number(extract(HOVALOT_ROOT, 'src/screens/shared/AccessibilityRequestScreen.tsx',
      /maxLength=\{1500\}/, 'notes maxLength')[0].match(/\d+/)[0]),
    web: () => Number(extract(WEB_ROOT, 'accessibility.html',
      /id="a11y-notes"[\s\S]{0,20}maxlength="(\d+)"/, 'a11y-notes maxlength')[1]),
  },
  {
    name: 'איפוס סיסמה — צינון בין שליחות (שניות)',
    kind: 'inline-literal',
    app: () => {
      const m = extract(HOVALOT_ROOT, 'src/screens/auth/LoginScreen.tsx',
        /useSendCooldown\('email', email, \{ cooldownSeconds: (\d+)/, 'useSendCooldown cooldownSeconds');
      return Number(m[1]);
    },
    web: () => Number(extract(WEB_ROOT, 'app/auth.js',
      /const RESET_COOLDOWN_MS = ([\d_]+)/, 'RESET_COOLDOWN_MS')[1].replace(/_/g, '') / 1000),
  },
  {
    name: 'איפוס סיסמה — מקסימום ניסיונות לאותה כתובת',
    kind: 'inline-literal',
    app: () => Number(extract(HOVALOT_ROOT, 'src/screens/auth/LoginScreen.tsx',
      /useSendCooldown\('email', email, \{ cooldownSeconds: \d+, maxPerTarget: (\d+)/, 'useSendCooldown maxPerTarget')[1]),
    web: () => Number(extract(WEB_ROOT, 'app/auth.js',
      /const RESET_MAX_PER_TARGET = (\d+)/, 'RESET_MAX_PER_TARGET')[1]),
  },
];

function extractTimeSlots(src, label) {
  if (src === null) throw new SkipError(`הקובץ לא נמצא: ${label}`);
  const m = src.match(/TIME_SLOTS(?::\s*string\[\])?\s*=\s*\[([\s\S]*?)\]/);
  if (!m) throw new Error(`דפוס TIME_SLOTS לא נמצא ב-${label} — הקוד זז, יש לעדכן את הדפוס.`);
  const slots = [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
  if (!slots.length) throw new Error(`TIME_SLOTS נמצא ב-${label} אבל לא חולצו ממנו חלונות זמן.`);
  return slots.join(',');
}

/* ------------------------------------------------------------------ *
 * הרצה
 * ------------------------------------------------------------------ */

let pass = 0, fail = 0, skip = 0;
const failures = [];

for (const entry of ENTRIES) {
  let appVal, webVal;
  try {
    appVal = entry.app();
  } catch (e) {
    if (e instanceof SkipError) {
      skip++;
      if (verbose) console.log(`  ⊘ ${entry.name} — דולג (${e.message})`);
      continue;
    }
    fail++;
    failures.push({ name: entry.name, msg: `[צד אפליקציה] ${e.message}` });
    continue;
  }
  try {
    webVal = entry.web();
  } catch (e) {
    fail++;
    failures.push({ name: entry.name, msg: `[צד אתר] ${e.message}` });
    continue;
  }

  if (String(appVal) === String(webVal)) {
    pass++;
    if (verbose) console.log(`  ✓ ${entry.name} — ${JSON.stringify(appVal)}`);
  } else {
    fail++;
    failures.push({
      name: entry.name,
      msg: `אפליקציה=${JSON.stringify(appVal)}  אתר=${JSON.stringify(webVal)}  (kind: ${entry.kind})`,
    });
  }
}

if (!HOVALOT_AVAILABLE) {
  console.log(`  ⚠ ~/Hovalot (או HOVALOT_ROOT) לא נמצא — כל הבדיקות מול האפליקציה דולגו.`);
}

if (failures.length) {
  console.log(`\n  ✗ ${failures.length} פערים מתוך ${ENTRIES.length}:\n`);
  for (const f of failures) console.log(`    • ${f.name}\n      ${f.msg}`);
  console.log(`\n  (${pass} תואמים, ${skip} דולגו)`);
  process.exit(1);
}

console.log(`  ✓ קבועים משותפים מסונכרנים — ${pass} נבדקו${skip ? `, ${skip} דולגו` : ''} מתוך ${ENTRIES.length}`);
process.exit(0);
