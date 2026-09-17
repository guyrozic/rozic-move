// ══════════════════════════════════════════════════════════════════
//  טעינת תצורת מחירים חיה מ-Firestore (60.5) — מקבילה ל-
//  Hovalot/src/services/pricingConfig.ts (loadRemotePricingConfig).
//
//  האדמין משנה מחירים במסך התמחור באפליקציה, והשינוי נכתב ל-
//  config/pricing ו-config/itemPrices ב-Firestore. הקובץ הזה קורא את אותם
//  מסמכים בדיוק ומחיל אותם מעל ברירות המחדל המקומפלות של pricing.js — כך
//  ששינוי מחיר באפליקציה מופיע גם באתר, בלי פריסה מחדש.
//
//  ⚠️ חוק Firestore על config/{docId} הוא `allow read: if true` — כלומר גם
//  אורח (בלי התחברות) יכול לקרוא, ולכן זה עובד בכל דף, לפני/בלי auth.
//
//  כשל טעינה **אינו שובר את הדף** — נשארים על ברירות המחדל המקומפלות,
//  בדיוק כמו שהאפליקציה עושה (loadRemotePricingConfig עוטף ב-try).
// ══════════════════════════════════════════════════════════════════
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';
import { db } from './firebase.js';
import { applyPricingRates, applyItemPriceOverrides } from './data/pricing.js';

let loadPromise = null;

/**
 * טוען ומחיל את config/pricing + config/itemPrices. אידמפוטנטי: נטען פעם
 * אחת לכל טעינת דף (הבטחה ממוזגת) — קריאות חוזרות מחזירות את אותה הבטחה,
 * כך שאפשר לקרוא לו בבטחה מכמה מקומות בלי כפל בקשות.
 *
 * חובה ל-await אותו **לפני** חישוב/הצגת מחיר ראשונים בדף, אחרת המחיר
 * הראשון יוצג לפי ברירות המחדל המקומפלות ורק אז יתעדכן.
 */
export function loadRemotePricingConfig() {
  if (loadPromise) return loadPromise;
  // ⚠️ רשת-ביטחון: אם ה-getDoc נתקע (רשת גרועה), הדף לא ימתין לו לנצח —
  // אחרי 4 שניות ה-await משתחרר וממשיכים על ברירות המחדל. ה-fetch נמשך
  // ברקע וה-override עדיין יחול כשיגיע (המחיר מחושב מחדש בכל אינטראקציה).
  const fetchAndApply = (async () => {
    try {
      const [ratesSnap, itemsSnap] = await Promise.all([
        getDoc(doc(db, 'config', 'pricing')),
        getDoc(doc(db, 'config', 'itemPrices')),
      ]);
      if (ratesSnap.exists()) applyPricingRates(ratesSnap.data() || {});
      if (itemsSnap.exists()) applyItemPriceOverrides(itemsSnap.data() || {});
    } catch (err) {
      // נשארים על ברירות המחדל — לא מפילים את הדף על כשל רשת/הרשאה.
      console.warn('loadRemotePricingConfig: נשארתי על מחירי ברירת המחדל', err);
    }
  })();
  const timeout = new Promise((resolve) => setTimeout(resolve, 4000));
  loadPromise = Promise.race([fetchAndApply, timeout]);
  return loadPromise;
}
