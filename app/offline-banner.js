/**
 * באנר "אין חיבור לאינטרנט" — **תאום ל-`src/components/OfflineBanner.tsx`**
 * באפליקציה (מותקן שם גלובלית דרך `TopBanners.tsx:96`).
 *
 * ## מה הוא עושה
 * רצועה ברוחב מלא בראש הדף כשאין חיבור, נעלמת מיד כשהוא חוזר.
 * **אינה חוסמת, אין בה כפתור סגירה ואין בה שום פקד** — בדיוק כמו באפליקציה,
 * ומאותו נימוק שכתוב שם: הבאנר הזה אינו מבקש פעולה, הוא **מסביר למה שום
 * דבר בדף לא מתעדכן**. באנר שאפשר לסגור פירושו מסך קפוא בלי שום רמז למה.
 *
 * ## ⚠️ למה `navigator.onLine` ולא heartbeat לשרת
 * האפליקציה בודקת `state.isConnected === false` של NetInfo — **ולא**
 * `isInternetReachable`. `navigator.onLine` הוא אותה סמנטיקה בדיוק: יש/אין
 * ממשק רשת פעיל, בלי לשאול אם יעד כלשהו עונה. heartbeat היה הופך את האתר
 * למחמיר מהאפליקציה (רשת שעובדת + שרת אחד שלא עונה = "אין אינטרנט"),
 * כלומר מייצר false-positive משלו על מסך שדווקא כן מתעדכן.
 *
 * ## ⚠️ למה הקובץ הזה בלי אף `import`
 * דף שנטען ממטמון הדפדפן בזמן שאין רשת **לא יצליח למשוך את ה-SDK של
 * Firebase מ-gstatic** — כלומר כל מודול שתלוי בו מת בשקט, וזה בדיוק הרגע
 * שבו הבאנר הזה הכי נחוץ. אפס תלויות הוא מה שמבטיח שהוא ירוץ שם.
 *
 * ## ⚠️ למה ההזרקה היא **אחרי** קישור הדילוג
 * `a.skip-link` חייב להישאר האלמנט הראשון בסדר ה-Tab (WCAG 2.4.1), ולכן
 * שום דבר לא נכנס לפניו. הבאנר עצמו אינו ניתן למיקוד, אבל הכלל נשמר כאן
 * כדי שלא ייווצר תקדים — ראו את ההערה המקבילה ב-`pilot-banner.js`.
 */

/**
 * ⚠️ הנוסח באפליקציה הוא **"אין חיבור לאינטרנט"** בלבד (נבדק במקור,
 * `OfflineBanner.tsx`). המשפט השני כאן הוא תוספת מכוונת של האתר, והנימוק
 * הוא הבדל אמיתי בין שני המשטחים: באפליקציה מסך שאיבד רשת מפסיק להתרנדר
 * ומראה ספינרים, ואילו דף אינטרנט **ממשיך להציג את מה שכבר צויר** — יתרה,
 * סטטוס הזמנה, מונה הודעות — בלי שום סימן שהוא קפוא. המשפט הזה הוא מה
 * שמונע מהמבקר להסתמך על מספר ישן.
 */
const TEXT = '📡 אין חיבור לאינטרנט — חלק מהנתונים עשויים להיות לא מעודכנים';

let host = null;

function mount() {
  if (host) return;
  const el = document.createElement('div');
  el.className = 'offline-banner';
  /* ⚠️ `role="status"` מוזרק **ריק**, והטקסט נכנס פריים אחרי. אזור חי
     שנולד עם התוכן כבר בתוכו אינו מוכרז ברוב קוראי המסך — הם מכריזים
     *שינוי* באזור קיים. אותו לקח בדיוק כמו ב-`pilot-banner.js`. */
  el.setAttribute('role', 'status');
  el.setAttribute('aria-live', 'polite');
  el.setAttribute('aria-atomic', 'true');

  const skip = document.querySelector('a.skip-link');
  if (skip) skip.insertAdjacentElement('afterend', el);
  else document.body.insertBefore(el, document.body.firstChild);
  host = el;

  requestAnimationFrame(() => { if (el.isConnected) el.textContent = TEXT; });
}

function unmount() {
  if (!host) return;
  host.remove();
  host = null;
}

/** מקור אמת אחד לשני הכיוונים — `sync()` נקרא גם באירועים וגם בטעינה. */
function sync() {
  if (navigator.onLine === false) mount();
  else unmount();
}

window.addEventListener('offline', sync);
window.addEventListener('online', sync);
sync();
