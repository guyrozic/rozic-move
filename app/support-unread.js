/**
 * חיווי "יש לך הודעה שלא נקראה בתמיכה" — **תאום לשני המשטחים הגלובליים
 * באפליקציה**: `src/components/SupportFAB.tsx` (כפתור צף עם badge)
 * ו-`src/components/SupportReplyBanner.tsx` (רצועה עליונה).
 *
 * ## מאיפה מגיע המספר
 * `support_tickets/{id}.unreadUser`. `sendSupportMessage` (support.js)
 * מקדם אותו כשהתפקיד הוא `admin` או `ai`, ושתי נקודות בלבד מאפסות אותו:
 * `markUserRead(ticketId)` ו-`resolveTicket(ticketId, 'user')`.
 *
 * ## ⚠️ איזו פנייה נספרת — ולמה **גם פנייה סגורה**
 * זהה ל-`subscribeToUserTicket` ב-`Hovalot/src/services/support.ts`:
 * החדשה ביותר מבין `bot|waiting|active`, **ואם אין כזו** — פנייה
 * `resolved` שנשארה בה הודעה שלא נקראה. זו כמעט תמיד הודעת הסיום של
 * הנציג, והתעלמות ממנה פירושה הודעה אחרונה שנעלמת בלי שנראתה. פניות
 * סגורות ותיקות נשמרו עם `unreadUser: 0` ולכן אינן נתפסות כאן ממילא.
 *
 * ## ⚠️ למה הכפתור הצף מוגבל לדפים מסוימים
 * `SupportFAB` באפליקציה מוצג רק ב-`['Home','DriverHome','OrdersList',
 * 'MyJobsList','ProfileMain']`, עם ההערה המפורשת שבכל מקום אחר הוא כיסה
 * תוכן או ישב על כפתורים אחרים. `SUPPORT_FAB_PAGES` הוא אותה רשימה
 * בדיוק בשפת האתר, ובאותו דפוס כמו `PILOT_BANNER_PAGES` ב-`pilot-banner.js`:
 * ההחלטה "איפה" חיה בקבוע אחד, ולא מתפזרת על פני תגי `<script>`.
 * הרצועה העליונה, לעומתו, גלובלית — כמו `SupportReplyBanner`.
 *
 * ## ⚠️ למה הקובץ הזה אינו נטען ב-`support-chat.html`
 * שם המשתמש **קורא** את ההודעה, ו-`markUserRead` רץ שם על כל עדכון. חיווי
 * "קיבלת תשובה" מעל הצ'אט שמציג אותה הוא רעש, ובאפליקציה שני המשטחים
 * מוסתרים באותו מסך מאותה סיבה (`SupportChat` אינו ב-`visibleRoutes`).
 */
import { collection, onSnapshot, query, where } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import { auth, db } from './firebase.js';

/** זהה ל-OPEN_TICKET_STATUSES ב-support.js וב-support.ts. */
const OPEN_TICKET_STATUSES = ['bot', 'waiting', 'active'];

/** מסכי הנחיתה של האתר — המקבילה ל-`visibleRoutes` ב-SupportFAB.tsx.
 *  `/app/` הוא מסך הבית של ממשק ההזמנה, ו-`account.html` הוא `ProfileMain`
 *  **וגם** `OrdersList` (באתר ההזמנות הן טאב בתוך האזור האישי). */
const SUPPORT_FAB_PAGES = ['/app/', '/app/index.html', '/app/account.html'];

/**
 * ⚠️ הנוסח באפליקציה הוא **"מחכה לך הודעה חדשה"** בתוך `PopToast` שנסגר
 * לבד אחרי 5 שניות (נבדק במקור, `SupportReplyBanner.tsx`). כאן הנוסח מלא
 * יותר והרצועה **אינה** נעלמת מעצמה, ושתי הסטיות הן אותה סיבה אחת:
 * באפליקציה הטוסט קופץ בתוך סשן חי ברגע ש-`unreadUser` **עולה**, כלומר
 * המשתמש נמצא מול המסך ורואה אותו קופץ. באתר כל ניווט הוא טעינת דף חדשה,
 * ולכן אין "עלייה" לזהות — יש רק מצב. טוסט של 5 שניות על דף שזה עתה נטען
 * הוא טוסט שמי שקורא לאט מפספס, והוא לא יחזור עד הניווט הבא.
 * לכן: מוצג כל עוד `unreadUser > 0`, ונעלם מעצמו ברגע שהוא מתאפס.
 */
const STRIP_TEXT = '💬 קיבלת תשובה ממרכז התמיכה — לחץ לצפייה';

const CHAT_HREF = 'support-chat.html';
const path = location.pathname.replace(/\/{2,}/g, '/');
const wantsFab = SUPPORT_FAB_PAGES.includes(path);

let strip = null;
let fab = null;
let unsubTicket = null;

