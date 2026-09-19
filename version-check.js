/**
 * "יש גרסה חדשה — רענן" — הודעה שמופיעה מעצמה כשהדף שפתוח מיושן.
 *
 * ## למה זה קיים
 * ⚠️ **זו הפעם השנייה שהבעיה הזאת אוכלת סבבים שלמים.** ב-15.9 נוספה
 * חותמת הבנייה הגלויה (`data-build-stamp` ב-`stamp-assets.mjs`) בדיוק
 * מהסיבה הזאת, וההערה שם אומרת "בזבזנו על זה סבבים שלמים". ב-20.9 זה
 * חזר: שלוש פריסות רצופות נבדקו מול משוב שהתייחס לגרסה ישנה, כי הטאב
 * היה פתוח מ-02:28 ולא נטען מחדש.
 *
 * **חותמת היא פסיבית.** היא אומרת לך מה אתה רואה רק אם חשבת לבדוק.
 * `Cache-Control: max-age=600` של GitHub Pages פג אחרי עשר דקות, אבל
 * דף **שכבר טעון** לא מושך את עצמו שוב לעולם — הוא יכול להישאר פתוח
 * שעות ולהציג בנאמנות גרסה שכבר לא קיימת. זה לא באג בדפדפן וזה לא
 * ייפתר בכך שנזכיר למישהו לרענן.
 *
 * ## למה זה לא רק בשבילנו
 * האתר הוא זרימת הזמנה חיה בלי שלב build ובלי סביבת ביניים — כל דחיפה
 * ל-`main` עולה לאוויר. לקוח שמשאיר את הטופס פתוח בזמן שנפרס תיקון
 * תמחור ממשיך למלא אותו על הקוד הישן. ההודעה הזאת היא מה שסוגר את
 * הפער הזה, ולא רק את זה שבינינו.
 *
 * ## ⚠️ אפס `import`
 * בדיוק מאותה סיבה כמו ב-`offline-banner.js`: דף שנטען כשהרשת גרועה
 * לא ימשוך את ה-SDK של Firebase, וכל מודול שתלוי בו מת בשקט. הקובץ
 * הזה חייב לרוץ גם שם.
 *
 * ## ⚠️ לא מרענן לבד
 * הריענון הוא לחיצה, לעולם לא אוטומטי. רענון יזום באמצע מילוי טופס
 * מוחק ללקוח את מה שהקליד — כלומר "תיקון" שגורם בדיוק לנזק שהוא בא
 * למנוע. ההודעה מסבירה ונותנת כפתור; ההחלטה שלו.
 *
 * ⚠️ נמחק יחד עם חותמת הבנייה לפני השקה לציבור — שניהם מוזרקים
 * מ-`stamp-assets.mjs` ומחפשים באותו `data-build-stamp`.
 */

(() => {
  const el = document.querySelector('[data-build-stamp]');
  if (!el) return;

  // החותמת בדף: "עודכן 20.09 · 02:37" → משווים את החלק שאחרי "עודכן".
  const mine = el.textContent.replace('עודכן', '').trim();
  if (!mine) return;

  let shown = false;

  async function check() {
    if (shown || document.hidden) return;
    try {
      // ⚠️ `no-store` מדלג על מטמון הדפדפן, והפרמטר מדלג על מטמון ה-CDN
      // של GitHub Pages (`max-age=600` חל גם על הקובץ הזה). בלי שניהם
      // הבדיקה עצמה יכולה להחזיר תשובה ישנה — כלומר לשקר בדיוק על מה
      // שהיא באה לבדוק.
      const res = await fetch(`/version.txt?t=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) return;
      const live = (await res.text()).trim();
      if (!live || live === mine) return;
      show(live);
    } catch {
      // אין רשת, או שהקובץ לא נפרס עדיין. שקט מכוון: `offline-banner`
      // הוא זה שמדבר על ניתוקים, ושתי הודעות על אותו דבר הן רעש.
    }
  }

  function show(live) {
    if (shown) return;
    shown = true;

    const bar = document.createElement('div');
    bar.className = 'version-bar';
    bar.setAttribute('role', 'status');

    const text = document.createElement('span');
    text.textContent = `עודכנה גרסה חדשה של האתר (${live}). מה שמוצג כאן הוא מ-${mine}.`;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'version-bar-btn';
    btn.textContent = 'רענן';
    btn.addEventListener('click', () => location.reload());

    bar.append(text, btn);

    // ⚠️ **אחרי** קישור הדילוג, לא לפניו. `a.skip-link` חייב להישאר
    // האלמנט הראשון בסדר ה-Tab (WCAG 2.4.1) — אותו כלל בדיוק כמו
    // ב-`offline-banner.js` וב-`pilot-banner.js`.
    const skip = document.querySelector('a.skip-link');
    if (skip && skip.parentNode) skip.insertAdjacentElement('afterend', bar);
    else document.body.prepend(bar);
  }

  // בטעינה, בכל חזרה לטאב, ואחת לחמש דקות. החזרה לטאב היא המקרה
  // שבו זה באמת קורה: משאירים דף פתוח, הולכים, וחוזרים.
  check();
  document.addEventListener('visibilitychange', () => { if (!document.hidden) check(); });
  setInterval(check, 5 * 60 * 1000);
})();
