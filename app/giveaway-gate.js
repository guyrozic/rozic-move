/**
 * הכלל של לוח "מעבירים את זה הלאה": **כדי לקחת פריט צריך למסור פריט.**
 *
 * ## למה זה קיים (16.9)
 * הכרעת גיא: *"לקוחות אוהבים לראות מה נותנים להם בחינם, ובהמשך ידעו
 * שיש התניה שאם הם רוצים לאסוף משהו הם חייבים למסור בעצמם לפחות פריט
 * אחד — כדי שהלוח יתמלא."*
 *
 * ⚠️ **הכלל לא נולד כאן — הוא כבר חי באפליקציה, ורק באתר הוא חסר.**
 * `src/screens/marketplace/ListingDetailsScreen.tsx` מריץ בדיוק את
 * הבדיקה הזו ב-`handleContactFreeItem` ("בדיקת קח אחד, תן אחד"), ומציג
 * דיאלוג שמפנה למסך הפרסום. באתר `marketplace.html` ו-`listing.html`
 * פתחו את הוואטסאפ בלי שום תנאי. כלומר זה לא פיצ'ר חדש אלא **עותק שני
 * של לוגיקה עסקית שלא הסכים עם הראשון** — בדיוק המשפחה שה-CLAUDE.md
 * של הריפו הזה מזהיר עליה.
 *
 * ## מה נמדד, ומאיפה
 * "מסר לפחות פריט אחד" נגזר מ-`listings` עצמו — `where userId == uid`,
 * עם `limit(1)`. **אין שדה חדש ואין מונה.** `firestore.rules` כבר אוכף
 * ש-`userId` במודעה חדשה שווה למי שיצר אותה (`allow create: if isAuth()
 * && newListing().userId == uid()`), כלומר המדידה נשענת על נתון שכבר
 * מאומת בשרת ואי אפשר לזייף אותו מהדפדפן. מונה נפרד היה נתון שני שצריך
 * להסכים עם הראשון, ובדיוק ממנו נובעות התקלות בפרויקט הזה.
 *
 * ## ⚠️ מה הקובץ הזה **אינו**
 * הוא רץ בדפדפן, ולכן הוא **חוויה ולא אכיפה**. מי שפותח DevTools עוקף
 * אותו בשורה אחת. האכיפה האמיתית חייבת לשבת ב-`firestore.rules` על
 * `listings/{id}/private/contact` — הנוסח המדויק הועבר לגיא ואינו מוחל
 * כאן, כי חוקים משפיעים על משתמשים חיים ודורשים אישור.
 */
import {
  arrayUnion, doc, getDoc, serverTimestamp, setDoc,
} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';
import { db } from './firebase.js';
import { hasUserListing } from './listings.js';

/* ═══════════════════ הדגלים — כל השליטה במקום אחד ═══════════════════ */

/**
 * הכלל עצמו. כיבוי מחזיר את הלוח למצב שלפני 16.9 — כל מי שמחובר יכול
 * לבקש כל פריט.
 *
 * ⚠️ **תאום ל-`GIVE_TO_TAKE_ENABLED` באפליקציה** ביום שהדגל ייבנה גם
 * שם. היום הכלל באפליקציה מקודד קשיח ב-`handleContactFreeItem`, כלומר
 * כיבוי כאן משאיר את האפליקציה חוסמת — שני משטחים, שתי התנהגויות.
 * זה בדיוק הפער שהקובץ הזה נועד לסגור, ולא לפתוח מחדש.
 */
export const GIVE_TO_TAKE_ENABLED = true;

