/**
 * מה שהאורח רואה כשנגמרה לו מכסת הסריקות — ומה שמונע שהעבודה שלו תלך לאיבוד.
 *
 * ## למה זה קיים (16.9, תזכיר #60)
 * גיא הכריע לפתוח סריקת AI לאורחים, עם מכסה. הכרעה כזו נושאת איתה רגע
 * אחד מסוכן: הסריקה שבה המכסה נגמרת. גיא ניסח אותו במילים שלו —
 *
 *   *"צריך ליצור דף נוסף שרושם — נגמרה מכסת הסריקות ללא התחברות,
 *   התחבר עם חשבון גוגל, אפל או עצמאי ותוכל להמשיך לסרוק בחינם.
 *   **חייב להסביר זאת ללקוח שלא תהיה כשל שקט והוא יעזוב את האתר
 *   ויקבל שירות גרוע.**"*
 *
 * כלומר שתי דרישות, ושתיהן נאכפות כאן:
 *   1. **הסבר, לא כשל.** אורח שמיצה את המכסה מקבל מסך שאומר בדיוק מה
 *      קרה, מה לעשות, ו**גם מוצא ידני** למי שלא רוצה חשבון.
 *   2. **העבודה שלו נשמרת.** מי שמתחבר חוזר בדיוק לאותו מקום, עם
 *      התמונות והפריטים שכבר הוסיף. ואם תמונה לא שרדה את המעבר —
 *      אומרים לו את זה במפורש, ולא משאירים אותו לגלות לבד.
 *
 * ## ⚠️ שלוש מלכודות שהקוד כאן חוסם בכוונה
 *
 * **א. לא כל 429 הוא מכסת אורח.** השרת מחזיר `429` גם למשתמש **רשום**
 * שחצה את מגבלת הקצב שלו. הצגת "התחברו והמשיכו" למי שכבר מחובר היא
 * הודעה חסרת פשר. לכן `isGuestQuotaError` בודקת גם `auth.currentUser`,
 * ולא רק את קוד השגיאה — ראו `callGemini` ב-`ai-vision.js`, שם נקרא
 * גוף התשובה (`guest_quota_exhausted`) ולא רק הסטטוס.
 *
 * **ב. כשל רשת אינו מכסה.** `fetch` שנופל, `500` מהשרת או `401` —
 * כולם ממשיכים לנוסח השגיאה הרגיל של `friendlyAIError`. אורח שהאינטרנט
 * שלו התנתק ונשלח להירשם היה מגלה שגם אחרי ההרשמה זה לא עובד.
 *
 * **ג. הפאנל נמחק בכל רינדור מחדש של הצ'אט.** שרשור ההודעות נבנה
 * מחדש ב-`innerHTML` בכל הודעה, כלומר מאזין שנתלה על הכפתור עצמו
 * הולך לאיבוד והכפתור הופך למת. לכן ההאזנה כאן היא **האצלה** (מאזין
 * אחד על `document`), והכפתורים מזוהים לפי `data-ai-quota`.
 */
import { auth } from './firebase.js';
import { resizeImageToBase64 } from './image-resize.js';

/** קוד השגיאה שמייצג "אורח מיצה את המכסה". נזרק מ-`callGemini`. */
export const GUEST_QUOTA_CODE = 'AI_GUEST_QUOTA_EXHAUSTED';

/**
 * האם זו **באמת** מכסת אורח שנגמרה.
 *
 * ⚠️ הבדיקה הכפולה אינה הגנת יתר: `guest_quota_exhausted` מגיע מהשרת,
 * ואם יום אחד יוחזר בטעות גם למשתמש מחובר — מי שכבר מחובר יקבל כאן
 * `false` ויראה את הודעת מגבלת הקצב הרגילה, ולא הזמנה להתחבר פעמיים.
 */
export function isGuestQuotaError(err) {
  return String((err && err.message) || err).includes(GUEST_QUOTA_CODE) && !auth.currentUser;
}

/* ── הנוסח שגיא אישר ─────────────────────────────────────────────────
   הכותרת והשורה הראשונה **מילה במילה**. מה שמשתנה בין המסכים הוא רק
   המוצא הידני: במסכי ההזמנה ממשיכים "להוסיף פריטים", ובמסירת הפריט
   ממלאים "פרטים" — ואין שם לא סריקה ולא פריטים. זה לא קפדנות יתר:
   ב-16.9 אורח בעוזר הכתיבה קיבל את הנוסח של מסך סריקת החדרים, ושתי
   מילים ממסך אחר הפכו תשובה להודעה לא מובנת. ראו friendlyAIError.
   ─────────────────────────────────────────────────────────────────── */
const QUOTA_TITLE = 'נגמרו הסריקות החינמיות ללא חשבון';
const QUOTA_BODY = 'ההתחברות חינם ולוקחת שנייה — Google, Apple או מייל — ומשם ממשיכים לסרוק.';

/** נוסח טקסטואלי בלבד (בלי כפתורים) — לכל מקום שמציג מחרוזת ולא HTML. */
export const GUEST_QUOTA_TEXT = `${QUOTA_TITLE}. ${QUOTA_BODY}`;

