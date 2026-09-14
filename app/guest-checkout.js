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

/** מחזירה את הטיוטה אם היא קיימת וטרייה, אחרת `null` (ומנקה את מה שפג). */
export function loadOrderDraft(serviceType) {
  try {
    const raw = localStorage.getItem(draftKey(serviceType));
    if (!raw) return null;
    const { savedAt, state } = JSON.parse(raw);
    if (!savedAt || Date.now() - savedAt > DRAFT_TTL_MS) {
      localStorage.removeItem(draftKey(serviceType));
      return null;
    }
    return state ?? null;
  } catch {
    return null;
  }
}

/** ⚠️ לקרוא אחרי יצירת הזמנה מוצלחת — אחרת הטיוטה תצוף שוב בהזמנה הבאה. */
export function clearOrderDraft(serviceType) {
  try { localStorage.removeItem(draftKey(serviceType)); } catch { /* ראו למעלה */ }
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
  set('notes', state.notes || '');
  check('has-insurance', state.hasInsurance);
  check('has-packing', state.hasPacking);

  // התאריך נשמר בתצוגה העברית של האפליקציה, וה-input דורש YYYY-MM-DD.
  // תאריך שכבר עבר אינו משוחזר — לקוח שחוזר מחר לטיוטה של אתמול צריך
  // לבחור מועד חדש, לא לגלות בסוף שהזמין ליום שחלף.
  const d = state.date ? parseDateApp(state.date) : null;
  if (d && d >= new Date(new Date().toDateString())) {
    const pad = (n) => String(n).padStart(2, '0');
    set('move-date', `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
  }
}
