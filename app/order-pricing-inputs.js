// ============================================================
//  pricingInputs — הקלטים שמהם השרת מחשב מחדש את מחיר ההזמנה
// ============================================================
// 31.10 (הכרעה 134.2): `createGrowCheckout` לא גובה יותר את `order.price`
// כפי שהדפדפן כתב אותו. הוא מחשב מחדש מ-`orders/{id}.pricingInputs`, מהקואורדינטות
// ב-`orders/{id}/private/contact` ומהתעריפים החיים, ואם יש פער — **דורס**
// את `price` במחיר שלו.
//
// ⚠️ זה העתק של `buildPricingInputs` מ-`~/Hovalot/src/data/orderPricing.ts`
// (בלי הטיפוסים). לא לערוך כאן לבד: `scripts/check-web-order-pricing-sync.ts`
// ב-Hovalot מריץ את שתי הגרסאות על אותם קלטים ונופל על כל הבדל בצורה.
//
// ⚠️ `undefined` אסור ב-Firestore (JSON.stringify משמיט את המפתח בשקט, והשרת
// רואה שדה חסר) — לכן כל שדה מקבל ערך מפורש, עם `null` כשאין.
export function buildPricingInputs(i) {
  const out = {
    v: 1,
    fromFloor: i.fromFloor ?? null,
    toFloor: i.toFloor ?? null,
    fromElevator: !!i.fromElevator,
    toElevator: !!i.toElevator,
    couponCode: i.couponCode,
  };
  if (i.items) { out.items = i.items; out.boxesAlreadyPacked = !!i.boxesAlreadyPacked; }
  if (i.quantities) out.quantities = i.quantities;
  return out;
}

/**
 * באתר הפריטים שטוחים (`state.items[itemKey] = qty`) ולא לפי חדר כמו באפליקציה
 * (`items[roomId][itemKey]`). השרת אינו קורא את מזהי החדרים אלא רק סוכם על פניהם
 * (`Object.keys(items)`), ולכן כל הפריטים נכנסים תחת "חדר" אחד. מחיר ואריזה
 * מצטברים לפי פריט, כך שהסכום זהה — הבדיקה ב-Hovalot מוכיחה את זה.
 */
export const WEB_ROOM_ID = 'web';

/** כמויות > 0 בלבד — בדיוק מה ש-`computeApartmentPrice` קורא. */
export function positiveQuantities(items) {
  return Object.fromEntries(Object.entries(items || {}).filter(([, q]) => q > 0));
}

export function apartmentPricingInputs(state, couponCode) {
  return buildPricingInputs({
    items: { [WEB_ROOM_ID]: positiveQuantities(state.items) },
    fromFloor: state.fromFloor, toFloor: state.toFloor,
    fromElevator: state.fromElevator, toElevator: state.toElevator,
    boxesAlreadyPacked: state.boxesAlreadyPacked,
    couponCode,
  });
}

export function smallMovePricingInputs(state, couponCode) {
  return buildPricingInputs({
    quantities: positiveQuantities(state.items),
    fromFloor: state.fromFloor, toFloor: state.toFloor,
    fromElevator: state.fromElevator, toElevator: state.toElevator,
    couponCode,
  });
}
