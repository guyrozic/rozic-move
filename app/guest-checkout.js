/**
 * הזמנה בלי חשבון — עד שלב התשלום.
 *
 * ## למה זה קיים (14.9)
 * עד היום `apartment.html` ו-`small-move.html` קראו ל-`requireAuth()`
 * **בשורה הראשונה**, כלומר אורח נזרק ל-`login.html` לפני שראה מחיר אחד.
 *
 * גיא: *"לקוחות לא אוהבים יש ליצור חשבון — הם מעדיפים קודם לראות מה
 * קורה, להתחיל הזמנה בלי ליצור חשבון, ואם זה נראה להם בסוף עם התשלום
 * אין להם בעיה להירשם… לקוחות לא אוהבים למלא פרטים - זה מבריח אותם."*
 *
 * **הגבול שהוא קבע מדויק:** לשוטט בלי חשבון, לקבל מחיר בלי חשבון —
 * **ולהירשם לפני התשלום.** לא אחריו.
 *
 * ## ⚠️ למה יש כאן שמירת טיוטה בכלל
 * זה החלק שבלעדיו השינוי מזיק במקום להועיל. אורח שבנה הזמנה שלמה —
 * פריטים, כתובות, קומות, תאריך — ואז נשלח להירשם, **חוזר לדף ריק
 * ומתחיל מאפס**. זה גרוע מהמצב הקודם, שבו לפחות ידע מראש שהוא צריך
 * חשבון. גיא ניסח את התנאי במפורש: *"ואז הכול יישמר תחתיו ויוכל לשלם."*
 *
 * לכן: לפני ההפניה ל-login נשמרת הטיוטה, ובחזרה היא משוחזרת. **ההפניה
 * והשמירה חייבות להישאר צמודות** — כל נתיב חדש שמפנה להרשמה מאמצע
 * הזרימה חייב לקרוא ל-`saveOrderDraft` קודם.
 *
 * ## ⚠️ מה שהטיוטה במכוון אינה שומרת
 * **מחיר.** המחיר מחושב מחדש מ-`computePrice()` בכל טעינה. טיוטה ששומרת
 * מחיר היא טיוטה שמציגה מחיר ישן אחרי עדכון מחירון — וזה בדיוק הפער
 * שסגרנו באפליקציה (מדיניות נעילת המחירים: נעילה קורית בתשלום, לא
 * בטיוטה). כאן היא נשמרת ב-localStorage של הדפדפן, בלי שום גיבוי בשרת,
 * ולכן **אין לה שום מעמד מחייב**.
 *
 * ## מה הוויתור, ומי החליט עליו
 * אורח שנוטש לפני התשלום אינו מזוהה: אין לו מעקב, אין התראות, ואי אפשר
 * ליצור איתו קשר. גיא שקל והכריע: *"לא יהיה עדכון מעקב ולהחזיר כסף עד
 * שלב התשלום, לכן לא יהיה למי להחזיר, ואני יודע שאנחנו מוותרים על
 * עדכונים ומעקב אבל זה נראה לי עדיף."* **זו הכרעה מודעת, לא פספוס.**
 */

import { subscribeToAuth } from './auth.js';
import { auth } from './firebase.js';
import { parseDateApp } from './geo.js';
// 62.3 (21.9) — הטיוטה של מחובר נוסעת עם החשבון, לא עם המכשיר. שלוש הפונקציות
// האלה כבר קיימות ב-orders.js ומראות מילה במילה את saveDraftOrder/
// getActiveDraftOrder/clearDraftOrder באפליקציה (Hovalot/src/services/orders.ts) —
// ראו את הפונקציות למטה (loadResumeDraft, attachDraftAutosave) למה עד עכשיו
// שום מסך לא קרא להן.
import { saveDraftOrder, getActiveDraftOrder, clearDraftOrder } from './orders.js';

/** כמה זמן טיוטת אורח נשארת רלוונטית. מעבר לזה — מחירים ותאריכים מתיישנים. */
const DRAFT_TTL_MS = 24 * 60 * 60 * 1000;

const draftKey = (serviceType) => `rozic:draft:${serviceType}`;

/**
 * תקרת ההערות למוביל.
 *
 * ⚠️ **זו לא החמרה שלנו — זו התקרה שכבר קיימת בשני הצדדים.** השדה באתר
 * היה בלי `maxlength` בכלל, בזמן ש-`firestore.rules` חוסם `notes` מעל
 * 1000 תווים. כלומר לקוח שכתב הערה ארוכה למוביל ולחץ "מעבר לתשלום"
 * קיבל *יצירת ההזמנה נכשלה. נסה שוב.* — **וכל ניסיון חוזר נכשל בדיוק
 * אותו דבר**, כי ההערה נשארת בשדה. אין לו שום רמז לקשר בין השניים.
 *
 * 500 ולא 1000: זו התקרה שהשדה המקביל באפליקציה מגביל אליה, ודף באתר
 * שמתיר יותר מהאפליקציה הוא בדיוק הפער שיוצר הזמנות שעוברות כאן
 * ונופלות שם. ⚠️ הערך כתוב גם כ-`maxlength` ב-`apartment.html`
 * וב-`small-move.html` — שינוי כאן בלבד לא יעצור הקלדה.
 */
export const NOTES_MAX_LENGTH = 500;

/**
 * מצב ההתחברות **בלי להפנות לשום מקום** — התאום השקט של `requireAuth`.
 * מחזיר `null` לאורח, וזה מצב תקין ולא שגיאה.
 */
export function getAuthOptional() {
  return new Promise((resolve) => {
    const unsub = subscribeToAuth((state) => { unsub(); resolve(state); });
  });
}

/**
 * ⚠️ מוביל אינו לקוח. גיא (14.9): *"הזמנה צריכה להיות ללקוחות בלבד —
 * התחברתי עם חשבון מוביל וזה השאיר אותי בזרימה רגילה, צריכה להיות
 * חסימה לכך."*
 *
 * הבדיקה על `userType` ולא על היעדר שדות מוביל: חשבון מוביל שטרם השלים
 * מסמכים הוא עדיין מוביל, וצריך להיחסם בדיוק כמו מי שהשלים.
 */
export function isDriverAccount(state) {
  return state?.profile?.userType === 'driver';
}

/**
 * ⚠️ 18.9 — **בעל הטיוטה.**
 *
 * ## למה זה נוסף עכשיו ולא קודם
 * `rozic:draft:apartment` הוא מפתח **גלובלי לדפדפן** (ראו
 * `clearAllOrderDrafts` — שם זה כבר מתועד כדליפה שאומתה בהרצה: כתובת
 * הבית, כתובת היעד, והטקסט החופשי של משתמש א׳ הופיעו בטופס של ב׳).
 * עד היום הטיוטה נכתבה **רק** בקיר ההרשמה, כלומר כמעט תמיד ע"י אורח.
 * עם השמירה האוטומטית היא נכתבת בכל אינטראקציה, גם של משתמש מחובר —
 * כלומר **נתיב הדליפה מתרחב בדיוק בגלל התיקון**, וזה לא מקובל.
 *
 * ## הכלל, ולמה הוא לא שובר את הפיצ'ר
 * טיוטה של **אורח** (`uid: null`) פתוחה לכל אחד — זה כל הרעיון: בונים
 * בלי חשבון, נשלחים להירשם, וחוזרים לאותה הזמנה תחת החשבון החדש.
 * טיוטה שנשמרה תחת משתמש מזוהה שייכת לו בלבד.
 *
 * ⚠️ טיוטה ישנה בלי השדה (`undefined`) נחשבת אורח — כלומר בדיוק
 * ההתנהגות שהייתה לפני השינוי, בלי לזרוק טיוטות קיימות של אף אחד.
 */
function currentUid() {
  return auth.currentUser?.uid ?? null;
}

/**
 * מנקה `undefined` מכל עומק לפני כתיבה.
 *
 * ## ⚠️ למה זה כאן, למרות שאין Firestore בנתיב הזה
 * הכלל באפליקציה (`~/Hovalot/CLAUDE.md`, "שמירת טיוטות" סעיף 7) נוסח מול
 * RNFB, שזורק `Unsupported field value: undefined` ו**מפיל את הכתיבה
 * כולה**. בדפדפן הכשל שקט יותר ולכן מסוכן באותה מידה: `JSON.stringify`
 * **משמיט** מפתח שערכו `undefined` בלי מילה. כלומר
 * `{ timeSlot: undefined }` נכתב כטיוטה שבה `timeSlot` פשוט אינו קיים —
 * וב-`shapeOk` זה עובר (`if (!(key in state)) continue`), וב-
 * `Object.assign` הוא לא דורס את ברירת המחדל. התוצאה היא שדה שנעלם
 * מהטיוטה בלי שאיש יראה שגיאה, כלומר בדיוק אותו תסמין שהכלל בא למנוע.
 *
 * הניקוי המפורש הופך את זה למפורש: מה שנשמר הוא מה שנקרא בחזרה, ו-
 * `null` (ערך אמיתי, למשל `fromLat` לפני גאוקוד) עובר כמו שהוא.
 *
 * ⚠️ עומק ולא רק שכבה ראשונה: `freeItems` הוא `[{label, qty, description}]`
 * ו-`description` אופציונלי — כלומר `undefined` בתוך מערך הוא המקרה
 * השכיח כאן, לא התיאורטי. `JSON.stringify` היה הופך אותו לאיבר
 * `{label,qty}` ולא ל-`null`, וזה דווקא בסדר; הניקוי משאיר את אותה
 * תוצאה בלי להסתמך על התנהגות של הסריאלייזר.
 */
