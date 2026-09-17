// Web equivalent of Hovalot's src/services/listings.ts. Scope pivot already removed
// the sale side app-wide (see project CLAUDE.md — "marketplace give&take, חינמי
// בלבד") so this only ever writes listingType:'free', matching the app today.
import {
  addDoc, collection, deleteDoc, doc, getDoc, getDocs, limit, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc, where,
} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';
import { db } from './firebase.js';

/**
 * 17.9 — הוסר שדה `icon` (היה תחליף אמוג'י ל-{lib:'ion'|'mci', name}
 * וקטורי-האייקון של האפליקציה). **הלוח "מעבירים את זה הלאה" עוצב מחדש
 * ב-24.7 במכוון בלי אמוג'י** — `GiveawayScreen.tsx`/`ListingDetailsScreen.tsx`/
 * `CreateGiveawayScreen.tsx` לא נושאים ולו תו אמוג'י אחד, ומחליפים אותם
 * ב-Ionicons/MaterialCommunityIcons (למשל `EmptyState` שהחליף את "📭" ב-SVG
 * קווי). האתר לא טוען את גופני האייקונים האלה, ולכן במקום להמציא תחליף —
 * התוויות עומדות בפני עצמן, בדיוק כמו קטגוריה שנקראת בקול.
 */
export const CATEGORY_INFO = {
  furniture:   { label: 'רהיטים' },
  electronics: { label: 'אלקטרוניקה' },
  appliances:  { label: 'מכשירי חשמל' },
  clothing:    { label: 'ביגוד' },
  sports:      { label: 'ספורט' },
  books:       { label: 'ספרים' },
  other:       { label: 'שונות' },
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

/* ══════════════════════════════════════════════════════════════════
   חסימה ודיווח — פורט של src/services/blocks.ts + src/services/reports.ts
   ══════════════════════════════════════════════════════════════════

   ⚠️ 17.9 — עד עכשיו האתר לא נשא שום דרך לחסום מפרסם או לדווח על מודעה,
   בזמן ש-`ListingDetailsScreen.tsx` באפליקציה מציג את שתי הפעולות לכל
   צופה שאינו הבעלים (מדיניות ה-UGC של גוגל דורשת ששתיהן יהיו נבדלות
   ומסומנות בבירור — לכן שני כפתורים נפרדים, לא אחד).

   `subscribeToBlockedUsers`/`unblockUser` (מי **אני** חסמתי) כבר קיימים
   ב-`account.js` עבור מסך "אזור אישי", ומיובאים משם ולא משוכפלים כאן.
   מה שחסר, וזה מקומו — כי הוא נוצר ונצרך רק מהקשר של מודעה — הוא כתיבת
   חסימה חדשה, קריאת "מי חסם אותי", ודיווח על מודעה.
*/

/**
 * מי חסם אותי — מסמך שנכתב אך ורק ע"י `mirrorUserBlocks` (Admin SDK, ראו
 * functions/src/mirrorUserBlocks.ts ב-Hovalot). מראה את
 * `subscribeToWhoBlockedMe` ב-`src/services/blocks.ts`.
 *
 * בכוונה מנוי חי ולא קריאה חד-פעמית: הלוח (`marketplace.html`) מסתיר
 * לפיו כרטיסים שלמים בזמן אמת — אותה סיבה בדיוק ש-`subscribeToActiveListings`
 * הוא מנוי ולא `getDocs`.
 */
export function subscribeToWhoBlockedMe(uid, callback) {
  return onSnapshot(
    doc(db, 'users', uid, 'private', 'blockedBy'),
    (snap) => {
      const ids = snap.exists() ? snap.data()?.blockedByIds : null;
      callback(Array.isArray(ids) ? ids : []);
    },
    () => callback([]),
  );
}

/**
 * מראה את `blockUser` ב-`src/services/blocks.ts` — אותו מבנה נתונים בדיוק
 * (`users/{uid}/private/blocks` → `{ blocked: { [targetId]: {name, at} } }`),
 * כדי שחסימה מהאתר תיראה מיד גם באפליקציה של אותו חשבון, ולהפך.
 */
export async function blockUser(uid, targetId, targetName) {
  if (!uid || !targetId || uid === targetId) return;
  await setDoc(
    doc(db, 'users', uid, 'private', 'blocks'),
    { blocked: { [targetId]: { name: (targetName ?? '').trim() || 'משתמש', at: serverTimestamp() } }, updatedAt: serverTimestamp() },
    { merge: true },
  );
}

/**
 * בדיקה חד-פעמית — האם יש יחס חסימה (בכל כיוון) בין `uid` למפרסם המודעה.
 *
 * ⚠️ **לא מנוי חי, ובכוונה.** מיועדת לדפים שנטענים פעם אחת (`listing.html`,
 * דף השיתוף הציבורי) ולא ללוח החי — שם `subscribeToWhoBlockedMe` +
 * `subscribeToBlockedUsers` (מ-`account.js`) כבר עושים את זה כמנוי מתמשך.
 * שתי קריאות `getDoc` בודדות ולא שני מנויים ששרידים אחרי שהדף כבר הוצג.
 */
export async function checkListingBlockHidden(uid, listing) {
  if (!uid || !listing?.userId || listing.userId === uid) return { hidden: false, blockedByMe: false };
  const [blocksSnap, blockedBySnap] = await Promise.all([
    getDoc(doc(db, 'users', uid, 'private', 'blocks')).catch(() => null),
    getDoc(doc(db, 'users', uid, 'private', 'blockedBy')).catch(() => null),
  ]);
  const blockedByMe = !!blocksSnap?.data()?.blocked?.[listing.userId];
  const blockedMe = (blockedBySnap?.data()?.blockedByIds || []).includes(listing.userId);
  return { hidden: blockedByMe || blockedMe, blockedByMe };
}

/**
 * סיבות הדיווח שרלוונטיות למודעה בלוח — תת-קבוצה של
 * `REPORT_REASONS_BY_TYPE.listing` ב-`src/services/reports.ts` (שם
 * הרשימה המלאה, שכוללת גם סיבות עבור מוביל/לקוח/משתמש שלא רלוונטיות כאן).
 */
export const LISTING_REPORT_REASONS = {
  offensive_content:  'תוכן פוגעני או לא הולם',
  prohibited_item:    'פריט אסור לפרסום',
  misleading_listing: 'מודעה מטעה או ספאם',
  wrong_contact:      'פרטי קשר שגויים',
  other:              'אחר',
};

/**
 * מראה את `submitReport` ב-`src/services/reports.ts`, מוגבל ל-`type:'listing'`
 * — האתר לא מדווח על מוביל/לקוח/הזמנה, רק על מודעה בלוח.
 */
export async function submitListingReport({ reporterId, reporterName, listingId, listingTitle, targetUserId, targetUserName, reason, details }) {
  await addDoc(collection(db, 'reports'), {
    reporterId, reporterName,
    type: 'listing',
    targetId: listingId,
    targetName: listingTitle,
    reason,
    details: (details ?? '').trim(),
    status: 'open',
    createdAt: serverTimestamp(),
    // פריסה מותנית ולא `?? null`: `undefined` מפיל את הכתיבה כולה — אותו
    // לקח כמו `createListing` למעלה.
    ...(targetUserId ? { targetUserId } : {}),
    ...(targetUserName ? { targetUserName } : {}),
  });
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
