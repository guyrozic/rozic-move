// Web equivalent of Hovalot's src/constants/legal.ts — same constant, same
// value, same four consent field names. Kept as a separate tiny module (and
// not inlined in orders.js) so the mirror is one-to-one with the app and the
// version can't drift between the two order forms.
import { serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';

/**
 * גרסת התקנון ומדיניות הפרטיות שבתוקף — **מקור אמת יחיד בצד האתר.**
 *
 * למה זה קיים (ביקורת משפטית 11.9): ההסכמה לתקנון חסמה בממשק אבל לא הותירה
 * זכר ברשומת ההזמנה — לא מי אישר, לא מתי, ולא לפי איזה נוסח. בלי הגרסה גם
 * התיעוד עצמו כמעט חסר ערך, כי התקנון מתעדכן.
 *
 * המנגנון בכוונה הפשוט ביותר שעובד: קבוע יחיד שמעודכן ידנית. הערך הוא בדיוק
 * שורת "עודכן לאחרונה" שכבר מופיעה במסמכים המשפטיים, בפורמט YYYY-MM — אותה
 * רזולוציה שהמשתמש רואה בפועל ("ספטמבר 2026"), לא יותר.
 *
 * ⚠️ בכל עדכון של התקנון / מדיניות הפרטיות יש לעדכן באותו יום:
 *   1. הקבוע כאן.
 *   2. `src/constants/legal.ts` בריפו האפליקציה (Hovalot) — **ערך זהה בדיוק**,
 *      אחרת שני המשטחים מתייגים את אותו נוסח בשתי גרסאות שונות.
 *   3. שורת "עודכן לאחרונה" ב-terms.html, privacy.html, accessibility.html,
 *      ובשני המסכים המקבילים באפליקציה (TermsOfServiceScreen/PrivacyPolicyScreen).
 */
export const TERMS_VERSION = '2026-09';

/**
 * בונה את ראיית ההסכמה שמוצמדת להזמנה חדשה באתר — מראה של
 * `orderTermsConsent()` ב-`Hovalot/src/services/orders.ts`, אותם ארבעה
 * מפתחות בדיוק.
 *
 * ההבדל היחיד הוא הערכים, וזה תיעוד ולא דריפט: באתר יש צ'ק-בוקס חוסם בטופס
 * ההזמנה עצמו (`terms-accept` ב-apartment.html/small-move.html), כלומר
 * ההסכמה ניתנה באותו רגע — ולכן `termsAcceptedAt` הוא זמן השרת עכשיו ו-
 * `termsAcceptedVia` הוא 'order_checkbox'. באפליקציה ההסכמה נלקחת פעם אחת
 * בהרשמה, ולכן שם המועד מגיע ממסמך המשתמש ו-via הוא 'registration'.
 *
 * נקרא רק אחרי שנבדק שהצ'ק-בוקס מסומן — אין כאן ברירת מחדל "מסכים".
 */
export function orderTermsConsent() {
  return {
    termsAccepted: true,
    termsAcceptedAt: serverTimestamp(),
    termsVersion: TERMS_VERSION,
    termsAcceptedVia: 'order_checkbox',
  };
}