/**
 * ⚠️ **הכרעה פתוחה של גיא — הדגל בנוי, המדיניות לא נקבעה.**
 *
 * "לקיחה ראשונה בלי תנאי": מי שעוד לא מסר כלום מקבל לקיחה אחת חינם,
 * והתנאי חל מהשנייה והלאה.
 *
 * **מה זה מרכך:** סטודנט שזה עתה עבר דירה, או מישהו בתחילת דרכו, נחסם
 * היום לגמרי — ודווקא הוא הקהל שהשירות מתאים לו. הוא נכנס ללוח, מוצא
 * מיטה, ומגלה שכדי לקחת אותה הוא צריך רהיט שאין לו.
 *
 * **מה זה עולה:** הלקיחה החופשית נספרת ב-`users/{uid}/private/giveaway`,
 * שהמשתמש עצמו רשאי לכתוב לפי החוקים היום — כלומר היא **מוצהרת ולא
 * מאומתת**, ואיפוס שלה מהדפדפן מחזיר לקיחה חופשית נוספת. זה לא נורא
 * כשהדגל כבוי (אין מה לאפס), והוא **חייב** לעבור לאכיפת שרת לפני
 * שהדגל נדלק. הפירוט בדוח.
 *
 * ברירת המחדל `false` היא הכלל הנקי שגיא ניסח, בלי חריגים.
 */
export const FIRST_TAKE_FREE = false;

/**
 * ⚠️ **הכרעה פתוחה של גיא — מלכודת האיכות.**
 *
 * כשחייבים לתת כדי לקחת, אנשים מפרסמים זבל כדי "לפתוח" את הלוח.
 * `false` = מספיק שפרסם פעם אחת, גם אם מחק/סימן כנמסר מיד אחר כך.
 * `true` = השער נפתח רק כל עוד יש לו מודעה **פעילה** על הלוח — כלומר
 * הוא נתן משהו שעדיין עומד לרשות אחרים, ולא "שילם כניסה" ונעלם.
 *
 * ⚠️ `true` מייצר תופעת לוואי שצריך להכיר: מי שמסר את הפריט שלו בפועל
 * מסמן אותו "נמסר", והשער **נסגר עליו** בדיוק ברגע שבו הוא הוכיח
 * שהמסירה שלו אמיתית. זו הסיבה שזה דגל ולא ברירת מחדל.
 */
export const REQUIRE_ACTIVE_LISTING = false;

/** כמה לקיחות מותרות בלי שמסרו כלום, כש-`FIRST_TAKE_FREE` דלוק. */
const FREE_TAKE_ALLOWANCE = 1;

/* ═══════════════════ המדידה ═══════════════════ */

/**
 * האם המשתמש מסר לפחות פריט אחד.
 *
 * ⚠️ **זורק** אם הקריאה נכשלה — ובכוונה. `evaluateTakeGate` הוא זה
 * שמחליט מה עושים עם כישלון, ובולע-שגיאות כאן היה הופך "אין רשת"
 * ל"לא מסר כלום", כלומר חוסם משתמש לגיטימי בלי שום סיבה.
 */
export async function hasGivenAtLeastOne(uid) {
  return hasUserListing(uid, { activeOnly: REQUIRE_ACTIVE_LISTING });
}

/* ═══════════════════ ספר הלקיחות (רק עבור FIRST_TAKE_FREE) ═══════════════════ */

/**
 * ⚠️ נכתב רק כשהלקיחה **נזקפה למכסה החופשית**, לא בכל לקיחה.
 *
 * בלי הדגל אין מה לספור — השער נשען על `listings` בלבד, שהוא נתון
 * מאומת. כל כתיבה נוספת כאן היא נתון שני שצריך להסכים עם הראשון,
 * ולכן היא נכתבת במינימום המוחלט שהדגל דורש.
 *
 * `arrayUnion` ולא מונה: לחיצה חוזרת על **אותו** פריט (חזרה למודעה,
 * רענון, פתיחת הוואטסאפ פעמיים) אינה לקיחה שנייה, והמשתמש לא אמור
 * לשלם עליה במכסה.
 */
async function readTakeLedger(uid) {
  const snap = await getDoc(doc(db, 'users', uid, 'private', 'giveaway'));
  return snap.exists() ? (snap.data().takenListingIds || []) : [];
}