/**
 * הפאנל עצמו, כמחרוזת HTML.
 *
 * מחרוזת ולא אלמנט, כי שרשור הצ'אט נבנה ב-`innerHTML` ואלמנט שנבנה
 * ידנית לא ישרוד שם. אין כאן שום ערך שמגיע מהמשתמש או מהשרת —
 * `manualLabel` ו-`note` הם קבועים שהדפים מעבירים.
 *
 * @param {object} [opts]
 * @param {string} [opts.manualLabel] נוסח המוצא הידני (חובה שיתאים למסך).
 * @param {string} [opts.note] שורת הרגעה על מה שנשמר — או אזהרה על מה שלא.
 * @param {boolean} [opts.boxed] מסגרת `alert` (ברירת מחדל). בצ'אט — `false`,
 *   כי הבועה עצמה כבר מסגרת.
 */
export function guestQuotaPanelHTML({ manualLabel = 'או המשך להוסיף פריטים ידנית', note = '', boxed = true } = {}) {
  return `<div class="ai-quota-gate${boxed ? ' alert alert-info' : ''}">
    <strong class="ai-quota-gate-title">${QUOTA_TITLE}</strong>
    <span class="ai-quota-gate-body">${QUOTA_BODY}</span>
    ${note ? `<span class="ai-quota-gate-note">${note}</span>` : ''}
    <span class="ai-quota-gate-actions">
      <button tabindex="0" type="button" class="btn btn-primary" data-ai-quota="login">התחבר והמשך</button>
      <button tabindex="0" type="button" class="btn btn-text" data-ai-quota="manual">${manualLabel}</button>
    </span>
  </div>`;
}

/**
 * מציגה את הפאנל בתיבה נתונה — **ומביאה אותו לעין**.
 *
 * ⚠️ הגלילה אינה קישוט. בטלפון תיבת השגיאה יושבת באמצע כרטיס הסריקה,
 * ומתחתיה סרגל מחיר דביק שמכסה את תחתית המסך; נמדד בדפדפן ב-390px
 * שהכפתורים נחתכים מתחתיו. `block: 'center'` מבטיח ששני הכפתורים —
 * ההתחברות **והמוצא הידני** — נראים ברגע שהם מופיעים.
 */
