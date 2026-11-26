/**
 * הצגת תמונות הסריקה למובילים — צד האתר (הכרעה 8.7 ב, 25.11.2026).
 * **תאום ל-`src/services/orderScanPhotos.ts` + `ScanShareConsentBox` +
 * `useScanPhotosShare` באפליקציה (ענף w2-photos).** נוסח ההסכמה הוא סעיף 2ד
 * ב-`legal-drafts.md`, מילה במילה, וגרסתו חייבת להיות ב-`KNOWN_CONSENT_VERSIONS`
 * בשרת (`publishOrderScanPhotos` דוחה גרסה לא מוכרת: 400 `consent_required`).
 *
 * ## ⚠️ האתר הוא ממשק לקוח בלבד
 * אין באתר לוח מובילים, ולכן אין כאן "הצגה למוביל". כל מה שכאן הוא צד הלקוח:
 * הסכמה, פרסום, תצוגה מקדימה, "לא לשתף".
 *
 * ## ⚠️ דגל `config/scanPhotos.enabled` (fail-closed) ואחריו בדיקת קיום
 * הדגל חייב להיות דלוק מפורשות. אחריו, כל עוד הפונקציות עוד לא פרוסות (עד פריסת w2-photos) — הכל מאחורי בדיקת קיום
 * `isScanShareAvailable()` שולחת בקשה מקדימה אחת. פונקציה שאינה קיימת עונה 404
 * בלי כותרות CORS, והדפדפן מדווח את זה כ-`TypeError`; פונקציה קיימת עונה
 * (400/401) **עם** כותרות CORS. כל כשל = לא זמין = תיבת ההסכמה **אינה מוצגת
 * בכלל**: לא מבקשים הסכמה לשיתוף שאי אפשר לבצע. האתר אינו נשבר בשום מצב.
 *
 * ## ⚠️ שיתוף תמונות הוא תוספת ולעולם לא חוסם
 * כשל בפרסום = ההזמנה ממשיכה לתשלום בלי תמונות. **לא מתנים שירות בהסכמה.**
 * המתג דלוק כברירת מחדל בכל טעינת עמוד (גם אחרי הפניה להתחברות), ובחירת
 * כיבוי אינה נשמרת בין עמודים — כיבוי הוא הכיוון הבטוח, והוא נשמר בעמוד עצמו.
 */
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';
import { auth, db } from './firebase.js';

const BASE = 'https://us-central1-hovalot-6cf65.cloudfunctions.net';
const PUBLISH_URL = `${BASE}/publishOrderScanPhotos`;
const GET_URL = `${BASE}/getOrderScanPhotos`;
const WITHDRAW_URL = `${BASE}/withdrawOrderScanPhotos`;

export const SCAN_CONSENT_VERSION = '2026-11-26';
export const SCAN_CONSENT_TITLE = 'מציג את התמונות למובילים';
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
 * מצייר את שורת השיתוף לתוך `slot` ומחזיר `{ getConsent }`. (26.11.2026, נוסח ליאור; מראה
 * `ScanShareConsentBox` באפליקציה.) גיא: "אין באנרים מעצבנים" — שורה שקטה עם **מתג חיובי,
 * דלוק כברירת מחדל**, במקום תיבה לא מסומנת. הבסיס המשפטי הוא סעיף בתקנון ובפרטיות; השורה היא
 * חובת היידוע במקום ההעלאה. דלוק = `{version, acceptedAt: <רגע הפרסום>}`, כבוי = `null`.
 * ⚠️ כיבוי לא חוסם את ההזמנה — התמונות משמשות אז רק לזיהוי (מינימיזציה, אפל 5.1.1(iii)).
 */
export function mountScanConsent(slot) {
  slot.innerHTML = `
    <div class="scan-consent">
      <div class="scan-consent-row">
        <span class="scan-consent-title" id="scan-consent-title">${SCAN_CONSENT_TITLE}</span>
        <label class="switch">
          <input type="checkbox" role="switch" id="scan-consent-check" checked
                 aria-checked="true" aria-labelledby="scan-consent-title" aria-describedby="scan-consent-body">
          <span class="switch-track" aria-hidden="true"></span>
        </label>
      </div>
      <p class="scan-consent-body" id="scan-consent-body">${SCAN_CONSENT_BODY}</p>
    </div>`;
  slot.hidden = false;
  const box = slot.querySelector('#scan-consent-check');
  box.addEventListener('change', () => { box.setAttribute('aria-checked', String(box.checked)); });
  return {
    getConsent: () => (box.checked ? { version: SCAN_CONSENT_VERSION, acceptedAt: Date.now() } : null),
  };
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

/**
 * סטטוס הפרסום: `orders/{id}/private/scanPhotos.scanPhotosStatus` (נכתב ב-Admin SDK בלבד, קריא ללקוח הבעלים).
 * ⚠️ המצב הקובע יושב שם ולא על מסמך ההזמנה (שם נשאר רק `scanPhotoCount` כמונה תצוגה).
 * מחזיר `null` כשלא נקרא (שגיאה/חסר) — המתקשר מחליט; הגלריה עצמה נפתחת רק דרך `getOrderScanPhotos`.
 */
export async function getScanPhotosStatus(orderId) {
  try {
    const snap = await getDoc(doc(db, 'orders', orderId, 'private', 'scanPhotos'));
    return snap.exists() ? (snap.data().scanPhotosStatus ?? null) : null;
  } catch (e) {
    if (e?.code !== 'permission-denied') console.warn('[scanPhotos] status read failed', e?.code || e);
    return null;
  }
}

/** קישורים חתומים ל-10 דקות. `[]` כשאין הרשאה/תמונות/כשל. לא נשמרים. */
export async function fetchScanPhotoUrls(orderId) {
  try {
    const res = await authedPost(GET_URL, { orderId });
    if (!res || !res.ok) return [];
    const json = await res.json();
    return Array.isArray(json?.photos) ? json.photos.map(p => p?.url).filter(u => typeof u === 'string') : [];
  } catch (e) {
    console.warn('[scanPhotos] fetch error', e);
    return [];
  }
}

/** "לא לשתף": מסירה מהלוח ומחיקה. שני ניסיונות — כשל מחיקה אחרי סירוב פוגע באמון. */
export async function withdrawScanPhotos(orderId) {
  for (let i = 0; i < 2; i++) {
    try {
      const res = await authedPost(WITHDRAW_URL, { orderId });
      if (res && res.ok) return true;
    } catch (e) {
      console.warn('[scanPhotos] withdraw error', e);
    }
  }
  console.warn('[scanPhotos] withdraw failed twice', orderId);
  return false;
}
