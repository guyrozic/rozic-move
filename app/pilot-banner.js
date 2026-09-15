/**
 * באנר שלב ההרצה באתר — **תאום ל-`src/components/PilotBanner.tsx` באפליקציה.**
 *
 * ## הבקשה של גיא (16.9)
 * *"לגבי השורה העליונה 'האתר בשלב בדיקות פרטי — לא מיועד להזמנות מהציבור
 * הרחב כרגע' — אני רוצה שתסיר את זה כשורה עליונה ותיצור את זה כבאנר קופץ
 * ממש כמו באפליקציה."*
 *
 * עד כאן הקובץ הזה הזריק **שורה כתומה קבועה** בראש כל דף, שדחפה את כל
 * התוכן למטה (`--banner-h`, שה-nav, תפריט המובייל וה-hero כולם היו
 * צריכים לספור). עכשיו: כרטיס צף, במסכי הבית בלבד, שנסגר ונעלם.
 *
 * ## ⚠️ למה זה **לא** דיאלוג מודאלי
 * באפליקציה `PilotBanner` הוא כרטיס צף בתוך `TopBanners` — הוא אינו חוסם
 * את המסך, אינו לוכד מיקוד, ואינו דורש פעולה. "ממש כמו באפליקציה" פירושו
 * בדיוק זה. ומעבר לנאמנות לתאום, מודאל כאן היה **רגרסיה בנגישות**: הסגירה
 * אינה נזכרת בין דפים (ראו למטה), כלומר כל נחיתה במסך בית הייתה לוכדת את
 * המיקוד מחדש — ודוחקת את "דלג לתוכן המרכזי", שחייב להישאר האלמנט הממוקד
 * הראשון בדף (WCAG 2.4.1), אל מאחורי מלכודת.
 *
 * מה שכן נלקח ממוסכמת הדיאלוג: **Escape סוגר**, לכפתור הסגירה יש שם נגיש
 * בעברית ויעד מגע 44×44, והמיקוד מוחזר במפורש כשהוא היה בפנים.
 *
 * ## ⚠️ למה הסגירה היא לחיי הדף ולא לצמיתות
 * `dismissed` בזיכרון ולא `localStorage`, בכוונה — בדיוק כמו ה-`useState`
 * באפליקציה. זו הצהרה משפטית שמופיעה גם בתקנון, ומבקר שסגר אותה פעם אחת
 * לפני חודש לא אמור להפסיק לראות אותה לנצח.
 *
 * ## ⚠️ למה הסקריפט נטען בכל הדפים אבל מוצג בשניים
 * `PILOT_BANNER_PAGES` הוא המקבילה ל-`onHome` באפליקציה: שם הרכיב מותקן
 * גלובלית ומחליט בעצמו לפי שם המסלול, וכאן הסקריפט נטען בכל דף ומחליט
 * בעצמו לפי הנתיב. כך ההחלטה "איפה הבאנר מופיע" חיה **בקבוע אחד**, ולא
 * מתפזרת על פני תשעה תגי `<script>` שמישהו יוסיף או ישכח.
 */
import { PILOT_MODE, PILOT_BANNER_TITLE, PILOT_BANNER_BODY } from './pilot-mode.js';

/**
 * מסכי הבית של האתר — המקבילה ל-`'Home'` ו-`'DriverHome'` באפליקציה.
 *
 * - `/` · `/index.html` — הבית הציבורי.
 * - `/app/` · `/app/index.html` — הבית של ממשק ההזמנה ("לאן מובילים היום?").
 *
 * ⚠️ **`app/login.html` אינו ברשימה בכוונה.** הבית הציבורי מקשר אל ממשק
 * ההזמנה דרך `app/index.html` **בלבד** (נבדק: שני הקישורים בדף, ואין אף
 * קישור ישיר ל-`apartment.html`/`small-move.html`), כלומר כל דרך אל
 * הזמנה עוברת באחד משני הדפים האלה. ובאתר — בניגוד לאפליקציה — כל ניווט
 * הוא טעינת דף חדשה שמאפסת את הסגירה, ולכן כל משטח נוסף אינו "עוד מקום
 * שרואים בו את ההצהרה" אלא **עוד פעם שרואים אותה באותו ביקור**.
 */
const PILOT_BANNER_PAGES = ['/', '/index.html', '/app/', '/app/index.html'];

const path = location.pathname.replace(/\/{2,}/g, '/');
if (PILOT_MODE && PILOT_BANNER_PAGES.includes(path)) showPilotBanner();

