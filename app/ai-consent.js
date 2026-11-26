/**
 * הסכמה חד-פעמית לפני שליחת תמונות או טקסט ל-Google Gemini — **תאום ל-
 * `ensureAIPhotoConsent` / `ensureAITextConsent` ב-`src/services/orderScanPhotos.ts`**
 * (ענף w2-privacy, אפל 5.1.2(i)). הנוסחים והגרסאות מועתקים מילה במילה מ-
 * `AI_CONSENT_CONFIG`; שינוי נוסח = גרסה חדשה בשני המשטחים.
 *
 * ## ההתנהגות
 * - נשמרת ב-`localStorage` לפי סוג, משתמש וגרסה: `rozic:aiConsent:<kind>:<uid>`.
 *   אורח (בלי חשבון) נשמר תחת `guest` — לפי דפדפן, והמשתמש המחובר מקבל שאלה משלו.
 * - **כשל קריאה/כתיבה = שואלים שוב** (הכיוון הבטוח). אחסון חסום אינו חוסם את השירות,
 *   רק מבקש הסכמה בכל פעם.
 * - **סירוב = לא נשלח דבר.** המתקשר מציג הודעה וממשיך ידנית.
 * - מסמכי מוביל אינם באתר, ולכן אין כאן `docs`.
 *
 * ## נגישות
 * `role="dialog"` + `aria-modal`, מיקוד נכנס ל"אני מסכים", Tab לכוד בדיאלוג, Escape = סירוב,
 * והמיקוד חוזר למי שהיה ממוקד. (מ-26.11 מייבא את firebase.js, לשמירת ההסכמה בשרת.)
 */

