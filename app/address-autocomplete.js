/**
 * רכיב כתובת ברמת האפליקציה (0.2) — השלמה אוטומטית תוך כדי הקלדה, רשימת
 * הצעות, וכתובות שמורות/אחרונות. מקביל ל-AddressInput.tsx באפליקציה
 * (Hovalot/src/components/AddressInput.tsx), מצומצם למה שרלוונטי לשדה
 * טקסט חופשי בודד (ולא city/street/houseNumber מפורקים כמו באפליקציה —
 * שדות ה-from-address/to-address באתר הם מחרוזת אחת מההתחלה, וכל מורד
 * הזרם — computePrice, distanceAndCoords, createOrder — כבר בנוי על כך).
 *
 * ⚠️⚠️ חסם פרטיות שדורש את גיא — ראו NIGHT-LOG.md בשורש ה-worktree. ⚠️⚠️
 * ההשלמה האוטומטית שולחת את מה שהמשתמש מקליד (תווים חלקיים, לפני שלחץ
 * "המשך") ל-Google Places Autocomplete. geo.js:5 מתעד שההשלמה הושמטה
 * במכוון בעבר בגלל מדיניות פרטיות — לא ידוע אם privacy.html מכסה כיום
 * שליחת הקלדות-תוך-כדי-הקלדה (להבדיל מכתובת סופית שנשלחת לגיאוקוד, שכן
 * מכוסה). ממומש כאן לפי הנחיית "ממש את זה", אבל לא לפרוס לפני שגיא מאשר
 * שהפרטיות מכסה את זה.
 *
 * ⚠️ חסם נפרד, טכני: ההשלמה עובדת **רק למשתמש מחובר**. המפתח של Google
 * יושב בפרוקסי `mapsProxy` (Hovalot/functions/src/mapsProxy.ts), שדורש
 * טוקן Firebase Auth תקף — כך שהוא נבנה במקור עבור האפליקציה (שם המשתמש
 * תמיד מחובר) ולא נועד לשמש אורח אנונימי. באתר יש גם זרימת אורח (ראו
 * guest-checkout.js) — ולאורח אין טוקן, ה-proxy מחזיר 401. **אין כאן שום
 * proxy חלופי, ואין מנדט במשימה הזו לפרוס אחד חדש** (זה קוד Hovalot, לא
 * rozic-move, ופריסת Cloud Function היא פעולה על תשתית ייצור משותפת —
 * מחוץ להיקף worktree האתר). הפתרון: משתמש מחובר מקבל השלמה אמיתית
 * (בדיוק כמו באפליקציה); אורח מקבל שדה חופשי + אימות רקע לא-חוסם דרך
 * geocodeAddress הקיים (זהה למה שהיה קודם, רק עם badge). ראו NIGHT-LOG.md.
 */
import { doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';
import { db } from './firebase.js';
import { geocode } from './geo.js';

const MAPS_PROXY_URL = 'https://us-central1-hovalot-6cf65.cloudfunctions.net/mapsProxy';
const MAX_SAVED_ADDRESSES = 8; // זהה ל-MAX_SAVED_ADDRESSES ב-AuthContext.tsx
const MAX_RECENT_ADDRESSES = 10; // זהה ל-addRecentAddress ב-AuthContext.tsx
const DEBOUNCE_MS = 350;

const escHtml = (v) => String(v ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/** קריאה לפרוקסי mapsProxy — אותו חוזה בדיוק כמו src/services/mapsApi.ts באפליקציה. */
async function callMapsProxy(authUser, endpoint, params) {
  if (!authUser) return null;
  try {
    const token = await authUser.getIdToken();
    const res = await fetch(MAPS_PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ endpoint, params }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function placeAutocomplete(authUser, input, sessionToken) {
  return callMapsProxy(authUser, 'autocomplete', {
    input, components: 'country:il', language: 'he', types: 'geocode', sessiontoken: sessionToken,
  });
}

function placeDetails(authUser, placeId, sessionToken) {
  return callMapsProxy(authUser, 'placeDetails', {
    place_id: placeId, fields: 'geometry,formatted_address', language: 'he', sessiontoken: sessionToken,
  });
}

/**
 * `users/{uid}/private/addresses` — אותו מסמך ואותם שני שדות בדיוק
 * (savedAddresses/recentAddresses) שהאפליקציה קוראת/כותבת ב-AuthContext.tsx.
 * אותו משתמש, אותו פרויקט Firebase — כתובת שנשמרה באפליקציה מופיעה כאן
 * וההפך.
 */
async function loadAddresses(uid) {
  try {
    const snap = await getDoc(doc(db, 'users', uid, 'private', 'addresses'));
    const data = snap.exists() ? snap.data() : {};
    return { saved: data.savedAddresses ?? [], recent: data.recentAddresses ?? [] };
  } catch {
    return { saved: [], recent: [] };
  }
}
async function writeAddresses(uid, patch) {
  try { await setDoc(doc(db, 'users', uid, 'private', 'addresses'), patch, { merge: true }); }
  catch { /* כשל שקט: הכתובת עדיין נבחרה ומולאה בשדה, רק לא נשמרה לפעם הבאה */ }
}
function addRecent(uid, cache, address) {
  const deduped = [address, ...cache.recent.filter((a) => a !== address)].slice(0, MAX_RECENT_ADDRESSES);
  cache.recent = deduped;
  writeAddresses(uid, { recentAddresses: deduped });
}
function toggleSaved(uid, cache, address) {
  const isSaved = cache.saved.includes(address);
  const updated = isSaved
    ? cache.saved.filter((a) => a !== address)
    : [address, ...cache.saved.filter((a) => a !== address)].slice(0, MAX_SAVED_ADDRESSES);
  cache.saved = updated;
  writeAddresses(uid, { savedAddresses: updated });
  return !isSaved;
}

function debounce(fn, ms) {
  let t = null;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

/**
 * מרכיבה רכיב כתובת סביב `<input id="${prefix}">` קיים. מצפה לאלמנטים
 * שכבר קיימים ב-HTML: `${prefix}-field`, `${prefix}-chips`,
 * `${prefix}-chips-list`, `${prefix}-dropdown`, `${prefix}-hint`,
 * `${prefix}-badge` (ראו apartment.html/small-move.html, שלב 3).
 *
 * ⚠️ לא נוגעת בערך של ה-input מעבר לבחירה מפורשת של המשתמש (הצעה/צ'יפ) —
 * הקוד הקיים ממשיך לקרוא `document.getElementById(prefix).value` בדיוק
 * כמו היום (delivery-continue-btn, applyDraftToForm). זו תוספת שכבת UX
 * מעל השדה, לא שינוי בחוזה שלו.
 */
export function mountAddressField({ prefix, authState }) {
  const input = document.getElementById(prefix);
  const field = document.getElementById(`${prefix}-field`);
  const chipsWrap = document.getElementById(`${prefix}-chips`);
  const chipsList = document.getElementById(`${prefix}-chips-list`);
  const dropdown = document.getElementById(`${prefix}-dropdown`);
  const hint = document.getElementById(`${prefix}-hint`);
  const badge = document.getElementById(`${prefix}-badge`);
  if (!input || !field) return;

  const authUser = authState?.authUser ?? null;
  const uid = authUser?.uid ?? null;
  let sessionToken = Math.random().toString(36).slice(2);
  let addressCache = { saved: [], recent: [] };
  let activeTab = 'fav';
  let confirmed = !!input.value.trim();

  function setBadge(kind, text) {
    if (!badge) return;
    if (!kind) { badge.hidden = true; badge.textContent = ''; return; }
    badge.hidden = false;
    badge.className = `address-badge ${kind}`;
    badge.textContent = text;
  }

  function hideDropdown() { if (dropdown) { dropdown.hidden = true; dropdown.innerHTML = ''; } }

  function renderChips() {
    if (!chipsWrap || !chipsList) return;
    const list = activeTab === 'fav' ? addressCache.saved : addressCache.recent;
    const showRow = !confirmed && (addressCache.saved.length > 0 || addressCache.recent.length > 0);
    chipsWrap.hidden = !showRow;
    if (!showRow) return;
    if (list.length === 0) {
      chipsList.innerHTML = `<span class="address-chip-empty">${activeTab === 'fav' ? 'אין עדיין כתובות מועדפות' : 'אין עדיין כתובות אחרונות'}</span>`;
      return;
    }
    // "מועדפות" — צ'יפ בחירה בלבד, כמו ב-AddressInput. "אחרונות" — עם כפתור
    // כוכב להוספה למועדפות (showFavoriteToggle, אותה הבחנה בדיוק).
    chipsList.innerHTML = list.map((addr) => `
      <span class="address-chip" data-addr="${escHtml(addr)}">
        <button type="button" class="address-chip-select">${escHtml(addr)}</button>
        ${activeTab === 'recent' ? `<button type="button" class="address-chip-star" aria-label="שמור כתובת" aria-pressed="${addressCache.saved.includes(addr)}">${addressCache.saved.includes(addr) ? '★' : '☆'}</button>` : ''}
      </span>
    `).join('');
    chipsList.querySelectorAll('.address-chip-select').forEach((btn) => {
      btn.addEventListener('click', () => selectAddressText(btn.closest('.address-chip').dataset.addr, { verify: true }));
    });
    chipsList.querySelectorAll('.address-chip-star').forEach((btn) => {
      btn.addEventListener('click', () => {
        const addr = btn.closest('.address-chip').dataset.addr;
        const nowSaved = toggleSaved(uid, addressCache, addr);
        btn.textContent = nowSaved ? '★' : '☆';
        btn.setAttribute('aria-pressed', String(nowSaved));
      });
    });
  }

  if (chipsWrap) {
    chipsWrap.querySelectorAll('.address-chip-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        activeTab = tab.dataset.tab;
        chipsWrap.querySelectorAll('.address-chip-tab').forEach((t) => {
          const on = t === tab;
          t.classList.toggle('active', on);
          t.setAttribute('aria-selected', String(on));
        });
        renderChips();
      });
    });
  }

  if (uid) {
    loadAddresses(uid).then((data) => { addressCache = data; renderChips(); });
  }

  /** בוחר כתובת סופית (מהצעה, מצ'יפ, או מהקלדה חופשית) — משותף לכל הנתיבים. */
  function selectAddressText(text, { verify }) {
    input.value = text;
    confirmed = true;
    hideDropdown();
    renderChips();
    if (uid) addRecent(uid, addressCache, text);
    if (verify) verifyInBackground(text);
  }

  /**
   * אימות לא-חוסם ברקע — בדיוק כמו `distanceAndCoords`/`scheduleBackgroundGeocode`
   * באפליקציה: כשל אינו חוסם המשך, רק אין badge ירוק. משמש גם למי שבחר
   * מהרשימה/צ'יפ (אין lat/lng משם — ראו placeDetails, רק formatted_address)
   * וגם לאורח שמקליד חופשי (ה-badge היחיד שיש לו, ראו onInput).
   */
  const verifyInBackground = debounce(async (text) => {
    if (!text.trim()) { setBadge(null); return; }
    const result = await geocode(text);
    if (input.value.trim() !== text.trim()) return; // המשתמש כבר המשיך הלאה
    setBadge(result ? 'ok' : 'warn', result ? 'כתובת אומתה' : 'לא הצלחנו לאמת אוטומטית — אפשר להמשיך בכל זאת');
  }, DEBOUNCE_MS);

  async function renderPredictions(text) {
    const data = await placeAutocomplete(authUser, text, sessionToken);
    if (input.value.trim() !== text.trim()) return; // staleness guard — כמו ב-AddressInput.search
    const predictions = data?.predictions ?? [];
    if (predictions.length === 0) {
      dropdown.innerHTML = '<div class="address-dropdown-empty">לא נמצאו הצעות — אפשר להמשיך להקליד את הכתובת המלאה</div>';
      dropdown.hidden = false;
      return;
    }
    dropdown.innerHTML = predictions.slice(0, 6).map((p, i) => `
      <button type="button" data-i="${i}">
        <div class="address-dropdown-main">${escHtml(p.structured_formatting?.main_text ?? p.description)}</div>
        <div class="address-dropdown-sub">${escHtml(p.structured_formatting?.secondary_text ?? '')}</div>
      </button>
    `).join('');
    dropdown.hidden = false;
    dropdown.querySelectorAll('button').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const p = predictions[Number(btn.dataset.i)];
        selectAddressText(p.description, { verify: false });
        const details = await placeDetails(authUser, p.place_id, sessionToken);
        sessionToken = Math.random().toString(36).slice(2); // סוגר סשן חיוב — ראו ⚠️ 16.9 ב-AddressInput.tsx
        const loc = details?.result?.geometry?.location;
        if (loc && input.value.trim() === p.description.trim()) {
          input.dataset.lat = String(loc.lat);
          input.dataset.lng = String(loc.lng);
          setBadge('ok', 'כתובת מאומתת');
        } else {
          setBadge('warn', 'נבחרה כתובת — לא אומתה במדויק, אפשר להמשיך בכל זאת');
        }
      });
    });
  }

  const onInputDebounced = debounce((text) => {
    if (uid) {
      if (text.length < 2) { hideDropdown(); return; }
      renderPredictions(text);
    } else {
      // אורח — אין דרך להציג הצעות (ראו הערת החסם למעלה), רק אימות רקע.
      verifyInBackground(text);
    }
  }, DEBOUNCE_MS);

  input.addEventListener('input', () => {
    confirmed = false;
    setBadge(null);
    renderChips();
    const text = input.value.trim();
    delete input.dataset.lat;
    delete input.dataset.lng;
    if (!text) { hideDropdown(); return; }
    onInputDebounced(text);
  });

  input.addEventListener('blur', () => {
    // השהיה קצרה כדי שלחיצה על הצעה/צ'יפ (mousedown לפני blur) תספיק להירשם.
    setTimeout(() => { if (document.activeElement !== input) hideDropdown(); }, 150);
  });

  document.addEventListener('click', (e) => {
    if (!field.contains(e.target)) hideDropdown();
  });

  // ⚠️ רק לאורח, ורק אם עוד לא הראנו הצעה כלשהי — ניואנס גילוי, לא חוסם.
  if (!uid && hint) hint.textContent = 'התחברות מאפשרת הצעות כתובת בזמן ההקלדה';

  renderChips();
  if (confirmed && input.value.trim()) verifyInBackground(input.value.trim());
}
