// "איך שמעת עלינו?" — תאום של `~/Hovalot/src/services/heardFrom.ts` ושל
// `HeardFromPicker.tsx`. אותו נוסח ואותם קודים (ליאור, b63a0d5), ואותה הכרעה
// (עמוס, 12.11): פעם אחת לכל לקוח, לא חובה, ולא בטיוטה.
//
// ⚠️ **התשובה ב-`users/{uid}/private/acquisition`**, כי את מסמך המשתמש קורא
// כל מחובר, ו"אחר" הוא טקסט חופשי. על ההזמנה נכתב רק הקוד (`heardFrom`), וה-src
// (`heardFromSrc`) אם הגיע מקישור מסומן.
//
// ⚠️ **אורח עונה לפני שיש לו חשבון.** התשובה נשמרת ב-localStorage, ונכתבת
// ל-Firestore ביצירת ההזמנה, כשהוא כבר מחובר (חובה לפני תשלום).
import { doc, getDoc, serverTimestamp, setDoc } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';
import { db, auth } from './firebase.js';
import { readAttribution } from './attribution.js';

export const HEARD_FROM_TITLE = 'איך שמעת עלינו?';
export const HEARD_FROM_HINT = 'זה עוזר לנו לדעת איפה כדאי לספר עלינו.';
export const HEARD_FROM_OPTIONS = [
  { code: 'instagram', label: 'אינסטגרם' },
  { code: 'facebook', label: 'פייסבוק' },
  { code: 'google', label: 'חיפוש בגוגל' },
  { code: 'friend', label: 'המלצה של חבר או משפחה' },
  { code: 'mover', label: 'מוביל סיפר לי' },
  { code: 'other', label: 'אחר' },
];
const VALID = new Set(['instagram', 'facebook', 'google', 'friend', 'mover', 'group', 'other']);
const OTHER_MAX = 80;
const LOCAL_KEY = 'rozic:heard-from';

const acquisitionRef = (uid) => doc(db, 'users', uid, 'private', 'acquisition');
const cache = new Map();

function readLocal() {
  try {
    const v = JSON.parse(localStorage.getItem(LOCAL_KEY) || 'null');
    return v && VALID.has(v.code) ? { code: v.code, other: String(v.other || '').slice(0, OTHER_MAX) } : null;
  } catch { return null; }
}
function writeLocal(answer) {
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify(answer)); } catch { /* חסום — נשאר בזיכרון בלבד */ }
}

async function loadCode(uid) {
  if (cache.has(uid)) return cache.get(uid);
  const snap = await getDoc(acquisitionRef(uid));
  const code = snap.exists() && VALID.has(snap.data()?.code) ? snap.data().code : null;
  cache.set(uid, code);
  return code;
}

async function saveAnswer(uid, answer) {
  const other = answer.code === 'other' ? answer.other.trim().slice(0, OTHER_MAX) : '';
  await setDoc(acquisitionRef(uid), {
    code: answer.code, other: other || null, role: 'customer', via: 'web',
    src: readAttribution(), answeredAt: serverTimestamp(),
  });
  cache.set(uid, answer.code);
}

/**
 * השדות שנכתבים על ההזמנה: `{ heardFrom?, heardFromSrc? }`.
 * אם האורח ענה לפני שהתחבר, כאן התשובה נכתבת לחשבון שלו.
 * ⚠️ **לעולם לא זורק.** הזמנה לא נכשלת בגלל נתון שיווקי.
 */
export async function heardFromFieldsForOrder() {
  const out = {};
  const src = readAttribution();
  if (src) out.heardFromSrc = src;
  const uid = auth.currentUser?.uid;
  if (!uid) return out;
  try {
    let code = await loadCode(uid);
    const local = readLocal();
    if (!code && local) { await saveAnswer(uid, local); code = local.code; }
    if (code) out.heardFrom = code;
  } catch (e) {
    console.warn('[heardFrom] read for order failed', e?.message);
  }
  return out;
}

/**
 * מצייר את הכרטיס בתוך `container`, רק אם הלקוח עוד לא ענה. אחרי שענה הכרטיס
 * נשאר עד היציאה מהדף, כדי שאפשר יהיה לתקן.
 */
export async function mountHeardFromCard(container) {
  if (!container) return;
  const uid = auth.currentUser?.uid;
  try {
    if (uid && await loadCode(uid)) return;
  } catch (e) {
    // כשל קריאה = לא מציגים. עדיף לא לשאול מאשר לשאול מי שכבר ענה.
    console.warn('[heardFrom] load failed', e?.message);
    return;
  }
  let value = readLocal();
  let timer = null;

  const persist = (answer) => {
    writeLocal(answer);
    const u = auth.currentUser?.uid;
    if (!u) return;
    saveAnswer(u, answer).catch(e => console.warn('[heardFrom] save failed', e?.message));
  };

  container.hidden = false;
  container.innerHTML = `
    <h3 class="heard-from-title" id="heard-from-title">${HEARD_FROM_TITLE}</h3>
    <p class="heard-from-hint">${HEARD_FROM_HINT}</p>
    <div class="heard-from-chips" role="radiogroup" aria-labelledby="heard-from-title">
      ${HEARD_FROM_OPTIONS.map(o => `<button type="button" tabindex="0" class="heard-from-chip" role="radio" aria-checked="false" data-code="${o.code}">${o.label}</button>`).join('')}
    </div>
    <input type="text" class="heard-from-other" maxlength="${OTHER_MAX}" placeholder="איפה?" aria-label="איפה שמעת עלינו" hidden>`;

  const chips = [...container.querySelectorAll('.heard-from-chip')];
  const other = container.querySelector('.heard-from-other');
  const paint = () => {
    chips.forEach(c => c.setAttribute('aria-checked', String(c.dataset.code === value?.code)));
    other.hidden = value?.code !== 'other';
    if (!other.hidden) other.value = value.other || '';
  };
  chips.forEach(c => c.addEventListener('click', () => {
    value = { code: c.dataset.code, other: c.dataset.code === 'other' ? (value?.other || '') : '' };
    paint();
    if (value.code === 'other') other.focus();
    persist(value);
  }));
  other.addEventListener('input', () => {
    value = { code: 'other', other: other.value };
    clearTimeout(timer);
    timer = setTimeout(() => persist(value), 800);
  });
  paint();
}
