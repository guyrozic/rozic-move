/**
 * מצב המדידה (Google Analytics) של הדפדפן הזה — מקור אמת יחיד.
 *
 * ## למה הקובץ הזה קיים ובלי תלויות
 * מדיניות הפרטיות מבטיחה: "אפשר לבטל את המדידה דרך 'הגדרות מדידה'
 * בתחתית האתר". ההבטחה נכונה רק אם **אותו מתג** נקרא גם ב-`analytics.js`
 * (שטוען את ה-SDK) וגם בממשק ההגדרות (`measurement.js`). לכן המצב יושב
 * כאן, בקובץ בלי אף `import`, ושניהם קוראים ממנו.
 *
 * ## המודל (חוות הדעת המשפטית לישראל: הודעה, לא הסכמה)
 * ברירת המחדל = מדידה **פועלת**. רק `'off'` שנשמר במפורש מכבה אותה.
 * המתג הוא העדפה של המכשיר ולא של משתמש, ולכן המפתח גלובלי בכוונה
 * (אין כאן נתוני לקוח שיכולים לדלוף בין משתמשים).
 *
 * ⚠️ אם `localStorage` חסום (מצב פרטי מסוים), ההעדפה נשמרת בזיכרון הדף
 * בלבד — ביטול עדיין עובד בדף הנוכחי, ולא מושלך בשקט.
 */
export const MEASUREMENT_KEY = 'rozic:measurement';
export const NOTICE_SEEN_KEY = 'rozic:measurement-notice';
export const MEASUREMENT_EVENT = 'rozic:measurement-change';

let memoryOff = false;

export function isMeasurementEnabled() {
  if (memoryOff) return false;
  try { return localStorage.getItem(MEASUREMENT_KEY) !== 'off'; }
  catch (_) { return true; }
}

/** מוחק את עוגיות המדידה (_ga, _ga_<ID>, _gid, _gat) מהדומיין ומדומייני-האב. */
export function clearMeasurementCookies() {
  try {
    const names = document.cookie.split(';')
      .map((c) => c.split('=')[0].trim())
      .filter((n) => /^(_ga|_gid|_gat)/.test(n));
    if (!names.length) return;
    const parts = location.hostname.split('.');
    const domains = [''];
    for (let i = 0; i < parts.length - 1; i++) domains.push(';domain=' + parts.slice(i).join('.'), ';domain=.' + parts.slice(i).join('.'));
    for (const n of names) {
      for (const d of domains) document.cookie = `${n}=;path=/;max-age=0;expires=Thu, 01 Jan 1970 00:00:00 GMT${d}`;
    }
  } catch (_) { /* מחיקת עוגיות היא best-effort; הטעינה כבר נעצרה */ }
}

export function setMeasurementEnabled(on) {
  memoryOff = !on;
  try {
    if (on) localStorage.removeItem(MEASUREMENT_KEY);
    else localStorage.setItem(MEASUREMENT_KEY, 'off');
  } catch (_) { /* נשאר ב-memoryOff */ }
  if (!on) clearMeasurementCookies();
  window.dispatchEvent(new CustomEvent(MEASUREMENT_EVENT, { detail: { enabled: on } }));
}