export function stripUndefined(value) {
  if (Array.isArray(value)) return value.map(stripUndefined);
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (v === undefined) continue;
      out[k] = stripUndefined(v);
    }
    return out;
  }
  return value;
}

/**
 * שומרת את מצב ההזמנה. ראו ההערה למעלה — זה לא אופציונלי.
 *
 * ⚠️ 18.9 — **הכשל לא נבלע יותר בשקט.** ה-`catch` כאן החזיר `false` ותו
 * לא, וזה בדיוק ה-`catch` הריק שהכלל באפליקציה נכתב בגללו (סעיף 8):
 * כתיבה שנכשלת בכל פעם נראית בדיוק כמו כתיבה שמצליחה. עכשיו הקורא
 * מקבל `false` **וגם** נשארת שורה בקונסול — זו העקבה היחידה שיש לנו
 * בדפדפן של לקוח, והיא מבדילה בין "לא שמרנו" ל"שמרנו ולא שוחזר".
 */
export function saveOrderDraft(serviceType, state) {
  try {
    localStorage.setItem(
      draftKey(serviceType),
      JSON.stringify({ savedAt: Date.now(), uid: currentUid(), state: stripUndefined(state) }),
    );
    return true;
  } catch (err) {
    // מכסה מצב פרטי, אחסון מלא, ודפדפן שחוסם אחסון. כישלון שמירה לא
    // מפיל את ההרשמה — הוא רק אומר שהלקוח ימלא שוב, וזה עדיף על מסך שבור.
    console.warn('[draft] שמירת טיוטה נכשלה', serviceType, err && err.name, err && err.message);
    return false;
  }
}

/**
 * ⚠️ הטיוטה נמזגת ל-`state` ב-`Object.assign`, כלומר **כל שדה בה דורס
 * את המקור בלי בדיקת טיפוס**. שדה במבנה שגוי אינו נשאר בעיה מקומית:
 * `renderFreeItems` קורא `state.freeItems.map`, וטיוטה שבה `freeItems`
 * הוא מחרוזת מפילה את הסקריפט כולו — **הדף מת ואי אפשר להזמין בו**.
 *
 * נתפס בבדיקה עוינת (15.9), אבל התרחיש המסוכן אינו זדוני אלא שגרתי:
 * **טיוטה שנשמרה בגרסת קוד קודמת.** שינוי מבנה של `state` בעתיד יהפוך
 * כל טיוטה קיימת לפצצה אצל מי שיש לו אחת — ואין לו דרך לנקות אותה.
 *
 * לכן: טיוטה שלא עומדת בצורה הצפויה **נזרקת** ולא מתוקנת חלקית.
 * טיוטה חצי-תקינה שמשוחזרת היא בדיוק הסוג של באג שנראה אקראי.
 */
/**
 * ⚠️ 18.9 — **שלושה שדות שעברו כאן בלי אימות, ואחד מהם משנה מחיר.**
 *
 * הרשימה הזאת נקראת כאילו היא כל `state`, והיא לא הייתה: שדה שאינו כאן
 * מדלג על הבדיקה לגמרי (`if (!(key in state)) continue`) ונמזג ל-`state`
 * ב-`Object.assign` כמו שהוא. כלומר בדיוק הפער שההערה למעלה מזהירה
 * ממנו — "טיוטה במבנה שגוי מפילה את הסקריפט" — נשאר פתוח לשדות שלא
 * נרשמו כאן.
 *
 * - **`boxesAlreadyPacked`** — תשובת הלקוח ל"הארגזים כבר ארוזים?".
 *   `computePrice` גוזר ממנו `countCustomerBoxes`, שקובע אם ארגזי
 *   הקרטון נכנסים למחיר שירות האריזה. ערך שאינו בוליאני (`"no"`,
 *   למשל) הוא truthy, כלומר **הארגזים יורדים מהחישוב והלקוח משלם
 *   פחות** — שדה מחיר שעבר בלי אימות.
 * - **`craneFloor`** — נקרא חזרה ב-`applyDraftToForm` ומוזן ל-
 *   `craneCostFor()`. גם הוא נתיב מחיר.
 * - **`couponCode`** — נשמר כטקסט בלבד (ראו `applyDraftToForm`).
 *
 * ⚠️ **גם `__step` אינו כאן בכוונה** (השלב שאליו חוזרים; נכתב מתוך
 * `attachDraftAutosave` ב-`apartment.html`/`small-move.html`). הוא
 * *כן* עובר ב-`Object.assign` בלי אימות — אבל הקורא מחטא אותו בעצמו
 * (`Math.min(4, Math.max(1, Number(...) || 1))`), כלומר כל ערך פגום
 * נופל חזרה לשלב 1. רישום שלו כאן היה עושה את ההפך ממה שנדרש: `shapeOk`
 * זורק את **הטיוטה כולה** על שדה שנכשל, ואובדן הזמנה שלמה בגלל מספר
 * שלב שגוי הוא נזק גדול בהרבה מהתעלמות ממנו.
 *
 * ⚠️ **מה שבמכוון *אינו* כאן:** `fromLat`/`fromLng`/`toLat`/`toLng`.
 * הם `null` לגיטימי עד שהגאוקוד חוזר, ו-`shapeOk` פוסל `null` בכל שדה
 * רשום (בצדק — ראו ההערה עליו) — כלומר רישום שלהם כאן היה **זורק כל
 * טיוטה** שנשמרה לפני שהכתובת אומתה. זו לא השמטה.
 */
const DRAFT_SHAPE = {
  items: 'object', freeItems: 'array', craneItems: 'array',
  fromAddress: 'string', toAddress: 'string', fromFloor: 'string', toFloor: 'string',
  notes: 'string', date: 'string', timeSlot: 'string',
  hasPacking: 'boolean', hasInsurance: 'boolean', needsCrane: 'boolean',
  fromElevator: 'boolean', toElevator: 'boolean', distance: 'number',
  boxesAlreadyPacked: 'boolean', craneFloor: 'string', couponCode: 'string',
};

/**
 * ⚠️ 15.9 — **בדיקת הטיפוס לבדה לא הספיקה, והדף מת לצמיתות.**
 *
 * שתי צורות עברו את `shapeOk` והפילו את הסקריפט:
 *
 * 1. `items: null` — `typeof null === 'object'`, כלומר null עובר כ"אובייקט
 *    תקין" לכל שדה שהטיפוס הצפוי שלו הוא object. התוצאה: `Object.entries(null)`
 *    ב-`selectedItems()` זורק, **הקטלוג לא מתרנדר בכלל**, ואין על המסך
 *    כפתור "המשך".
 * 2. `freeItems: [null]` — `Array.isArray([null])` נכון, המערך במבנה הנכון,
 *    אבל `renderFreeItems` קורא `f.label` על האיבר ונופל. הסרגל התחתון
 *    נשאר מוסתר.
 *
 * ⚠️ **ובשני המקרים הטיוטה נשארה ב-localStorage** — כלומר הכישלון אינו
 * חד-פעמי: כל רענון מת מחדש, במשך 24 שעות, ואין ללקוח שום מוצא חוץ
 * ממחיקת נתוני האתר בהגדרות הדפדפן. בדיוק מהסיבה הזו הבדיקה חייבת
 * להסתכל **לתוך** המערכים ולא רק על העטיפה שלהם.
 */
const ARRAY_ELEMENT_OK = {
  // [{label, qty}] — `label` מוזרק ל-HTML ו-`qty` מסוכם; שניהם חייבים להיות שם.
  freeItems: (v) => !!v && typeof v === 'object' && !Array.isArray(v)
    && typeof v.label === 'string' && typeof v.qty === 'number' && Number.isFinite(v.qty),
  // מערך תוויות — `state.craneItems.includes(label)` ו-`filter` על מחרוזות.
  craneItems: (v) => typeof v === 'string',
};