/** רושמת שהלקיחה הזו נזקפה למכסה החופשית. */
export async function recordFreeTake(uid, listingId) {
  await setDoc(
    doc(db, 'users', uid, 'private', 'giveaway'),
    { takenListingIds: arrayUnion(listingId), lastTakeAt: serverTimestamp() },
    { merge: true },
  );
}

/* ═══════════════════ השער ═══════════════════ */

/**
 * @typedef {object} TakeGateDecision
 * @property {boolean} allowed      האם מותר לבקש את הפריט
 * @property {string}  reason       למה — ראו הרשימה ב-`describeTakeGate`
 * @property {boolean} hasGiven     האם נמדד שמסר לפחות אחד
 * @property {number}  freeTakesLeft כמה לקיחות חופשיות נשארו (0 כשהדגל כבוי)
 * @property {string}  listingId
 * @property {boolean} consumesFreeTake האם אישור הלקיחה הזו שורף מכסה
 */

/**
 * מכריעה אם המשתמש רשאי לבקש את הפריט.
 *
 * ⚠️ **כישלון קריאה מחזיר `allowed: true` עם `reason: 'check-failed'`.**
 * זו אותה הכרעה שכבר קיימת באפליקציה (*"If check fails, allow contact
 * anyway"*), והיא נכונה **בדיוק משום** שהשער הזה אינו האכיפה: חסימת
 * משתמש אמיתי בגלל רשת מקרטעת היא נזק ודאי, בעוד הרווח מדומה — מי
 * שמנסה לעקוף לא זקוק לכישלון רשת. ברגע שהחוק בשרת קיים, הוא זה
 * שחוסם, וכאן זה נשאר נוח ולא מסוכן.
 *
 * @param {{uid: string|null, listing: {id: string, userId?: string, status?: string}}} args
 * @returns {Promise<TakeGateDecision>}
 */
export async function evaluateTakeGate({ uid, listing }) {
  const base = {
    listingId: listing?.id ?? '',
    hasGiven: false,
    freeTakesLeft: 0,
    consumesFreeTake: false,
  };

  if (!uid) return { ...base, allowed: false, reason: 'anonymous' };
  if (listing?.userId === uid) return { ...base, allowed: true, reason: 'owner' };
  if (listing?.status === 'sold') return { ...base, allowed: false, reason: 'sold' };
  if (!GIVE_TO_TAKE_ENABLED) return { ...base, allowed: true, reason: 'disabled' };

  let hasGiven;
  try {
    hasGiven = await hasGivenAtLeastOne(uid);
  } catch {
    return { ...base, allowed: true, reason: 'check-failed' };
  }
  if (hasGiven) return { ...base, allowed: true, hasGiven: true, reason: 'has-given' };

  if (FIRST_TAKE_FREE) {
    let used;
    try {
      used = (await readTakeLedger(uid)).length;
    } catch {
      return { ...base, allowed: true, reason: 'check-failed' };
    }
    const left = Math.max(0, FREE_TAKE_ALLOWANCE - used);
    if (left > 0) {
      return { ...base, allowed: true, reason: 'first-take-free', freeTakesLeft: left, consumesFreeTake: true };
    }
    return { ...base, allowed: false, reason: 'free-takes-used' };
  }

  return {
    ...base,
    allowed: false,
    reason: REQUIRE_ACTIVE_LISTING ? 'needs-active-listing' : 'needs-listing',
  };
}

/* ═══════════════════ נקודת החיבור לעיצוב ═══════════════════ */

/**
 * שם האירוע שנורה על `document` בכל הכרעה של השער, עם ה-decision
 * המלא ב-`detail`.
 *
 * ⚠️ **זו נקודת התלייה לעיצוב, והיא קיימת כדי שלא יהיה צורך לגעת
 * בקובץ הזה.** סבב העיצוב של "מעבירים את זה הלאה" פתוח: שלושת
 * הכיוונים ב-`preview-giveaway.html` נבדלים **רק במתי ואיך התנאי
 * נאמר**, ולא בכלל עצמו. מי שיממש את הנוסח הנבחר מאזין לאירוע, ולא
 * משכתב את ההכרעה:
 *
 *     onTakeGate((d) => { if (!d.allowed) myBeautifulPanel(d); });
 */
