// Web equivalent of Hovalot's src/services/listings.ts. Scope pivot already removed
// the sale side app-wide (see project CLAUDE.md — "marketplace give&take, חינמי
// בלבד") so this only ever writes listingType:'free', matching the app today.
import {
  addDoc, collection, deleteDoc, doc, getDoc, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc, where,
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
