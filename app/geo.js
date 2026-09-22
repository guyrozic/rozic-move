// עזרי כתובת/מרחק/קומה משותפים — העתק של הלוגיקה הזהה שמשוכפלת באפליקציה
// (Hovalot: DeliveryDetailsScreen.tsx ו-SmallMoveAddressScreen.tsx, זהה בית-לבית).
// הגיאוקודינג נעשה מול Google Geocoding API — אותו מוצר ואותו פרויקט GCP (hovalot-6cf65)
// שהאפליקציה משתמשת בו ב-AddressInput.tsx, כדי שכתובות של לקוחות לא יגיעו לצד שלישי
// שאינו מכוסה במדיניות הפרטיות. באתר אין השלמה אוטומטית (Places Autocomplete) —
// רק חיפוש כתובת חופשית → נ"צ. חישוב המרחק עצמו (haversine × 1.3 מקדם כביש) זהה לאפליקציה.

const GEOCODE_TIMEOUT_MS = 6000;

export const FLOORS = ['קרקע', '1', '2', '3', '4', '5', '6+'];

export function getFloorNumber(floor) {
  if (floor === 'קרקע') return 0;
  if (floor === '6+') return 6;
  return parseInt(floor, 10) || 0;
}

/** Flat one-time crane surcharge by the item's own floor — NOT the unused hourly APARTMENT_CRANE_PRICE_PER_HOUR in pricing.ts (confirmed dead code in the app; this table is what's actually wired to both flows' UI). */
/**
 * ⚠️ 16.9 — `'קרקע'` היה **0** כאן ו-**300** באפליקציה, ו-`craneFloor`
 * מאותחל ל-`'קרקע'` בשני טפסי ההזמנה.
 *
 * כלומר לקוח שסימן "צריך מנוף" ולא נגע בבורר הקומה קיבל מנוף **בחינם**
 * דרך האתר, בזמן שאותה הזמנה בדיוק עלתה לו ₪300 באפליקציה. והאתר לא
 * רק גבה פחות — הוא **הציג לו במפורש** "🏗️ תוספת מנוף: ₪0", כלומר
 * הבטחה שאי אפשר לחזור ממנה אחרי ההזמנה.
 *
 * מיושר לאפליקציה לפי ההכרעה של גיא מ-11.9: *"תתקן את האתר שיהיה
 * באותו מבנה ותנאים בדיוק כמו באפליקציה."* ⚠️ זו **העלאת מחיר**
 * באתר, ולכן היא מסומנת בולט בדוח — הפיכה בספרה אחת אם הכוונה הייתה
 * שקומת קרקע פטורה.
 *
 * `'קרקע'` ו-`'1'` באותו מחיר אינו טעות אלא **מינימום קריאת מנוף**:
 * הגעת המנוף למקום עולה אותו דבר בין אם הפריט ברצפה או בקומה ראשונה.
 *
 * `npm run lint:drafts` ב-Hovalot (`check-web-pricing-sync`) מאמת שהטבלה
 * הזאת זהה לזו שב-`src/data/pricing.ts`, ונכשל על כל פער — בשני הכיוונים.
 */
export const CRANE_PRICE_PER_FLOOR = { 'קרקע': 300, '1': 300, '2': 400, '3': 500, '4': 600, '5': 700, '6+': 900 };

export function craneCostFor(floor) {
  return CRANE_PRICE_PER_FLOOR[floor] ?? 500;
}

/**
 * כתובת חופשית → { lat, lon } דרך Google Geocoding API, או null בכל כשל.
 * לא זורקת לעולם: ZERO_RESULTS / OVER_QUERY_LIMIT / REQUEST_DENIED / INVALID_REQUEST /
 * UNKNOWN_ERROR, שגיאת רשת, JSON פגום או timeout — כולם מחזירים null (הקורא, distanceBetween,
 * מתרגם null למרחק 0 ולא חוסם את ההמשך, כמו באפליקציה).
 */
