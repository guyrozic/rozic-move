// Web equivalent of pieces of Hovalot's src/context/AuthContext.tsx and
// src/services/{notifications,blocks}.ts — everything in the "אזור אישי"
// (פאזה 2, 16.9) that isn't core sign-in/identity (that's auth.js) and isn't
// an order (that's orders.js). Same Firestore document shapes
// (users/{uid}/private/{addresses,notifications,blocks}) as the mobile app,
// so a change made from the website is visible to — and made by — the same
// account's app session, and vice versa.
import {
  deleteField, doc, getDoc, onSnapshot, serverTimestamp, setDoc, updateDoc,
} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';
import { db } from './firebase.js';

/* ══════════════════════════════════════════════════════════════════
   כתובות שמורות
   ══════════════════════════════════════════════════════════════════

   ⚠️ 21.8 באפליקציה: savedAddresses עבר מהמסמך הראשי (`users/{uid}`, שקריא
   לכל משתמש מחובר) אל `users/{uid}/private/addresses` — אחרת כל משתמש יכול
   היה לקרוא את כתובות הבית של כל אחד אחר. **לכתוב כאן ל-`users/{uid}`
   ישירות זו בדיוק הרגרסיה שתועדה שם** (מסך שכתב לשם קיבל הרשאה נדחתה, בלי
   הודעה, כי firestore.rules כבר לא מתירות שם את השדה). ראו auth.js —
   `state.profile` מגיע מ-`users/{uid}` בלבד ולעולם לא יכיל savedAddresses;
   הדף חייב לקרוא מהמנוי הנפרד למטה.

   אין כאן שכבת השלמה אוטומטית של כתובות (Google Places) כמו ב-AddressInput
   של האפליקציה — geo.js מתעד במפורש שהאתר עובד רק עם כתובת חופשית, ולכן גם
   כאן זו קלט טקסט חופשי בלבד.
*/

// זהה ל-MAX_SAVED_ADDRESSES ב-Hovalot/src/context/AuthContext.tsx — לא
// לשנות כאן בלי לשנות שם, אחרת התקרה בין האתר לאפליקציה נפרדת.
export const MAX_SAVED_ADDRESSES = 8;

function addressesRef(uid) {
  return doc(db, 'users', uid, 'private', 'addresses');
}

/** מנוי חי לכתובות השמורות. שגיאה (למשל הרשאות) מחזירה רשימה ריקה — כתובות לא אמורות לעולם להשבית מסך. */
export function subscribeToSavedAddresses(uid, callback) {
  return onSnapshot(
    addressesRef(uid),
    (snap) => {
      const data = snap.exists() ? snap.data()?.savedAddresses : null;
      callback(Array.isArray(data) ? data : []);
    },
    () => callback([]),
  );
}

/** מראה את `saveAddress` ב-AuthContext.tsx: דה-דופ (הכתובת החדשה עולה לראש) וחיתוך לתקרה. */
export async function saveAddress(uid, address) {
  const trimmed = (address ?? '').trim();
  if (!trimmed) return;
  const snap = await getDoc(addressesRef(uid));
  const current = Array.isArray(snap.data()?.savedAddresses) ? snap.data().savedAddresses : [];
  if (current.includes(trimmed)) throw { code: 'address/duplicate' };
  const deduped = [trimmed, ...current.filter(a => a !== trimmed)].slice(0, MAX_SAVED_ADDRESSES);
  await setDoc(addressesRef(uid), { savedAddresses: deduped }, { merge: true });
}

/** מראה את `removeSavedAddress` ב-AuthContext.tsx. */
export async function removeSavedAddress(uid, address) {
  const snap = await getDoc(addressesRef(uid));
  const current = Array.isArray(snap.data()?.savedAddresses) ? snap.data().savedAddresses : [];
  const updated = current.filter(a => a !== address);
  await setDoc(addressesRef(uid), { savedAddresses: updated }, { merge: true });
}

