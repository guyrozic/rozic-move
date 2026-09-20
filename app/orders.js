// Web equivalent of Hovalot's src/services/orders.ts — customer-facing subset only
// (no driver/admin actions). Writes the exact same OrderRecord field shape so
// orders created from the web show up correctly in the mobile app's admin/driver
// screens with zero changes on that side.
import {
  addDoc, collection, deleteDoc, doc, getDoc, getDocs, onSnapshot,
  query, serverTimestamp, setDoc, updateDoc, where,
} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';
import { db, auth } from './firebase.js';
// מדרג הביטולים **אינו** מועתק לכאן ביד — הוא נגזר מהקובץ המקומפל מ-
// `~/Hovalot/src/data/pricing.ts`, שעליו `check-web-pricing-sync.ts` אוכף
// זהות. ראו `getCancellationPolicy` למטה.
import { CANCELLATION_POLICY, getCancellationFee } from './data/pricing.js';

/**
 * מסירה `undefined` לעומק, לפני כתיבה ל-Firestore.
 *
 * ⚠️ עותק מקומי, לא ייבוא מ-`guest-checkout.js` — הקובץ הזה נטען **על
 * ידי** `guest-checkout.js` (`saveDraftOrder`/`getActiveDraftOrder`/
 * `clearDraftOrder`, ראו 62.3), וייבוא בכיוון ההפוך היה מעגלי. הכלל
 * זהה בשני המקומות: `JSON.stringify`/`setDoc` משמיטים מפתח עם ערך
 * `undefined` בלי שגיאה, ובדפדפן `setDoc` **דוחה את הכתיבה כולה** על
 * שדה כזה (בניגוד ל-RNFB, לפחות יש כאן `reject`, לא כתיבה חלקית שקטה) —
 * ראו stripUndefined ב-guest-checkout.js לנימוק המלא.
 */
function stripUndefinedDeep(value) {
  if (Array.isArray(value)) return value.map(stripUndefinedDeep);
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (v === undefined) continue;
      out[k] = stripUndefinedDeep(v);
    }
    return out;
  }
  return value;
}

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
    /**
     * ⚠️ (task 3, 21.9) — מצב האשף המלא ברגע התשלום, **לא** שדה כספי.
     * קיים כדי ש-`order-status.html` יוכל להציע "ערוך את ההזמנה" על
     * הזמנה ב-`pending_payment`: `itemsSummary` הוא מחרוזת לקריאת אדם
     * ("מיטת יחיד x2") ואי אפשר לשחזר ממנה עגלה בלי ניחוש תוויות שמייצר
     * מחיר שגוי. זה בדיוק אותו `state` שנשמר לטיוטה (ראו `saveDraftOrder`
     * ו-`loadResumeDraft` ב-guest-checkout.js) — לא צורה חדשה.
     *
     * ⚠️ `firestore.rules`'s `serverOnlyMoneyFields()` הוא רשימת-איסור
     * (`hasAny`) ולא רשימת-היתר, ולכן שדה חדש שאינו בה עובר בלי שינוי
     * חוקים — נבדק ואומת (ראו `orderShapeValid`/`allow create`). מטרתו
     * היא שחזור הטופס בלבד — לא לקרוא ממנו מחיר בשום נתיב.
     */
    editablePayload: input.editablePayload ? stripUndefinedDeep(input.editablePayload) : null,
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

/**
 * פורמט סכום — פורט מילה במילה מ-`formatPrice()` ב-`src/utils/money.ts`.
 *
 * ⚠️ הפונקציה קיימת באתר כבר פעמיים, מקומית בתוך `apartment.html`
 * וב-`small-move.html`, ושתיהן העתק של אותו ביטוי. כאן היא מיוצאת כדי
 * שמסך ההזמנה יציג דמי ביטול באותו פורמט **בדיוק** שבו האפליקציה מציגה
 * אותם — סכום כסף שמוצג בשני פורמטים באותו מוצר נראה כמו שני סכומים.
 */