/**
 * ⚠️ 62.3 (21.9) — מיוצאת כדי ש-`loadResumeDraft` תוכל להפעיל **את אותה**
 * בדיקה על טיוטה מרוחקת (`draftPayload` שנקרא מ-Firestore). הסכנה זהה
 * במדויק: מסמך טיוטה שנכתב בגרסת קוד אחרת (או, במקרה החדש הזה, ע"י
 * מקור אחר שכותב לאותו אוסף `orders` עם `status:'draft'`) יכול להכיל
 * `items:null` או `freeItems:[null]` ולהפיל את הדף — בדיוק כמו טיוטה
 * מקומית פגומה. אין לרכך את הבדיקה כדי "לקבל יותר" ממקור מרוחק.
 */
export function shapeOk(state) {
  if (!state || typeof state !== 'object' || Array.isArray(state)) return false;
  for (const [key, kind] of Object.entries(DRAFT_SHAPE)) {
    if (!(key in state)) continue;              // שדה חסר — ברירת המחדל תופסת
    const v = state[key];
    // ⚠️ לפני בדיקת הטיפוס: `typeof null === 'object'` היה מכשיר `items: null`.
    if (v === null) return false;
    const actual = Array.isArray(v) ? 'array' : typeof v;
    if (actual !== kind) return false;
    if (actual === 'array' && ARRAY_ELEMENT_OK[key] && !v.every(ARRAY_ELEMENT_OK[key])) return false;
  }
  // `items` הוא מפה של itemKey→כמות. ערך שאינו מספר סופי עובר את בדיקת
  // ה"אובייקט" ואז מזהם את הסכום ב-`updateItemsHeader` ואת המחיר עצמו.
  if ('items' in state
      && !Object.values(state.items).every(q => typeof q === 'number' && Number.isFinite(q))) return false;
  return true;
}

/**
 * האם הקריאה האחרונה ל-`loadOrderDraft` **זרקה** טיוטה קיימת.
 *
 * ⚠️ הכרחי כדי להבדיל בין שני מצבים ש-`null` מכסה עליהם: "לא הייתה
 * טיוטה" (מצב רגיל, אין מה לומר) לעומת "הייתה טיוטה ונזרקה" — ושם
 * הלקוח ראה "ההזמנה שלך נשמרה" לפני ההרשמה, חזר, וקיבל טופס ריק
 * **בלי מילה**. ראו `showDraftDiscardedNotice`.
 */
let lastDraftDiscarded = false;
export function draftWasDiscarded() { return lastDraftDiscarded; }

/**
 * מתי הטיוטה **המקומית** האחרונה שנקראה נשמרה (מ"ש, `Date.now()`), או
 * `null` אם לא הייתה טיוטה תקינה. ⚠️ 62.3 — קיים כדי ש-`loadResumeDraft`
 * יוכל להשוות מול `draftUpdatedAt` (Firestore `Timestamp`) ולהכריע איזה
 * מקור עדכני יותר. בלי זה אין דרך לדעת את `savedAt` בלי לפרק שוב את
 * ה-JSON הגולמי מ-`localStorage` — `loadOrderDraft` כבר עשתה את זה.
 */
let lastDraftSavedAt = null;
export function draftSavedAt() { return lastDraftSavedAt; }

/** מחזירה את הטיוטה אם היא קיימת, טרייה ובמבנה תקין; אחרת `null` (ומנקה). */
export function loadOrderDraft(serviceType) {
  lastDraftDiscarded = false;
  lastDraftSavedAt = null;
  try {
    const raw = localStorage.getItem(draftKey(serviceType));
    if (!raw) return null;
    const { savedAt, uid, state } = JSON.parse(raw);
    /**
     * ⚠️ טיוטה של משתמש אחר על אותו מכשיר — נמחקת ו**אינה מוצגת**. ראו
     * `currentUid`. `uid` חסר או `null` = טיוטת אורח, פתוחה לכל אחד.
     *
     * ⚠️ ובלי `lastDraftDiscarded`: ההודעה אומרת *"לא הצלחנו לשחזר את
     * ההזמנה שהתחלת"*, ומי שרואה אותה כאן **לא התחיל שום הזמנה** — היא
     * של מי שהשתמש במכשיר לפניו. הודעה כזאת היא בדיוק ההפך מהתכלית
     * שלה: היא מרמזת לו שאיבדנו עבודה שלו, וגם מסגירה שהייתה כאן
     * הזמנה של מישהו אחר.
     */
    if (uid != null && uid !== currentUid()) {
      localStorage.removeItem(draftKey(serviceType));
      return null;
    }
    if (!savedAt || Date.now() - savedAt > DRAFT_TTL_MS || !shapeOk(state)) {
      localStorage.removeItem(draftKey(serviceType));
      lastDraftDiscarded = true;
      return null;
    }
    lastDraftSavedAt = savedAt;
    return state;
  } catch {
    // JSON פגום — לנקות, אחרת הוא ייקרא שוב בכל טעינה.
    try { localStorage.removeItem(draftKey(serviceType)); } catch { /* ראו למעלה */ }
    lastDraftDiscarded = true;
    return null;
  }
}

/**
 * מודיעה ללקוח שהטיוטה נזרקה, במקום להחליף לו את הטופס בשקט.
 *
 * ההודעה קצרה ואומרת מה לעשות עכשיו. לא מוצג בה שום פירוט טכני —
 * הלקוח לא יכול לעשות דבר עם "מבנה טיוטה לא תקין", והסיבה השכיחה
 * ביותר היא ממילא TTL שפג או טיוטה מגרסת קוד קודמת.
 */
export function showDraftDiscardedNotice() {
  const host = document.querySelector('.app-main') || document.querySelector('.app-container');
  if (!host) return;
  const box = document.createElement('div');
  box.className = 'alert alert-info';
  box.setAttribute('role', 'status');
  box.textContent = 'לא הצלחנו לשחזר את ההזמנה שהתחלת — היא כבר לא בתוקף. נתחיל מחדש, זה ייקח רגע.';
  host.prepend(box);
}

/** ⚠️ לקרוא אחרי יצירת הזמנה מוצלחת — אחרת הטיוטה תצוף שוב בהזמנה הבאה. */
export function clearOrderDraft(serviceType) {
  try { localStorage.removeItem(draftKey(serviceType)); } catch { /* ראו למעלה */ }
}

/**
 * ⚠️ 62.3 (21.9) — מוחקת גם את הטיוטה **המרוחקת**, לא רק המקומית.
 *
 * מאז שיש מקור שני (Firestore, למחוברים), כל מקום שקרא ל-`clearOrderDraft`
 * לבדו הפך לחצי-מחיקה: הטיוטה נעלמת מהמכשיר הזה, אבל `getActiveDraftOrder`
 * עדיין מוצא אותה בפעם הבאה (מכשיר אחר, או אותו מכשיר אחרי שה-localStorage
 * נוקה) ומחזיר אותה. שני מקומות קוראים לזה: אחרי `createOrder` מוצלח
 * (ראו `apartment.html`/`small-move.html`) ובנתיב "התחל חדשה" (`?new=1`).
 *
 * `remoteDraftId` הוא `null` לאורח או למחובר שעדיין אין לו טיוטה מרוחקת —
 * במקרה כזה אין קריאת רשת בכלל.
 *
 * ⚠️ כשל במחיקה המרוחקת **לא נבלע בשקט**: מדווח בקונסול, ולא חוסם את
 * ההמשך (המחיקה המקומית כבר קרתה, וזו רשת הביטחון החשובה יותר ללקוח
 * שממול המסך; טיוטה מרוחקת שנשארה יתומה תפוג רק בזמן שהלקוח כבר בהזמנה
 * חדשה — לא נזק חסר-תיקון).
 */
export async function clearOrderDraftEverywhere(serviceType, remoteDraftId) {
  clearOrderDraft(serviceType);
  if (!remoteDraftId) return;
  try {
    await clearDraftOrder(remoteDraftId);
  } catch (err) {
    console.warn('[draft] מחיקת טיוטה מרוחקת נכשלה', serviceType, remoteDraftId, err && err.message);
  }
}

/**
 * ⚠️ 62.3 (21.9) — "התחל חדשה" (`?new=1`) חייבת למחוק את **שתי** הטיוטות,
 * לא רק המקומית. בלי זה `loadResumeDraft` בטעינה הבאה מוצא את הטיוטה
 * המרוחקת (שלא נמחקה), רואה אותה "עדכנית יותר" מהמקומית הריקה שהתחלפה,
 * ומחזיר אותה — "התחל חדשה" היה נראה כאילו לא עשה כלום.
 *
 * שונה מ-`clearOrderDraftEverywhere`: כאן אין מזהה טיוטה מרוחקת מוכן
 * (הדף עדיין לא טען אחת, זה תחילת הטעינה), אז הפונקציה מחפשת אותה לפי
 * `uid` בעצמה. `uid` חסר (אורח) מדלג על השאילתה לרשת לגמרי — בדיוק
 * ההתנהגות הישנה, בלי שינוי.
 */
