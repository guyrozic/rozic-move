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
 * ⚠️ 20.9 — **ה"פישוט המכוון" שהיה מתועד כאן בוטל.** הטקסט הקודם אמר
 * שאין באתר "טען עוד" כי "שיחת הובלה טיפוסית קצרה בהרבה מ-50". זה נכון
 * לרוב השיחות ולא עוזר בכלל לשיחה שכן חורגת: שם ההתחלה נחתכה **בלי שום
 * סימן**, כלומר הלקוח לא ידע שחסר לו מידע. `ChatScreen.tsx:73` מגדיל
 * שם את החלון בגלילה לראש הרשימה.
 */
export const CHAT_PAGE_SIZE = 50;

/**
 * מנוי על הודעות הצ'אט בחלון נגלל.
 *
 * ⚠️ **שאילתה אחת לשני הקוראים.** בסבב הקודם היא שוכפלה בתוך
 * `order-chat.html` כי הקובץ הזה היה נעול לעריכה מקבילית — וזו בדיוק
 * משפחת הבאג של שאלת המזרון: שני עותקים כתובים ביד שאף קומפיילר לא
 * רואה. אוחד לכאן ברגע שהקובץ התפנה.
 *
 * @param {number} [windowSize] כמה הודעות אחרונות לטעון.
 * @param {(messages: object[], hasOlder: boolean) => void} callback
 *   `hasOlder` הוא `snap.size >= windowSize` — כלומר **"ייתכן שיש עוד"**
 *   ולא "בוודאות יש". בשיחה שאורכה בדיוק כגודל החלון הכפתור יופיע
 *   ולחיצה עליו לא תוסיף דבר. זו אותה הערכה שבאפליקציה, והחלופה
 *   (שאילתת ספירה נוספת בכל סנאפשוט) יקרה הרבה יותר מכפתור מיותר.
 */
export function subscribeToMessages(orderId, callback, windowSize = CHAT_PAGE_SIZE) {
  const q = query(
    collection(db, 'orders', orderId, 'messages'),
    orderBy('timestamp', 'asc'),
    limitToLast(windowSize),
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })), snap.size >= windowSize);
  }, () => callback([], false));
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
