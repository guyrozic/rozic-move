// Web equivalent of Hovalot's src/services/orders.ts — customer-facing subset only
// (no driver/admin actions). Writes the exact same OrderRecord field shape so
// orders created from the web show up correctly in the mobile app's admin/driver
// screens with zero changes on that side.
import {
  addDoc, collection, deleteDoc, doc, getDoc, getDocs, onSnapshot,
  query, serverTimestamp, setDoc, updateDoc, where,
} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';
import { db } from './firebase.js';

export const STATUS_LABELS = {
  draft: 'טיוטה',
  pending_pricing: 'ממתין לתמחור',
  pending_payment: 'ממתין לתשלום',
  pending: 'ממתין למוביל',
  assigned: 'מוביל שובץ',
  en_route: 'המוביל בדרך',
  in_progress: 'הובלה בעיצומה',
  completed: 'הושלם',
  cancelled: 'בוטל',
};

/**
 * הסכום שהלקוח רואה — פורט מ-customerTotalOf() ב-orders.ts.
 *
 * תוספת התמחור הידני נכנסת ל-`price` **בדיוק פעם אחת**, ברגע היציאה מ-
 * 'pending_pricing'. לפני כן `price` הוא הסכום הקטלוגי בלבד ו-
 * `manualPricingTotal` הוא תוספת שעוד לא נכנסה אליו, אחרי כן היא כבר בפנים
 * והשדה נשאר כפירוט. חיבור עיוור של השניים מציג את התוספת פעמיים.
 */
export function customerTotalOf(order) {
  const price = order.price ?? 0;
  const folded = order.status !== 'draft' && order.status !== 'pending_pricing';
  return folded ? price : price + (order.manualPricingTotal ?? 0);
}

/**
 * מראה את computeInitialOrderStatus() ב-orders.ts. הזמנה שיש בה פריט לתמחור
 * ידני שעוד לא תומחר **לא יכולה ללכת ל-Grow** — אין סכום נכון לחייב עדיין,
 * ו-price מכיל רק את הסכום הקטלוגי בלי אותו פריט. בלי זה הלקוח משלם סכום
 * שלא כולל את הפריט שהוסיף.
 *
 * אין כאן פיצול card/cash כמו באפליקציה — האתר מציע כרטיס בלבד.
 */
function computeInitialOrderStatus(manualPricingItems) {
  if (manualPricingItems?.some(i => i.price === undefined)) return 'pending_pricing';
  return 'pending_payment';
}

/** Creates a submitted order (not a draft) — mirrors createOrder() in orders.ts field-for-field. */
export async function createOrder(input) {
  const ref = await addDoc(collection(db, 'orders'), {
    customerId: input.customerId,
    driverId: null,
    serviceType: input.serviceType,
    title: input.title,
    fromAddress: input.fromAddress ?? null,
    toAddress: input.toAddress ?? null,
    scheduledDate: input.scheduledDate ?? null,
    timeSlot: input.timeSlot ?? null,
    notes: input.notes ?? null,
    itemsSummary: input.itemsSummary ?? null,
    price: input.price,
    commissionAmount: input.commissionAmount ?? 0,
    // Card is the only payment method the site offers (matches the app) — orders
    // wait in 'pending_payment' until Grow's webhook (growNotify) confirms payment.
    // אלא אם יש פריט שממתין לתמחור ידני — ראו computeInitialOrderStatus.
    status: computeInitialOrderStatus(input.manualPricingItems),
    createdAt: serverTimestamp(),
    hasInsurance: input.hasInsurance ?? false,
    insuranceAmount: input.insuranceAmount ?? 0,
    paymentMethod: 'card',
    paymentStatus: 'pending',
    packingService: input.packingService ?? false,
    packingServicePrice: input.packingServicePrice ?? 0,
    craneNeeded: input.craneNeeded ?? false,
    craneFloor: input.craneFloor ?? null,
    craneCost: input.craneCost ?? 0,
    craneItems: input.craneItems ?? [],
    manualPricingItems: input.manualPricingItems ?? [],
    manualPricingTotal: input.manualPricingTotal ?? 0,
    orderSource: 'web',
  });
  return ref.id;
}

function sortByNewest(orders) {
  return [...orders].sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0));
}

export function subscribeToUserOrders(uid, callback) {
  const q = query(collection(db, 'orders'), where('customerId', '==', uid));
  return onSnapshot(q, (snapshot) => {
    const orders = snapshot.docs.map(d => ({ id: d.id, ...d.data() })).filter(o => o.status !== 'draft');
    callback(sortByNewest(orders));
  });
}