export async function discardOrderDraftEverywhere(serviceType, uid) {
  clearOrderDraft(serviceType);
  if (!uid) return;
  try {
    const existing = await getActiveDraftOrder(uid, serviceType);
    if (existing) await clearDraftOrder(existing.id);
  } catch (err) {
    console.warn('[draft] מחיקת טיוטה מרוחקת נכשלה (התחל חדשה)', serviceType, err && err.message);
  }
}

/**
 * ⚠️ 62.3 (21.9) — **טיוטה מסונכרנת ל-Firestore, למחוברים בלבד.**
 *
 * ## למה זה קיים
 * עד עכשיו הטיוטה באתר הייתה של **המכשיר**: `localStorage`, בלי שום גיבוי
 * בשרת. לקוח שהתחיל הזמנה בטלפון והמשיך במחשב לא מצא שום דבר — וגם
 * `sendDraftReminders` (הפונקציה המתוזמנת שמזכירה טיוטה שנשארה יומיים)
 * לא מצאה טיוטות מהאתר, כי מעולם לא נכתבה אחת ל-Firestore. `saveDraftOrder`/
 * `getActiveDraftOrder`/`clearDraftOrder` ב-`orders.js` היו קיימות ולא
 * נקראו משום מקום — התיעוד ב-`account.html` (סעיף "בתהליך") הסביר את
 * ההחלטה המקורית לא לכתוב אליהן. ההחלטה ההיא התהפכה כאן.
 *
 * ## למה זה **בלבד** למחוברים
 * טיוטה מרוחקת חייבת `customerId` אמיתי (`getActiveDraftOrder` שואלת
 * `where('customerId','==', uid)`) — אין דבר כזה "טיוטת אורח בשרת" בלי
 * לשנות את המודל. אורח ממשיך על `localStorage` בדיוק כמו היום, בלי שום
 * שינוי בהתנהגות שלו. זו הכרעה מפורשת של גיא, לא פשרה טכנית.
 *
 * ## המיזוג בין שני המקורות, ולמה **לא** מיזוג-שדות
 * מחובר יכול להגיע לכאן עם שני מקורות שונים בזמן: טיוטת המכשיר הזה
 * (`localStorage`, אם נשארה מדפדפן קודם) וטיוטת החשבון (Firestore, אם
 * נכתבה ממכשיר אחר). ההכרעה כאן היא **"כל הטיוטה" ולא מיזוג שדה-שדה**:
 * המקור העדכני יותר (לפי `draftUpdatedAt` המרוחק מול `savedAt` המקומי,
 * שניהם מנורמלים למילישניות) מנצח **בשלמותו**. מיזוג שדות היה דורש
 * להחליט, לכל שדה, איזה "חלק" של איזו הזמנה נכון — ואין דרך לדעת אם
 * הלקוח התחיל לתקן משהו במכשיר אחד בזמן שהשני "קפא" באמצע. טיוטה שלמה
 * אחת, גם אם היא לא העדכנית ביותר בכל שדה בנפרד, היא מצב עקבי; מיזוג
 * חלקי הוא בדיוק המתכון ל"למה יש לי כתובת מוצא ממכשיר אחד ותאריך
 * ממכשיר שני שכבר לא רלוונטי לכתובת הזאת".
 *
 * ## מבנה שונה, לא רק מקור שונה
 * הטיוטה המקומית שומרת את השלב בתוך ה-JSON עצמו (`state.__step`, ראו
 * `apartment.html`). הטיוטה המרוחקת שומרת אותו בשדה נפרד על המסמך
 * (`draftStep`, כמו באפליקציה) — נקי יותר, ולכן אין `__step` בתוך
 * `draftPayload` בכלל. שני המקורות מוחזרים כאן **מיושרים לאותה צורה**
 * (`{ state, step }`) כך שהקורא (`apartment.html`/`small-move.html`) לא
 * צריך לדעת מאיפה הגיעה הטיוטה.
 *
 * ## ⚠️ אימות מבנה על **שני** המקורות
 * `draftPayload` מרוחק עובר את `shapeOk` בדיוק כמו טיוטה מקומית, ומאותה
 * סיבה: מסמך פגום (או, במקרה הזה, מסמך שנכתב ע"י מקור אחר לאותו אוסף —
 * ראו הדוח על הסיכון הצולב בין האתר לאפליקציה) יכול להפיל את הדף בדיוק
 * כמו טיוטה מקומית פגומה. טיוטה מרוחקת שנפסלה **עדיין** מחזירה את
 * `remoteDraftId` שלה — כתיבות עתידיות ידרסו אותה במקום ליצור כפולה.
 *
 * ## מה שלא נאמת כאן, ולמה
 * הפונקציה מסתמכת על `getActiveDraftOrder` (קריאת Firestore ישירה, לא
 * פונקציית ענן) — ולכן **כן** ניתנת לבדיקה מקומית, בניגוד לגאוקוד
 * ולהשלמת כתובות. מה שלא נבדק: מכשיר שני אמיתי (שני דפדפנים, אותו
 * חשבון) — הבדיקה שבוצעה השתמשה בשני "מקורות" מדומים (שתילה ידנית
 * ב-localStorage מול כתיבה ידנית ל-Firestore) על אותו דפדפן. ראו דוח
 * הסיום למה שכן אומת ומה לא.
 *
 * @param {string} serviceType
 * @param {string|null} uid `null` = אורח, מפעיל את הנתיב הישן בלבד
 * @returns {Promise<{state: object|null, step: number, remoteDraftId: string|null, discarded: boolean, source: 'local'|'remote'|'none'}>}
 */
export async function loadResumeDraft(serviceType, uid) {
  const local = loadOrderDraft(serviceType);
  const localDiscarded = draftWasDiscarded();
  const localSavedAt = draftSavedAt();

  const finalizeLocal = () => {
    if (!local) return { state: null, step: 1, discarded: localDiscarded, source: 'none' };
    const step = Math.min(4, Math.max(1, Number(local.__step) || 1));
    delete local.__step;
    return { state: local, step, discarded: localDiscarded, source: 'local' };
  };

  if (!uid) {
    // אורח — בלי שום שינוי מההתנהגות הקיימת. ראו ההערה למעלה למה.
    return { ...finalizeLocal(), remoteDraftId: null };
  }

  let remote = null;
  try {
    remote = await getActiveDraftOrder(uid, serviceType);
  } catch (err) {
    // בלי רשת (או קריאה שנכשלה) — לא נתקעים, ממשיכים עם המקומית בלבד.
    // אין `catch` ריק: זה בדיוק הכשל השקט שהכלל באפליקציה נכתב עליו.
    console.warn('[draft] טעינת טיוטה מרוחקת נכשלה — ממשיכים עם המקומית בלבד', serviceType, err && err.message);
  }

  const remoteDraftId = remote ? remote.id : null;
  const remoteStateOk = !!remote && remote.draftPayload && typeof remote.draftPayload === 'object' && shapeOk(remote.draftPayload);
  if (remote && !remoteStateOk) {
    console.warn('[draft] טיוטה מרוחקת במבנה לא תקין — נזרקת כמו טיוטה מקומית פגומה', serviceType, remote.id);
  }

  if (!remoteStateOk) {
    return { ...finalizeLocal(), remoteDraftId };
  }
  if (!local) {
    const step = Math.min(4, Math.max(1, Number(remote.draftStep) || 1));
    // מיישר את המקומי לתוכן המרוחק שניצח — כדי ש"בתהליך" ב-account.html
    // (קורא localStorage בלבד, לא נגעתי בו בסבב הזה) לא יישאר על טיוטה
    // ישנה או ריקה בזמן שהאשף כבר ממשיך מהטיוטה החדשה.
    saveOrderDraft(serviceType, { ...remote.draftPayload, __step: step });
    return { state: remote.draftPayload, step, remoteDraftId, discarded: false, source: 'remote' };
  }

  // שני מקורות — המנצח הוא העדכני, "כל הטיוטה" ולא מיזוג שדות (ראו למעלה).
  // ⚠️ `draftUpdatedAt` הוא Firestore `Timestamp`, `savedAt` הוא מ"ש גולמיות —
  // `.toMillis()` מנרמל את שניהם לפני ההשוואה, אחרת אין דרך לדעת מי מוקדם.
  const remoteMs = remote.draftUpdatedAt?.toMillis?.() ?? 0;
  if (remoteMs > (localSavedAt ?? 0)) {
    const step = Math.min(4, Math.max(1, Number(remote.draftStep) || 1));
    saveOrderDraft(serviceType, { ...remote.draftPayload, __step: step });
    return { state: remote.draftPayload, step, remoteDraftId, discarded: false, source: 'remote' };
  }
  return { ...finalizeLocal(), remoteDraftId };
}

