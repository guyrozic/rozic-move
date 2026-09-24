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
  doc, setDoc, updateDoc, serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';

const CREATE_CHECKOUT_URL = 'https://us-central1-hovalot-6cf65.cloudfunctions.net/createGrowCheckout';
const CREATE_LOAD_GAP_CHECKOUT_URL = 'https://us-central1-hovalot-6cf65.cloudfunctions.net/createLoadGapCheckout';

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

/**
 * שינוי מועד להזמנה שטרם שולמה.
 *
 * ⚠️ הסכום **לא** נשלח ולא מחושב כאן. השרת מוודא שהמועד החדש נמצא
 * באותה מדרגת תוספת (שבת +50% · שישי +25% · שאר הימים 0), ולכן המחיר
 * זהה מעצם ההגדרה. מדרגה שונה מוחזרת כשגיאה `surge tier changed`
 * ולא נכתבת בשקט — ראו `functions/src/customerRescheduleOrder.ts`.
 */
const RESCHEDULE_URL = 'https://us-central1-hovalot-6cf65.cloudfunctions.net/customerRescheduleOrder';

export async function rescheduleOrder(orderId, scheduledDate, timeSlot) {
  if (!auth.currentUser) throw new Error('NOT_LOGGED_IN');
  const token = await auth.currentUser.getIdToken();
  const res = await fetch(RESCHEDULE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ orderId, scheduledDate, timeSlot: timeSlot || null }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error((data && data.error) || 'RESCHEDULE_FAILED');
  return data;
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

/* ══════════ פער בין המוזמן למובל — תוספת פריטים שהתגלתה בשטח ══════════

   ⚠️ **24.9 (98.2א) — זה נבנה כי בלעדיו לא הייתה שום דרך.**

   המוביל מדווח בשלב הפריקה על פריטים שיש בבית ולא הוזמנו
   (`LoadGapItemsScreen` באפליקציה), והלקוח מאשר ומשלם. עד היום הצד
   של הלקוח היה קיים **רק באפליקציה**: לא היה באתר אזכור אחד של
   `loadGap`, וההתראה נשלחת ב-`sendPushToUser` — שאין לה נמען אצל
   לקוח שהזמין מהאתר ואין לו אפליקציה.

   התוצאה, ולא בתיאוריה: המוביל עומד בבית הלקוח, שולח בקשה, **והלקוח
   לא רואה אותה בשום מקום ולא יכול לאשר.** זה נמצא בהרצה של הזמנה
   #834268, שנוצרה ושולמה באתר.

   הזרימה כאן היא מראה של `useLoadGapCheckout` + `handleDeclineLoadGap`
   ב-`OrderDetailsScreen.tsx`, עם ההבדל היחיד שמתחייב מהמשטח:
   באפליקציה נפתח דפדפן חיצוני והמסך ממתין; כאן `location.href` **הורס
   את הדף**, ולכן אין למי להמתין ואין מה להאזין — בדיוק אותו סייג
   שכבר מתועד ב-`startTipCheckout` למעלה. `growNotifyLoadGap` מסיימת
   את העבודה בשרת בלי קשר לאיזה דף פתוח אצל הלקוח.
   ─────────────────────────────────────────────────────────────────── */

/**
 * מעביר את הלקוח לדף הסליקה של Grow עבור תוספת הפריטים.
 *
 * ⚠️ **`fromWeb: true` אינו קישוט.** בלעדיו `createLoadGapCheckout` בונה
 * כתובת חזרה שמנסה deep-link אל האפליקציה — כלומר בדיוק הלקוח שבשבילו
 * המסך הזה נבנה היה חוזר לדף שמציע לו להוריד אפליקציה. אותה אמנה
 * בדיוק כמו `startGrowCheckout` למעלה.
 *
 * הסכום **אינו נשלח מכאן**: השרת קורא את `loadGapAmount` מההזמנה עצמה
 * ומוודא ש-`loadGapStatus === 'pending'`, כך שאי אפשר לפתוח סליקה
 * שנייה על אותה בקשה ואי אפשר לשנות את הסכום מהדפדפן.
 */
export async function startLoadGapCheckout(orderId) {
  if (!auth.currentUser) throw new Error('NOT_LOGGED_IN');
  const token = await auth.currentUser.getIdToken();
  const res = await fetch(CREATE_LOAD_GAP_CHECKOUT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ orderId, fromWeb: true }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.url) throw new Error((data && data.error) || 'CHECKOUT_FAILED');
  location.href = data.url;
}

/**
 * הלקוח מסרב לתוספת.
 *
 * ⚠️ **אין כאן שום תנועת כסף**, ולכן זו כתיבת קליינט ישירה ולא קריאה
 * לפונקציה — בדיוק כמו `respondToLoadGapCharge` ב-
 * `src/services/orders.ts`, ותחת אותו חוק Firestore. ההובלה ממשיכה
 * כרגיל (הכרעת 92.3), והרישום לאדמין נכתב ע"י הטריגר
 * `notifyAdminsOnLoadGapDeclined` ב-Admin SDK.
 *
 * שני השדות נכתבים יחד ובאותם שמות כמו באפליקציה — שדה שיחסר כאן
 * ייראה למוביל כבקשה שעדיין ממתינה.
 */
export async function declineLoadGap(orderId) {
  if (!auth.currentUser) throw new Error('NOT_LOGGED_IN');
  await updateDoc(doc(db, 'orders', orderId), {
    loadGapStatus: 'declined',
    loadGapRespondedAt: serverTimestamp(),
  });
}
