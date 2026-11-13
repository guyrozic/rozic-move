// ⚠️ מראה של Hovalot/src/utils/serviceArea.ts. ההסבר המלא שם.
//
// 13.11, נמדד בסימולטור: טיוטה עם יעד בסן פרנסיסקו הציגה 15,464 ק"מ
// ו-₪139,176, והמסך הציע להמשיך לתשלום. חסימת הקלט בלבד אינה חסימה —
// טיוטה שנשמרה לפניה כבר נושאת את הנ"צ ומשוחזרת כ"כתובת מאומתת".
const ISRAEL_BOUNDS = { minLat: 29.3, maxLat: 33.4, minLng: 34.2, maxLng: 35.9 };
export const MAX_SERVICE_DISTANCE_KM = 700;

export function isInServiceArea(lat, lng) {
  if (typeof lat !== 'number' || typeof lng !== 'number') return true;
  return lat >= ISRAEL_BOUNDS.minLat && lat <= ISRAEL_BOUNDS.maxLat
    && lng >= ISRAEL_BOUNDS.minLng && lng <= ISRAEL_BOUNDS.maxLng;
}

export function checkServiceArea(from, to, distanceKm) {
  const outside = !isInServiceArea(from?.lat, from?.lng) || !isInServiceArea(to?.lat, to?.lng);
  if (outside) {
    return {
      title: 'הכתובת מחוץ לישראל',
      body: 'אחת הכתובות בהזמנה אינה בישראל, והשירות פועל בישראל בלבד. אפשר לתקן אותה ולהמשיך.',
    };
  }
  if (distanceKm > MAX_SERVICE_DISTANCE_KM) {
    return {
      title: 'המרחק אינו סביר',
      body: `חישבנו ${Math.round(distanceKm).toLocaleString('he-IL')} ק"מ בין הכתובות, וזה רחוק מכל מרחק אפשרי בישראל. כדאי לבדוק שתי הכתובות — כנראה אחת מהן לא מה שהתכוונת.`,
    };
  }
  return null;
}