/**
 * שמירה אוטומטית של הטיוטה בכל שינוי — התאום של `useDraftAutosave`
 * באפליקציה.
 *
 * ## ⚠️ למה זה קיים (18.9) — רענון בשלב 4 מחק הזמנה שלמה
 * `saveOrderDraft` נקראה עד היום **רק** מ-`goRegister` ומשני שערי
 * הטלפון/השם. כלומר לקוח מחובר בנה הזמנה שלמה — פריטים, כתובות, קומות,
 * תאריך, הערות — ומעולם לא נשמרה לו טיוטה, כי הוא לא עבר באף אחד
 * מהנתיבים האלה. רענון אחד, לחיצה על "חזרה" בדפדפן, או טאב שהדפדפן
 * שחרר מהזיכרון — והכול נמחק וחוזר לשלב 1 ריק.
 * ההערה ב-`apartment.html` ליד `stuckTimer` כבר תיעדה את זה כעובדה
 * מדודה ("לקוח בשלב 4 עם הזמנה של ₪150 → רענון → שלב 1 ריק"), ולא
 * נסגר. באפליקציה זה כלל מחייב: **כל** מסך באשף שומר אוטומטית.
 *
 * ## מה נשמר, ומתי
 * `debounce` ולא שמירה על כל הקלדה: הקלדת כתובת היא ~30 אירועי `input`,
 * ו-`localStorage.setItem` הוא כתיבה סינכרונית שחוסמת את ה-thread.
 * ההאזנה היא על `input`/`change`/`click` ברמת המסמך, כי `state` מתעדכן
 * גם מרכיבים שאינם שדות טופס כלל — צ'יפים של חלון זמן, כפתורי כמות
 * לפריט, צ'יפים של פריטי מנוף. מאזין אחד שמכסה את כולם עדיף על רשימת
 * מזהים שתתיישן בשקט בשינוי הבא.
 *
 * ## ⚠️ למה `shouldSkip` נבדק ברגע הכתיבה ולא ברגע התזמון
 * זה **הבאג הכספי מ-21.8**, בגרסת הדפדפן שלו. באפליקציה autosave כתב
 * `price:0`/`status:'draft'` על הזמנה שכבר בתשלום; כאן הנתיב הוא אחר
 * ומסוכן באותה מידה: הלחיצה על "מעבר לתשלום" היא בעצמה `click`, כלומר
 * היא **מתזמנת שמירה**. `createOrder` מצליח, `clearOrderDraft` מוחק את
 * הטיוטה, הדף מתחיל לנווט — והטיימר שנותר מהלחיצה נורה וכותב את
 * הטיוטה **בחזרה**. הלקוח היה חוזר לאתר ומקבל הצעה לשחזר הזמנה שהוא
 * כבר יצר ועומד לשלם עליה.
 *
 * הבדיקה ברגע הכתיבה סוגרת את זה בלי להסתמך על תזמון: ברגע שהדגל
 * עולה, כל שמירה שממתינה בתור מתה איתו.
 *
 * ## ⚠️ 62.3 (21.9) — נוספה כתיבה מרוחקת, ל**מחוברים** בלבד
 * `remote` (רביעי, אופציונלי) הוא `{ uid, draftId }` — `draftId` הוא מזהה
 * הטיוטה המרוחקת הקיימת (מ-`loadResumeDraft`) או `null` אם עדיין אין
 * אחת. הכתיבה המקומית (`writeLocal`) והמרוחקת (`writeRemote`) רצות
 * **שתיהן** בכל `writeNow` — הראשונה היא רשת הביטחון הקיימת, השנייה היא
 * הסנכרון החדש. אורח (`remote` חסר או `remote.uid` חסר) מקבל רק את
 * הראשונה, בדיוק כמו היום.
 *
 * ⚠️ **הכתיבה המרוחקת היא "שיגור ולא נעילה".** `writeNow`/`flush` לא
 * מחכים לה — אם היו מחכים, טיוטה שמתעכבת ברשת הייתה חוסמת גם את
 * ה-debounce הבא בתור. `remoteDraftId` (המשתנה הפרטי) מתעדכן רק אחרי
 * הצלחה; כתיבה שנכשלת משאירה אותו כמו שהיה, כך שהניסיון הבא עדיין
 * מכוון לאותו מסמך (או יוצר אחד, אם עדיין אין). כשל **לא** נבלע בשקט —
 * מדווח בקונסול, מאותה סיבה שהכלל הזה חוזר בכל הקובץ.
 *
 * ⚠️ **ואין `stripUndefined` בתוך `saveDraftOrder` עצמה** (בניגוד
 * לגרסת האפליקציה) — לכן היא מוחלת כאן, לפני הקריאה. בלעדיה, שדה
 * `undefined` בודד (למשל קואורדינטה לפני גאוקוד) היה מפיל את **כל**
 * כתיבת הטיוטה המרוחקת בכל debounce, עד שהשדה מתמלא.
 *
 * @param {string} serviceType
 * @param {() => object} getState מחזירה את ה-`state` החי, כולל `__step`
 * @param {() => boolean} shouldSkip `true` = אל תכתוב (שליחה/תשלום בעיצומם)
 * @param {{uid: string, draftId: string|null}|null} [remote] מחובר בלבד
 */
export function attachDraftAutosave(serviceType, getState, shouldSkip, remote) {
  const DEBOUNCE_MS = 700;
  let timer = null;
  let remoteDraftId = remote?.draftId ?? null;

  const writeLocal = (snapshot) => saveOrderDraft(serviceType, snapshot);

  const writeRemote = (snapshot) => {
    if (!remote?.uid) return;
    const { __step, ...rest } = snapshot;
    const step = Math.min(4, Math.max(1, Number(__step) || 1));
    saveDraftOrder(remote.uid, serviceType, step, stripUndefined(rest), remoteDraftId)
      .then((id) => { remoteDraftId = id; })
      .catch((err) => console.warn('[draft] שמירה מרוחקת נכשלה', serviceType, err && err.message));
  };

  const writeNow = () => {
    timer = null;
    if (shouldSkip && shouldSkip()) return;
    const snapshot = getState();
    writeLocal(snapshot);
    writeRemote(snapshot);
  };

  const schedule = () => {
    if (shouldSkip && shouldSkip()) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(writeNow, DEBOUNCE_MS);
  };

  ['input', 'change', 'click'].forEach(evt => {
    // `capture` — כדי שגם מאזין שקורא `stopPropagation` (הצ'יפים עושים
    // זאת) לא יבליע את השמירה.
    document.addEventListener(evt, schedule, { capture: true, passive: true });
  });

  /**
   * ⚠️ `pagehide` ולא `beforeunload`: האחרון מבטל את ה-bfcache בחלק
   * מהדפדפנים, והוא גם אינו נורה באופן אמין בסגירת טאב בנייד. בלי
   * ההשטחה הזאת, שינוי שנעשה פחות מ-700 מ"ש לפני רענון פשוט אובד —
   * וזה בדיוק החלון שבו לקוח לוחץ משהו ומיד מרענן כי "זה נתקע".
   *
   * ⚠️ 62.3 — **מקומית בלבד, בכוונה.** כתיבה ל-Firestore היא בקשת רשת
   * אסינכרונית בלי הבטחת סיום, וברגע ש-`pagehide` נורה הדף עשוי להיהרס
   * תוך מילישניות — אין `keepalive` שמכסה את ה-SDK של Firestore (הוא
   * לא `fetch` גולמי). כתיבה שלא מובטח שתסתיים לפני שהדף נעלם עשויה
   * להתחיל ולא להיגמר, וזה לא עדיף על לא לכתוב. **המגבלה בפועל:** אם
   * הלקוח עוזב פחות מ-700 מ"ש אחרי השינוי האחרון בלי אינטראקציה נוספת,
   * המצב נשמר מקומית (סינכרוני, בטוח) אבל לא מגיע לחשבון עד שמכשיר כלשהו
   * יפתח את הדף בשנית ויריץ `debounce` נוסף.
   */
  window.addEventListener('pagehide', () => {
    if (timer) { clearTimeout(timer); timer = null; }
    if (shouldSkip && shouldSkip()) return;
    writeLocal(getState());
  });

  return {
    /** מבטלת שמירה שממתינה בתור. לקרוא לפני `clearOrderDraftEverywhere`. */
    cancel() { if (timer) { clearTimeout(timer); timer = null; } },
    /** כתיבה מיידית (עדיין כפופה ל-`shouldSkip`) — מקומית **וגם** מרוחקת. */
    flush() { if (timer) { clearTimeout(timer); } writeNow(); },
    /** מזהה הטיוטה המרוחקת הנוכחי, או `null`. לקרוא לפני ניקוי אחרי הזמנה מוצלחת. */
    remoteDraftId() { return remoteDraftId; },
  };
}