export const TAKE_GATE_EVENT = 'rozic:take-gate';

/** @param {(d: TakeGateDecision) => void} handler */
export function onTakeGate(handler) {
  document.addEventListener(TAKE_GATE_EVENT, (e) => handler(e.detail));
}

/** יורה את האירוע. נקראת ע"י הדפים אחרי `evaluateTakeGate`. */
export function emitTakeGate(decision) {
  document.dispatchEvent(new CustomEvent(TAKE_GATE_EVENT, { detail: decision }));
}

/* ── ⚠️ נוסח זמני ─────────────────────────────────────────────────────
   גיא מעצב את הנוסח הסופי בעצמו — הכיוונים ב-`preview-giveaway.html`
   הם בדיוק השאלה הזו ("בפתח / ברגע הרצון / כהיגיון של הדבר"). מה
   שכתוב כאן הוא **מחזיק מקום מובן**, לא הצעה: הוא אומר מה קרה ולאן
   ללכת, ושום דבר מעבר. אין כאן שכנוע, אין מיתוג, ואין הבטחה.
   ─────────────────────────────────────────────────────────────────── */

/**
 * @param {TakeGateDecision} decision
 * @returns {{title: string, body: string, ctaLabel: string, ctaHref: string}|null}
 *   `null` כשאין מה להציג (הלקיחה מותרת).
 */
export function describeTakeGate(decision) {
  if (decision.allowed) return null;
  if (decision.reason === 'anonymous') {
    return {
      title: 'כדי לבקש פריט צריך חשבון',
      body: 'כך המוסר יודע מי פונה אליו.',
      ctaLabel: 'להתחברות',
      ctaHref: '',   // הדף קובע — הוא היחיד שיודע לאן להחזיר
    };
  }
  if (decision.reason === 'sold') {
    return { title: 'הפריט כבר נמסר', body: '', ctaLabel: '', ctaHref: '' };
  }
  return {
    title: 'כדי לקחת פריט, צריך קודם למסור אחד',
    body: decision.reason === 'needs-active-listing'
      ? 'הלוח חי ממי שמוסר. כל עוד יש לכם פריט פעיל בלוח — אפשר לבקש כל פריט אחר.'
      : 'הלוח חי ממי שמוסר. פרסמו פריט אחד, ומאותו רגע אפשר לבקש כל פריט בלוח.',
    ctaLabel: 'לפרסום פריט',
    ctaHref: 'marketplace-create.html',
  };
}

/**
 * רינדור זמני של השער כמחרוזת HTML.
 *
 * מחרוזת ולא אלמנט, כדי שתיכנס לאותם `innerHTML` שהדפים כבר בונים
 * (אותו דפוס בדיוק כמו `guestQuotaPanelHTML`). **אין כאן שום ערך
 * שמגיע ממשתמש** — הכול קבועים מהקובץ הזה — ולכן אין מה לברוח.
 *
 * `tabindex="0"` מפורש: בספארי במק, בברירת המחדל של המערכת, קישורים
 * וכפתורים נשמטים מסדר ה-Tab בלי זה. ראו ההערה ב-`marketplace.html`.
 *
 * @param {TakeGateDecision} decision
 * @param {{ctaHref?: string}} [opts] דריסת היעד (למשל מסלול התחברות עם `next`)
 */
export function takeGatePanelHTML(decision, opts = {}) {
  const copy = describeTakeGate(decision);
  if (!copy) return '';
  const href = opts.ctaHref || copy.ctaHref;
  return `<div class="alert alert-info take-gate" role="status">
    <strong>${copy.title}</strong>
    ${copy.body ? `<span> ${copy.body}</span>` : ''}
    ${copy.ctaLabel && href ? `<a class="btn btn-primary btn-block" tabindex="0" href="${href}" style="margin-top:10px;">${copy.ctaLabel}</a>` : ''}
  </div>`;
}