/** מראה `subscribeToUserTicket` ב-Hovalot/src/services/support.ts, שורה מול שורה. */
function subscribeToUserTicket(userId, callback) {
  const q = query(collection(db, 'support_tickets'), where('userId', '==', userId));
  return onSnapshot(q, (snap) => {
    const tickets = snap?.docs?.map(d => ({ id: d.id, ...d.data() })) ?? [];
    const byNewest = (a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0);
    const active = tickets.filter(t => OPEN_TICKET_STATUSES.includes(t.status)).sort(byNewest)[0];
    const closedUnread = tickets
      .filter(t => t.status === 'resolved' && (t.unreadUser ?? 0) > 0)
      .sort(byNewest)[0];
    callback(active ?? closedUnread ?? null);
  }, () => callback(null));
}

/* ── הרצועה העליונה ───────────────────────────────────────────────── */

function mountStrip() {
  if (strip) return;
  /* ⚠️ `role="status"` יושב על ה-**עוטף**, לא על הקישור. role על <a>
     **דורס** את תפקיד הקישור — קורא מסך היה מכריז "סטטוס" ולא "קישור",
     כלומר החיווי היחיד שאפשר ללחוץ עליו מפסיק להישמע כמשהו שאפשר
     ללחוץ עליו. */
  const el = document.createElement('div');
  el.className = 'support-unread-strip';
  el.setAttribute('role', 'status');
  el.setAttribute('aria-live', 'polite');
  el.setAttribute('aria-atomic', 'true');

  /* ⚠️ אחרי קישור הדילוג, ואחרי באנר הניתוק אם הוא על המסך: `skip-link`
     חייב להישאר תחנת ה-Tab הראשונה (WCAG 2.4.1), ו"אין אינטרנט" הוא
     ההסבר למה שום דבר אחר בדף אינו אמין — הוא נשאר מעל. */
  const skip = document.querySelector('a.skip-link');
  const offline = document.querySelector('.offline-banner');
  const anchor = offline || skip;
  if (anchor) anchor.insertAdjacentElement('afterend', el);
  else document.body.insertBefore(el, document.body.firstChild);
  strip = el;

  /* אזור חי מוזרק ריק והתוכן נכנס פריים אחרי — ראו pilot-banner.js. */
  requestAnimationFrame(() => {
    if (!el.isConnected) return;
    const link = document.createElement('a');
    link.className = 'support-unread-strip-link';
    link.href = CHAT_HREF;
    link.textContent = STRIP_TEXT;
    el.appendChild(link);
  });
}

function unmountStrip() {
  if (!strip) return;
  strip.remove();
  strip = null;
}

/* ── הכפתור הצף ───────────────────────────────────────────────────── */

/** זהה לתקרה ב-SupportFAB.tsx: מעל 9 מוצג `9+` ולא המספר עצמו. */
const badgeText = (n) => (n > 9 ? '9+' : String(n));

/** זהה ל-accessibilityLabel ב-SupportFAB.tsx, כולל צורת היחיד. */
const fabLabel = (n) => (n > 0
  ? `פתח צ'אט תמיכה, ${n === 1 ? 'הודעה חדשה אחת' : `${n} הודעות חדשות`}`
  : "פתח צ'אט תמיכה");

function renderFab(unread) {
  if (!wantsFab) return;
  if (!fab) {
    /* ⚠️ נוסף ב**סוף** ה-body ולא ליד קישור הדילוג. הכפתור מרחף בפינה
       התחתונה, ומיקום ב-DOM בראש הדף היה נותן לו את תחנת ה-Tab השנייה
       — כלומר סדר מקלדת שמקדים את כל התוכן לכפתור שנמצא מתחתיו. */
    fab = document.createElement('a');
    fab.className = 'support-unread-fab';
    fab.href = CHAT_HREF;
    fab.innerHTML = '<span class="support-unread-fab-icon" aria-hidden="true">💬</span>'
      + '<span class="support-unread-fab-badge" aria-hidden="true"></span>';
    document.body.appendChild(fab);
  }
  /* ⚠️ ה-badge הוא `aria-hidden`: המספר כבר נמצא בשם הנגיש של הכפתור,
     ובלי ההסתרה קורא מסך היה מכריז אותו פעמיים ("3 · פתח צ'אט תמיכה,
     3 הודעות חדשות"). אותה הפרדה בדיוק כמו ב-SupportFAB.tsx. */
  const badge = fab.querySelector('.support-unread-fab-badge');
  badge.textContent = unread > 0 ? badgeText(unread) : '';
  badge.style.display = unread > 0 ? 'flex' : 'none';
  fab.setAttribute('aria-label', fabLabel(unread));
}

function removeFab() {
  if (!fab) return;
  fab.remove();
  fab = null;
}

/* ── חיווט ────────────────────────────────────────────────────────── */

function apply(ticket) {
  const unread = ticket?.unreadUser ?? 0;
  if (unread > 0) mountStrip(); else unmountStrip();
  renderFab(unread);
}

onAuthStateChanged(auth, (user) => {
  if (unsubTicket) { unsubTicket(); unsubTicket = null; }
  if (!user) {
    unmountStrip();
    removeFab();
    return;
  }
  /* הכפתור מוצג למשתמש מחובר גם בלי הודעות — עם badge ריק. זהה
     לאפליקציה: `SupportFAB` תמיד על המסך במסכי הנחיתה, וה-badge הוא
     שמותנה ב-`unread > 0`. */
  renderFab(0);
  unsubTicket = subscribeToUserTicket(user.uid, apply);
});