/* ==================================================================== *
 * קופונים — **בדיקה ומימוש בשרת בלבד** (`functions/src/couponSecure.ts`)
 * ==================================================================== */

const COUPON_URL = 'https://us-central1-hovalot-6cf65.cloudfunctions.net/couponSecure';

/**
 * ⚠️ **זהה מילה במילה ל-`normalizeCouponCode`** ב-
 * `~/Hovalot/src/services/coupons.ts` ול-`normalize()` בשרת.
 *
 * `trim()` אינו מסיר תווים חסרי רוחב. קוד שהודבק ממסמך או מוואטסאפ
 * נושא לעיתים `U+200B` באמצע, והחיפוש מול מה שנשמר **לעולם לא יתאים** —
 * קופון שנראה תקין במסך האדמין ומחזיר "קוד לא תקין" לכל מי שמנסה, בלי
 * שום רמז למה. (הסבב הארוך של 12.9, בדיקה 159.)
 */
export function normalizeCouponCode(code) {
  return String(code ?? '')
    .replace(/[​-‏‪-‮⁠-⁯﻿]/g, '')
    .trim()
    .toUpperCase();
}

/**
 * הסכום הנמוך ביותר שהזמנה יכולה לרדת אליו אחרי קופון.
 *
 * ⚠️ **תאום ל-`MIN_ORDER_PRICE_AFTER_COUPON`** ב-
 * `~/Hovalot/src/services/coupons.ts`, ושם מתועד מלוא הנימוק: ב-₪3
 * העיגול של `3/1.18` שובר את מתמטיקת המע"מ, העמלה מתאפסת, והמוביל
 * מקבל ₪4 על הזמנה של ₪3. קופון של 98% על הזמנה מינימלית מגיע לשם
 * בדיוק, ואין חסם על האחוז במסך הקופונים.
 *
 * ⚠️ **שינוי כאן בלי שינוי שם — פיצול שקט בין שני המשטחים.** אותה
 * הזמנה, אותו קופון, שני מחירים.
 */
export const MIN_ORDER_PRICE_AFTER_COUPON = 50;

/** זהה ל-`applyCoupon` באפליקציה, כולל העיגול והרצפה. */
export function applyCoupon(originalPrice, coupon) {
  const discounted = coupon.type === 'percent'
    ? Math.round(originalPrice * (1 - coupon.value / 100))
    : originalPrice - coupon.value;
  return Math.max(MIN_ORDER_PRICE_AFTER_COUPON, discounted);
}

/** זהה ל-`getDiscountAmount` באפליקציה. */
export function getDiscountAmount(originalPrice, coupon) {
  return originalPrice - applyCoupon(originalPrice, coupon);
}

/**
 * בדיקת קופון — **רצה בשרת.**
 *
 * ⚠️ **הלקוח אינו מחליט דבר.** תוקף, `maxUses`, "כבר השתמשת" וסכום
 * ההזמנה המינימלי נבדקים כולם ב-`couponSecure`, מול המסמך ב-Firestore
 * ומול ה-uid שנגזר מהטוקן — לא מנתונים שנשלחו מכאן. החוקים על
 * `match /coupons` הם `allow read: if isAdmin()`, כלומר לדפדפן אין
 * בכלל גישה לאוסף: אי אפשר לקרוא קוד, אי אפשר להמציא קופון, ואי אפשר
 * לעקוף את הבדיקה בהסרת קוד מה-DevTools — בלי תשובה חיובית מהשרת אין
 * מה להחיל.
 *
 * מה שכן נעשה כאן הוא **החשבון בלבד** (`applyCoupon`), מתוך `type`
 * ו-`value` שהשרת החזיר. ⚠️ זה **בדיוק** המסלול של האפליקציה, שורה
 * מול שורה: גם שם `validateCoupon` מחזירה את הקופון ו-`SummaryScreen`
 * מחשב `getDiscountAmount` ושולח `price` מוזל ל-`createOrder`. אימות
 * המחיר בשרת אינו קיים באף אחד מהמשטחים (הכרעה מודעת שנדחתה בסבב
 * 21.8; `flagSuspiciousOrderPrice` הוא הרשת שכן קיימת). מימוש אחר כאן
 * לא היה מקשיח כלום — הוא היה יוצר שני מחירים שונים לאותה הזמנה.
 *
 * @returns {Promise<{valid: boolean, coupon?: object, error?: string}>}
 */
export async function validateCouponSecure(code, orderAmount) {
  const token = await auth.currentUser?.getIdToken().catch(() => null);
  // אותו נוסח בדיוק כמו באפליקציה. באתר הוא **כן** ניתן להגעה, כי שלב 4
  // פתוח לאורח — ההרשמה נדרשת רק בתשלום. ראו הכפתור שמוצג לצידו.
  if (!token) return { valid: false, error: 'יש להתחבר כדי להשתמש בקופון' };

  let res;
  try {
    res = await fetch(COUPON_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: 'validate', code: normalizeCouponCode(code), orderAmount }),
    });
  } catch {
    return { valid: false, error: 'אין חיבור לרשת. נסו שוב.' };
  }

  const data = await res.json().catch(() => null);
  if (!res.ok || !data) return { valid: false, error: 'לא הצלחנו לבדוק את הקוד. נסו שוב.' };
  if (!data.valid) return { valid: false, error: data.error ?? 'קוד קופון לא תקין' };
  return { valid: true, coupon: data.coupon };
}

/**
 * פדיית הקופון — **טרנזקציה בשרת.**
 *
 * ## ⚠️ המסלול כאן שונה מהאפליקציה, וזה ההבדל שחייב להיקרא
 * באפליקציה `markCouponUsed` נקראת **אחרי** `payForOrder` — כלומר אחרי
 * שהסליקה אישרה. באתר אין נקודה כזו בזרימה הזאת: "מעבר לתשלום" **יוצר
 * את ההזמנה** ומנווט ל-`order-status.html`, והתשלום עצמו קורה שם
 * (`payments.js`), בדף אחר, לפעמים דקות או ימים אחר כך.
 *
 * שלוש האפשרויות, ולמה נבחרה זו:
 * 1. **לא לפדות כאן בכלל** — ואז `usedCount`/`usedBy` לא זזים לעולם,
 *    ו-`validate` עוברת שוב ושוב. קופון חד-פעמי הופך לבלתי מוגבל, לכל
 *    לקוח. זה **אובדן כסף ודאי**, לא סיכון.
 * 2. **לפדות מדף התשלום** — הנכון תיאורטית, אבל `payments.js` ו-
 *    `order-status.html` אינם בהיקף הזה, והקופון אינו נשמר על מסמך
 *    ההזמנה בכלל (לא באפליקציה ולא כאן) — כלומר לדף ההוא אין מאיפה
 *    לדעת שהיה קופון.
 * 3. **לפדות ביצירת ההזמנה** — מה שנבחר.
 *
 * **למה זה בטוח:** הפדייה היא `runTransaction` בשרת עם `increment` ו-
 * `arrayUnion`, ו-`maxUses` נבדק **בתוך** הנעילה — כלומר גם שתי לשוניות
 * שנשלחות יחד אינן יכולות לפדות פעמיים. השרת גוזר את ה-uid מהטוקן, ולכן
 * אי אפשר לפדות בשם אחר. וכשל פדייה אינו שקט: `couponSecure` כותב
 * `adminAlerts`, מעלה מונה על הקופון עצמו, ושולח push לאדמין בכשל הראשון.
 *
 * ⚠️ **ומה הוויתור, במפורש:** לקוח שיוצר הזמנה עם קופון ואז **לא משלם**
 * שורף אותו — באפליקציה הקופון היה שורד. זו הרעה ללקוח בודד מול הדלף
 * של אפשרות 1, וניתנת לתיקון ידני במסך הקופונים.
 *
 * ⚠️ הכשל **אינו מפיל את ההזמנה**, כמו באפליקציה: הלקוח כבר קיבל את
 * ההנחה, וההזמנה חשובה יותר מהספירה. הקורא עוטף ומדווח.
 */