function showPilotBanner() {
  /* ⚠️ הכרטיס נכנס **מיד אחרי** קישור הדילוג, ולא כילד הראשון של ה-body.
     כפתור הסגירה הוא פקד ממוקד, ולכן סדר ה-DOM כאן הוא סדר ה-Tab: לפני
     הקישור — והבאנר היה גונב ממנו את המקום הראשון; אחריו — והוא תחנת
     ה-Tab השנייה, בדיוק כמו שהוא נראה על המסך (מתחת לסרגל העליון,
     מעל התוכן). */
  const host = document.createElement('div');

  /* ⚠️ `role="status"` מוזרק **ריק**, והתוכן נכנס פריים אחרי.
     אזור חי שנולד עם התוכן כבר בתוכו אינו מוכרז ברוב קוראי המסך — הם
     מכריזים *שינוי* באזור קיים. שתי הפעימות האלה הן ההפרש בין הצהרה
     שנשמעת להצהרה שנראית בלבד. */
  host.setAttribute('role', 'status');
  host.setAttribute('aria-atomic', 'true');

  /* ⚠️ 15.9 — הכרטיס נכנס **לתוך הזרימה** בראש התוכן הראשי, ולא כשכבה
     צפה אחרי קישור הדילוג. `PilotBanner.tsx` באפליקציה הוא `View` רגיל
     שדוחף את מה שמתחתיו; גרסת ה-`position:fixed` הראשונה כאן כיסתה את
     הכותרת "לאן מובילים היום?" בכל רוחב מסך שנמדד — כלומר ההצהרה הסתירה
     בדיוק את מה שהמבקר בא לקרוא. "ממש כמו באפליקציה" הוא כרטיס שדוחף. */
  const main = document.querySelector('main#main-content, main');
  if (main) main.insertBefore(host, main.firstChild);
  else document.body.insertBefore(host, document.body.firstChild);

  requestAnimationFrame(() => {
    host.className = 'pilot-banner';
    host.innerHTML =
      '<div class="pilot-banner-texts">' +
        '<p class="pilot-banner-title"></p>' +
        '<p class="pilot-banner-body"></p>' +
      '</div>' +
      '<button type="button" class="pilot-banner-close" ' +
        'aria-label="סגור את ההודעה על שלב ההרצה"><span aria-hidden="true">✕</span></button>';
    host.querySelector('.pilot-banner-title').textContent = PILOT_BANNER_TITLE;
    host.querySelector('.pilot-banner-body').textContent = PILOT_BANNER_BODY;
    host.querySelector('.pilot-banner-close').addEventListener('click', dismiss);
    document.addEventListener('keydown', onKeyDown);
  });

  /**
   * ⚠️ בלי `preventDefault`/`stopPropagation`: ב-`index.html` יושב מאזין
   * Escape נוסף שסוגר את תפריט המובייל, והוא קדם לבאנר. באנר-הודעה
   * שבולע את Escape היה משאיר את מי שפתח את התפריט במקלדת בלי דרך
   * יציאה מוכרת — בדיוק התקלה שתוקנה שם ב-15.9.
   *
   * ⚠️ **ולכן נדרש התנאי על `visibility`.** בלעדיו Escape אחד סוגר את
   * שניהם — ובמובייל התפריט הפתוח מסתיר את הבאנר לגמרי, כלומר ההצהרה
   * המשפטית הייתה נסגרת בלי שהמבקר ראה אותה ובלי שהתכוון. הכלל:
   * **Escape סוגר את מה שרואים.** מי שסגר את התפריט ב-Escape הראשון
   * רואה את הבאנר חוזר, וה-Escape השני סוגר אותו.
   */
  function onKeyDown(e) {
    if (e.key !== 'Escape') return;
    if (getComputedStyle(host).visibility !== 'visible') return;
    dismiss();
  }

  function dismiss() {
    /* ⚠️ החזרת המיקוד **מותנית** ב"היה בפנים". Escape יכול להילחץ בכל
       רגע, גם כשהמיקוד נמצא באמצע טופס — וגניבת מיקוד ממי שלא נגע
       בבאנר גרועה מאובדן מיקוד.
       והיעד הוא קישור הדילוג כי הוא האלמנט שקדם לבאנר ב-DOM: המיקוד
       חוזר בדיוק למקום שממנו הגיע, ומשם Tab ממשיך אל הדף כרגיל. */
    const hadFocus = host.contains(document.activeElement);
    document.removeEventListener('keydown', onKeyDown);
    host.remove();
    if (hadFocus && skip) skip.focus();
  }
}