export function formatPrice(amount) {
  const n = amount ?? 0;
  if (!Number.isFinite(n)) return '0';
  const rounded = Math.round(n);
  const sign = rounded < 0 ? '-' : '';
  return sign + Math.abs(rounded).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * שיעור החיוב בביטול אחרי שהמוביל כבר יצא לדרך — מראה
 * `EN_ROUTE_CANCELLATION_RATE` ב-`src/services/cancellation.ts`.
 *
 * ⚠️ **הערך הזה כתוב גם בתקנון (§8), גם בפרומפט של סוכן התמיכה, וגם
 * בשני מסכי הסיכום באפליקציה.** בניגוד למדרג הזמן, שיושב ב-
 * `data/pricing.js` המקומפל ומסונכרן אוטומטית, הקבוע הזה חי ב-
 * `cancellation.ts` — קובץ שאינו מקומפל לאתר — ולכן זהו **עותק שני
 * שנכתב ביד ואיש אינו אוכף עליו התאמה**. `check-app-web-const-sync.mjs`
 * אינו מכיר אותו היום. שינוי שלו באפליקציה חייב להיעשות גם כאן.
 */
const EN_ROUTE_CANCELLATION_RATE = 0.75;

/**
 * כמה שעות נותרו עד מועד ההובלה — פורט אחד לאחד מ-`hoursUntilPickup()`
 * ב-`cancellation.ts`, כולל הנפילה ל-`null` כשאין מספיק מידע.
 *
 * `scheduledDate` נשמר כטקסט "D/M/YYYY" ו-`timeSlot` כטווח "08:00-11:00".
 * מחשבים מול *תחילת* חלון הזמן. ערך שלילי = המועד כבר עבר.
 *
 * ⚠️ `new Date(y, m-1, d, h)` בדפדפן משתמש באזור הזמן של **המכשיר**,
 * בדיוק כמו ב-React Native — כלומר הפורט נאמן למקור גם בסטייה הזאת.
 * זו בדיוק הסיבה ש-`customerCancelOrder` מחשבת בשעון ישראל ושהיא זו
 * שקובעת את החיוב בפועל; מה שמחושב כאן הוא **תצוגה בלבד**, ו-`shownFee`
 * הוא מה שמאפשר לשרת לרשום ללוג פער בין השניים.
 */
function hoursUntilPickup(order) {
  if (!order.scheduledDate) return null;
  const parts = String(order.scheduledDate).split('/').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
  const [day, month, year] = parts;

  // תחילת חלון הזמן; בלי timeSlot נופלים לתחילת היום.
  const startHour = Number(order.timeSlot?.split('-')[0]?.split(':')[0]);
  const pickup = new Date(year, month - 1, day, Number.isNaN(startHour) ? 0 : startHour, 0, 0, 0);
  if (Number.isNaN(pickup.getTime())) return null;

  return (pickup.getTime() - Date.now()) / (1000 * 60 * 60);
}

/**
 * מדיניות הביטול כפי שהיא מוצגת ללקוח **לפני** האישור — פורט אחד לאחד
 * מ-`getCancellationPolicy()` ב-`src/services/cancellation.ts`.
 *
 * ## ⚠️ למה זה פורט עכשיו, אחרי שבמפורש הוחלט לא לפורט
 * ההערה שליד כפתור הביטול ב-`order-status.html` אמרה שחישוב צד-לקוח
 * כאן "יהיה חישוב שני שיכול להיפרד מהשרת", ולכן האזהרה נוסחה כמשפט
 * גנרי אחד. **הנימוק נכון, והמסקנה שנגזרה ממנו הייתה שגויה** — כי
 * המשפט הגנרי גובה מחיר בשני הכיוונים:
 *
 * 1. **שלושה מצבים שבהם הביטול חינם** (טרם שולם · טרם שובץ מוביל ·
 *    המוביל לא סימן שיצא והמועד עבר) הוצגו ללקוח כ"ייתכן חיוב דמי
 *    ביטול". התקנון §8 מבטיח לו שאינו מחויב, והאתר הרתיע אותו מלממש
 *    את מה שמובטח לו.
 * 2. **מי שייגבו ממנו 75%** לחץ "אישור" בלי לראות מספר.
 *
 * ## מה מגן מפני הפיצול שההערה חששה ממנו
 * - **הפורט מלא ומדויק**, ולא "רק המקרים הקלים". ערך שונה כאן ושם גרוע
 *   מהמצב הקודם, ולכן אין כאן גרסה מקורבת.
 * - **מדרג הזמן נגזר מ-`data/pricing.js`**, שמקומפל מ-`src/data/pricing.ts`
 *   ונבדק ע"י `check-web-pricing-sync.ts` — לא הועתק לכאן ביד.
 * - **החישוב אינו קובע דבר.** `customerCancelOrder` היא שגובה, וכל מה
 *   שנעשה כאן הוא להציג ולשלוח את המספר הלאה כ-`shownFee`.
 *
 * @param {object} order מסמך ההזמנה
 * @param {'customer'|'driver'} cancellerRole האתר הוא צד הלקוח בלבד;
 *   ענף המוביל פורט כדי שהפונקציה תישאר זהה למקור וניתנת להשוואה מולו.
 * @returns {{allowed:boolean, fee:number, feePercent:number, warningMessage:string, confirmLabel:string}}
 */
export function getCancellationPolicy(order, cancellerRole = 'customer') {
  if (cancellerRole === 'driver') {
    return {
      allowed: true,
      fee: 0,
      feePercent: 0,
      warningMessage: 'אם תבטל אחרי שלקחת את ההזמנה יירד קנס מהפיקדון ויועבר ללקוח כפיצוי: ₪100 אם נותרו יותר מ-24 שעות עד תחילת חלון הזמן, ו-₪150 אם נותרו פחות.\nכל ביטול נספר: ביטול ראשון ושני = השעיית חשבון לחודש (אפשר לערער מול הצוות). ביטול שלישי = השעיה לצמיתות.',
      confirmLabel: 'כן, בטל את ההזמנה',
    };
  }

  // ── מדיניות ביטול של הלקוח ──
  if (order.status === 'pending_pricing' || order.status === 'pending_payment') {
    return {
      allowed: true,
      fee: 0,
      feePercent: 0,
      warningMessage: 'ההזמנה עדיין לא שולמה — ביטול ללא עלות.',
      confirmLabel: 'כן, בטל את ההזמנה',
    };
  }

  // `pending` = טרם שובץ מוביל. אין מוביל, אין חלון זמן שאבד, ואין את מי
  // לפצות — המדרג כאן היה גובה 75% על כך ש**אנחנו** לא מצאנו מוביל.
  if (order.status === 'pending') {
    return {
      allowed: true,
      fee: 0,
      feePercent: 0,
      warningMessage: 'עדיין לא שובץ מוביל להזמנה — ביטול ללא עלות.',
      confirmLabel: 'כן, בטל את ההזמנה',
    };
  }

  if (order.status === 'assigned') {
    const hoursUntil = hoursUntilPickup(order);
    // בלי תאריך/שעה אין מדרג להחיל — נופלים לביטול ללא עלות במקום לנחש
    // לרעת הלקוח.
    if (hoursUntil === null) {
      return {
        allowed: true,
        fee: 0,
        feePercent: 0,
        warningMessage: 'ביטול ההזמנה — ללא עלות.',
        confirmLabel: 'כן, בטל את ההזמנה',
      };
    }

    // המועד עבר והמוביל מעולם לא סימן שיצא. `assigned` (ולא `en_route`)
    // הוא בדיוק העובדה הזו במסד: המוביל לא התחיל. מדרג "אי-הופעה" כאן
    // היה מחייב לקוחה שהמוביל הבריז לה ב-75%.
    if (hoursUntil < 0) {
      return {
        allowed: true,
        fee: 0,
        feePercent: 0,
        warningMessage: 'המוביל לא סימן שיצא לדרך והמועד כבר עבר — ביטול ללא עלות.',
        confirmLabel: 'כן, בטל את ההזמנה',
      };
    }

    const fee = getCancellationFee(order.price, hoursUntil);
    const tier = CANCELLATION_POLICY.find(
      t => hoursUntil >= t.hoursBeforeMin && hoursUntil < t.hoursBeforeMax
    );
    const feePercent = Math.round((tier?.feePct ?? 0.5) * 100);

    if (fee <= 0) {
      return {
        allowed: true,
        fee: 0,
        feePercent: 0,
        warningMessage: `${tier?.description ?? 'ביטול ללא עלות'}.`,
        confirmLabel: 'כן, בטל את ההזמנה',
      };
    }
    return {
      allowed: true,
      fee,
      feePercent,
      warningMessage: `${tier?.description ?? ''}.\nדמי ביטול: ₪${formatPrice(fee)} (${feePercent}% מהמחיר).`,
      confirmLabel: `כן, בטל ושלם ₪${formatPrice(fee)}`,
    };
  }

  if (order.status === 'en_route') {
    const fee = Math.round((order.price ?? 0) * EN_ROUTE_CANCELLATION_RATE);
    return {
      allowed: true,
      fee,
      feePercent: Math.round(EN_ROUTE_CANCELLATION_RATE * 100),
      // ⚠️ האחוז **נגזר** ולא כתוב כמחרוזת — אחרת שינוי עתידי של הקבוע
      // היה משנה את החיוב ומותיר את האזהרה ללקוח משקרת.
      warningMessage: `המוביל כבר בדרך אליך.\nביטול בשלב הזה מחויב ב-${Math.round(EN_ROUTE_CANCELLATION_RATE * 100)}% מסכום ההזמנה (₪${formatPrice(fee)} מתוך ₪${formatPrice(order.price ?? 0)}).`,
      confirmLabel: 'כן, בטל את ההזמנה',
    };
  }

  return { allowed: false, fee: 0, feePercent: 0, warningMessage: '', confirmLabel: '' };
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
 * ## ⚠️ `shownFee` — רשת הביטחון, שהייתה מנותקת
 * השרת משווה בין מה שהוצג ללקוח לבין מה שנגבה ממנו בפועל, ורושם ללוג
 * כל פער. זהו **הסימן היחיד** ששני החישובים נפרדו (שעון קיץ, מכשיר
 * בחו"ל, מדרג שהשתנה בצד אחד).
 *
 * עד היום האתר שלח `0` **תמיד**, ובצדק: הוא לא הציג מדרג, ו-`0` אמר
 * "לא הוצג דבר". אלא שמנגנון ההשוואה אינו יודע להבחין בין "לא הוצג
 * דבר" לבין "הוצג ₪0" — ולכן הוא היה **מושבת בפועל על כל ביטול
 * מהאתר**, כולל אלה שנגבו בהם ₪1,500.
 *
 * עכשיו `order-status.html` מציג את המדרג (`getCancellationPolicy`
 * למעלה) ומעביר לכאן את **אותו** מספר שהלקוח ראה על המסך, בדיוק כמו
 * `handleCancel` באפליקציה שמעביר `policy.fee`. הפרמטר חובה ואין לו
 * ברירת מחדל: קורא שישכח אותו יקבל `undefined` ויתגלה מיד, במקום
 * להחזיר בשקט את אותה השתקה.
 *
 * @param {string} orderId
 * @param {number} shownFee דמי הביטול **שהוצגו ללקוח** לפני האישור.
 * @returns {Promise<{fee:number, refundDue:number}>} מה נגבה בפועל ומה חייבים להחזיר.
 */
export async function cancelOrder(orderId, shownFee) {
  if (!auth.currentUser) throw new Error('NOT_LOGGED_IN');
  const token = await auth.currentUser.getIdToken();
  const res = await fetch(CUSTOMER_CANCEL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ orderId, shownFee }),
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

/* ═══════════ "המוביל לא הגיע" ═══════════════════════════════════════
   תאום ל-`canReportNoShow` + `reportDriverNoShow` באפליקציה
   (`src/services/orders.ts:1776`).

   ⚠️ **המסלול הזה נעדר מהאתר לגמרי עד 20.9.** הערה ב-
   `order-status.html` תיעדה את הסיבה: ב-17.9 `reportNoShow` חסמה
   preflight מ-`rozicmove.com`. אומת מול הייצור עכשיו —
   `OPTIONS` מחזיר 204 עם `access-control-allow-origin: rozicmove.com`
   ו-`Authorization` ברשימת הכותרות. החסם כבר לא קיים.

   ⚠️ **התנאים מועתקים מילה במילה** ולא נוסחו מחדש: `assigned` בלבד,
   לא דווח כבר, ורק אחרי סוף חלון הזמן. בלי חלון — סוף היום, כדי לא
   לפתוח דיווח על הזמנה שאין לה מועד סיום. */
const NO_SHOW_URL = 'https://us-central1-hovalot-6cf65.cloudfunctions.net/reportNoShow';

export function canReportNoShow(order) {
  if (order.status !== 'assigned') return false;
  if (order.noShowReportedAt) return false;
  if (!order.scheduledDate) return false;
  const parts = String(order.scheduledDate).split('/').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return false;
  const [day, month, year] = parts;
  const endHour = Number(order.timeSlot?.split('-')[1]?.split(':')[0]);
  const end = new Date(year, month - 1, day, Number.isNaN(endHour) ? 23 : endHour).getTime();
  return Date.now() >= end;
}

export async function reportDriverNoShow(orderId) {
  const { auth } = await import('./firebase.js');
  if (!auth.currentUser) throw new Error('NOT_LOGGED_IN');
  const token = await auth.currentUser.getIdToken();
  const res = await fetch(NO_SHOW_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ orderId }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error((data && data.error) || 'NO_SHOW_FAILED');
  return data;
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

/**
 * האם למשתמש יש הזמנה פעילה כרגע. תאום ל-`hasActiveOrders`
 * ב-`orders.ts:1026`, כולל רשימות הסטטוסים.
 *
 * ⚠️ **הבדיקה הזו נוספה באפליקציה ב-21.8 כהגנה על כסף, לא כנוחות.**
 * הנימוק שם, מילה במילה: *"אצל מוביל זו הייתה דרך מלאה להתחמק מהמחיר
 * של ביטול — לוקחים הזמנה, מוחקים חשבון, ואין קנס פיקדון, אין סטרייק
 * ואין השעיה. אצל לקוח זה משאיר מוביל בדרך להזמנה של אף אחד."*
 *
 * ⚠️ **הרשימה ללקוח רחבה מזו של המוביל בכוונה.** לקוח עם הזמנה
 * ב-`pending_payment` או `pending_pricing` הוא לקוח שיש לו התחייבות
 * פתוחה מולנו; מוביל באותם סטטוסים אינו משובץ לכלום.
 *
 * ⚠️ האתר הוא ממשק לקוח בלבד, אבל השאילתה כוללת גם `driverId` —
 * **אותו משתמש יכול להיות מוביל שנכנס מהדפדפן.** בדיקה שמסתכלת רק על
 * `customerId` הייתה משאירה בדיוק את חור-הבריחה שהאפליקציה סגרה.
 */
/**
 * ⚠️ **לא רשימה חדשה.** `ACTIVE_CUSTOMER_STATUSES` הצר (שורה 63) הוא
 * "יש הזמנה פעילה" לצורך נעילת מתג ההתראות, ואינו כולל את השלבים שלפני
 * התשלום — כלומר לקוח שההזמנה שלו ממתינה לתשלום היה עובר את הבדיקה
 * ומוחק חשבון עם התחייבות פתוחה. `OPEN_CUSTOMER_STATUSES` הוא בדיוק
 * הקבוצה ש-`orders.ts:1030` בודק מולה, ולכן הוא זה שנמצא בשימוש כאן.
 *
 * ההכרזה הראשונה שכתבתי כאן הייתה `ACTIVE_CUSTOMER_STATUSES` — שם שכבר
 * תפוס בקובץ הזה. זו הייתה הכרזה כפולה שמפילה את **כל** דף שמייבא את
 * המודול, לא רק את המחיקה.
 */
const DELETION_BLOCKING_DRIVER_STATUSES = ['assigned', 'en_route', 'in_progress'];

export async function hasActiveOrders(uid) {
  const [asDriver, asCustomer] = await Promise.all([
    getDocs(query(collection(db, 'orders'), where('driverId', '==', uid), where('status', 'in', DELETION_BLOCKING_DRIVER_STATUSES))),
    getDocs(query(collection(db, 'orders'), where('customerId', '==', uid), where('status', 'in', OPEN_CUSTOMER_STATUSES))),
  ]);
  return !asDriver.empty || !asCustomer.empty;
}
