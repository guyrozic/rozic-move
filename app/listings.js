// Web equivalent of Hovalot's src/services/listings.ts. Scope pivot already removed
// the sale side app-wide (see project CLAUDE.md — "marketplace give&take, חינמי
// בלבד") so this only ever writes listingType:'free', matching the app today.
import {
  addDoc, collection, deleteDoc, doc, getDoc, getDocs, limit, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc, where,
} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';
import { db } from './firebase.js';

// Emoji substitutes for the app's {lib:'ion'|'mci', name} vector-icon refs — this
// site doesn't load those icon fonts, only the labels/keys need to stay identical.
export const CATEGORY_INFO = {
  furniture:   { icon: '🛋️', label: 'רהיטים' },
  electronics: { icon: '📺', label: 'אלקטרוניקה' },
  appliances:  { icon: '🧊', label: 'מכשירי חשמל' },
  clothing:    { icon: '👕', label: 'ביגוד' },
  sports:      { icon: '⚽', label: 'ספורט' },
  books:       { icon: '📚', label: 'ספרים' },
  other:       { icon: '📦', label: 'שונות' },
};

/** מודעה בודדת. `listings/{id}` הוא ציבורי (allow read: if true) — עובד גם בלי התחברות. */
export async function getListing(listingId) {
  const snap = await getDoc(doc(db, 'listings', listingId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/**
 * פרטי הקשר של המפרסם — טלפון וכתובת איסוף — יושבים בתת-מסמך נפרד ולא על
 * המודעה עצמה. `listings/{id}` הוא `allow read: if true` (יש דף מודעה ציבורי
 * ב-listing.html), ותת-המסמך דורש התחברות. קריאה תיכשל למשתמש אנונימי — זה
 * מכוון, ולכן הקוראים מטפלים ב-null במקום להציג שגיאה.
 */
export async function getListingContact(listingId) {
  const snap = await getDoc(doc(db, 'listings', listingId, 'private', 'contact'));
  return snap.exists() ? snap.data() : null;
}

export async function createListing(input) {
  // `userPhone`/`fromAddress` נשלפים החוצה ולא נכתבים על המודעה: firestore.rules
  // (contactFieldsAbsent) **אוסר** אותם שם במפורש, כי המודעה קריאה לכל אדם
  // באינטרנט בלי חשבון — כלומר כל אחד היה יכול לשלוף שם מלא + טלפון + כתובת
  // בית של כל מי שפרסם. זה בדיוק מה ש-src/services/listings.ts עושה באפליקציה.
  const { userPhone, fromAddress, ...publicFields } = input;
  const ref = await addDoc(collection(db, 'listings'), {
    ...publicFields,
    listingType: 'free',
    status: 'active',
    createdAt: serverTimestamp(),
  });
  // `?? null` ולא הערך הגולמי: `undefined` מפיל את הכתיבה כולה — כלומר המודעה
  // הציבורית נוצרת ותת-מסמך יצירת הקשר לא, מודעה חיה שאי אפשר ליצור קשר דרכה.
  await setDoc(doc(db, 'listings', ref.id, 'private', 'contact'), {
    userPhone: userPhone ?? null,
    fromAddress: fromAddress ?? null,
  });
  return ref.id;
}

export function subscribeToActiveListings(callback, category) {
  const constraints = [where('status', '==', 'active'), orderBy('createdAt', 'desc')];
  if (category) constraints.splice(1, 0, where('category', '==', category));
  const q = query(collection(db, 'listings'), ...constraints);
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(l => l.listingType === 'free'));
  });
}

/**
 * האם למשתמש יש מודעה — **הבסיס למדידת "מסר לפחות פריט אחד"** של
 * `giveaway-gate.js`.
 *
 * ⚠️ `limit(1)` ולא ספירה: השאלה היא "קיים לפחות אחד", וזו קריאת מסמך
 * אחת קבועה בלי קשר לכמה מודעות יש למשתמש. מונה (`getCountFromServer`)
 * היה עולה אותו דבר ומחזיר מידע שאיש לא מבקש.
 *
 * ⚠️ **אין כאן `orderBy`, ובכוונה.** `subscribeToUserListings` מתחת
 * מצרף `orderBy('createdAt')` ולכן תלוי באינדקס המורכב
 * `userId + createdAt` (קיים ב-`functions/firestore.indexes.json`).
 * השאילתה כאן היא שוויון בלבד — נענית מהאינדקס החד-שדי, בלי שום
 * אינדקס חדש לפרוס. `activeOnly` מוסיף שוויון **שני**, וגם צירוף של
 * שני שוויונות נענה בלי אינדקס מורכב (אותה צורה בדיוק שהאפליקציה כבר
 * מריצה בייצור: `userId` + `listingType` ב-`ListingDetailsScreen`).
 *
 * ⚠️ **זורק** ולא בולע: מי שקורא צריך להבדיל בין "לא מסר" לבין "לא
 * הצלחנו לבדוק". ראו `evaluateTakeGate`.
 */
