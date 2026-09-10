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
export const CRANE_PRICE_PER_FLOOR = { 'קרקע': 0, '1': 300, '2': 400, '3': 500, '4': 600, '5': 700, '6+': 900 };

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
    return { lat: data.lat, lon: data.lng };
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
  const [a, b] = await Promise.all([geocode(fromFullAddress), geocode(toFullAddress)]);
  if (!a || !b) return 0;
  return calcDistanceKm(a, b);
}

export function formatDateApp(d) {
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

export function parseDateApp(str) {
  const parts = (str || '').split('/').map(Number);
  return parts.length === 3 ? new Date(parts[2], parts[1] - 1, parts[0]) : new Date();
}
