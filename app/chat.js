// Web equivalent of Hovalot's src/services/chat.ts — same orders/{orderId}/messages
// subcollection shape (senderId, senderName, text, timestamp), so a message sent
// from the website shows up in the app's ChatScreen with zero changes on that side.
// firestore.rules: orderParticipant() (customerId or driverId of the parent order)
// may read/create; text must be 1-1000 chars; senderId must be the caller's own uid.
import {
  addDoc, collection, doc, limitToLast, onSnapshot, orderBy, query, serverTimestamp, updateDoc, increment,
} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';
import { db } from './firebase.js';

/**
 * כמה הודעות יורדות בפתיחת הצ'אט — מראה CHAT_PAGE_SIZE ב-chat.ts.
 *
 * ⚠️ פישוט מכוון מול האפליקציה: אין כאן "טען עוד" לגלילה להיסטוריה ישנה
 * יותר (hasOlder/windowSize שם) — האתר מציג רק את 50 ההודעות האחרונות.
 * שיחת הובלה טיפוסית קצרה בהרבה מזה, ולכן ברוב המקרים אין בכלל הבדל.
 */
const CHAT_PAGE_SIZE = 50;

export function subscribeToMessages(orderId, callback) {
  const q = query(
    collection(db, 'orders', orderId, 'messages'),
    orderBy('timestamp', 'asc'),
    limitToLast(CHAT_PAGE_SIZE),
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  }, () => callback([]));
}

/**
 * ⚠️ בניגוד ל-sendMessage() באפליקציה, כאן **אין** התראת push לצד השני —
 * אין באתר גשר להתראות Expo (sendPushToUser תלוי בפונקציות שרת ובטוקן
 * מכשיר). המוביל יראה הודעה חדשה רק כשהוא פותח את הצ'אט באפליקציה שלו,
 * לא באנר מיידי. תיעוד ב-NIGHT-LOG.
 */
export async function sendChatMessage(orderId, senderId, senderName, text) {
  const trimmed = text.trim();
  if (!trimmed) return;
  await addDoc(collection(db, 'orders', orderId, 'messages'), {
    senderId, senderName, text: trimmed, timestamp: serverTimestamp(),
  });
  const unreadField = 'unreadDriver'; // האתר הוא צד הלקוח בלבד — השולח תמיד הלקוח
  await updateDoc(doc(db, 'orders', orderId), { [unreadField]: increment(1) }).catch(() => {});
}

/** מאפס את מונה ה"לא נקרא" של הלקוח — נקרא כשהוא פותח את הצ'אט. */
export async function markChatRead(orderId) {
  await updateDoc(doc(db, 'orders', orderId), { unreadCustomer: 0 }).catch(() => {});
}
