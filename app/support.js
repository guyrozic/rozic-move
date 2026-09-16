// Web equivalent of Hovalot's src/services/support.ts — same support_tickets/{id} +
// messages subcollection shape (role/text/timestamp/read), so a ticket opened
// from the website shows up correctly in the app's AdminTicketDetailScreen and
// AdminSupportScreen with zero changes on that side.
import {
  addDoc, collection, doc, limitToLast, onSnapshot, orderBy, query,
  serverTimestamp, updateDoc, where, increment,
} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';
import { db } from './firebase.js';

/** כל סטטוס שאינו `resolved` — זהה ל-OPEN_TICKET_STATUSES ב-support.ts. */
export const OPEN_TICKET_STATUSES = ['bot', 'waiting', 'active'];

/** כמה הודעות יורדות בפתיחת פנייה, וכמה נוספות ב"טען הודעות קודמות". זהה ל-SUPPORT_PAGE_SIZE. */
export const SUPPORT_PAGE_SIZE = 50;

/**
 * מוצא פנייה פתוחה קיימת של המשתמש, או פותח חדשה — זהה ל-createOrGetTicket
 * באפליקציה (בלי הודעת פתיחה: הלקוח בוחר קטגוריה מ-FAQ_TOPICS או כותב בעצמו).
 */
export async function createOrGetTicket(userId, userName, userPhone) {
  const existing = await new Promise((resolve) => {
    const q = query(collection(db, 'support_tickets'), where('userId', '==', userId));
    const unsub = onSnapshot(q, (snap) => {
      unsub();
      const active = snap?.docs?.find(d => OPEN_TICKET_STATUSES.includes(d.data().status));
      resolve(active?.id ?? null);
    }, () => { unsub(); resolve(null); });
  });
  if (existing) return existing;

  const ref = await addDoc(collection(db, 'support_tickets'), {
    userId, userName, userPhone: userPhone || null, // undefined היה מפיל את הכתיבה — ראו listings.js
    status: 'bot',
    category: 'other',
    priority: 'normal',
    subject: 'פנייה חדשה',
    lastMessage: '',
    lastMessageAt: serverTimestamp(),
    unreadAdmin: 0,
    unreadUser: 0,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

/** איזה מונה "לא-נקרא" מתקדם בעקבות הודעה מכל תפקיד. זהה ל-UNREAD_FIELD_OF. */
const UNREAD_FIELD_OF = { user: 'unreadAdmin', admin: 'unreadUser', ai: 'unreadUser' };

/**
 * שולח הודעה בפנייה ומקדם את מונה "לא-נקרא" של הצד השני.
 *
 * ⚠️ פישוט מכוון מול `_increment` באפליקציה (שם: מנוי `onSnapshot` נפרד
 * + timeout של 10 שניות, כדי לעקוף כשל שקט שנמצא ב-`react-native-firebase`
 * — ראו ההערה המלאה ב-Hovalot/src/services/support.ts). כאן `increment()`
 * של Firestore JS SDK עצמו כבר מבצע קריאה-ועדכון אטומית בצד השרת, בלי
 * קריאה-ואז-כתיבה מהלקוח בכלל — ואין את הכשל שהתיקון ההוא בא לעקוף.
 * אותו דפוס בדיוק כבר קיים ב-`chat.js` באתר הזה, לאותה בעיה בדיוק
 * (מוני לא-נקרא בצ'אט עם המוביל).
 */
export async function sendSupportMessage(ticketId, role, text, opts) {
  // ⚠️ 17.9 — תקרת חוק: support_tickets/*/messages דורש text.size() <= 2000.
  // הודעת המשתמש מוגבלת ב-UI, אבל תשובת ה-AI אינה מוגבלת במקור — חותכים
  // כאן (מגן על כל הקוראים) כדי שהכתיבה לא תידחה ותסתיר את התשובה.
  const safeText = typeof text === 'string' ? text.slice(0, 2000) : text;
  await addDoc(collection(db, 'support_tickets', ticketId, 'messages'), {
    role, text: safeText, timestamp: serverTimestamp(), read: false,
    ...(opts?.promptFeedback ? { promptFeedback: true } : {}),
  });
  await updateDoc(doc(db, 'support_tickets', ticketId), {
    lastMessage: safeText,
    lastMessageAt: serverTimestamp(),
    [UNREAD_FIELD_OF[role]]: increment(1),
  });
}

/** מעביר פנייה לנציג אנושי. זהה ל-escalateToHuman. */
export async function escalateToHuman(ticketId, category) {
  await updateDoc(doc(db, 'support_tickets', ticketId), {
    status: 'waiting',
    category,
    priority: 'normal',
    unreadAdmin: 1,
    escalatedAt: serverTimestamp(),
  });
}

/** סוגר פנייה. `by:'user'` גם מאפס את unreadUser — הלקוח בדיוק סיים לקרוא. */
export async function resolveTicket(ticketId, by) {
  await updateDoc(doc(db, 'support_tickets', ticketId), {
    status: 'resolved',
    resolvedAt: serverTimestamp(),
    unreadAdmin: 0,
    ...(by === 'user' ? { unreadUser: 0 } : {}),
  });
}

/** מאפס את מונה ה"לא נקרא" של הלקוח — נקרא כשהוא פותח/רואה את הצ'אט. */
export async function markUserRead(ticketId) {
  await updateDoc(doc(db, 'support_tickets', ticketId), { unreadUser: 0 }).catch(() => {});
}

/**
 * מאזין להודעות פנייה — חלון של האחרונות, לא כל ההיסטוריה. זהה ל-
 * subscribeToTicketMessages (SUPPORT_PAGE_SIZE) באפליקציה.
 */
export function subscribeToTicketMessages(ticketId, callback, windowSize = SUPPORT_PAGE_SIZE) {
  const q = query(
    collection(db, 'support_tickets', ticketId, 'messages'),
    orderBy('timestamp', 'asc'),
    limitToLast(windowSize),
  );
  return onSnapshot(q, (snap) => {
    const msgs = snap?.docs.map(d => ({ id: d.id, ...d.data() })) ?? [];
    callback(msgs, (snap?.size ?? 0) >= windowSize);
  }, () => callback([], false));
}

/** מאזין לפנייה אחת לפי מזהה — כולל אחרי שהיא נסגרה. זהה ל-subscribeToTicket. */
export function subscribeToTicket(ticketId, callback) {
  return onSnapshot(doc(db, 'support_tickets', ticketId), (snap) => {
    const data = snap?.data();
    callback(data ? { id: ticketId, ...data } : null);
  }, () => callback(null));
}
