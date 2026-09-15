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
    // ⚠️ בלי ארבעת אלה `flagSuspiciousOrderPrice` יוצאת מיד ולא בודקת
    // כלום. ראו `distanceAndCoords` ב-geo.js לנימוק המלא.
    fromLat: input.fromLat ?? null,
    fromLng: input.fromLng ?? null,
    toLat: input.toLat ?? null,
    toLng: input.toLng ?? null,
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
    // ראיית ההסכמה לתקנון (11.9) — ארבעת השדות זהים בשמם ובמשמעותם לאלה
    // ש-createOrder באפליקציה כותב (Hovalot/src/services/orders.ts), ולכן
    // מסכי האדמין קוראים הזמנה מהאתר ומהאפליקציה באותו אופן בדיוק.
    // ההסכמה עצמה נלקחת בצ'ק-בוקס החוסם שבטופס — ראו orderTermsConsent
    // ב-legal.js; הקריאה כאן לא ממציאה הסכמה, היא רק כותבת את מה שהועבר.
    termsAccepted: input.termsAccepted ?? false,
    termsAcceptedAt: input.termsAcceptedAt ?? null,
    termsVersion: input.termsVersion ?? null,
    termsAcceptedVia: input.termsAcceptedVia ?? null,
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

/**
 * ⚠️ **הפונקציה הזו אינה מקבילה עוד לביטול שבאפליקציה, והפער עולה כסף.**
 *
 * ## מה חסר, ומה התוצאה
 * באפליקציה ביטול לקוח עבר לשרת ב-12.9 (`customerCancelOrder`), והוא
 * כותב שלושה שדות שהקריאה כאן אינה כותבת:
 *
 * | חסר | התוצאה בפועל |
 * |---|---|
 * | `refundDue` / `refundStatus` | `ordersWithRefundDue` מסנן `refundDue > 0`, ולכן **הזמנה שבוטלה מהאתר לא מופיעה ב-AdminRefundsScreen לעולם**. הכסף נשאר אצלנו, ואיש לא יודע שיש חוב ולא כמה |
 * | `cancelledAt` | הדוח החשבונאי נופל חזרה ל-`createdAt`, והביטול נספר בחודש היצירה |
 * | דמי ביטול | האתר מעביר `0` תמיד; האפליקציה גובה לפי המדרג |
 *
 * ⚠️ **וזה לא תיאורטי:** `order-status.html` מתיר ביטול ב-`pending`
 * וב-`assigned` — ושני אלה הם **אחרי תשלום** (הזמנה מגיעה ל-`pending`
 * רק כש-`growNotify` מאשר את התשלום). `firestore.rules` אינם תופסים
 * את זה: `refundDueIsDerived()` מאמת את `refundDue` רק אם הוא **נכתב**.
 *
 * ## ⚠️ למה זה עדיין לא תוקן — ואיך מתקנים
 * **התיקון אינו לחשב כאן.** זה בדיוק מה שיצר את הפער: `customerCancelOrder`
 * כבר מחשבת את המדרג בשעון ישראל (לקוח שמכשירו בחו"ל מקבל היסט מלא —
 * נמדד שם ₪0 מוצג מול ₪1,500 שנגבים), כותבת `refundDue`, ומנקה את שדות
 * המוביל. האתר צריך לקרוא לה, לא לשכפל אותה.
 *
 * **החיבור חסום ב-CORS, וההסרה אינה בידי האתר.** הפונקציה מוגדרת
 * `onRequest(async (req, res) => …)` **בלי** `{ cors: true }`
 * (`Hovalot/functions/src/customerCancelOrder.ts`), ולכן הדפדפן חוסם
 * את הקריאה מ-rozicmove.com לפני שהיא יוצאת. נמדד מול הפונקציה החיה
 * (15.9), preflight מ-`Origin: https://rozicmove.com`:
 *
 *   customerCancelOrder → 405, בלי `access-control-allow-origin`
 *   createGrowCheckout  → 204 + `access-control-allow-origin: https://rozicmove.com`
 *
 * שלוש הפונקציות שהאתר כן קורא להן (`createGrowCheckout`, `geocodeAddress`,
 * `geminiProxy`) כולן מוגדרות `{ cors: true }`. זה **שינוי של שורה אחת
 * בריפו Hovalot + פריסה של הפונקציה** — ופריסה אסורה לסוכן הזה.
 *
 * עד אז הקריאה נשארת כפי שהיא **במכוון**: היא לפחות מסמנת את ההזמנה
 * כמבוטלת. כתיבת `refundDue` מכאן בלי חישוב שרת היא בדיוק החישוב
 * בצד-לקוח שהועבר לשרת מלכתחילה.
 */
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
    // ראו createOrder למעלה — אותה ראיית הסכמה, גם במסלול קידום הטיוטה.
    termsAccepted: finalFields.termsAccepted ?? false,
    termsAcceptedAt: finalFields.termsAcceptedAt ?? null,
    termsVersion: finalFields.termsVersion ?? null,
    termsAcceptedVia: finalFields.termsAcceptedVia ?? null,
    draftServiceType: null, draftPayload: null, draftStep: null,
    draftUpdatedAt: null, draftReminderSent: null,
  });
}
