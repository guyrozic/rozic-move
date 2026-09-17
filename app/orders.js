// Web equivalent of Hovalot's src/services/orders.ts — customer-facing subset only
// (no driver/admin actions). Writes the exact same OrderRecord field shape so
// orders created from the web show up correctly in the mobile app's admin/driver
// screens with zero changes on that side.
import {
  addDoc, collection, deleteDoc, doc, getDoc, getDocs, onSnapshot,
  query, serverTimestamp, setDoc, updateDoc, where,
} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';
import { db, auth } from './firebase.js';

/**
 * ⚠️ 17.9 — **חמש מתוך תשע התוויות כאן לא היו אותן תוויות שהלקוח רואה
 * באפליקציה,** ושלוש מהן אף סתרו טקסט אחר באותו מסך עצמו.
 *
 * באפליקציה זהו **מקור אמת אחד** — `STATUS_INFO` מוגדר פעמיים, ב-
 * `OrderDetailsScreen.tsx` וב-`tabs/OrdersScreen.tsx`, ושתי ההגדרות
 * זהות מילה במילה (שם גם `Record<OrderStatus>` מלא, כדי שסטטוס עשירי
 * יפיל את tsc במקום להיות מוצג כקוד באנגלית).
 *
 * | סטטוס | האתר הציג | האפליקציה מציגה |
 * |---|---|---|
 * | `pending`     | ממתין למוביל     | מחפשים מוביל |
 * | `en_route`    | המוביל בדרך      | המוביל בדרך אליך |
 * | `in_progress` | הובלה בעיצומה    | המוביל מבצע את ההובלה |
 * | `completed`   | הושלם            | ההובלה הושלמה |
 * | `cancelled`   | בוטל             | בוטלה |
 *
 * ⚠️ **וזה לא היה רק ניסוח.** ב-`order-status.html` התג יושב ישירות מעל
 * `ORDER_PROGRESS_STEPS` (שכן הועתק נכון), כך שאותו רגע בהובלה נקרא
 * בשתי שורות סמוכות בשני נוסחים — "ממתין למוביל" מעל "מחפשים מוביל",
 * "המוביל בדרך" מעל "המוביל בדרך אליך". זו בדיוק הבעיה שהאיחוד
 * ב-`OrderProgressBar.tsx` נועד למנוע, רק שהיא נכנסה כאן מהצד השני.
 *
 * `draft` נשאר 'טיוטה' ולא `null` כמו באפליקציה: שם לטיוטה יש מסך משלה,
 * וכאן `subscribeToUserOrders` מסנן אותן ממילא — התווית היא רשת ביטחון
 * ולא מצב שמוצג בפועל.
 */
export const STATUS_LABELS = {
  draft: 'טיוטה',
  pending_pricing: 'ממתין לתמחור',
  pending_payment: 'ממתין לתשלום',
  pending: 'מחפשים מוביל',
  assigned: 'מוביל שובץ',
  en_route: 'המוביל בדרך אליך',
  in_progress: 'המוביל מבצע את ההובלה',
  completed: 'ההובלה הושלמה',
  cancelled: 'בוטלה',
};

/**
 * מראה את `OPEN_CUSTOMER_STATUSES`/`ACTIVE_CUSTOMER_STATUSES` ב-
 * Hovalot's src/services/orders.ts — נוספו 16.9 לטובת הטאבים ב-account.html.
 *
 * `OPEN` (כולל שלבים לפני תשלום) הוא טאב "פעילות"; `ACTIVE` (הצר יותר,
 * אחרי תשלום) הוא מה שמגדיר "יש הזמנה פעילה" בשביל נעילת מתג ההתראות
 * ב-settings.html — אותה הבחנה בדיוק כמו ProfileScreen/OrdersScreen באפליקציה.
 */
export const OPEN_CUSTOMER_STATUSES = ['pending_pricing', 'pending_payment', 'pending', 'assigned', 'en_route', 'in_progress'];
export const ACTIVE_CUSTOMER_STATUSES = ['pending', 'assigned', 'en_route', 'in_progress'];
export const HISTORY_STATUSES = ['completed', 'cancelled'];

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

/** קריאה חד-פעמית, לא מנוי חי — לדפים כמו order-rate.html שבהם מנוי חי
 *  היה מסכן למחוק בחירות באמצע מילוי טופס אם המסמך יתעדכן משום סיבה אחרת. */
