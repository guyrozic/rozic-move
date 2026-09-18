/* ══════════════════════════════════════════════════════════════════════
   כפתור תמיכה צף — הדפים הפומביים
   ══════════════════════════════════════════════════════════════════════

   גיא (18.9): *"אין לנו כפתור לתמיכה או לתמיכה בוואטסאפ — חייב להוסיף
   את זה באתר... ליצור את הקישוריות למשתמשים שמעוניינים להתחבר ולהירשם
   — תמיכה שלנו — ולכאלה שלא, פשוט תמיכת וואטסאפ רגילה."*

   ## שני מסלולים, ובכוונה
   מבקר בעמוד הבית אינו מחובר, ורובו המכריע לא ייצור חשבון כדי לשאול
   שאלה אחת. לכן **וואטסאפ הוא האפשרות הראשונה** — בלי חשבון, בלי
   טופס, ובאפליקציה שכבר פתוחה אצלו. צ'אט התמיכה שלנו הוא האפשרות
   השנייה, והוא מסומן במפורש כדורש התחברות כדי שאיש לא ילחץ ויופתע.

   ## למה לא לבדוק אם המשתמש מחובר
   בדיקה כזאת הייתה גוררת את Firebase Auth לכל דף פומבי — כולל התקנון
   והפרטיות, שאינם טוענים אותו כלל — בשביל להחליף סדר של שתי שורות.
   הקישור אל `app/support-chat.html` מגיע ממילא ל-`requireAuth()`, שכבר
   מוסיף `?next=` ומחזיר את המשתמש בדיוק לצ'אט אחרי ההתחברות.

   ## ⚠️ לא נטען בדפי `app/`
   שם כבר רץ `support-unread.js` עם כפתור צף משלו, שמציג גם מונה הודעות
   שלא נקראו. שני כפתורים צפים באותה פינה הם באג ולא פיצ'ר.

   ## נגישות
   `aria-expanded` + `aria-controls` על הכפתור, Escape סוגר ומחזיר את
   המיקוד, לחיצה מחוץ לחלונית סוגרת, ו-Tab אינו בורח מהחלונית כשהיא
   פתוחה. המיקוד נכנס לאפשרות הראשונה בפתיחה — מי שפתח בעזרת מקלדת
   רוצה להיות שם, לא לחפש.
   ══════════════════════════════════════════════════════════════════════ */

/** אותו מספר שההצהרה כבר מפרסמת כזמין בוואטסאפ (`accessibility.html`),
 *  ובפורמט הבין-לאומי של `ACCESSIBILITY_PHONE_E164` באפליקציה. */
const WA_E164 = '972508811085';
const WA_TEXT = 'היי, הגעתי מהאתר של ROZIC MOVE ויש לי שאלה';

