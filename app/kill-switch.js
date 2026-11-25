/**
 * מתג עצירה — צד האתר. **תאום ל-`src/services/killSwitchPure.ts` ול-
 * `KillSwitchBanner.tsx` באפליקציה** (ענף w2-ops), 25.11.2026.
 *
 * מסמך: `config/killSwitch` — `{ ordersPaused, paymentsPaused, message }`.
 * נקרא ב-REST בלי התחברות (אותו דפוס כמו `config/appVersion`), ולכן עובד גם
 * לאורח. אפס `import`: כמו `offline-banner.js`, דף על רשת גרועה לא ימשוך את
 * ה-SDK של Firebase, והמתג חייב לרוץ גם אז.
 *
 * ## ⚠️ fail-open — מתג שנדלק מעצמו גרוע מהתקלה שהוא בא למנוע
 * מסמך חסר (404), חוק שעוד לא נפרס (403), רשת, timeout, JSON שבור, או שדה
 * שאינו `true` מפורש = הכל פתוח. כשל שאינו 403/404 נרשם בקונסולה (לא נבלע);
 * 403/404 הם המצב הצפוי עד שהחוק/המסמך קיימים ולכן שקטים.
 *
 * ## מה נעצר ומה לא
 * רק פתיחת הזמנה חדשה (כמו באפליקציה: `newOrdersBlocked` = הזמנות או
 * תשלומים מושהים, כי בלי תשלום אי אפשר להשלים הזמנה). הזמנות קיימות, צ'אט,
 * חשבון וטיוטות ב-localStorage ממשיכים לעבוד — לא נוגעים בהם כאן. עצירת
 * התשלום עצמה נאכפת בשרת (`createGrowCheckout` -> 503 `payments_paused`),
 * ו-`payments.js` מעביר את ההודעה שלו כמו שהיא.
 *
 * ⚠️ הנוסח הברירת-מחדל זהה ל-`DEFAULT_KILL_SWITCH_MESSAGE` באפליקציה.
 */
const KILL_SWITCH_URL =
  'https://firestore.googleapis.com/v1/projects/hovalot-6cf65/databases/(default)/documents/config/killSwitch';
const TIMEOUT_MS = 4000;

export const DEFAULT_KILL_SWITCH_MESSAGE = 'ההזמנות מושהות זמנית. נחזור בהקדם.';
export const KILL_SWITCH_OFF = Object.freeze({ ordersPaused: false, paymentsPaused: false, message: '' });

/** מקבל את גוף ה-REST של Firestore (`{ fields: { x: { booleanValue } } }`). */
export function parseKillSwitchDoc(doc) {
  const f = doc && typeof doc === 'object' ? doc.fields : null;
  if (!f || typeof f !== 'object') return KILL_SWITCH_OFF;
  const msg = f.message?.stringValue;
  return {
    ordersPaused: f.ordersPaused?.booleanValue === true,
    paymentsPaused: f.paymentsPaused?.booleanValue === true,
    message: typeof msg === 'string' ? msg.trim().slice(0, 300) : '',
  };
}

export function newOrdersBlocked(state) {
  return state.ordersPaused || state.paymentsPaused;
}

export function killSwitchMessage(state) {
  return state.message || DEFAULT_KILL_SWITCH_MESSAGE;
}

export async function readKillSwitch(fetchImpl = globalThis.fetch) {
  const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = ctrl ? setTimeout(() => ctrl.abort(), TIMEOUT_MS) : null;
  try {
    const res = await fetchImpl(KILL_SWITCH_URL, { cache: 'no-store', signal: ctrl?.signal });
    if (res.status === 404 || res.status === 403) return KILL_SWITCH_OFF;
    if (!res.ok) {
      console.warn('[kill-switch] unexpected status, staying open', res.status);
      return KILL_SWITCH_OFF;
    }
    return parseKillSwitchDoc(await res.json());
  } catch (e) {
    console.warn('[kill-switch] read failed, staying open', e?.name || e);
    return KILL_SWITCH_OFF;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/* ───────────────────────── DOM ───────────────────────── */

/** קישורים שפותחים הזמנה. `apartment.html`/`small-move.html` הם שני הפתחים היחידים. */
const ORDER_LINK = /(^|\/)(apartment|small-move)\.html(?:[?#]|$)/;

function mountBanner(text) {
  if (document.querySelector('.kill-switch-banner')) return;
  const el = document.createElement('div');
  el.className = 'kill-switch-banner';
  /* ⚠️ `role="status"` מוזרק ריק והטקסט נכנס פריים אחרי — אזור חי שנולד עם
     תוכן אינו מוכרז (אותו לקח כמו ב-`pilot-banner.js`). באפליקציה זה
     `alert`; כאן `status`, כי הודעה שנטענת אחרי הדף והיא אינה שגיאת משתמש
     לא אמורה לקטוע קורא מסך באמצע משפט. */
  el.setAttribute('role', 'status');
  el.setAttribute('aria-atomic', 'true');
  const slot = document.querySelector('[data-pilot-banner-slot]');
  const main = document.querySelector('main#main-content, main');
  if (slot) slot.insertAdjacentElement('afterend', el);
  else if (main) main.insertBefore(el, main.firstChild);
  else document.body.insertBefore(el, document.body.firstChild);
  requestAnimationFrame(() => { el.textContent = text; });
}

/** משבית (לא מסיר) כדי שהפריסה לא תזוז; לא ניתן למיקוד ולא ללחיצה. */
function disableOrderLinks() {
  for (const a of document.querySelectorAll('a[href]')) {
    const href = a.getAttribute('href') || '';
    if (!ORDER_LINK.test(href)) continue;
    a.dataset.killHref = href;
    a.removeAttribute('href');
    a.setAttribute('aria-disabled', 'true');
    a.removeAttribute('tabindex');
    a.classList.add('kill-switch-disabled');
  }
}

/** דפי האשף עצמם: מסתירים את הטופס, משאירים את ההודעה וחזרה לבית. */
function pauseWizard() {
  const main = document.querySelector('main#main-content');
  if (!main) return;
  document.body.classList.add('kill-switch-paused');
  for (const child of Array.from(main.children)) {
    if (child.classList.contains('kill-switch-banner')) continue;
    child.hidden = true;
  }
  if (!main.querySelector('.kill-switch-back')) {
    const back = document.createElement('p');
    back.className = 'kill-switch-back';
    back.innerHTML = '<a class="pill-link" href="index.html">חזרה למסך הבית</a>';
    main.appendChild(back);
  }
}

async function init() {
  const state = await readKillSwitch();
  if (!newOrdersBlocked(state)) return;
  const path = location.pathname;
  mountBanner(killSwitchMessage(state));
  disableOrderLinks();
  if (/\/(apartment|small-move)\.html$/.test(path)) pauseWizard();
}

if (typeof document !== 'undefined') {
  init().catch((e) => console.warn('[kill-switch] init failed, staying open', e));
}
