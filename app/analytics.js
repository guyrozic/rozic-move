// מדידה (Firebase Analytics / GA4) — פרויקט hovalot-6cf65.
//
// ⚠️ **המודול ישן ללא `measurementId`.** כל עוד `MEASUREMENT_ID` ב-
// `firebase.js` ריק, `track()` לא עושה כלום: לא טוען את ה-SDK, לא יוצר
// עוגיות ולא שולח בקשה. הוספת המזהה היא מה שמדליק את המדידה.
//
// כללים (אין לעבור עליהם):
//  1. **בלי PII.** פרמטרים מותרים בלבד: order_type, value, currency,
//     transaction_id (מזהה הזמנה אטום), store, page. לא שם, לא טלפון,
//     לא מייל, לא כתובת, לא מזהה משתמש, ולא טקסט חופשי.
//  2. **שמות סטנדרטיים** כשיש כאלה (begin_checkout, purchase), ופרמטר
//     `order_type` = 'apartment' | 'small_move' — כמו באפליקציה.
//  3. כשל במדידה לעולם לא שובר את הזרימה. (זה לא ה-catch הבולע של
//     נתוני לקוח: המדידה היא לוג בלבד, ושגיאה מודפסת לקונסול.)
//  4. פרסום מותאם נחסם (`ad_*` denied) — המדידה היא לניתוח פאנל בלבד.

import { isMeasurementEnabled, clearMeasurementCookies, MEASUREMENT_EVENT, MEASUREMENT_KEY } from './measurement-state.js';

// ⚠️ הביטול (15.10) — "הגדרות מדידה" בפוטר. כשהמתג כבוי: לא טוענים את ה-SDK,
// לא שולחים אירועים, ואם הוא כבר נטען — עוצרים אותו ומוחקים את עוגיות _ga.
// הדגל נשמר ב-localStorage (ראו measurement-state.js) ולכן חל על כל דף וכל טעינה.

const ALLOWED = new Set(['order_type', 'value', 'currency', 'transaction_id', 'store', 'page', 'service']);

let ready = null;      // Promise<{ga, logEvent}|null>
const onceKeys = new Set();

function load() {
  // לא נשמר ב-`ready`: אם המשתמש מדליק מחדש באותו דף, הטעינה צריכה להתאפשר.
  if (!isMeasurementEnabled()) return Promise.resolve(null);
  if (ready) return ready;
  ready = (async () => {
    try {
      const fb = await import('./firebase.js');
      if (!fb.MEASUREMENT_ID) return null;
      const m = await import('https://www.gstatic.com/firebasejs/12.16.0/firebase-analytics.js');
      if (!(await m.isSupported())) return null;
      const ga = m.getAnalytics(fb.app);
      m.setConsent({ ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
      window['ga-disable-' + fb.MEASUREMENT_ID] = false;
      return { ga, logEvent: m.logEvent, setEnabled: m.setAnalyticsCollectionEnabled, id: fb.MEASUREMENT_ID };
    } catch (e) {
      console.warn('[analytics] init failed', e && e.message);
      return null;
    }
  })();
  return ready;
}

/** מחיל את מצב המתג על SDK שכבר נטען בדף הזה (אם לא נטען — אין מה לעצור). */
async function applyEnabledState() {
  if (!ready) return;
  try {
    const a = await ready;
    if (!a) return;
    const on = isMeasurementEnabled();
    window['ga-disable-' + a.id] = !on;
    a.setEnabled(a.ga, on);
    if (!on) clearMeasurementCookies();
  } catch (e) {
    console.warn('[analytics] apply state failed', e && e.message);
  }
}
if (typeof window !== 'undefined') {
  window.addEventListener(MEASUREMENT_EVENT, applyEnabledState);
  // לשונית אחרת שינתה את המתג.
  window.addEventListener('storage', (e) => { if (e.key === MEASUREMENT_KEY) applyEnabledState(); });
}

/** order_type קנוני, זהה לאפליקציה: 'apartment' | 'small_move'. */
export function orderTypeOf(serviceType) {
  return serviceType === 'smallMove' || serviceType === 'small_move' ? 'small_move' : 'apartment';
}

/** שולח אירוע. `once` = מפתח לדה-דופליקציה בטעינת הדף הנוכחית. */
export async function track(name, params = {}, once) {
  try {
    if (!isMeasurementEnabled()) return;
    if (once) { if (onceKeys.has(once)) return; onceKeys.add(once); }
    const clean = {};
    for (const [k, v] of Object.entries(params)) {
      if (!ALLOWED.has(k) || v === undefined || v === null) continue;
      clean[k] = v;
    }
    const a = await load();
    if (a && isMeasurementEnabled()) a.logEvent(a.ga, name, clean);
  } catch (e) {
    console.warn('[analytics] track failed', name, e && e.message);
  }
}

/** מחכה לשליחה לפני ניווט החוצה, אבל לא יותר מ-400ms. */
export function trackThenGo(name, params) {
  return Promise.race([track(name, params), new Promise(r => setTimeout(r, 400))]);
}

// ── לחיצה על כפתורי חנות האפליקציות (בכל דף שטוען את המודול) ──────────
if (typeof document !== 'undefined') {
  document.addEventListener('click', (ev) => {
    const a = ev.target && ev.target.closest && ev.target.closest('a[href]');
    if (!a) return;
    const href = a.getAttribute('href') || '';
    const store = href.includes('apps.apple.com') ? 'app_store'
      : href.includes('play.google.com') ? 'google_play' : null;
    if (store) track('app_download_click', { store, page: location.pathname });
  }, true);
}