export function subscribeToOrder(orderId, callback, onError) {
  return onSnapshot(doc(db, 'orders', orderId), (snap) => {
    callback(snap.exists() ? { id: snap.id, ...snap.data() } : null);
  }, onError);
}

/** Customer cancels their own order — mirrors cancelOrder(cancelledBy:'customer') in orders.ts. */
export async function cancelOrder(orderId, cancellationFee = 0) {
  await updateDoc(doc(db, 'orders', orderId), {
    status: 'cancelled',
    cancelledBy: 'customer',
    ...(cancellationFee > 0 ? { cancellationFee } : {}),
  });
}

/** Autosaves in-progress wizard state — mirrors saveDraftOrder() in orders.ts. */
export async function saveDraftOrder(customerId, serviceType, step, payload, draftId) {
  if (draftId) {
    await updateDoc(doc(db, 'orders', draftId), {
      draftServiceType: serviceType, draftPayload: payload, draftStep: step,
      draftUpdatedAt: serverTimestamp(), draftReminderSent: false,
    });
    return draftId;
  }
  const ref = doc(collection(db, 'orders'));
  await setDoc(ref, {
    customerId, driverId: null, serviceType, title: '',
    fromAddress: null, toAddress: null, scheduledDate: null, timeSlot: null,
    notes: null, itemsSummary: null, price: 0, status: 'draft',
    createdAt: serverTimestamp(),
    draftServiceType: serviceType, draftPayload: payload, draftStep: step,
    draftUpdatedAt: serverTimestamp(), draftReminderSent: false,
    orderSource: 'web',
  });
  return ref.id;
}

export async function getDraftOrderById(orderId) {
  const snap = await getDoc(doc(db, 'orders', orderId));
  if (!snap.exists() || snap.data()?.status !== 'draft') return null;
  return { id: snap.id, ...snap.data() };
}

export async function getActiveDraftOrder(customerId, serviceType) {
  const constraints = [where('customerId', '==', customerId), where('status', '==', 'draft'), where('draftServiceType', '==', serviceType)];
  const snap = await getDocs(query(collection(db, 'orders'), ...constraints));
  if (snap.empty) return null;
  const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  docs.sort((a, b) => (b.draftUpdatedAt?.toMillis() ?? 0) - (a.draftUpdatedAt?.toMillis() ?? 0));
  return docs[0];
}

export async function clearDraftOrder(orderId) {
  await deleteDoc(doc(db, 'orders', orderId));
}

/** Turns a draft into a submitted order — mirrors promoteDraftToOrder() in orders.ts. */
export async function promoteDraftToOrder(orderId, finalFields) {
  await updateDoc(doc(db, 'orders', orderId), {
    title: finalFields.title,
    fromAddress: finalFields.fromAddress ?? null,
    toAddress: finalFields.toAddress ?? null,
    scheduledDate: finalFields.scheduledDate ?? null,
    timeSlot: finalFields.timeSlot ?? null,
    notes: finalFields.notes ?? null,
    itemsSummary: finalFields.itemsSummary ?? null,
    price: finalFields.price,
    commissionAmount: finalFields.commissionAmount ?? 0,
    status: computeInitialOrderStatus(finalFields.manualPricingItems),
    hasInsurance: finalFields.hasInsurance ?? false,
    insuranceAmount: finalFields.insuranceAmount ?? 0,
    paymentMethod: 'card',
    paymentStatus: 'pending',
    packingService: finalFields.packingService ?? false,
    packingServicePrice: finalFields.packingServicePrice ?? 0,
    craneNeeded: finalFields.craneNeeded ?? false,
    craneFloor: finalFields.craneFloor ?? null,
    craneCost: finalFields.craneCost ?? 0,
    craneItems: finalFields.craneItems ?? [],
    // היה `[]` קשיח. זה מוחק פריטים שממתינים לתמחור בדיוק ברגע קידום הטיוטה,
    // ובנוסף מפיל את הכתיבה מול firestore.rules: ענף 'pending_pricing' ב-
    // orderShapeValid() דורש `manualPricingItems is list && size() > 0`.
    manualPricingItems: finalFields.manualPricingItems ?? [],
    manualPricingTotal: 0,
    draftServiceType: null, draftPayload: null, draftStep: null,
    draftUpdatedAt: null, draftReminderSent: null,
  });
}