/** ⚠️ דפי `app/` מוחרגים — שם יש כפתור צף אחר. */
if (!location.pathname.includes('/app/')) {
  const css = document.createElement('style');
  css.textContent = `
    /* ⚠️ 18.9 — הוגדל לבקשת גיא: "הכפתור קטן מדי ולא שמים אליו לב —
       צריך לשקול שינוי מיקום או הגדלה או גם וגם."
       52→64px גובה, הכיתוב 0.95→1.1rem, והצל עמוק יותר כדי שיתנתק
       מהרקע. **המיקום נשאר בפינה התחתונה-שמאלית** — באתר RTL זו
       הפינה המקבילה לימין-תחתון בלטינית, כלומר המקום שבו גולשים
       מצפים למצוא צ'אט תמיכה. שינוי מיקום היה פותר את הבלטות במחיר
       של להפתיע את מי שכבר יודע איפה לחפש. */
    .sfab-btn {
      position: fixed; bottom: 26px; left: 20px; z-index: 50;
      display: inline-flex; align-items: center; gap: 10px;
      height: 64px; padding: 0 26px; border-radius: 32px;
      background: var(--green, #0E5C43); color: #fff;
      border: none; cursor: pointer;
      font-family: inherit; font-size: 1.1rem; font-weight: 800;
      letter-spacing: .2px;
      box-shadow: 0 10px 30px rgba(0,0,0,.26), 0 2px 6px rgba(0,0,0,.14);
      transition: transform .2s ease, box-shadow .2s ease;
    }
    .sfab-btn:hover { transform: translateY(-3px); box-shadow: 0 16px 38px rgba(0,0,0,.32), 0 3px 8px rgba(0,0,0,.16); }

    /* ⚠️ פעימה **אחת** אחרי שנייה וחצי, ולא לולאה. המטרה היא שהעין
       תתפוס אותו פעם אחת; אנימציה מתמשכת בפינת המסך היא הסחה ולא
       גילוי. ההעדפה prefers-reduced-motion מבטלת אותה לגמרי. */
    @keyframes sfabNotice {
      0%, 100% { transform: scale(1); }
      35%      { transform: scale(1.07); }
      70%      { transform: scale(0.98); }
    }
    .sfab-btn.sfab-notice { animation: sfabNotice .85s ease both; }
    .sfab-btn:focus-visible { outline: 3px solid var(--green-bright, #16A34A); outline-offset: 3px; }
    .sfab-panel {
      position: fixed; bottom: 100px; left: 20px; z-index: 51;
      width: min(304px, calc(100vw - 32px));
      background: #fff; border: 1px solid var(--border, #E3E8E6);
      border-radius: 16px; box-shadow: 0 18px 44px rgba(0,0,0,.2);
      padding: 14px; text-align: right;
    }
    .sfab-panel[hidden] { display: none; }
    .sfab-title { margin: 2px 4px 12px; font-size: .95rem; font-weight: 800; color: var(--text, #14211D); }
    .sfab-opt {
      display: flex; align-items: flex-start; gap: 11px;
      padding: 11px 12px; border-radius: 12px;
      text-decoration: none; color: inherit;
      border: 1px solid var(--border, #E3E8E6);
    }
    .sfab-opt + .sfab-opt { margin-top: 8px; }
    .sfab-opt:hover { background: var(--green-tint, #F1F8F5); }
    .sfab-opt:focus-visible { outline: 3px solid var(--green, #0E5C43); outline-offset: 2px; }
    .sfab-ico { flex: none; width: 34px; height: 34px; border-radius: 10px;
      display: inline-flex; align-items: center; justify-content: center;
      background: var(--green-tint, #F1F8F5); }
    .sfab-opt b { display: block; font-size: .93rem; font-weight: 800; color: var(--text, #14211D); }
    .sfab-opt span { display: block; margin-top: 2px; font-size: .8rem; line-height: 1.5; color: var(--text-muted, #5C6B66); }
    @media (prefers-reduced-motion: reduce) {
      .sfab-btn { transition: none; }
      .sfab-btn:hover { transform: none; }
    }
  `;
  document.head.appendChild(css);

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'sfab-btn';
  btn.setAttribute('aria-expanded', 'false');
  btn.setAttribute('aria-controls', 'sfab-panel');
  btn.innerHTML =
    '<svg width="23" height="23" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
    '<path d="M21 11.5a8.4 8.4 0 0 1-9 8.4L3 21l1.1-3.3A8.4 8.4 0 1 1 21 11.5z" ' +
    'stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/></svg>' +
    '<span>תמיכה</span>';

  const panel = document.createElement('div');
  panel.className = 'sfab-panel';
  panel.id = 'sfab-panel';
  panel.hidden = true;
  panel.innerHTML =
    '<p class="sfab-title">איך נוח לך לדבר איתנו?</p>' +

    '<a class="sfab-opt" href="https://wa.me/' + WA_E164 +
    '?text=' + encodeURIComponent(WA_TEXT) + '" target="_blank" rel="noopener">' +
      '<span class="sfab-ico" aria-hidden="true">' +
      '<svg width="19" height="19" viewBox="0 0 24 24" fill="none">' +
      '<path d="M21 11.5a8.4 8.4 0 0 1-9 8.4L3 21l1.1-3.3A8.4 8.4 0 1 1 21 11.5z" ' +
      'stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg></span>' +
      '<span><b>וואטסאפ</b><span>בלי חשבון ובלי טופס &mdash; נפתח ישר בשיחה</span></span>' +
    '</a>' +

    '<a class="sfab-opt" href="app/support-chat.html">' +
      '<span class="sfab-ico" aria-hidden="true">' +
      '<svg width="19" height="19" viewBox="0 0 24 24" fill="none">' +
      '<path d="M4 5h16v11H8l-4 4V5z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg></span>' +
      '<span><b>צ&#39;אט התמיכה שלנו</b><span>ההתכתבות נשמרת מול ההזמנות שלך &mdash; נדרשת התחברות</span></span>' +
    '</a>';

  /* ⚠️ הקישור אל הצ'אט יחסי (`app/support-chat.html`), ולכן הוא נשבר
     בכל דף שאינו בשורש. כל הדפים הפומביים יושבים בשורש, אבל אם יתווסף
     דף בתת-תיקייה — זה המקום שיצטרך נתיב מוחלט. */

  function close(back) {
    if (panel.hidden) return;
    panel.hidden = true;
    btn.setAttribute('aria-expanded', 'false');
    if (back) btn.focus();
  }
  function open() {
    panel.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
    panel.querySelector('.sfab-opt').focus();
  }

  btn.addEventListener('click', () => (panel.hidden ? open() : close(true)));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(true); });
  document.addEventListener('click', (e) => {
    if (panel.hidden) return;
    if (!panel.contains(e.target) && !btn.contains(e.target)) close(false);
  });
  /* Tab מהאפשרות האחרונה חוזר לכפתור ולא בורח אל הדף שמאחור. */
  panel.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    const items = panel.querySelectorAll('.sfab-opt');
    const last = items[items.length - 1];
    if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); btn.focus(); }
    if (e.shiftKey && document.activeElement === items[0]) { e.preventDefault(); btn.focus(); }
  });

  document.body.appendChild(btn);
  document.body.appendChild(panel);

  /* ⚠️ נבדק מול ההעדפה **וגם** מקוצר-דרך: מי שכבר פתח את התמיכה פעם
     אחת אינו צריך שיסבו את תשומת ליבו שוב. */
  try {
    const seen = localStorage.getItem('rm-sfab-seen');
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!seen && !calm) {
      setTimeout(() => {
        btn.classList.add('sfab-notice');
        btn.addEventListener('animationend', () => btn.classList.remove('sfab-notice'), { once: true });
      }, 1500);
    }
  } catch {}
  btn.addEventListener('click', () => { try { localStorage.setItem('rm-sfab-seen', '1'); } catch {} }, { once: true });
}
