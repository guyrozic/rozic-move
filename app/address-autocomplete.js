/**
 * רכיב כתובת ברמת האפליקציה (0.2) — השלמה אוטומטית תוך כדי הקלדה, רשימת
 * הצעות, וכתובות שמורות/אחרונות. מקביל ל-AddressInput.tsx באפליקציה
 * (Hovalot/src/components/AddressInput.tsx), מצומצם למה שרלוונטי לשדה
 * טקסט חופשי בודד (ולא city/street/houseNumber מפורקים כמו באפליקציה —
 * שדות ה-from-address/to-address באתר הם מחרוזת אחת מההתחלה, וכל מורד
 * הזרם — computePrice, distanceAndCoords, createOrder — כבר בנוי על כך).
 *
 * ## פרטיות — נסגר, ולא לפתוח מחדש בלי לקרוא את זה
 * ההשלמה האוטומטית שולחת את מה שהמשתמש מקליד (תווים חלקיים, לפני שלחץ
 * "המשך") ל-Google Places Autocomplete. `geo.js:5` מתעד שההשלמה הושמטה
 * במכוון בעבר בדיוק מהסיבה הזו.
 *
 * ⚠️ **החסם הזה כבר הוסר.** `privacy.html` מכסה את זה במפורש ובהדגשה:
 * "כדי להציע לכם השלמה אוטומטית של הכתובת בזמן ההקלדה, הטקסט החלקי
 * שהקלדתם עד אותו רגע נשלח ל-Google — כלומר לא רק הכתובת הסופית שבחרתם,
 * אלא גם מה שהקלדתם בדרך אליה", כולל דרך המילוט ("אפשר להקליד את
 * הכתובת המלאה ולהתעלם מההצעות"). אומת 20.9 מול **הנוסח החי**
 * ב-rozicmove.com, לא מול הקובץ המקומי.
 *
 * משתמש מחובר וגם אורח מקבלים כעת את **אותה חוויית השלמה אוטומטית** —
 * dropdown הצעות תוך כדי הקלדה, ובחירה שמאמתת lat/lng דרך placeDetails.
 * ההבדל היחיד הוא הפרוקסי: משתמש מחובר → `mapsProxy`
 * (Hovalot/functions/src/mapsProxy.ts) עם טוקן Firebase Auth; אורח →
 * `placesAutocompleteGuest` (אותו ריפו, אותו חוזה JSON בדיוק —
 * `POST { endpoint, params }` — רק בלי Authorization, ה-Origin נשלח
 * אוטומטית ע"י הדפדפן). שני ה-endpoints מוחזרים דרך `placeAutocomplete`/
 * `placeDetails` למטה, שבוחרים בין השניים לפי `authUser`; כל שאר הקוד
 * (renderPredictions, selectAddressText, badge) משותף ולא יודע מי קרא.
 * ⚠️ **`placesAutocompleteGuest` פרוס וחי** (אומת 20.9: `functions:list`,
 * וקריאה אמיתית שהחזירה הצעות). ההערה הקודמת כאן אמרה "עדיין לא פרוס"
 * והתיישנה — אורח מקבל היום הצעות אמיתיות, לא רשימה ריקה.
 *
 * ⚠️ **הפונקציה מסננת לפי `Origin`**, ולכן קריאה מ-`localhost` מקבלת
 * `403 forbidden origin`. כלומר **אי אפשר לבדוק את מסלול האורח בשרת
 * מקומי** — בדיקה כזו תיראה כמו כישלון של הפיצ'ר ואינה כזו. אימות
 * אמיתי הוא מול הדומיין החי בלבד.
 *
 * נתיב הכישלון עצמו נשאר רך ולא חוסם: `callPlacesAutocompleteGuest`
 * בולעת כשל ל-`null`, `renderPredictions` מציגה "לא נמצאו הצעות —
 * אפשר להמשיך להקליד את הכתובת המלאה", והשדה עצמו נשאר טקסט חופשי רגיל
 * (`required` בלבד, לא תלוי ב-badge/lat/lng — ראו apartment.html/small-move.html).
 *
 * ⚠️ **63.5 — עיר/רחוב ללוח המובילים הפתוח.** בבחירת הצעה מהרשימה
 * (לא צ'יפ, לא הקלדה חופשית) `placeDetails` מבקשת גם `address_components`,
 * ו-`getAddressCityStreet(prefix)` מחזירה `{city, street}`/`null` לקורא
 * (apartment.html/small-move.html), שמעביר אותם ל-`fromCity`/`fromStreet`/
 * `toCity`/`toStreet` ב-`createOrder`. ראו `parseCityStreet` למטה.
 */
import { doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';
import { db } from './firebase.js';
import { geocode, reverseGeocodeGuest } from './geo.js';

const MAPS_PROXY_URL = 'https://us-central1-hovalot-6cf65.cloudfunctions.net/mapsProxy';
const PLACES_AUTOCOMPLETE_GUEST_URL = 'https://us-central1-hovalot-6cf65.cloudfunctions.net/placesAutocompleteGuest';
const MAX_SAVED_ADDRESSES = 8; // זהה ל-MAX_SAVED_ADDRESSES ב-AuthContext.tsx
const MAX_RECENT_ADDRESSES = 10; // זהה ל-addRecentAddress ב-AuthContext.tsx
const DEBOUNCE_MS = 350;

const escHtml = (v) => String(v ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/** קריאה לפרוקסי mapsProxy (משתמש מחובר) — אותו חוזה בדיוק כמו src/services/mapsApi.ts באפליקציה. */
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

/**
 * קריאה ל-placesAutocompleteGuest (Hovalot, פונקציית Cloud ציבורית/לא-מאומתת)
 * — אורח בלי חשבון. אותו חוזה JSON בדיוק כמו callMapsProxy (`POST { endpoint,
 * params }`, אותה תשובה גולמית מ-Google), רק בלי Authorization; ה-Origin
 * נשלח אוטומטית ע"י הדפדפן ולא ניתן (ואין צורך) להוסיף אותו ידנית ב-JS.
 * כשל — רשת, CORS, או שה-endpoint עוד לא פרוס — נבלע ל-null בדיוק כמו
 * ב-callMapsProxy, כדי ש-renderPredictions יתייחס אליו כ"אין הצעות" ולא יחסום.
 */
async function callPlacesAutocompleteGuest(endpoint, params) {
  try {
    const res = await fetch(PLACES_AUTOCOMPLETE_GUEST_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint, params }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/** מנתב בין שני הפרוקסי לפי authUser — כל שאר הקוד (renderPredictions וכו') לא יודע מי ענה. */
function placeAutocomplete(authUser, input, sessionToken) {
  const params = { input, components: 'country:il', language: 'he', types: 'geocode', sessiontoken: sessionToken };
  return authUser
    ? callMapsProxy(authUser, 'autocomplete', params)
    : callPlacesAutocompleteGuest('autocomplete', params);
}

function placeDetails(authUser, placeId, sessionToken) {
  // `address_components` נוסף ב-63.5 כדי לחלץ עיר/רחוב ללוח המובילים
  // הפתוח (ראו parseCityStreet למטה) — בלי מספר בית, שיושב רק ב-
  // `orders/{id}/private/contact` אחרי שיבוץ מוביל.
  const params = { place_id: placeId, fields: 'geometry,formatted_address,address_components', language: 'he', sessiontoken: sessionToken };
  return authUser
    ? callMapsProxy(authUser, 'placeDetails', params)
    : callPlacesAutocompleteGuest('placeDetails', params);
}

/**
 * מפרקת `address_components` של Google Place Details לעיר/רחוב — פורט
 * 1:1 מ-`parseGoogleAddressComponents` ב-
 * `Hovalot/src/utils/googleAddressComponents.ts` (לא מיפוי `types` עצמאי).
 * מספר הבית (`street_number`/`premise` שם) לא מחולץ כאן בכוונה: הוא לא
 * נכתב לשום מקום באתר היום — המסמך הראשי מקבל רק עיר/רחוב (הכרעת גיא
 * 63.5), והכתובת המלאה (כולל מספר) ממשיכה להגיע כמחרוזת חופשית אל
 * `orders/{id}/private/contact`.
 */
function parseCityStreet(comps) {
  const get = (type) => comps.find((c) => c.types?.includes(type))?.long_name ?? '';
  return {
    city: get('locality') || get('administrative_area_level_2') || get('sublocality_level_1'),
    street: get('route'),
  };
}

/**
 * גיאוקודינג הפוך — נ"צ → כתובת. מנתבת בין שני הפרוקסי לפי `authUser`,
 * בדיוק כמו `placeAutocomplete`/`placeDetails` לעיל: מחובר → `mapsProxy`
 * (endpoint `geocode` עם `latlng`, כמו `reverseGeocode` ב-
 * `Hovalot/src/services/mapsApi.ts`); אורח → `reverseGeocodeGuest`
 * (`./geo.js`), שקוראת ל-`geocodeAddress` — הפתוחה לאורח, שהורחבה ב-25.9
 * (הכרעת גיא 70.1א) לקבל גם `lat`/`lng` ולא רק `address`.
 *
 * ⚠️ **עד 25.9 המסלול הזה דרש `authUser` ולא נפל לאורח בכלל** — `mapsProxy`
 * דורש טוקן, ול-`placesAutocompleteGuest` (הפרוקסי הפתוח לאורח) אין
 * endpoint גיאוקודינג הפוך. `apartment.html`/`small-move.html` תומכים
 * במפורש בזרימת אורח (`getAuthOptional`, 14.9), ולכן זו הייתה מגבלת שרת
 * אמיתית שחסמה GPS/מפה לאורח — לא רק לקוח. הוסרה כשהשרת נפתח.
 *
 * שני המסלולים מחזירים אותה צורה (`{ city, street, fullAddress }`), כדי
 * שכל קורא — `useMyLocation`, `openAddressMapPicker` — יטפל בתוצאה בלי
 * להבחין מי ענה. מעדיפה את התוצאה הכי ספציפית שגוגל מחזירה במסלול המחובר —
 * מראה `pickBestReverseGeocodeResult` ב-`LocationConfirmMap.tsx`: כתובת
 * מלאה, ואם אין אז רחוב, ואם אין אז לפחות שם היישוב. במסלול האורח הבחירה
 * הזו כבר נעשית בשרת (`geocodeAddress`'s `tooCoarse`), ולכן `formattedAddress`
 * שמתקבל משם מועבר כמו שהוא.
 */
export async function reverseGeocode(authUser, lat, lng) {
  if (!authUser) {
    const guest = await reverseGeocodeGuest(lat, lng);
    if (!guest) return null;
    const { city, street } = parseCityStreet(guest.components ?? []);
    return { city, street, fullAddress: guest.formattedAddress };
  }
  const data = await callMapsProxy(authUser, 'geocode', { latlng: `${lat},${lng}`, language: 'he' });
  const results = data?.results ?? [];
  const best = results.find((r) => r.types?.includes('street_address'))
    ?? results.find((r) => r.types?.includes('route'))
    ?? results.find((r) => r.types?.includes('locality'));
  if (!best) return null;
  const { city, street } = parseCityStreet(best.address_components ?? []);
  return { city, street, fullAddress: best.formatted_address ?? '' };
}

/**
 * עיר/רחוב שחולצו מ-`address_components` בבחירת ההצעה האחרונה מהרשימה
 * החיה, או `null`. **בכוונה `null` ולא ניחוש** — כתובת שהוקלדה חופשי,
 * נבחרה מצ'יפ מועדף/אחרון, או ש-Google לא סיפק רכיבים, אינן ניתנות
 * לפירוק אמין (רגקס על "רחוב מספר, עיר" נשבר על שמות רחוב מרובי-מילים
 * וישובים בלי רחוב). ראו המשימה ב-CLAUDE.md, סעיף ⚠️ הכרעת "אין
 * address_components".
 */
export function getAddressCityStreet(prefix) {
  const input = document.getElementById(prefix);
  const city = input?.dataset.city;
  if (!city) return null;
  return { city, street: input.dataset.street || null };
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
  // 25.9 — מערך המיקום (GPS + מפה), מקביל ל-"מצא לפי המיקום"/מפת האישור
  // ב-AddressInput.tsx/LocationConfirmMap.tsx. שלושתם אופציונליים בכוונה
  // (getElementById מחזיר null אם דף לא הוסיף אותם) — עמוד שלא הוסיף את
  // המרקאפ החדש ממשיך לעבוד בדיוק כמו היום, בלי הפיצ'ר.
  const locRow = document.getElementById(`${prefix}-loc-row`);
  const locBtn = document.getElementById(`${prefix}-loc-btn`);
  const locBtnText = locBtn?.querySelector('.address-loc-btn-text') ?? null;
  const locStatus = document.getElementById(`${prefix}-loc-status`);
  const mapBtn = document.getElementById(`${prefix}-map-btn`);
  const mapBtnText = mapBtn?.querySelector('.address-map-btn-text') ?? null;
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

  /**
   * מציג/מסתיר את שורת "המיקום הנוכחי שלי" ומחליף את נוסח כפתור המפה —
   * נקראת מכל נקודה שמשנה `confirmed` (ראו קריאות ל-renderChips למטה,
   * שכל אחת מהן היא בדיוק נקודת שינוי כזו).
   *
   * ⚠️ **סטייה מודעת אחת מהאפליקציה**: שם כפתור המפה (`mapCheckBtn`)
   * מוצג רק אחרי שכבר יש כתובת (`isComplete`) — הוא כלי לדיוק/אימות,
   * לא שיטת קלט ראשית. כאן הוא **תמיד** גלוי, גם לפני שהוקלד דבר, לפי
   * הבקשה המפורשת של גיא (25.9): "עם אפשרות לבחור ממפה **או** ממיקום
   * נוכחי" — שני מסלולי קלט שווים, לא רק עידון של הקלדה. הנוסח עצמו
   * כן מתחלף בדיוק כמו באפליקציה (`isVerified ? 'ודא/דייק...' : '...'`).
   */
  function syncLocationUI() {
    if (locRow) locRow.hidden = confirmed;
    if (mapBtnText) mapBtnText.textContent = confirmed ? 'דייק מיקום על המפה' : 'בחר ממפה';
  }

  function renderChips() {
    syncLocationUI();
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
   * באפליקציה: כשל אינו חוסם המשך, רק אין badge ירוק. משמש למי שבחר
   * צ'יפ מועדף/אחרון (אין lat/lng משם — ראו placeDetails, רק
   * formatted_address) וגם לערך שכבר היה בשדה בעת העלייה (ראו `confirmed`
   * בסוף הפונקציה, למשל שחזור טיוטה). הקלדה חיה — מחובר או אורח כאחד —
   * עוברת ב-onInputDebounced/renderPredictions, לא כאן.
   */
  const verifyInBackground = debounce(async (text) => {
    if (!text.trim()) { setBadge(null); return; }
    const result = await geocode(text);
    if (input.value.trim() !== text.trim()) return; // המשתמש כבר המשיך הלאה
    /**
     * ⚠️ 22.9 — **כאן נגזרים העיר והרחוב, ולא רק ה-badge.**
     *
     * עד היום הפונקציה הזאת עשתה דבר אחד: לצבוע badge. `dataset.city`/
     * `dataset.street` נכתבו **רק** במסלול השני, של בחירה מההצעות
     * (`renderPredictions` → `placeDetails` → `parseCityStreet`).
     * המשמעות: מי שבחר כתובת מצ'יפ שמור יצר הזמנה שבה אותו צד
     * (`fromCity`/`fromStreet` או `toCity`/`toStreet`) **null**.
     *
     * נמדד על הזמנה אמיתית מהאתר (#834268, 22.9): היעד הוקלד ונבחר
     * מההצעות ויצא מלא, המוצא נבחר מצ'יפ ויצא ריק — וכרטיס ההזמנה
     * בשוק המובילים הופיע **בלי שורת "מוצא" בכלל**.
     *
     * ההערה שמעל הפונקציה כבר ציינה ש"אין lat/lng משם", אבל לא הבחינה
     * שגם העיר והרחוב חסרים. עכשיו `geocode` מחזיר את
     * `address_components` ואותו `parseCityStreet` בדיוק רץ על שניהם,
     * כך שאין שני מסלולים שגוזרים אחרת.
     */
    const parsed = result?.components ? parseCityStreet(result.components) : null;
    if (parsed?.city) {
      input.dataset.city = parsed.city;
      if (parsed.street) input.dataset.street = parsed.street;
      else delete input.dataset.street;
    }
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
          // עיר בלי רחוב עדיין שימושית ללוח (יישוב בלי שם רחוב, למשל
          // קדש ברנע) — רחוב בלי עיר לא, ולכן התנאי הוא על עיר בלבד.
          const comps = details?.result?.address_components;
          const parsed = comps ? parseCityStreet(comps) : null;
          if (parsed?.city) {
            input.dataset.city = parsed.city;
            if (parsed.street) input.dataset.street = parsed.street;
            else delete input.dataset.street;
          } else {
            delete input.dataset.city;
            delete input.dataset.street;
          }
          setBadge('ok', 'כתובת מאומתת');
        } else {
          setBadge('warn', 'נבחרה כתובת — לא אומתה במדויק, אפשר להמשיך בכל זאת');
        }
      });
    });
  }

  const onInputDebounced = debounce((text) => {
    // uid ולא-uid עוברים באותו נתיב — placeAutocomplete מנתב פנימית בין
    // mapsProxy (מחובר) ל-placesAutocompleteGuest (אורח), ראו למעלה.
    if (text.length < 2) { hideDropdown(); return; }
    renderPredictions(text);
  }, DEBOUNCE_MS);

  input.addEventListener('input', () => {
    confirmed = false;
    setBadge(null);
    renderChips();
    const text = input.value.trim();
    delete input.dataset.lat;
    delete input.dataset.lng;
    delete input.dataset.city;
    delete input.dataset.street;
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

  /**
   * מפעילה כתובת שנפתרה מ-GPS או מהמפה — משותף לשני המקורות, מראה
   * `useMyLocation`/`onConfirm` ב-`AddressInput.tsx`/`LocationConfirmMap.tsx`.
   * **לא** עוברת דרך אירוע ה-`input` (שמאפס lat/lng/city/street בכל הקלדה —
   * ראו למעלה): מדובר בבחירה מאומתת, לא בהקלדה חדשה, בדיוק כמו בחירת
   * הצעה/צ'יפ קיימת.
   */
  function applyResolvedLocation(loc, badgeText) {
    input.value = loc.fullAddress;
    confirmed = true;
    hideDropdown();
    renderChips();
    input.dataset.lat = String(loc.lat);
    input.dataset.lng = String(loc.lng);
    if (loc.city) input.dataset.city = loc.city; else delete input.dataset.city;
    if (loc.street) input.dataset.street = loc.street; else delete input.dataset.street;
    setBadge('ok', badgeText);
    if (uid) addRecent(uid, addressCache, loc.fullAddress);
  }

  /**
   * "השתמש במיקום הנוכחי שלי" — GPS. מראה `useMyLocation` ב-`AddressInput.tsx`
   * שורה־שורה: אותם ארבעה מסלולי כשל, בלי דיאלוג שגיאה טכני (הנחיה מפורשת
   * של גיא בעבר) — הודעה קצרה ליד הכפתור, וחזרה בחן לשדה הידני.
   *
   * ⚠️ **הבדל מדויק אחד מהאפליקציה, מתחייב מהמשטח**: אין `ensureLocationPermission`
   * נפרד — הדפדפן עצמו שואל הרשאה בתוך `getCurrentPosition`, ואין API
   * לשאול "יש הרשאה?" מראש בלי לבקש אותה (בניגוד ל-`expo-location`).
   * ⚠️ Geolocation דורש הקשר מאובטח (HTTPS) — `rozicmove.com` עומד בזה.
   * `localhost` נחשב הקשר מאובטח גם הוא (כלל דפדפנים סטנדרטי), כך שבדיקה
   * מקומית עדיין יכולה לתת/לדחות הרשאה אמיתית — רק דיוק ה-GPS עצמו עשוי
   * להיות שונה ממכשיר נייד אמיתי.
   */
  const LOCATE_MSG = {
    denied: 'אין הרשאת מיקום. אפשר לאשר בהגדרות הדפדפן, או להקליד את הכתובת.',
    unavailable: 'לא הצלחתי לאתר את המיקום. בדוק שה-GPS דלוק, או הקלד את הכתובת.',
    timeout: 'לא הצלחנו לאתר מיקום בזמן. אפשר לנסות שוב או להקליד ידנית.',
    noAddress: 'מצאתי את המיקום אבל לא כתובת שמתאימה לו. אפשר להקליד ידנית.',
    generic: 'משהו השתבש באיתור המיקום. אפשר לנסות שוב או להקליד ידנית.',
    unsupported: 'איתור מיקום אינו נתמך בדפדפן הזה. אפשר להקליד את הכתובת.',
  };
  function setLocStatus(msg) {
    if (!locStatus) return;
    locStatus.textContent = msg || '';
    locStatus.hidden = !msg;
  }
  async function useMyLocation() {
    if (!locBtn || locBtn.disabled) return;
    if (!navigator.geolocation) { setLocStatus(LOCATE_MSG.unsupported); return; }
    locBtn.disabled = true;
    locBtn.setAttribute('aria-busy', 'true');
    if (locBtnText) locBtnText.textContent = 'מאתר את המיקום שלך…';
    setLocStatus('');
    try {
      const pos = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true, timeout: 10000, maximumAge: 0,
        });
      });
      const { latitude: lat, longitude: lng } = pos.coords;
      const result = await reverseGeocode(authUser, lat, lng);
      if (!result || !result.fullAddress) { setLocStatus(LOCATE_MSG.noAddress); return; }
      // הנ"צ הן של המדידה עצמה, לא של תוצאת הגיאוקודינג — מראה useMyLocation
      // באפליקציה: הן מדויקות יותר, וזה מה שהמשתמש התכוון אליו בפועל.
      applyResolvedLocation({ lat, lng, fullAddress: result.fullAddress, city: result.city, street: result.street }, 'כתובת מהמיקום שלך');
    } catch (e) {
      if (e && typeof e.code === 'number') {
        if (e.code === 1) setLocStatus(LOCATE_MSG.denied);
        else if (e.code === 3) setLocStatus(LOCATE_MSG.timeout);
        else setLocStatus(LOCATE_MSG.unavailable);
      } else {
        setLocStatus(LOCATE_MSG.generic);
      }
    } finally {
      locBtn.disabled = false;
      locBtn.removeAttribute('aria-busy');
      if (locBtnText) locBtnText.textContent = 'השתמש במיקום הנוכחי שלי';
    }
  }
  if (locBtn) locBtn.addEventListener('click', useMyLocation);

  /**
   * "בחר ממפה" — טוען את מודול המפה (ומרכיב Leaflet שבתוכו) רק כשנלחץ,
   * לא בטעינת הדף. ראו `address-map.js` למימוש המלא. `authUser` מועבר גם
   * כשהוא `null` (אורח) — `reverseGeocode` מנתבת פנימית לפי זה, ראו שם.
   */
  if (mapBtn) {
    mapBtn.addEventListener('click', async () => {
      const { openAddressMapPicker } = await import('./address-map.js');
      const lat = input.dataset.lat ? Number(input.dataset.lat) : undefined;
      const lng = input.dataset.lng ? Number(input.dataset.lng) : undefined;
      const result = await openAddressMapPicker({ authUser, lat, lng, returnFocusEl: mapBtn });
      if (result) applyResolvedLocation(result, 'כתובת מאומתת');
    });
  }

  renderChips();
  if (confirmed && input.value.trim()) verifyInBackground(input.value.trim());
}
