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
 * ## ⚠️ הפונקציות עוד לא פרוסות (עד פריסת w2-photos) — הכל מאחורי בדיקת קיום
 * `isScanShareAvailable()` שולחת בקשה מקדימה אחת. פונקציה שאינה קיימת עונה 404
 * בלי כותרות CORS, והדפדפן מדווח את זה כ-`TypeError`; פונקציה קיימת עונה
 * (400/401) **עם** כותרות CORS. כל כשל = לא זמין = תיבת ההסכמה **אינה מוצגת
 * בכלל**: לא מבקשים הסכמה לשיתוף שאי אפשר לבצע. האתר אינו נשבר בשום מצב.
 *
 * ## ⚠️ שיתוף תמונות הוא תוספת ולעולם לא חוסם
 * כשל בפרסום = ההזמנה ממשיכה לתשלום בלי תמונות. **לא מתנים שירות בהסכמה.**
 * ההסכמה אינה נשמרת בין עמודים (גם לא בהפניה להתחברות): מי שחזר מההתחברות
 * מסמן שוב. זה הכיוון הבטוח — הסכמה שלא נתנו עכשיו אינה נחשבת.
 */
import { auth } from './firebase.js';

const BASE = 'https://us-central1-hovalot-6cf65.cloudfunctions.net';
const PUBLISH_URL = `${BASE}/publishOrderScanPhotos`;
const GET_URL = `${BASE}/getOrderScanPhotos`;
const WITHDRAW_URL = `${BASE}/withdrawOrderScanPhotos`;

export const SCAN_CONSENT_VERSION = '2026-11-25';
export const SCAN_CONSENT_TITLE = 'התמונות יוצגו למובילים';
export const SCAN_CONSENT_BODY =
  'כדי שמובילים יוכלו לראות מה מחכה להם, התמונות שתצלם יוצגו למובילים מאומתים שבוחנים את ההזמנה, כשפנים ואנשים מטושטשים. תמונות נבדקות גם בבינה מלאכותית כדי לזהות פריטים. אל תצלם אנשים, מסמכים או מסכים.';
export const SCAN_CONSENT_CHECKBOX = 'אני מאשר להציג את התמונות למובילים';
/** מגבלות השרת: 12 תמונות, 8MB מפוענחים. התקרה בממשק האתר היא 10. */
export const SCAN_MAX_PHOTOS = 12;

const PROBE_KEY = 'rozic:scanShareProbe';
const PROBE_TTL_MS = 5 * 60 * 1000;

/** בקשה מקדימה אחת, ממוטמנת 5 דקות ב-sessionStorage. ראו "בדיקת קיום" למעלה. */
export async function isScanShareAvailable(fetchImpl = globalThis.fetch) {
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
 * מצייר את תיבת ההסכמה לתוך `slot` ומחזיר `{ getConsent }`.
 * ⚠️ לא מסומנת מראש, לעולם. סימון = `{version, acceptedAt}` (זמן הסימון).
 * ⚠️ אין תלות בסימון כדי להמשיך (מינימיזציה, אפל 5.1.1(iii)).
 */
export function mountScanConsent(slot) {
  slot.innerHTML = `
    <div class="scan-consent">
      <p class="scan-consent-title">${SCAN_CONSENT_TITLE}</p>
      <p class="scan-consent-body">${SCAN_CONSENT_BODY}</p>
      <label class="scan-consent-row" for="scan-consent-check">
        <input type="checkbox" id="scan-consent-check">
        <span>${SCAN_CONSENT_CHECKBOX}</span>
      </label>
      <a class="scan-consent-link" href="../privacy.html" target="_blank" rel="noopener">מדיניות הפרטיות</a>
    </div>`;
  slot.hidden = false;
  const box = slot.querySelector('#scan-consent-check');
  let acceptedAt = null;
  box.addEventListener('change', () => { acceptedAt = box.checked ? Date.now() : null; });
  return {
    getConsent: () => (box.checked && acceptedAt ? { version: SCAN_CONSENT_VERSION, acceptedAt } : null),
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
