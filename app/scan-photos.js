/**
 * הצגת תמונות הסריקה למובילים — צד האתר (הכרעה 8.7 ב, 25.11.2026; 26.11: לפי התקנון בלבד, בלי מתג ובלי שלב).
 * **תאום ל-`src/services/orderScanPhotos.ts` + `ScanShareConsentBox` +
 * `useScanPhotosShare` באפליקציה (ענף w2-photos).** נוסח ההסכמה הוא סעיף 2ד
 * ב-`legal-drafts.md`, מילה במילה, וגרסתו חייבת להיות ב-`KNOWN_CONSENT_VERSIONS`
 * בשרת (`publishOrderScanPhotos` דוחה גרסה לא מוכרת: 400 `consent_required`).
 *
 * ## ⚠️ האתר הוא ממשק לקוח בלבד
 * אין באתר לוח מובילים, ולכן אין כאן "הצגה למוביל". כל מה שכאן הוא צד הלקוח:
 * פרסום ברקע בלבד.
 *
 * ## ⚠️ דגל `config/scanPhotos.enabled` (fail-closed) ואחריו בדיקת קיום
 * הדגל חייב להיות דלוק מפורשות. אחריו, כל עוד הפונקציות עוד לא פרוסות (עד פריסת w2-photos) — הכל מאחורי בדיקת קיום
 * `isScanShareAvailable()` שולחת בקשה מקדימה אחת. פונקציה שאינה קיימת עונה 404
 * בלי כותרות CORS, והדפדפן מדווח את זה כ-`TypeError`; פונקציה קיימת עונה
 * (400/401) **עם** כותרות CORS. כל כשל = לא זמין = הפרסום **אינו מתבצע**. האתר אינו נשבר בשום מצב.
 *
 * ## ⚠️ שיתוף תמונות הוא תוספת ולעולם לא חוסם
 * כשל בפרסום = ההזמנה ממשיכה לתשלום בלי תמונות. **לא מתנים שירות בהסכמה.**
 * אין מתג ואין שלב: ההצגה לפי התקנון והפרטיות (גרסה 2026-11-3). הסרה: דרך התמיכה או מהאדמין.
 */
import { auth } from './firebase.js';

const BASE = 'https://us-central1-hovalot-6cf65.cloudfunctions.net';
const PUBLISH_URL = `${BASE}/publishOrderScanPhotos`;

export const SCAN_CONSENT_VERSION = '2026-11-26t';
export const SCAN_CONSENT_TITLE = 'הצגת תמונות הסריקה למובילים';
export const SCAN_CONSENT_BODY =
  'התמונות שצילמתם יוצגו מטושטשות למובילים שרואים את ההזמנה בלוח, כדי שידעו מה מחכה להם. אפשר לכבות — אז הן משמשות רק לזיהוי הפריטים.';
/** מגבלות השרת: 12 תמונות, 8MB מפוענחים. התקרה בממשק האתר היא 10. */
export const SCAN_MAX_PHOTOS = 12;

const FLAG_URL =
  'https://firestore.googleapis.com/v1/projects/hovalot-6cf65/databases/(default)/documents/config/scanPhotos';
let flagPromise = null;

/**
 * דגל ההפעלה `config/scanPhotos.enabled` (תואם ל-`scanPhotosEnabled()` ב-
 * `functions/src/orderScanPhotos.ts`, ענף integrate-129). **fail-closed — הפוך
 * ממתג העצירה:** מסמך חסר (404), חוק שלא נפרס (403), רשת, timeout, או כל ערך שאינו
 * `booleanValue: true` מפורש = כבוי. "הפונקציה קיימת" אינו מספיק להצגת התיבה.
 * ⚠️ דורש שהחוק יתיר קריאה ל-`config/scanPhotos` (ראו הערת הדוח).
 */