/* ══════════════════════════════════════════════════════════════════
   התראות
   ══════════════════════════════════════════════════════════════════

   `notificationsEnabled` יושב על מסמך המשתמש הראשי (לא private) והוא
   *משותף לכל המכשירים של החשבון* — לא דגל נפרד לדפדפן. כלומר כיבוי כאן
   משפיע גם על פושים באפליקציה של אותו חשבון בדיוק, לא רק על האתר. הדפדפן
   עצמו אינו רושם טוקן פוש (אין כאן service worker של Firebase Messaging),
   ולכן "הפעלה" מהאתר רק מסירה את הדגל שחוסם — טוקן אמיתי יירשם כשהאפליקציה
   הנייטיבית תיפתח מחדש (ראו App.tsx retry, מתועד ב-src/services/notifications.ts).
*/

/** מראה את `setNotificationPreference` ב-src/services/notifications.ts (הענף שלא תלוי בהרשאת OS, שאין לו מקבילה בדפדפן). */
export async function setNotificationPreference(uid, enabled) {
  await updateDoc(doc(db, 'users', uid), { notificationsEnabled: enabled });
  if (!enabled) {
    // מנקה גם את הטוקן הנייטיבי הקיים, כדי שכיבוי מהאתר עוצר בפועל גם
    // פושים באפליקציה של אותו חשבון — לא רק כותב דגל שאיש לא בודק.
    await setDoc(doc(db, 'users', uid, 'private', 'notifications'), { pushToken: null }, { merge: true });
  }
}

/* ══════════════════════════════════════════════════════════════════
   משתמשים חסומים
   ══════════════════════════════════════════════════════════════════

   מציג ומאפשר לבטל רק חסימות שהמשתמש **עצמו** יזם (למשל בלוח "מעבירים
   את זה הלאה" באפליקציה) — ראו src/services/blocks.ts. אין כאן כפתור
   "חסום" חדש: יצירת חסימה קורית היום רק מהקשר של מודעה/הזמנה קונקרטית,
   וזה נשאר שם. `blockedBy` (מי חסם אותי) לא מוצג כאן בכוונה — אותה הבחנה
   כמו BlockContext באפליקציה: חשיפת "מישהו חסם אותך" היא בדיוק המידע
   שממנו מתחילה הסלמה.
*/

function blocksRef(uid) {
  return doc(db, 'users', uid, 'private', 'blocks');
}

/** מנוי חי למי שהמשתמש חסם. שגיאה מחזירה מפה ריקה — ראו את אותו העיקרון ב-subscribeToSavedAddresses. */
export function subscribeToBlockedUsers(uid, callback) {
  return onSnapshot(
    blocksRef(uid),
    (snap) => {
      const data = snap.exists() ? snap.data()?.blocked : null;
      callback(data && typeof data === 'object' ? data : {});
    },
    () => callback({}),
  );
}

/** מראה את `unblockUser` ב-src/services/blocks.ts. */
export async function unblockUser(uid, targetId) {
  await updateDoc(blocksRef(uid), {
    [`blocked.${targetId}`]: deleteField(),
    updatedAt: serverTimestamp(),
  });
}

/* ══════════════════════════════════════════════════════════════════
   מובילים מועדפים
   ══════════════════════════════════════════════════════════════════

   `favoriteDrivers` יושב על מסמך המשתמש הראשי (`users/{uid}`, לא private) —
   בדיוק כמו notificationsEnabled — כי הלקוח עצמו הוא היחיד שכותב וקורא אותו
   דרך state.profile הרגיל. מראה `toggleFavoriteDriver` ב-AuthContext.tsx:
   לא arrayUnion/arrayRemove, אלא חישוב הרשימה בצד הלקוח וכתיבתה שלמה —
   כאן זה נשמר זהה כדי ששני הצדדים יתנהגו אותו דבר בעדכון בו-זמני.
*/

/** מראה את `toggleFavoriteDriver` ב-AuthContext.tsx. `currentFavorites` הוא user.favoriteDrivers כפי שהאתר כבר מחזיק אותו (state.profile). מחזיר את הרשימה החדשה, כדי שהמסך יעדכן תצוגה בלי לחכות למנוי חוזר. */
export async function toggleFavoriteDriver(uid, driverUid, currentFavorites) {
  const current = Array.isArray(currentFavorites) ? currentFavorites : [];
  const updated = current.includes(driverUid)
    ? current.filter(id => id !== driverUid)
    : [...current, driverUid];
  await updateDoc(doc(db, 'users', uid), { favoriteDrivers: updated });
  return updated;
}
