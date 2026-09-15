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
import { parseDateApp } from './geo.js';

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

/** שומרת את מצב ההזמנה לפני שליחה להרשמה. ראו ההערה למעלה — זה לא אופציונלי. */
export function saveOrderDraft(serviceType, state) {
  try {
    localStorage.setItem(draftKey(serviceType), JSON.stringify({ savedAt: Date.now(), state }));
    return true;
  } catch {
    // מכסה מצב פרטי, אחסון מלא, ודפדפן שחוסם אחסון. כישלון שמירה לא
    // מפיל את ההרשמה — הוא רק אומר שהלקוח ימלא שוב, וזה עדיף על מסך שבור.
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
const DRAFT_SHAPE = {
  items: 'object', freeItems: 'array', craneItems: 'array',
  fromAddress: 'string', toAddress: 'string', fromFloor: 'string', toFloor: 'string',
  notes: 'string', date: 'string', timeSlot: 'string',
  hasPacking: 'boolean', hasInsurance: 'boolean', needsCrane: 'boolean',
  fromElevator: 'boolean', toElevator: 'boolean', distance: 'number',
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

function shapeOk(state) {
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

/** מחזירה את הטיוטה אם היא קיימת, טרייה ובמבנה תקין; אחרת `null` (ומנקה). */
export function loadOrderDraft(serviceType) {
  lastDraftDiscarded = false;
  try {
    const raw = localStorage.getItem(draftKey(serviceType));
    if (!raw) return null;
    const { savedAt, state } = JSON.parse(raw);
    if (!savedAt || Date.now() - savedAt > DRAFT_TTL_MS || !shapeOk(state)) {
      localStorage.removeItem(draftKey(serviceType));
      lastDraftDiscarded = true;
      return null;
    }
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

/** מפנה להרשמה/התחברות, ומבטיחה שהזרימה תחזור בדיוק לאותו דף. */
export function goRegister(serviceType, state) {
  saveOrderDraft(serviceType, state);
  const next = encodeURIComponent(location.pathname + location.search);
  location.href = `login.html?next=${next}`;
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
