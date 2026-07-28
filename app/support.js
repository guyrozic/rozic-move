// Web equivalent of Hovalot's src/services/support.ts createSupportTicket() —
// same support_tickets/{id} + messages subcollection shape, so a ticket opened
// from the website shows up correctly in the app's AdminTicketDetailScreen.
import { addDoc, collection, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';
import { db } from './firebase.js';

export async function createSupportTicket(userId, userName, userPhone, message) {
  const ref = await addDoc(collection(db, 'support_tickets'), {
    userId, userName, userPhone,
    status: 'bot',
    category: 'other',
    priority: 'normal',
    subject: message.slice(0, 60),
    lastMessage: message,
    lastMessageAt: serverTimestamp(),
    unreadAdmin: 1,
    unreadUser: 0,
    createdAt: serverTimestamp(),
  });
  await addDoc(collection(db, 'support_tickets', ref.id, 'messages'), {
    role: 'user', text: message, timestamp: serverTimestamp(), read: false,
  });
  return ref.id;
}