export async function hasUserListing(userId, { activeOnly = false } = {}) {
  const constraints = [where('userId', '==', userId)];
  if (activeOnly) constraints.push(where('status', '==', 'active'));
  const snap = await getDocs(query(collection(db, 'listings'), ...constraints, limit(1)));
  return !snap.empty;
}

export function subscribeToUserListings(userId, callback) {
  const q = query(collection(db, 'listings'), where('userId', '==', userId), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}

export async function markListingSold(listingId) {
  await updateDoc(doc(db, 'listings', listingId), { status: 'sold' });
}

export async function deleteListing(listingId) {
  await deleteDoc(doc(db, 'listings', listingId));
}

/**
 * מסירה את מספר הבית מכתובת, ומשאירה רחוב ועיר — פורט מדויק של
 * `stripHouseNumber` ב-`ListingDetailsScreen.tsx` (Hovalot).
 *
 * ## ⚠️ למה זה כאן (16.9)
 * המסך באפליקציה תוקן ב-16.9 אחרי שנמצא ש-`contact.fromAddress`
 * **המלא** הוצג לכל צופה, בזמן ש-`CreateGiveawayScreen` מבטיח למפרסם
 * במפורש: *"פרטיות: רק שם העיר והרחוב יוצגו. מספר הבית ישמש אך ורק אם
 * מעוניין יזמין הובלה."* האתר (`marketplace.html`, `listing.html`) מעולם
 * לא קיבל את התיקון הזה — שני משטחים מציגים את אותו `fromAddress`, ורק
 * אחד מהם מכבד את ההבטחה. זו בדיוק המשפחה של "עותק שני של לוגיקה עסקית
 * שלא הסכים עם הראשון" שה-CLAUDE.md של הריפו הזה מזהיר עליה — כאן זה
 * לא כסף, זו כתובת הבית של המפרסם.
 *
 * ⚠️ הביטוח כאן מסיר **רק רצף ספרות שעומד בפני עצמו בסוף שם הרחוב**:
 * "הרצל 28, רחובות" → "הרצל, רחובות", בעוד "דרך מנחם בגין" נשאר שלם.
 * אם הצורה לא מזוהה, מוחזרת העיר לבדה ולא הכתובת המלאה — הכיוון הבטוח
 * לטעות בו הוא פחות מידע, לא יותר. הבעלים ממשיך לראות את הכתובת המלאה.
 */
export function stripHouseNumber(addr) {
  const parts = String(addr ?? '').split(',').map(x => x.trim()).filter(Boolean);
  if (parts.length === 0) return addr;
  const street = parts[0].replace(/\s+\d+[א-ת]?$/, '').trim();
  const rest = parts.slice(1);
  if (!street) return rest.join(', ') || addr;
  return [street, ...rest].join(', ');
}

/**
 * "לפני 3 שעות" וכו' — פורט מדויק של `formatAgo` ב-`GiveawayScreen.tsx`
 * (Hovalot), כולל אותן צורות זוגי/יחיד בעברית ("לפני שעתיים" ולא "לפני 2
 * שעות"). שם הפונקציה שונה מהמקור כדי לא להתנגש עם `Array.prototype`
 * או שם כללי מדי בקובץ ששיתוף בין כמה דפים.
 *
 * ⚠️ **התיקון של 11.9 שם קריטי**: `Timestamp` בודד עם `mins === 1` הפיק
 * "לפני 1 דקות" — רבים על יחיד, על **כל מודעה בלוח**. `ts` יכול להיות
 * `undefined` ברגע שהמסמך עדיין ב-cache המקומי לפני ש-`serverTimestamp()`
 * חזר מהשרת (אותה סיטואציה שקיימת גם באפליקציה).
 */
export function formatListingAge(ts) {
  if (!ts) return '';
  const diffMs = Date.now() - ts.toMillis();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'הרגע';
  if (mins < 60) return mins === 1 ? 'לפני דקה' : mins === 2 ? 'לפני שתי דקות' : `לפני ${mins} דקות`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs === 1 ? 'לפני שעה' : hrs === 2 ? 'לפני שעתיים' : `לפני ${hrs} שעות`;
  const days = Math.floor(hrs / 24);
  return days === 1 ? 'אתמול' : days === 2 ? 'לפני יומיים' : `לפני ${days} ימים`;
}
