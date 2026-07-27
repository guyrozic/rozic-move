// Web equivalent of Hovalot's src/services/listings.ts. Scope pivot already removed
// the sale side app-wide (see project CLAUDE.md — "marketplace give&take, חינמי
// בלבד") so this only ever writes listingType:'free', matching the app today.
import {
  addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc, where,
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

export async function createListing(input) {
  const ref = await addDoc(collection(db, 'listings'), {
    ...input,
    listingType: 'free',
    status: 'active',
    createdAt: serverTimestamp(),
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