export async function redeemCouponSecure(code) {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error('coupon-redeem-failed: no_token');

  /**
   * ⚠️ תקרת זמן, כי הקריאה הזו יושבת **בין ההזמנה שנוצרה לבין הניווט**
   * לדף המעקב. בלעדיה, רשת תקועה (`fetch` אינו זורק על חיבור שנתקע —
   * אותה מלכודת שתועדה ליד `stuckTimer`) הייתה משאירה את הלקוח מול
   * כפתור "כמעט מוכן, רגע..." על הזמנה שכבר קיימת ומוכנה לתשלום.
   * פסק זמן נופל ל-`catch` של הקורא, שמדווח וממשיך לנווט.
   */
  const ctrl = new AbortController();
  const abortTimer = setTimeout(() => ctrl.abort(), 6000);
  let res;
  try {
    res = await fetch(COUPON_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: 'redeem', code: normalizeCouponCode(code) }),
      signal: ctrl.signal,
    });
  } finally {
    clearTimeout(abortTimer);
  }

  /**
   * ⚠️ 13.9, והלקח חוזר כאן מילה במילה: השרת מחזיר **200 על כל כשל
   * פדייה** (`exhausted`/`already`/`gone`) — בכוונה, כדי שכישלון פדייה
   * לא יפיל הזמנה ששולמה. קוד שבודק רק `res.ok` רואה הצלחה תמיד, וכל
   * דיווח שנתלה עליו הופך לבלתי-ניתן-להגעה.
   */
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.ok) {
    throw new Error(`coupon-redeem-failed: ${data?.reason ?? `http_${res.status}`}`);
  }
}

/**
 * מוחקת את הטיוטות של **כל** השירותים.
 *
 * ## ⚠️ למה זה קיים (15.9) — הטיוטה אינה משויכת ל-uid
 * `rozic:draft:apartment` הוא מפתח **גלובלי לדפדפן**. אומת בהרצה:
 * משתמש א׳ השאיר טיוטה, משתמש ב׳ טען את הדף באותו מכשיר — והכתובות,
 * הקומות והערות הטקסט החופשי של א׳ הופיעו בטופס של ב׳.
 *
 * **ומה שנשאר שם הוא לא שדות ניטרליים:** כתובת הבית, כתובת היעד,
 * התאריך שבו הדירה תהיה ריקה, וטקסט חופשי שהלקוחות כותבים בו דברים
 * כמו "קוד כניסה 4477 · לטלפן לעתר 050-1234567".
 *
 * ⚠️ **והתזמון מחמיר את זה:** הטיוטה נכתבת **רק** ברגע שהאורח נחסם
 * בקיר ההרשמה (`goRegister`) — כלומר בדיוק בנקודת הנטישה המרבית.
 * המקרה השכיח אינו "משתמש שסיים" אלא אורח שבנה הזמנה, ראה שצריך
 * להירשם, ועזב — והשאיר את כל זה על המכשיר.
 *
 * מחיקה לפי תחילית ולא לפי רשימת שירותים קשיחה: שירות חדש שיתווסף
 * בעתיד ינוקה מעצמו. מפתח שמפספסים כאן הוא בדיוק דליפה שאיש לא יראה.
 */
export function clearAllOrderDrafts() {
  try {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('rozic:draft:')) keys.push(k);
    }
    // איסוף ואז מחיקה — מחיקה תוך כדי המעבר מזיזה את האינדקסים ומדלגת על מפתחות.
    keys.forEach(k => localStorage.removeItem(k));
  } catch { /* ראו saveOrderDraft */ }
}

/**
 * מפנה להרשמה/התחברות, ומבטיחה שהזרימה תחזור בדיוק לאותו דף.
 *
 * @param {string} [reason] **למה** נשלח להתחבר — נמסר ל-`login.html`,
 *   שמציג שם שורת הסבר תואמת. נוסף ב-16.9 עם מכסת הסריקות לאורח:
 *   מי שנשלח באמצע סריקה ומגיע למסך התחברות ניטרלי רואה בקשה לפרטים
 *   בלי שום קשר למה שעשה שנייה קודם, וזה בדיוק אותו כשל שקט. ערך לא
 *   מוכר פשוט אינו מציג דבר, ולכן אי אפשר לשבור כאן שום דף.
 */
export function goRegister(serviceType, state, reason) {
  saveOrderDraft(serviceType, state);
  const next = encodeURIComponent(location.pathname + location.search);
  location.href = `login.html?next=${next}${reason ? `&reason=${encodeURIComponent(reason)}` : ''}`;
}

/**
 * מסך חסימה למוביל שנקלע לזרימת הזמנה של לקוח.
 *
 * ⚠️ **זה עוצר את הזרימה ולא רק מזהיר.** הדף מוחלף לגמרי, כי מוביל
 * שממשיך למלא טופס ונחסם רק בתשלום מאבד את כל מה שמילא — וזו בדיוק
 * החוויה שגיא תיאר כשגילה את זה.
 *
 * הפנייה היא לדף הבית ולא ל-logout: יכול להיות שהוא פשוט טעה בלשונית,
 * ואין שום סיבה לנתק אותו מהחשבון בגלל זה.
 *
 * ⚠️ **הפונקציה זורקת בסופה, בכוונה.** היא מוחקת את ה-DOM, וכל שורה
 * שתרוץ אחריה תיפול על `getElementById` שמחזיר `null` — עם ערימת
 * שגיאות שמסתירה את הסיבה האמיתית. הזריקה עוצרת את המודול בנקודה
 * הנכונה, ומייתרת את הצורך לזכור `return` בכל קריאה.
 */
export function showDriverBlockAndHalt() {
  /**
   * ⚠️ 15.9 — **הנתיב שהשאיר טיוטה של לקוח על מכשיר של מוביל.**
   *
   * הפונקציה רצה ב-`apartment.html:256` — **לפני** `loadOrderDraft`
   * ב-`:277` — ואז זורקת. כלומר בכל כניסה של מוביל לדף הזמנה, הקוד
   * שקורא (ומנקה) את הטיוטה **לא מגיע לרוץ בכלל**, והטיוטה של מי
   * שהשתמש במכשיר לפניו נשארת שם עד שיפוג ה-TTL.
   *
   * לכן הניקוי כאן, בשורה הראשונה: זה הנתיב שנעצר, וזו הנקודה
   * היחידה שבה הוא עדיין רץ.
   */
  clearAllOrderDrafts();
  document.body.innerHTML = `
    <div style="max-width:560px;margin:14vh auto;padding:0 24px;text-align:center;font-family:inherit">
      <div style="font-size:2.6rem;line-height:1;margin-bottom:18px">🚚</div>
      <h1 style="font-size:1.5rem;margin:0 0 12px">הזמנת הובלה היא מסך של לקוחות</h1>
      <p style="font-size:1.05rem;line-height:1.7;color:#4a5a54;margin:0 0 26px">
        אתה מחובר בחשבון מוביל. כדי לקבל הובלות היכנס ללוח ההובלות באפליקציה —
        ואם רצית להזמין הובלה לעצמך, צריך חשבון לקוח נפרד.
      </p>
      <a href="../index.html"
         style="display:inline-block;background:#0E5C43;color:#fff;text-decoration:none;
                padding:13px 30px;border-radius:12px;font-weight:700;font-size:1.02rem">
        חזרה לדף הבית
      </a>
    </div>`;
  throw new Error('[guest-checkout] חשבון מוביל — זרימת הלקוח נעצרה בכוונה');
}

/**
 * חסימת המוביל **במסך הריכוז** (`app/index.html`) — רק אריחי ההזמנה.
 *
 * ## ⚠️ למה זה שונה מ-`showDriverBlockAndHalt` (15.9)
 * `app/index.html` אינו דף הזמנה, הוא ה-hub: יושבים בו גם **"מעבירים את
 * זה הלאה"**, **"ההזמנות שלי"**, **"הגדרות"** ו**"תמיכה טכנית"**. חסימת
 * הדף כולו סגרה למוביל גם את ארבעת אלה, והמוצא היחיד שהוצע לו היה
 * "חזרה לדף הבית".
 *
 * **וזה לא חסם כלום בפועל** — `marketplace.html`, `account.html`
 * ו-`order-status.html` פתוחים לו לגמרי בכניסה ישירה. כלומר נחסמה
 * *הדרך* אל מסכים שאינם חסומים, ולא ההזמנה.
 *
 * ## ⚠️ מה נשאר בדיוק כפי שהוא
 * **האכיפה עצמה לא נגעה.** `apartment.html` ו-`small-move.html`
 * ממשיכים לקרוא ל-`showDriverBlockAndHalt()` בשורה הראשונה של
 * המודול, ולכן מוביל שיגיע אליהם בכל דרך — קישור ישיר, היסטוריה,
 * לשונית חדשה, רענון — נחסם בדיוק כמו קודם. כאן אנחנו מכבים את
 * *הכניסה* מהאריח; שם עומדת הדלת.
 *
 * האריחים מושארים במקומם ומעומעמים, ולא נמחקים: מוביל שרואה אריח
 * שנעלם לא יודע אם זו תקלה. מעומעם + הסבר אומר לו מה קרה ומה כן פתוח.
 */