/**
 * גיאוקודינג דרך פרוקסי בשרת שלנו — לא ישירות מול Google.
 *
 * 10.9: הוחלף מ-Nominatim (OpenStreetMap) לפי הכרעת גיא. המפתח של Google
 * יושב כסוד ב-Cloud Function `geocodeAddress` ולא בקוד הזה — כך שהוא לא
 * חשוף, לא ניתן לגניבה מהדפדפן, ומוגן במגבלת קצב ובתקרה יומית. הפונקציה
 * מקבלת רק בקשות שמקורן ב-rozicmove.com.
 *
 * החוזה נשמר בדיוק: `{ lat, lon }` או `null`. כל כשל — כולל timeout — מחזיר
 * `null` ולא זורק, כך שהקוראים (`distanceBetween`) ממשיכים כמו היום.
 */
const GEOCODE_PROXY_URL = 'https://us-central1-hovalot-6cf65.cloudfunctions.net/geocodeAddress';

export async function geocode(address) {
  const query = String(address ?? '').trim();
  if (!query) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 6000);
  try {
    const res = await fetch(GEOCODE_PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: query }),
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (typeof data?.lat !== 'number' || typeof data?.lng !== 'number') return null;
    // `components` מועבר הלאה כדי ש-`verifyInBackground` יוכל לגזור ממנו
    // עיר ורחוב לכתובת שנבחרה מצ'יפ שמור — ראו הנימוק המלא ב-
    // `functions/src/geocodeAddress.ts`. השדות הקיימים לא השתנו, וקורא
    // שאינו צריך אותו פשוט מתעלם.
    return { lat: data.lat, lon: data.lng, components: data.addressComponents ?? null };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export function calcDistanceKm(a, b) {
  const R = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLon = (b.lon - a.lon) * Math.PI / 180;
  const x = Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return Math.ceil(R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x)) * 1.3);
}

/** Geocodes two free-text addresses and returns the km distance, or 0 if either lookup fails (mirrors the app: distance stays 0, never blocks continuing). */
export async function distanceBetween(fromFullAddress, toFullAddress) {
  const { km } = await distanceAndCoords(fromFullAddress, toFullAddress);
  return km;
}

/**
 * כמו `distanceBetween`, אבל מחזירה גם את הנקודות עצמן.
 *
 * ## ⚠️ למה זה נוסף (15.9)
 * `flagSuspiciousOrderPrice` בשרת היא **ההגנה היחידה** מפני הזמנה
 * שנוצרת במחיר מזויף — חוקי Firestore תוחמים את `price` רק ל-
 * `0 < price <= 100000`, כלומר הזמנת דירה שלמה ב-₪1 עוברת אותם.
 *
 * והפונקציה הזאת **יוצאת מיד** אם חסר `fromLat/fromLng/toLat/toLng`.
 * האתר גאוקד את שתי הכתובות, החזיר ק"מ, **וזרק את הנקודות** — ולכן
 * רשת הביטחון מעולם לא רצה על אף הזמנה שנוצרה באתר. האפליקציה כן
 * מעבירה אותן, כך שההגנה כיסתה צד אחד בלבד.
 *
 * הנתון כבר היה בידינו. זה לא חישוב חדש — רק הפסקת זריקה שלו.
 * (בונוס: `TrackOrderScreen` באפליקציה לא הציג סמני מוצא/יעד להזמנות
 * מהאתר, מאותה סיבה בדיוק.)
 */
export async function distanceAndCoords(fromFullAddress, toFullAddress) {
  const [a, b] = await Promise.all([geocode(fromFullAddress), geocode(toFullAddress)]);
  if (!a || !b) return { km: 0, fromLat: null, fromLng: null, toLat: null, toLng: null };
  // ⚠️ `geocode` מחזירה `{lat, lon}` — **`lon`, לא `lng`** — בעוד ששם
  // השדה ב-Firestore ובאפליקציה הוא `lng`. הגרסה הראשונה של הפונקציה
  // הזאת קראה `a.lng` וקיבלה `undefined`, שהפך ל-`null` ב-`?? null`
  // בדרך ל-Firestore. התוצאה הייתה נראית בדיוק כמו המצב שהיא באה
  // לתקן — ארבעה שדות ריקים ורשת ביטחון שממשיכה לא לרוץ.
  return {
    km: calcDistanceKm(a, b),
    fromLat: a.lat, fromLng: a.lon,
    toLat: b.lat, toLng: b.lon,
  };
}

export function formatDateApp(d) {
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

export function parseDateApp(str) {
  const parts = (str || '').split('/').map(Number);
  return parts.length === 3 ? new Date(parts[2], parts[1] - 1, parts[0]) : new Date();
}