import { doc, getDoc, updateDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';
import { db } from './firebase.js';

/* ═══ 26.11.2026 — הסכמה אחת בשרת (הכרעת עמוס, בעקבות גיא: "אין באנרים מעצבנים") ═══
 * תאום ל-`src/services/aiConsent.ts` באפליקציה: אותו שדה `users/{uid}.aiConsent`, אותה גרסה,
 * ולכן הסכמה שניתנה באתר תקפה באפליקציה ולהפך. נוסחים: `team/lior/launch/consent-wording.md`.
 * - מחובר: הסכמה בשרת בתוקף (גרסה זהה ובלי `revokedAt`) = בלי דיאלוג. אחרת הסכמה ישנה
 *   ב-localStorage לאותו סוג עדיין תקפה (אלא אם בוטלה בשרת). אחרת דיאלוג אחד מאוחד;
 *   אישור כותב `aiConsent` עם `via:'in_use'`.
 * - אורח: מנגנון ה-localStorage הקיים בלי שינוי (אין חשבון לכתוב אליו).
 * ⚠️ שינוי מהותי בנוסח = גרסה חדשה גם באפליקציה. */
export const AI_CONSENT_VERSION = '2026-11-26';
export const AI_CONSENT_CHECKBOX_BOLD = 'תמונות וטקסט שאשלח יישלחו לבינה המלאכותית של Google לניתוח בלבד';
export const AI_CONSENT_CHECKBOX_REST = ' — לזיהוי פריטים, לצ\'אט ולבדיקת מסמכים.';
export const AI_CONSENT_PROMPT_TITLE = 'שינוי קטן בזיהוי הפריטים';
export const AI_CONSENT_PROMPT_BODY =
  'כדי לזהות פריטים מתמונות ולהפעיל את הצ\'אט, אנחנו שולחים את התמונות והטקסט לבינה המלאכותית של Google, לניתוח בלבד. רצינו לשאול אתכם במפורש.';
export const AI_CONSENT_PROMPT_DECLINE_NOTE =
  'בלי האישור הזיהוי מהתמונות והצ\'אט כבויים, ואפשר להמשיך להזמין כרגיל ולבחור פריטים מהרשימה. אפשר לשנות בכל זמן ב"פרופיל והגדרות".';
export const AI_CONSENT_SETTING_LABEL = 'ניתוח בבינה המלאכותית של Google';
export const AI_CONSENT_SETTING_HINT =
  'זיהוי פריטים מתמונות, הצ\'אט ובדיקת מסמכים. כבוי = בוחרים פריטים מהרשימה, ומסמכים נבדקים ידנית.';

export const AI_CONSENT_CONFIG = {
  rooms: {
    key: 'aiPhotoConsent',
    version: '2026-11-25b',
    title: 'שליחת תמונות לבינה מלאכותית',
    body:
      'כדי לזהות את הפריטים, התמונות שמצלמים נשלחות לשירות בינה מלאכותית של צד שלישי (Google Gemini) וגם נשמרות אצלנו לשיפור הזיהוי. לא לצלם אנשים, מסמכים או מסכים. אפשר לסרב ולהוסיף פריטים ידנית. פרטים נוספים במדיניות הפרטיות.',
  },
  text: {
    key: 'aiTextConsent',
    version: '2026-11-25',
    title: 'שליחת הודעות לבינה מלאכותית',
    body:
      'ההודעות שנכתבות כאן נשלחות לשירות בינה מלאכותית של צד שלישי (Google Gemini) כדי לענות עליהן. כדאי לא לכתוב בהן פרטים מזהים שאינם נחוצים, כמו מספרי כרטיס או תעודת זהות. פרטים נוספים במדיניות הפרטיות.',
  },
};

const CONFIRM_LABEL = 'אני מסכים';
const CANCEL_LABEL = 'ביטול';
const UNIFIED_CONFIRM_LABEL = 'מאשר';
const UNIFIED_CANCEL_LABEL = 'לא עכשיו';

/** מזהה משתמש להפרדת הסכמות. `undefined` ב-auth נחשב אורח. */
function uidKey(uid) {
  return uid || 'guest';
}
const storageKey = (kind, uid) => `rozic:aiConsent:${kind}:${uidKey(uid)}`;

export function hasAIConsent(kind, uid) {
  try {
    const raw = localStorage.getItem(storageKey(kind, uid));
    if (!raw) return false;
    return JSON.parse(raw)?.version === AI_CONSENT_CONFIG[kind].version;
  } catch (e) {
    console.warn('[aiConsent] read failed, asking again', kind, e?.name || e);
    return false;
  }
}

function recordAIConsent(kind, uid) {
  try {
    localStorage.setItem(storageKey(kind, uid), JSON.stringify({ version: AI_CONSENT_CONFIG[kind].version, at: Date.now() }));
  } catch (e) {
    console.warn('[aiConsent] write failed (will ask again next time)', kind, e?.name || e);
  }
}

const pending = new Map();

function showDialog(c) {
  return new Promise((resolve) => {
    const previous = document.activeElement;
    const overlay = document.createElement('div');
    overlay.className = 'ai-consent-overlay';
    const id = c.id;
    overlay.innerHTML = `
      <div class="ai-consent-dialog" role="dialog" aria-modal="true" aria-labelledby="${id}-title" aria-describedby="${id}-body">
        <h2 id="${id}-title" class="ai-consent-title"></h2>
        <p id="${id}-body" class="ai-consent-body"></p>
        <p class="ai-consent-body ai-consent-note" hidden></p>
        <a class="ai-consent-link" href="/privacy.html" target="_blank" rel="noopener">מדיניות הפרטיות</a>
        <div class="ai-consent-actions">
          <button type="button" class="btn btn-primary" data-ok></button>
          <button type="button" class="btn btn-secondary" data-cancel></button>
        </div>
      </div>`;
    overlay.querySelector('.ai-consent-title').textContent = c.title;
    overlay.querySelector('.ai-consent-body').textContent = c.body;
    const noteEl = overlay.querySelector('.ai-consent-note');
    if (c.note) { noteEl.textContent = c.note; noteEl.hidden = false; }
    const ok = overlay.querySelector('[data-ok]');
    const cancel = overlay.querySelector('[data-cancel]');
    ok.textContent = c.ok;
    cancel.textContent = c.cancel;
    document.body.appendChild(overlay);

    const finish = (value) => {
      document.removeEventListener('keydown', onKey, true);
      overlay.remove();
      if (previous && typeof previous.focus === 'function') previous.focus();
      resolve(value);
    };
    function onKey(e) {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); finish(false); return; }
      if (e.key !== 'Tab') return;
      const focusables = Array.from(overlay.querySelectorAll('a[href], button'));
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      else if (!overlay.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
    }
    document.addEventListener('keydown', onKey, true);
    ok.addEventListener('click', () => finish(true));
    cancel.addEventListener('click', () => finish(false));
    ok.focus();
  });
}

/* ---------- הסכמה בשרת ---------- */
const serverCache = new Map(); // uid -> { valid, revoked }

export function isAIConsentValid(c) {
  return !!c && c.version === AI_CONSENT_VERSION && !c.revokedAt;
}

/** מעדכן את המטמון מהפרופיל החי (subscribeToAuth), כדי ששינוי מהאפליקציה יזוהה. */
export function syncAIConsentCache(uid, stored) {
  if (!uid) return;
  serverCache.set(uid, { valid: isAIConsentValid(stored), revoked: !!stored?.revokedAt });
}

async function readServerConsent(uid) {
  if (serverCache.has(uid)) return serverCache.get(uid);
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    const c = snap.data()?.aiConsent;
    const r = { valid: isAIConsentValid(c), revoked: !!c?.revokedAt };
    serverCache.set(uid, r);
    return r;
  } catch (e) {
    // כשל קריאה = לא מניחים הסכמה (הכיוון הבטוח): המשתמש יישאל. לא נשמר במטמון.
    console.warn('[aiConsent] server read failed, asking', e?.code || e);
    return { valid: false, revoked: false };
  }
}