export function blockOrderTilesForDriver() {
  const note = document.createElement('div');
  note.className = 'alert alert-info';
  note.setAttribute('role', 'status');
  note.style.marginTop = '14px';
  note.textContent = 'הזמנת הובלה היא מסך של לקוחות, ואתה מחובר בחשבון מוביל — '
    + 'לקבלת הובלות היכנס ללוח ההובלות באפליקציה. שאר הכלים בדף הזה פתוחים לך כרגיל.';

  let blocked = 0;
  ['apartment.html', 'small-move.html'].forEach((href) => {
    const tile = document.querySelector(`.service-tiles a[href="${href}"]`);
    if (!tile) return;
    blocked++;
    // ⚠️ הסרת `href` היא מה שמנטרל את הניווט בפועל — `preventDefault` לבדו
    // אינו מונע פתיחה ב"פתח בלשונית חדשה" מתפריט ההקשר או ב-Cmd+לחיצה.
    tile.removeAttribute('href');
    tile.setAttribute('role', 'link');
    tile.setAttribute('aria-disabled', 'true');
    // האריח יצא מסדר ה-Tab — אחרת משתמש מקלדת עוצר על יעד שלא עושה כלום.
    tile.setAttribute('tabindex', '-1');
    tile.style.opacity = '0.45';
    tile.style.cursor = 'default';
    tile.addEventListener('click', (e) => {
      e.preventDefault();
      note.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });
  });

  // ההסבר נתלה מתחת לאריחים, בתוך אותה סקציה. אם המבנה השתנה ואף אריח
  // לא נמצא — לא מוסיפים הודעה על כלום.
  const tiles = document.querySelector('.service-tiles');
  if (blocked && tiles) tiles.insertAdjacentElement('afterend', note);
}

/**
 * ממלאת את שדות הטופס מתוך `state` ששוחזר מטיוטה.
 *
 * ## ⚠️ למה זה נפרד מ-`Object.assign(state, draft)`
 * **כי `state` אינו מקור האמת לשדות האלה — ה-DOM הוא.** הקוד קורא
 * `document.getElementById('from-address').value` בלחיצה על ״המשך״
 * ודורס בו את מה שב-`state`. טיוטה שמוזגה ל-`state` בלי למלא את
 * השדות **נמחקת ברגע שהלקוח לוחץ המשך**, והוא רואה שגיאת ״יש למלא
 * כתובת״ על טופס שנראה מלא בעיניו — כי הוא זוכר שמילא אותו.
 *
 * זו בדיוק אותה מלכודת שנתפסה באפליקציה ב-`AddressInput` (CLAUDE.md,
 * ״שמירת טיוטות״ סעיף 10): שחזור שנכנס ל-state אבל לא לתיבה, והתסמין
 * נראה ככשל **שמירה** בזמן שהוא כשל **הצגה**.
 *
 * ## הנחה שמותר לסמוך עליה, ומה שומר עליה
 * שני דפי ההזמנה משתמשים באותם מזהי שדות בדיוק (אומת 14.9). שדה שלא
 * נמצא פשוט מדולג — דף שלישי עם שדות אחרים לא יקרוס, הוא פשוט לא
 * ישוחזר, וזה הכיוון הבטוח לטעות בו.
 */
export function applyDraftToForm(state) {
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
  const check = (id, val) => { const el = document.getElementById(id); if (el) el.checked = !!val; };

  set('from-address', state.fromAddress || '');
  set('to-address', state.toAddress || '');
  set('from-floor', state.fromFloor || 'קרקע');
  set('to-floor', state.toFloor || 'קרקע');
  set('from-elevator', state.fromElevator ? '1' : '0');
  set('to-elevator', state.toElevator ? '1' : '0');
  /**
   * ⚠️ `maxlength` ב-HTML חוסם **הקלדה**, לא השמה תכנותית. טיוטה שנשמרה
   * לפני שהתקרה נוספה (או ב-`lint`-אחר בעתיד) הייתה נכנסת לשדה כמו שהיא,
   * עוברת את הטופס, ונדחית ע"י `firestore.rules` ברגע "מעבר לתשלום" —
   * בדיוק הכישלון שהתקרה באה למנוע. הקיצוץ כאן סוגר גם את הנתיב הזה.
   */
  set('notes', String(state.notes || '').slice(0, NOTES_MAX_LENGTH));
  check('has-insurance', state.hasInsurance);
  check('has-packing', state.hasPacking);

  /**
   * ⚠️ **הקוד בלבד חוזר — לא ההנחה.** מקביל מדויק להערה ב-
   * `SmallMoveSummaryScreen.tsx:101`: *"הקופון נשמר כטקסט בלבד ולא
   * כהנחה מאומתת — קופון עשוי לפוג בין השמירה לחזרה"*.
   *
   * טיוטה חיה 24 שעות. קופון יכול לפוג בזמן הזה, להימצא מוצה, או
   * להיפדות בינתיים ע"י אותו משתמש בהזמנה אחרת — ושחזור ההנחה מהטיוטה
   * היה מציג מחיר מוזל שאף בדיקה לא תומכת בו, עד שהלקוח מגיע לתשלום.
   * הקוד חוזר לשדה, והלקוח לוחץ "החל" — כלומר השרת מכריע מחדש.
   */
  set('coupon-code', state.couponCode || '');

  /**
   * ⚠️ 15.9 — **חלון הזמן חזר מהטיוטה "בלתי נראה", ולחיצה אחת מחקה אותו.**
   *
   * `state.timeSlot` שוחזר נכון, אבל הצ'יפים נבנו כולם כבויים — כלומר
   * הלקוח מסתכל על טופס שבו לא נבחר שום חלון זמן, בזמן שב-`state` יש
   * חלון. הרצף שנמדד:
   *
   * | פעולה | הצ'יפים |
   * |---|---|
   * | אחרי שחזור (`timeSlot: '11:00-14:00'`) | כולם כבויים |
   * | הלקוח לוחץ על `11:00-14:00` | עדיין כבויים ← **נמחק** |
   * | לוחץ שוב | דולק |
   *
   * הלחיצה הראשונה נופלת על הענף המבטל של `pickSlot`
   * (`state.timeSlot === slot ? '' : slot`), ולכן היא **מוחקת** את מה
   * שהלקוח בדיוק ניסה לבחור. ואם לא לחץ בכלל — ההזמנה נשלחת עם חלון
   * זמן שהוא מעולם לא ראה על המסך.
   *
   * ⚠️ זו בדיוק המלכודת שהפונקציה הזו כבר מתעדת על המנוף כמה שורות
   * מתחת — state ששוחזר בלי הצגה מקבילה — ולא הוחלה על הצ'יפים.
   *
   * הסימון זהה לזה שב-`pickSlot` (מחלקה `active` + `aria-pressed`), ולכן
   * אין כאן שום מצב חדש: אותה תצוגה בדיוק שנוצרת מלחיצה.
   */
  const slotsEl = document.getElementById('time-slots');
  if (slotsEl) {
    [...slotsEl.children].forEach((chip) => {
      const on = !!state.timeSlot && chip.textContent === state.timeSlot;
      chip.classList.toggle('active', on);
      chip.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  /**
   * ⚠️ 15.9 — המנוף **לא שוחזר**, וזה עלה ללקוח ₪600 על שדה שנראה כבוי.
   *
   * `state.needsCrane` חזר מהטיוטה ל-`true`, אבל הצ'קבוקס הוצג לא-מסומן
   * ואזור המנוף נשאר מוסתר. התוצאה: מסך הסיכום גובה "מנוף הרמה ₪600",
   * הלקוח מסתכל על טופס שבו המנוף כבוי, **ואין לו דרך להסיר את החיוב**
   * בלי לסמן את התיבה ואז לבטל אותה.
   *
   * ⚠️ והצגה בלבד אינה מספיקה — הבורר והאזור הנסתר נשלטים ע"י מאזין
   * `change` שלא נורה משינוי תכנותי. לכן `dispatchEvent`, אחרת התיבה
   * מסומנת והאזור עדיין מוסתר.
   */
  const crane = document.getElementById('needs-crane');
  if (crane) {
    crane.checked = !!state.needsCrane;
    crane.dispatchEvent(new Event('change', { bubbles: true }));
    if (state.needsCrane) set('crane-floor', state.craneFloor || 'קרקע');
  }

  // התאריך נשמר בתצוגה העברית של האפליקציה, וה-input דורש YYYY-MM-DD.
  // תאריך שכבר עבר אינו משוחזר — לקוח שחוזר מחר לטיוטה של אתמול צריך
  // לבחור מועד חדש, לא לגלות בסוף שהזמין ליום שחלף.
  const d = state.date ? parseDateApp(state.date) : null;
  if (d && d >= new Date(new Date().toDateString())) {
    const pad = (n) => String(n).padStart(2, '0');
    set('move-date', `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
  }
}