export function mountGuestQuotaPanel(host, opts) {
  if (!host) return;
  host.innerHTML = guestQuotaPanelHTML(opts);
  host.querySelector('.ai-quota-gate')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

/**
 * מחבר את שני הכפתורים, פעם אחת לכל דף.
 *
 * ⚠️ האצלה מ-`document` ולא מאזין על הכפתור: הפאנל מופיע גם בתוך שרשור
 * הצ'אט, שנבנה מחדש ב-`innerHTML` בכל הודעה — מאזין ישיר היה שורד עד
 * הרינדור הבא בלבד, וכפתור מת כאן הוא בדיוק "הכשל השקט" שגיא אסר.
 *
 * הכפתורים הם `<button>` אמיתיים, ולכן Enter ו-Space עובדים מהמקלדת
 * בלי שום קוד נוסף.
 */
export function attachGuestQuotaHandlers({ onLogin, onManual }) {
  document.addEventListener('click', (e) => {
    const btn = e.target instanceof Element ? e.target.closest('[data-ai-quota]') : null;
    if (!btn) return;
    e.preventDefault();
    if (btn.dataset.aiQuota === 'login') {
      onLogin?.();
      return;
    }
    // המוצא הידני מסלק את הפאנל — הוא סיים את תפקידו, והמסך ממשיך לעבוד.
    btn.closest('.ai-quota-gate')?.remove();
    onManual?.();
  });
}

/* ═══════════ שימור התמונות במעבר להתחברות ═══════════════════════════
   הפריטים, הכתובות והתאריך נשמרים כבר ב-`saveOrderDraft`
   (`guest-checkout.js`), והמודעה בלוח נשמרת ב-`saveListingDraft`
   (`marketplace-create.html`) — כולל התמונות שלה. מה שאין לו בית הוא
   **התמונות שנבחרו לסריקה**: `File[]` בזיכרון, שנעלם ברגע שהדף מתחלף.

   ⚠️ **sessionStorage ולא localStorage, וזו הכרעה ולא נוחות.** טיוטת
   ההזמנה הודגמה כדליפה בין אנשים על אותו מכשיר (ראו
   `clearAllOrderDrafts`), והתמונות כאן גרועות בהרבה מכתובת: הן תמונות
   של הבית מבפנים. `sessionStorage` חי בלשונית אחת בלבד ומת עם סגירתה
   — בדיוק אורך החיים של מסע ההתחברות, ולא שנייה יותר.
   ─────────────────────────────────────────────────────────────────── */

const photoKey = (serviceType) => `rozic:draft:ai-photos:${serviceType}`;
const PHOTO_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * שומרת את התמונות שנבחרו לסריקה, לפני ההפניה להתחברות.
 *
 * ⚠️ הגודל הוא 1024/0.7 — **בדיוק** מה ש-`resizeImageToBase64` שולחת
 * ל-AI. אין טעם לשמור איכות גבוהה יותר: התמונות האלה אינן מתפרסמות
 * בשום מקום, הן רק נסרקות, ואחסון גדול יותר רק מקרב את מכסת הדפדפן.
 *
 * ⚠️ **כישלון שמירה אינו מבטל את ההתחברות** — הוא רק אומר שהתמונות
 * ייבחרו שוב. לכן במקרה כזה נשמרת **רשומת סימון בלבד** (`photos: []`
 * עם `expected`), כדי שבחזרה אפשר יהיה לומר למשתמש *"את התמונות צריך
 * לבחור שוב"* במקום להשאיר אותו מול אזור ריק בלי הסבר.
 *
 * @returns {Promise<'full'|'marker-only'|'none'>}
 */
export async function saveScanPhotos(serviceType, files) {
  const list = Array.from(files || []);
  if (list.length === 0) return 'none';
  const base = { savedAt: Date.now(), expected: list.length, photos: [] };
  try {
    const dataUrls = [];
    for (const file of list) {
      dataUrls.push('data:image/jpeg;base64,' + await resizeImageToBase64(file));
    }
    sessionStorage.setItem(photoKey(serviceType), JSON.stringify({ ...base, photos: dataUrls }));
    return 'full';
  } catch {
    try {
      sessionStorage.setItem(photoKey(serviceType), JSON.stringify(base));
      return 'marker-only';
    } catch {
      // מצב פרטי או אחסון חסום לגמרי. אין מה לעשות — וההתחברות ממשיכה.
      return 'none';
    }
  }
}

/**
 * data URL → `File`, כדי שהתמונה המשוחזרת תיכנס בדיוק לאותו מסלול
 * (`resizeImageToBase64` → `analyzeImagesWithCatalog`) כמו תמונה שנבחרה
 * עכשיו. אותו דפוס בדיוק כמו `dataUrlToFile` ב-`marketplace-create.html`.
 */
function dataUrlToFile(dataUrl, index) {
  const bin = atob(dataUrl.split(',')[1]);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new File([bytes], `scan-${index + 1}.jpg`, { type: 'image/jpeg' });
}

/**
 * מחזירה את התמונות ששמורות (ומנקה אותן — שימוש חד-פעמי).
 *
 * ⚠️ הצורה נבדקת לפני השחזור, כמו בכל טיוטה אחרת בפרויקט: רשומה פגומה
 * **נזרקת** ולא מתוקנת חלקית. `d.photos.map` על ערך שאינו מערך מפיל את
 * הסקריפט כולו, כלומר הדף מת ואי אפשר להזמין בו — בדיוק הלקח של
 * `shapeOk` ב-`guest-checkout.js`.
 *
 * @returns {{files: File[], expected: number, dropped: boolean}|null}
 */
export function restoreScanPhotos(serviceType) {
  let raw = null;
  try {
    raw = sessionStorage.getItem(photoKey(serviceType));
    if (raw) sessionStorage.removeItem(photoKey(serviceType));
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    const d = JSON.parse(raw);
    if (!d || typeof d !== 'object') return null;
    if (!d.savedAt || Date.now() - d.savedAt > PHOTO_TTL_MS) return null;
    if (!Number.isFinite(d.expected) || d.expected <= 0) return null;
    if (!Array.isArray(d.photos)
        || !d.photos.every(v => typeof v === 'string' && v.startsWith('data:image/jpeg;base64,'))) return null;
    const files = d.photos.map(dataUrlToFile);
    return { files, expected: d.expected, dropped: files.length === 0 };
  } catch {
    // base64 פגום או JSON שבור — עדיף אזור תמונות ריק מאשר דף שנפל.
    return null;
  }
}

/**
 * ההודעה בחזרה מההתחברות: מה חזר, ומה צריך לעשות שוב.
 *
 * **לא** הודעת שגיאה — אין כאן כשל שהמשתמש צריך לפתור. אבל מי שלא
 * יודע שהתמונות לא חזרו ייתקע מול כפתור סריקה מושבת בלי להבין למה,
 * וזה בדיוק אותו "כשל שקט" במקום אחר בזרימה.
 */
export function scanPhotosNotice(restored, signedIn) {
  if (!restored) return '';
  // ⚠️ "התחברתם" רק למי שבאמת התחבר: אורח יכול לחזור לאותה לשונית גם
  // בכפתור "אחורה", ומשפט שמברך אותו על התחברות שלא קרתה הוא בדיוק
  // סוג הבלבול שהמסך הזה נועד למנוע.
  const lead = signedIn ? 'התחברת — ' : '';
  return restored.dropped
    ? `${lead}מה שהוספת לרשימה נשמר. את התמונות לסריקה צריך לבחור שוב (הן לא שרדו את המעבר), ואז אפשר לסרוק.`
    : `${lead}החזרנו את התמונות שהעלית ואת הרשימה. אפשר להמשיך מכאן.`;
}