/** @param {'signup'|'prompt'|'settings'|'in_use'} via */
export async function recordServerAIConsent(uid, via) {
  try {
    await updateDoc(doc(db, 'users', uid), {
      aiConsent: { version: AI_CONSENT_VERSION, acceptedAt: serverTimestamp(), via },
    });
    serverCache.set(uid, { valid: true, revoked: false });
    return true;
  } catch (e) {
    console.warn('[aiConsent] server write failed', e?.code || e);
    return false;
  }
}

export async function revokeServerAIConsent(uid) {
  try {
    await updateDoc(doc(db, 'users', uid), { 'aiConsent.revokedAt': serverTimestamp() });
    serverCache.set(uid, { valid: false, revoked: true });
    return true;
  } catch (e) {
    console.warn('[aiConsent] revoke failed', e?.code || e);
    return false;
  }
}

async function markAIConsentPrompted(uid) {
  try { await updateDoc(doc(db, 'users', uid), { aiConsentPromptedAt: serverTimestamp() }); }
  catch (e) { console.warn('[aiConsent] prompted write failed', e?.code || e); }
}

/** שדות ההרשמה, נכתבים עם המסמך הראשון. מסומן = הסכמה; לא מסומן = "נשאל כבר", בלי מסך חד-פעמי. */
export function signupAIConsentField(accepted) {
  return accepted
    ? { aiConsent: { version: AI_CONSENT_VERSION, acceptedAt: serverTimestamp(), via: 'signup' } }
    : { aiConsentPromptedAt: serverTimestamp() };
}

/**
 * `true` = מותר לשלוח. `false` = סירב; **לא שולחים**.
 * @param {'rooms'|'text'} kind
 * @param {string|null|undefined} uid
 */
export function ensureAIConsent(kind, uid) {
  if (!uid) return ensureGuestConsent(kind);
  const key = `${kind}:${uid}`;
  if (pending.has(key)) return pending.get(key);
  const p = (async () => {
    const server = await readServerConsent(uid);
    if (server.valid) return true;
    // הסכמה ישנה (דיאלוג לפי סוג) עדיין תקפה, אלא אם המשתמש ביטל בשרת.
    if (!server.revoked && hasAIConsent(kind, uid)) return true;
    const agreed = await showDialog({
      id: 'ai-consent-unified',
      title: AI_CONSENT_PROMPT_TITLE,
      body: AI_CONSENT_PROMPT_BODY,
      note: AI_CONSENT_PROMPT_DECLINE_NOTE,
      ok: UNIFIED_CONFIRM_LABEL,
      cancel: UNIFIED_CANCEL_LABEL,
    });
    if (agreed) {
      await recordServerAIConsent(uid, 'in_use');
      recordAIConsent(kind, uid); // גיבוי מקומי: כשל כתיבה בשרת לא יחזיר את השאלה בכל פעם
    }
    return agreed;
  })().finally(() => pending.delete(key));
  pending.set(key, p);
  return p;
}

/** אורח: מנגנון ה-localStorage הקיים, בנוסח הקיים. */
function ensureGuestConsent(kind) {
  if (hasAIConsent(kind, null)) return Promise.resolve(true);
  const key = `${kind}:guest`;
  if (pending.has(key)) return pending.get(key);
  const c = AI_CONSENT_CONFIG[kind];
  const p = showDialog({ id: `ai-consent-${kind}`, title: c.title, body: c.body, ok: CONFIRM_LABEL, cancel: CANCEL_LABEL })
    .then((agreed) => { if (agreed) recordAIConsent(kind, null); return agreed; })
    .finally(() => pending.delete(key));
  pending.set(key, p);
  return p;
}

/**
 * מסך חד-פעמי למשתמש מחובר שאין לו הסכמה בתוקף, לא נשאל ולא ביטל.
 * "מאשר" כותב `aiConsent` (via:'prompt'); "לא עכשיו" כותב `aiConsentPromptedAt`.
 * נקרא בדפים שיש בהם AI עם הפרופיל החי. לעולם לא חוסם ולא זורק.
 */
export async function maybePromptAIConsent(uid, profile) {
  try {
    if (!uid || !profile) return;
    syncAIConsentCache(uid, profile.aiConsent);
    if (isAIConsentValid(profile.aiConsent) || profile.aiConsent?.revokedAt || profile.aiConsentPromptedAt) return;
    if (document.querySelector('.ai-consent-overlay')) return;
    const agreed = await showDialog({
      id: 'ai-consent-prompt',
      title: AI_CONSENT_PROMPT_TITLE,
      body: AI_CONSENT_PROMPT_BODY,
      note: AI_CONSENT_PROMPT_DECLINE_NOTE,
      ok: UNIFIED_CONFIRM_LABEL,
      cancel: UNIFIED_CANCEL_LABEL,
    });
    if (agreed) await recordServerAIConsent(uid, 'prompt');
    else await markAIConsentPrompted(uid);
  } catch (e) {
    console.warn('[aiConsent] prompt failed', e);
  }
}

export const ensureAIPhotoConsent = (uid) => ensureAIConsent('rooms', uid);
export const ensureAITextConsent = (uid) => ensureAIConsent('text', uid);
