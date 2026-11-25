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
 * והמיקוד חוזר למי שהיה ממוקד. אפס imports (כמו `offline-banner.js`).
 */
export const AI_CONSENT_CONFIG = {
  rooms: {
    key: 'aiPhotoConsent',
    version: '2026-11-25b',
    title: 'שליחת תמונות לבינה מלאכותית',
    body:
      'כדי לזהות את הפריטים, התמונות שתצלם נשלחות לשירות בינה מלאכותית של צד שלישי (Google Gemini) וגם נשמרות אצלנו לשיפור הזיהוי. אל תצלם אנשים, מסמכים או מסכים. אפשר לסרב ולהוסיף פריטים ידנית. פרטים נוספים במדיניות הפרטיות.',
  },
  text: {
    key: 'aiTextConsent',
    version: '2026-11-25',
    title: 'שליחת הודעות לבינה מלאכותית',
    body:
      'ההודעות שתכתוב כאן נשלחות לשירות בינה מלאכותית של צד שלישי (Google Gemini) כדי לענות לך. כדאי לא לכתוב בהן פרטים מזהים שאינם נחוצים, כמו מספרי כרטיס או תעודת זהות. פרטים נוספים במדיניות הפרטיות.',
  },
};

const CONFIRM_LABEL = 'אני מסכים';
const CANCEL_LABEL = 'ביטול';

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

function showDialog(kind) {
  const c = AI_CONSENT_CONFIG[kind];
  return new Promise((resolve) => {
    const previous = document.activeElement;
    const overlay = document.createElement('div');
    overlay.className = 'ai-consent-overlay';
    const id = `ai-consent-${kind}`;
    overlay.innerHTML = `
      <div class="ai-consent-dialog" role="dialog" aria-modal="true" aria-labelledby="${id}-title" aria-describedby="${id}-body">
        <h2 id="${id}-title" class="ai-consent-title"></h2>
        <p id="${id}-body" class="ai-consent-body"></p>
        <a class="ai-consent-link" href="/privacy.html" target="_blank" rel="noopener">מדיניות הפרטיות</a>
        <div class="ai-consent-actions">
          <button type="button" class="btn btn-primary" data-ok></button>
          <button type="button" class="btn btn-secondary" data-cancel></button>
        </div>
      </div>`;
    overlay.querySelector('.ai-consent-title').textContent = c.title;
    overlay.querySelector('.ai-consent-body').textContent = c.body;
    const ok = overlay.querySelector('[data-ok]');
    const cancel = overlay.querySelector('[data-cancel]');
    ok.textContent = CONFIRM_LABEL;
    cancel.textContent = CANCEL_LABEL;
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

/**
 * `true` = מותר לשלוח. `false` = סירב; **לא שולחים**.
 * @param {'rooms'|'text'} kind
 * @param {string|null|undefined} uid
 */
export function ensureAIConsent(kind, uid) {
  if (hasAIConsent(kind, uid)) return Promise.resolve(true);
  const key = `${kind}:${uidKey(uid)}`;
  if (pending.has(key)) return pending.get(key);
  const p = showDialog(kind).then((agreed) => {
    if (agreed) recordAIConsent(kind, uid);
    return agreed;
  }).finally(() => pending.delete(key));
  pending.set(key, p);
  return p;
}

export const ensureAIPhotoConsent = (uid) => ensureAIConsent('rooms', uid);
export const ensureAITextConsent = (uid) => ensureAIConsent('text', uid);
