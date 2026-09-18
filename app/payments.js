// Calls the same createGrowCheckout Cloud Function the mobile app uses
// (functions/src/createGrowCheckout.ts) — it only needs a Firebase ID token
// (Bearer auth) and an orderId; the amount is always read server-side from the
// order doc itself, never trusted from the client.
//
// ⚠️ הסייג לטיפ (`startTipCheckout` למטה): שם הסכום **כן** מגיע מהלקוח,
// כי אין לו מקור אחר — הוא הסכום שהלקוח בחר. הוא נכתב למסמך ב-`orderTips`
// שחוקי Firestore אוכפים עליו `customerId == uid` ו-`0 < amount <= 5000`,
// ו-`createGrowCheckout` קוראת אותו **מהמסמך** ולא מגוף הבקשה. זה אותו
// מסלול בדיוק שהאפליקציה עוברת בו; מה שהלקוח לעולם אינו כותב הוא הזיכוי
// עצמו — `tipAmount` על ההזמנה נכתב רק ע"י `growNotify` ב-Admin SDK.
import { auth, db } from './firebase.js';
import {
  doc, setDoc, serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';

const CREATE_CHECKOUT_URL = 'https://us-central1-hovalot-6cf65.cloudfunctions.net/createGrowCheckout';

/** Redirects the browser to the Grow hosted payment page for this order. */
export async function startGrowCheckout(orderId) {
  if (!auth.currentUser) throw new Error('NOT_LOGGED_IN');
  const token = await auth.currentUser.getIdToken();
  const res = await fetch(CREATE_CHECKOUT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ orderId, fromWeb: true }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.url) throw new Error((data && data.error) || 'CHECKOUT_FAILED');
  location.href = data.url;
}

/* ──────────────────────────── טיפ למוביל ──────────────────────────── */

/**
 * הסכומים המוצעים — **אותם ערכים בדיוק** כמו במודאל הטיפ ב-
 * `OrderDetailsScreen.tsx` (`[0.05, 0.10, 0.15, 0.20]` אחוזים מהמחיר,
 * ו-`[10, 20, 30, 50]` סכומים קבועים). לא נבחרו כאן מחדש.
 */
export const TIP_PERCENT_OPTIONS = [0.05, 0.10, 0.15, 0.20];
export const TIP_FIXED_OPTIONS = [10, 20, 30, 50];

/**
 * המינימום והמקסימום לסכום חופשי.
 *
 * ⚠️ **שניהם נגזרים מחוק ה-Firestore, לא הומצאו כאן.** `match
 * /orderTips/{tipId}` ב-`~/Hovalot/firestore.rules` מתיר יצירה רק כאשר
 * `amount is number && amount > 0 && amount <= 5000` — וזהו החוק **המשותף**
 * לאפליקציה ולאתר, כלומר זה המינימום והמקסימום האמיתיים של המערכת.
 *
 * האפליקציה בודקת בצד שלה רק `n > 0` ונשענת על החוק שידחה סכום גבוה
 * מדי. כאן התקרה נבדקת גם מראש — לא כדי לקבוע גבול אחר, אלא כדי שלקוח
 * שמקליד 6,000 יקבל משפט מובן במקום שגיאת הרשאות סתומה. **הערך זהה.**
 */
export const TIP_MIN = 1;
export const TIP_MAX = 5000;

/**
 * טיפ למוביל על הזמנה שהושלמה — **אותו מסלול בדיוק כמו באפליקציה.**
 *
 * הזרימה באפליקציה (`useOrderTipCheckout` → `orderTips.ts`) היא:
 * 1. `setDoc` ל-`orderTips/{tip_<orderId>_<ts>}` עם `status:'pending_payment'`
 *    — כתיבת לקוח רגילה, שחוקי Firestore אוכפים עליה
 *    `customerId == uid` ו-`0 < amount <= 5000`.
 * 2. `createGrowCheckout` עם אותו מזהה; הפונקציה **מנתבת לפי התחילית
 *    `tip_`** לאוסף `orderTips`, מוודאת בעלות, וקוראת את הסכום מהמסמך.
 * 3. `growNotify` בלבד הופכת ל-`status:'paid'` ומזכה את המוביל.
 *
 * ⚠️ **שום סכום כסף אינו נכתב כאן על ההזמנה.** `tipAmount` ו-
 * `driverEarningsAmount` על `orders/{id}` נכתבים אך ורק ע"י `growNotify`
 * ב-Admin SDK, אחרי שהתשלום אושר בפועל ואחרי שהיא מאמתת שהטיפ מצביע על
 * הזמנה של אותו לקוח ואותו מוביל. הדפדפן יוצר בקשת תשלום, לא זיכוי.
 *
 * ## ההבדל היחיד מהאפליקציה, והוא מבני
 * האפליקציה פותחת דפדפן פנימי ו**נשארת חיה** מאחוריו, ולכן
 * `waitForTipConfirmed` יכולה להאזין ל-`orderTips/{id}` עד שהסטטוס
 * מתהפך. באתר `location.href` **הורס את הדף** — אין למי להאזין.
 * לכן ההמתנה לאישור עברה לצד השני של המסע: `payment-success.html`
 * מזהה מזהה שמתחיל ב-`tip_` וסוקר את אותו מסמך בדיוק.
 *
 * **ומה אם הלקוח סוגר את הדף באמצע?** בדיוק כמו באפליקציה: כלום.
 * מסמך הטיפ נשאר `pending_payment` לנצח, ההזמנה לא נגעה, המוביל לא
 * זוכה, ולא נגבה דבר — אלא אם Grow באמת חייבה, ואז `growNotify` מסיימת
 * את העבודה בשרת בלי קשר לשאלה איזה דף פתוח אצל הלקוח.
 *
 * @param {string} orderId ההזמנה שעליה ניתן הטיפ
 * @param {string} customerId בעל ההזמנה (= המשתמש המחובר)
 * @param {string} driverId המוביל שיזוכה
 * @param {number} amount ₪, שלם, בין TIP_MIN ל-TIP_MAX
 */
export async function startTipCheckout(orderId, customerId, driverId, amount) {
  if (!auth.currentUser) throw new Error('NOT_LOGGED_IN');
  if (!Number.isFinite(amount) || amount < TIP_MIN || amount > TIP_MAX) throw new Error('TIP_AMOUNT_INVALID');

  // אותו מבנה מזהה כמו `createTip()` ב-`src/services/orderTips.ts` —
  // התחילית היא מה ש-`createGrowCheckout` ו-`growNotify` מנתבות לפיו.
  const tipId = `tip_${orderId}_${Date.now()}`;
  await setDoc(doc(db, 'orderTips', tipId), {
    orderId,
    customerId,
    driverId,
    amount,
    status: 'pending_payment',
    createdAt: serverTimestamp(),
  });

  await startGrowCheckout(tipId);
}