export function isScanPhotosFlagOn(fetchImpl = globalThis.fetch) {
  if (flagPromise) return flagPromise;
  flagPromise = (async () => {
    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = ctrl ? setTimeout(() => ctrl.abort(), 4000) : null;
    try {
      const res = await fetchImpl(FLAG_URL, { cache: 'no-store', signal: ctrl?.signal });
      if (!res.ok) return false;
      const doc = await res.json();
      return doc?.fields?.enabled?.booleanValue === true;
    } catch {
      return false;
    } finally {
      if (timer) clearTimeout(timer);
    }
  })();
  return flagPromise;
}

const PROBE_KEY = 'rozic:scanShareProbe';
const PROBE_TTL_MS = 5 * 60 * 1000;

/** בקשה מקדימה אחת, ממוטמנת 5 דקות ב-sessionStorage. ראו "בדיקת קיום" למעלה. */
export async function isScanShareAvailable(fetchImpl = globalThis.fetch) {
  if (!(await isScanPhotosFlagOn(fetchImpl))) return false;
  try {
    const cached = JSON.parse(sessionStorage.getItem(PROBE_KEY) || 'null');
    if (cached && Date.now() - cached.at < PROBE_TTL_MS) return cached.ok === true;
  } catch { /* אחסון חסום — בודקים שוב */ }
  let ok = false;
  try {
    const token = auth.currentUser ? await auth.currentUser.getIdToken() : 'probe';
    const res = await fetchImpl(PUBLISH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: '{}',
    });
    // 404 הוא "אין פונקציה" גם כשהוא קריא; כל סטטוס אחר מוכיח שהיא קיימת.
    ok = res.status !== 404;
  } catch {
    ok = false; // TypeError של CORS/רשת: לא זמין (ולא שגיאה לרשום — זה המצב הצפוי לפני הפריסה)
  }
  try { sessionStorage.setItem(PROBE_KEY, JSON.stringify({ at: Date.now(), ok })); } catch { /* ignore */ }
  return ok;
}

/**
 * 26.11 (גיא: "שיהיה בתקנון וזהו"; "אני לא רוצה מתג כזה"): הבסיס הוא אישור התקנון.
 * משתמש מחובר = `{version, acceptedAt}` תמיד; אורח = `null` (פרסום ממילא דורש משתמש מחובר).
 * מראה `newScanPhotoConsent` ב-`orderScanPhotos.ts`.
 */
export async function getScanConsent() {
  if (!auth.currentUser?.uid) return null;
  return { version: SCAN_CONSENT_VERSION, acceptedAt: Date.now() };
}

async function authedPost(url, body) {
  if (!auth.currentUser) return null;
  const token = await auth.currentUser.getIdToken();
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
}

/**
 * מפרסמת את התמונות להזמנה (אחרי שנוצרה, לפני התשלום). מחזירה
 * `{kind:'ready'|'none'|'failed'}` ולעולם אינה זורקת. כשל נרשם בקונסולה.
 * `base64Fn` = `resizeImageToBase64` (1024px, כמו מסלול ה-AI).
 */
export async function publishScanPhotos(orderId, files, consent, base64Fn) {
  try {
    if (!consent || !files.length) return { kind: 'none', rejected: 0 };
    const photos = [];
    for (const file of files.slice(0, SCAN_MAX_PHOTOS)) {
      photos.push({ base64: await base64Fn(file), mimeType: 'image/jpeg' });
    }
    const res = await authedPost(PUBLISH_URL, { orderId, consent, photos });
    if (!res || !res.ok) {
      console.warn('[scanPhotos] publish failed', res?.status);
      return { kind: 'failed' };
    }
    const json = await res.json();
    if (json?.status === 'ready') return { kind: 'ready', published: Number(json.published) || 0, rejected: Number(json.rejected) || 0 };
    return { kind: 'none', rejected: Number(json?.rejected) || 0 };
  } catch (e) {
    console.warn('[scanPhotos] publish error', e);
    return { kind: 'failed' };
  }
}