export async function getOrder(orderId) {
  const snap = await getDoc(doc(db, 'orders', orderId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export function subscribeToOrder(orderId, callback, onError) {
  return onSnapshot(doc(db, 'orders', orderId), (snap) => {
    callback(snap.exists() ? { id: snap.id, ...snap.data() } : null);
  }, onError);
}

/**
 * חמשת שלבי ההזמנה, בניסוח הלקוח — מראה ORDER_PROGRESS_STEPS
 * ב-src/components/OrderProgressBar.tsx (מקור אמת יחיד באפליקציה, כדי
 * שהמסך הבא בעל ניסוח 5-שלבים אחר לעולם לא ייווצר). האתר הוא צד הלקוח
 * בלבד, ולכן רק `label` הועתק — לא `driverLabel`.
 */
export const ORDER_PROGRESS_STEPS = [
  { status: 'pending', label: 'מחפשים מוביל' },
  { status: 'assigned', label: 'מוביל שובץ' },
  { status: 'en_route', label: 'המוביל בדרך אליך' },
  { status: 'in_progress', label: 'המוביל מבצע את ההובלה' },
  { status: 'completed', label: 'ההובלה הושלמה' },
];

/**
 * פירוק `itemsSummary` לרשימה מובנית — פורט מ-`parseItemsSummary()`
 * ב-`OrderDetailsScreen.tsx` (שם הוא מיוצא ונבדק), כולל המלכודת שתוקנה שם.
 *
 * ⚠️ 17.9 — **האתר הציג את המחרוזת הזו כשורת טקסט אחת.** באפליקציה זו
 * מקטע משלו ("פריטים שהוזמנו") עם שורה לכל פריט וקיבוץ לפי חדר; באתר
 * הזמנת דירה בת חמישה חדרים נדחסה לשורה אחת ארוכה בתוך טבלת הפרטים, ולא
 * הייתה שום דרך לוודא בה שהפריטים שהוזמנו הם אלה שנבחרו.
 *
 * `isRoomGrouped` חייב לבוא מ-`serviceType` ולא להיגזר מהמחרוזת: הזמנה
 * עם חדר **אחד** אין בה `" | "` בכלל, ושם החדר שלה היה נבלע לתוך התווית
 * של הפריט הראשון.
 *
 * ⚠️ אין פיצול על `","`. תווית פריט יכולה להכיל פסיק משלה ("נברשת גדולה
 * (מפוארת, קוטר 50-100 ס״מ) x1") — פיצול כזה שבר פריט אחד לשני מקטעים
 * שאף אחד מהם לא התאים, וכל הסיכום נפל בשקט לטקסט גולמי. סורקים ישירות
 * את סמני `... xN`.
 *
 * @returns מערך קבוצות, או `null` כשהטקסט אינו בתבנית שאנחנו מייצרים —
 *          ואז הקורא מציג את המחרוזת כמות שהיא במקום להסתיר מידע.
 */
export function parseItemsSummary(itemsSummary, isRoomGrouped) {
  const parseItemList = (str) => {
    const items = [];
    const re = /(.+?)\s+x(\d+)(?:,\s*|$)/g;
    let consumed = 0;
    let m;
    while ((m = re.exec(str)) !== null) {
      items.push({ label: m[1], qty: parseInt(m[2], 10) });
      consumed = m.index + m[0].length;
    }
    return items.length > 0 && consumed === str.length ? items : null;
  };

  if (isRoomGrouped) {
    const groups = [];
    for (const segment of itemsSummary.split(' | ')) {
      const idx = segment.indexOf(': ');
      if (idx === -1) return null;
      const items = parseItemList(segment.slice(idx + 2));
      if (!items) return null;
      groups.push({ room: segment.slice(0, idx), items });
    }
    return groups;
  }

  const items = parseItemList(itemsSummary);
  return items ? [{ room: null, items }] : null;
}

/**
 * הלקוח מאשר את דיווח הסיום של המוביל — הפעולה היחידה שבאמת משלימה
 * את ההזמנה. מראה customerConfirmCompletion() ב-orders.ts.
 *
 * ⚠️ לא בדיקה מקומית: firestore.rules (`completingIsCustomerConfirmOnly`)
 * מתירות את המעבר ל-'completed' רק כשההזמנה כבר 'in_progress' וכבר
 * `driverConfirmedCompletion == true` — אכיפה בשרת, לא כאן.
 */
export async function customerConfirmCompletion(orderId) {
  await updateDoc(doc(db, 'orders', orderId), { status: 'completed' });
}

/**
 * הלקוח מדרג את המוביל אחרי השלמה — מראה submitRating(orderId,'customer',…)
 * ב-orders.ts. האתר הוא צד הלקוח בלבד, ולכן raterRole מקובע מראש.
 *
 * firestore.rules (`customerRatesDriverOnly`) מתירות ללקוח לכתוב רק
 * `driverRating` (1–5) ו-`customerFeedback` — לא `customerRating`
 * ולא `driverFeedback`, ששייכים לצד המוביל.
 */
export async function submitCustomerRating(orderId, score, feedback = {}) {
  const updates = { driverRating: score };
  const feedbackData = {};
  if (feedback.tags?.length) feedbackData.ratingTags = feedback.tags;
  if (feedback.text?.trim()) feedbackData.ratingText = feedback.text.trim();
  if (typeof feedback.appScore === 'number') feedbackData.appScore = feedback.appScore;
  if (feedback.appText?.trim()) feedbackData.appText = feedback.appText.trim();
  if (Object.keys(feedbackData).length > 0) updates.customerFeedback = feedbackData;
  await updateDoc(doc(db, 'orders', orderId), updates);
}

/**
 * מיקום המוביל בזמן אמת, כפי שהאפליקציה מפרסמת אותו — מראה
 * subscribeToDriverLocation() ב-src/services/location.ts. **אותו שדה
 * ממש** על מסמך ההזמנה (`orders/{id}.driverLocation`), לא תת-אוסף:
 * המוביל כותב אליו ישירות מהאפליקציה, ולכן אין צורך בכתיבה מהאתר.
 */
export function subscribeToDriverLocation(orderId, callback) {
  return onSnapshot(doc(db, 'orders', orderId), (snap) => {
    callback(snap.exists() ? (snap.data().driverLocation ?? null) : null);
  }, () => callback(null));
}

/** עד גיל זה המיקום נחשב חי. מראה LOCATION_LIVE_MS ב-location.ts. */
export const LOCATION_LIVE_MS = 75_000;
/** מעבר לזה כבר לא מדובר בהפרעה רגעית אלא במעקב שמושהה. מראה LOCATION_LOST_MS. */
export const LOCATION_LOST_MS = 5 * 60_000;

/** מראה getLocationFreshness() ב-location.ts. `null` = אין מיקום בכלל. */
export function locationFreshness(loc, now = Date.now()) {
  if (!loc) return null;
  const ts = loc.updatedAt;
  if (!ts || typeof ts.toMillis !== 'function') return 'stale';
  const age = Math.max(0, now - ts.toMillis());
  if (age < LOCATION_LIVE_MS) return 'live';
  if (age < LOCATION_LOST_MS) return 'stale';
  return 'lost';
}

/** "לפני 4 דקות" / "לפני רגע" — מראה formatLocationAge() ב-location.ts. */
export function formatLocationAge(loc, now = Date.now()) {
  const ts = loc?.updatedAt;
  if (!ts || typeof ts.toMillis !== 'function') return 'לא ידוע מתי';
  const ageMs = Math.max(0, now - ts.toMillis());
  const minutes = Math.floor(ageMs / 60_000);
  if (minutes < 1) return 'לפני פחות מדקה';
  if (minutes === 1) return 'לפני דקה';
  if (minutes < 60) return `לפני ${minutes} דקות`;
  const hours = Math.floor(minutes / 60);
  return hours === 1 ? 'לפני שעה' : `לפני ${hours} שעות`;
}

const CUSTOMER_CANCEL_URL = 'https://us-central1-hovalot-6cf65.cloudfunctions.net/customerCancelOrder';

/**
 * ביטול הזמנה ע"י הלקוח — **דרך אותה Cloud Function שהאפליקציה קוראת לה.**
 *
 * ## ⚠️ 16.9 — מה היה כאן, ולמה זה עלה כסף
 * עד היום זה היה `updateDoc` ישיר שכתב `status:'cancelled'` ותו לא.
 * שלושה שדות שהאפליקציה כותבת חסרו:
 *
 * | חסר | התוצאה בפועל |
 * |---|---|
 * | `refundDue` / `refundStatus` | `ordersWithRefundDue` מסנן `refundDue > 0`, ולכן **הזמנה שבוטלה מהאתר לא הופיעה ב-AdminRefundsScreen לעולם.** הכסף נשאר אצלנו ואיש לא ידע שיש חוב ולא כמה |
 * | `cancelledAt` | הדוח החשבונאי נפל ל-`createdAt`, והביטול נספר בחודש היצירה |
 * | דמי ביטול | האתר העביר `0` תמיד; האפליקציה גובה לפי המדרג |
 *
 * ⚠️ **ולא היה תיאורטי:** `order-status.html` מתיר ביטול ב-`pending`
 * וב-`assigned` — **שניהם אחרי תשלום**. והחוקים לא תפסו את זה, כי
 * `refundDueIsDerived()` מאמת את `refundDue` רק אם הוא **נכתב**.
 *
 * ## למה קריאה לשרת ולא חישוב כאן
 * ⚠️ **חישוב בצד-לקוח הוא בדיוק מה שיצר את הפער.** `customerCancelOrder`
 * מחשבת את המדרג **בשעון ישראל** — לקוח שמכשירו מוגדר לאזור זמן אחר
 * קיבל היסט מלא, ונמדד ₪0 מוצג מול ₪1,500 שנגבים. היא גם כותבת את
 * `refundDue` ומנקה את שדות המוביל. האתר קורא לה, לא משכפל אותה.
 *
 * החסם היה CORS — הפונקציה נפרסה בלי `{ cors: true }`, ולכן הדפדפן
 * חסם את הקריאה לפני שיצאה. ⚠️ **נפתר ואומת מול הפונקציה החיה (16.9):**
 * preflight מ-`Origin: https://rozicmove.com` מחזיר 204 עם
 * `access-control-allow-origin`.
 *
 * `shownFee` נשלח כדי שהשרת ירשום ללוג פער בין מה שהוצג לבין מה שנגבה —
 * הסימן היחיד ששני החישובים נפרדו. האתר אינו מציג מדרג לפני האישור
 * (ראו `order-status.html`), ולכן הוא שולח `0` ומסמן בכך "לא הוצג דבר".
 *
 * @returns {Promise<{fee:number, refundDue:number}>} מה נגבה בפועל ומה חייבים להחזיר.
 */
export async function cancelOrder(orderId) {
  if (!auth.currentUser) throw new Error('NOT_LOGGED_IN');
  const token = await auth.currentUser.getIdToken();
  const res = await fetch(CUSTOMER_CANCEL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ orderId, shownFee: 0 }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error ?? 'לא הצלחנו לבטל את ההזמנה');
  return { fee: data?.fee ?? 0, refundDue: data?.refundDue ?? 0 };
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

/**
 * 17.9 — "המוביל לא הגיע לנקודת האיסוף?" (דיווח שהמוביל שולח), צד הלקוח.
 *
 * מראה `CUSTOMER_NO_SHOW_RESPONSES` ב-Hovalot/src/services/orders.ts —
 * שלוש התשובות שהלקוח יכול לתת כשמוביל מדווח שהוא בכתובת ולא מוצא אותה.
 * **זכות תגובה, לא הכרעה**: התשובה נכנסת לתיק שהצוות בודק לפיו, ואינה
 * מבטלת ואינה מאשרת דבר בעצמה.
 */
export const CUSTOMER_NO_SHOW_RESPONSES = {
  here:          'אני כאן',
  wrong_address: 'אתה בכתובת הלא נכונה',
  on_the_way:    'אני בדרך, מאחר',
};

/**
 * מראה `respondToCustomerNoShow` ב-orders.ts — כתיבת לקוח ישירה (לא Cloud
 * Function): אין כאן שום דבר שהשרת צריך לאמת (זו דעתו של הלקוח) ואין תנועת
 * כסף, ו-firestore.rules כבר מתירות ללקוח לכתוב על ההזמנה שלו כל שדה שאינו
 * שדה כסף.
 */
export async function respondToCustomerNoShow(orderId, response) {
  await updateDoc(doc(db, 'orders', orderId), {
    customerNoShowResponse: response,
    customerNoShowRespondedAt: serverTimestamp(),
  });
}
