/**
 * ============================================================================
 *  ai-chat-log.js — תיעוד צדדי של שיחות בורר הפריטים **באתר**
 * ============================================================================
 *
 *  פורט של `Hovalot/src/services/aiChatLogger.ts` אל האתר: JS וניל, בלי
 *  bundler, Firebase מה-CDN. כותב לאותו אוסף בדיוק — `ai_catalog_chat_logs`
 *  — ובאותה סכימה, כדי ששני הערוצים ייקראו כדאטה אחת ב-
 *  `AdminCatalogInsightsScreen` וב-`notifyAdminsOnAIInsight`.
 *
 *  ## למה זה קיים
 *  האפליקציה מתעדת כל סשן של הצ'אט: מה הלקוח כתב, מה ה-AI ענה, מה הוא
 *  בחר, ולאן הכמויות נחתו. האתר לא תיעד כלום — **וזה הערוץ של האורח ושל
 *  המשתמש בפעם הראשונה**, כלומר בדיוק מי שמשתמש באוצר מילים שהקטלוג לא
 *  מכיר. כל הפערים האלה (פריטים שלא זוהו, שאלות שחזרו, ניסוחים שנפלו)
 *  נעלמו, ומסך התובנות הציג תמונה של משתמשי האפליקציה בלבד — **כתמונה
 *  מלאה**. זו דאטה שמחליטים לפיה על הקטלוג והתמחור.
 *
 *  ## ⚠️ הדרישה הקשיחה: fire-and-forget מוחלט
 *  התיעוד לא חוסם, לא מאט, ולעולם לא מפיל את הצ'אט. חמש שכבות:
 *    1. `ai-vision.js` **משדר** (`observeItemPickerAI`) ואינו ממתין —
 *       המאזין נקרא סינכרונית, הערך המוחזר נזרק, וכל חריגה נבלעת שם.
 *    2. כל גוף מטפל כאן עטוף ב-try/catch משל עצמו.
 *    3. כל שרשרת הבטחות נסגרת ב-`.catch` — אין promise ללא טיפול.
 *    4. **מפסק (circuit breaker):** `permission-denied` אחד מכבה את
 *       המנגנון לכל שארית חיי הדף. בלי זה, אורח (שהחוקים חוסמים היום —
 *       ראו למטה) היה מייצר בקשה כושלת על כל תור צ'אט.
 *    5. שום ערך מהתיעוד לא חוזר אל הצ'אט. כשל תיעוד = הצ'אט ממשיך כרגיל.
 *
 *  ## ⚠️ חוקי הגישה — אורח חסום היום
 *  `firestore.rules` (Hovalot, סביב שורה 1216):
 *      allow create: if isAuth() && (newLog().userId == uid() || newLog().userId == null);
 *      allow update: if isAuth() && ... hasOnly(['turns','turnCount','updatedAt','finalQuantities'])
 *  `isAuth()` הוא `request.auth != null`. באתר, ספק Anonymous **כבוי**
 *  בפרויקט (ראו ההערה הארוכה ב-`ai-vision.js` סביב שורה 28), ולכן לאורח
 *  אין `request.auth` בכלל — **כל כתיבה שלו נדחית ב-permission-denied.**
 *  התנאי `userId == null` קיים אבל אינו מספיק; הוא נועד למקרה אחר.
 *
 *  ההכרעה כאן: **מנסים בכל זאת, פעם אחת, ואז נכבים.** לא שער `if
 *  (auth.currentUser)`, כי אז תיקון בחוקים לבדו לא היה מדליק כלום ומישהו
 *  היה צריך לזכור לחזור לקובץ הזה. כך, ברגע שהחוקים יתירו — זה פשוט
 *  מתחיל לעבוד, בלי שינוי קוד. עד אז משתמשים מחוברים מתועדים במלואם.
 *
 *  ## ⚠️ תמונות — בכוונה לא מועלות מהאתר
 *  האפליקציה מעלה את תמונות הסריקה ל-Storage ושומרת `photoUrls` בלוג.
 *  כאן נשמר `photoCount` בלבד, משלוש סיבות:
 *    1. **אותו חסם בדיוק.** `storage.rules` מתיר `ai_chat_logs/{sessionId}/`
 *       רק ל-`isAuth()` — כלומר האוכלוסייה שהכי חשוב לתעד (אורחים) חסומה
 *       גם שם. העלאה מהאתר הייתה עובדת רק למי שכבר מתועד באפליקציה.
 *    2. **משטח פרטיות.** `allow read: if isAuth()` על אותו נתיב = כל
 *       משתמש מחובר (כולל כל מוביל) שיודע `sessionId` קורא תמונות של
 *       דירות של אנשים. באפליקציה זה כבר התקבל כ"מזהה בלתי-ניחוש הוא רצפה
 *       סבירה"; להוסיף לשם אוכלוסייה שלמה של אורחי אתר פומבי זו הרחבת
 *       חשיפה בלי תמורה.
 *    3. **ערך ניתוחי אפסי.** התובנה שמחפשים כאן היא אוצר מילים — פריטים
 *       שהלקוח *כתב* והקטלוג לא הכיר, ושאלות שאף אפשרות לא ענתה עליהן.
 *       `AdminCatalogInsightsScreen` ו-`notifyAdminsOnAIInsight` אינם
 *       קוראים `photoUrls` בכלל. הפיקסלים אינם נכנסים לשום חישוב.
 *  `photoUrls` הוא שדה אופציונלי בסכימה (`AIChatLogTurn`), ולכן היעדרו
 *  אינו סטייה מהסכימה אלא תת-קבוצה מותרת שלה.
 *
 *  ## פרטיות
 *  לא נשמרים כאן שם, טלפון או אימייל — בדיוק כמו באפליקציה. `userId` הוא
 *  ה-UID בלבד (ו-`null` לאורח). `userText` הוא טקסט חופשי שהלקוח כתב,
 *  ולכן ⚠️ **נדרשת פסקה במדיניות הפרטיות על שמירה אצלנו לצורך שיפור
 *  הקטלוג** — הפסקה הקיימת מדברת על שליחה ל-Google Gemini בלבד, וסעיף 7
 *  (שמירה ומחיקה) קשור לחשבון, בזמן שהלוג הזה חי בלי חשבון. דווח לגיא.
 */
import { doc, setDoc, serverTimestamp, arrayUnion, increment }
  from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';
import { db, auth } from './firebase.js';
import { observeItemPickerAI } from './ai-vision.js';

const COLLECTION = 'ai_catalog_chat_logs';

/**
 * הזרימה נגזרת מהנתיב ולא מפרמטר, כי לדפים מותר להוסיף **שורת ייבוא
 * אחת בלבד** ואין להם דרך להעביר ארגומנט. הערכים זהים מילה-במילה למה
 * ש-`AIRoomScanScreen`/`SmallMoveItemsScreen` מעבירים ל-
 * `startAIChatLogSession`, כדי ששני הערוצים ייפלו לאותן קטגוריות.
 *
 * דף שאינו אחד משניים אלה מקבל `null` — והמודול נשאר רדום לגמרי. זו רשת
 * ביטחון למקרה שהייבוא יתווסף בטעות לדף אחר שמשתמש ב-`ai-vision.js`
 * (תמיכה, מרקטפלייס) ושאין לו שיחת בורר פריטים בכלל.
 */
function detectFlow() {
  const path = location.pathname;
  if (path.endsWith('/apartment.html')) {
    return { flow: 'apartment_room_scan', contextLabel: 'apartment_all_rooms' };
  }
  if (path.endsWith('/small-move.html')) {
    return { flow: 'small_move_items', contextLabel: 'פריטים למובילים בקטנה' };
  }
  return null;
}

const FLOW = detectFlow();

/* ═══════════════════ מצב פנימי ═══════════════════════════════════════ */

let disabled = false;          // המפסק — ראו סעיף 4 בראש הקובץ
let sessionId = null;          // נוצר בעצלתיים, בתור האמיתי הראשון
let seq = 0;
let queue = Promise.resolve(); // תור סדרתי לכל הכתיבות של הסשן
let lastFinalJson = null;      // מניעת כתיבה חוזרת של אותן כמויות
let finalTimer = null;

/** שאלות שה-AI החזיר, לפי מזהה — כדי לשחזר `selectedItemKey` בלחיצה. */
const knownQuestions = new Map();

/**
 * מכבה לצמיתות (לדף הזה) ומסביר פעם אחת. `permission-denied` אינו תקלה
 * אקראית אלא מצב קבוע — החוקים לא ישתנו באמצע הדף — ולכן ניסיון חוזר הוא
 * רק רעש רשת.
 */
function shutDown(reason) {
  if (disabled) return;
  disabled = true;
  console.warn('[ai-chat-log] תיעוד הצ\'אט כבוי לשארית הדף:', reason);
}

function warn(label, err) {
  const code = err && (err.code || err.message);
  if (code === 'permission-denied' || String(code).includes('permission-denied')) {
    shutDown('אין הרשאת כתיבה ל-' + COLLECTION + ' (אורח לא מזוהה? ראו ההערה בראש הקובץ)');
    return;
  }
  console.warn('[ai-chat-log] ' + label, code || err);
}

/**
 * תור סדרתי לכל הכתיבות של הסשן — העתק של `enqueue` ב-`aiChatLogger.ts`,
 * ומאותה סיבה בדיוק: `arrayUnion` על מסמך שטרם נוצר, או שתי כתיבות
 * שמתחרות על אותו מסמך, מאבדות תורים בלי שום עקבות. `.then(task, task)`
 * מריץ את הבא גם אחרי כישלון של הקודם — כישלון של תור אחד לא קובר את כל
 * מה שיבוא אחריו.
 */
function enqueue(task) {
  const run = queue.then(task, task);
  queue = run.catch(() => {});
  return queue;
}

/**
 * Firestore דוחה **כל** שדה שערכו `undefined` במפורש, ונפילה כזו מפילה את
 * הכתיבה **כולה** ולא רק את השדה. זה בדיוק הבאג שגרם לתורי `photo_scan`
 * להיעלם באפליקציה בלי זכר (ראו ההערה ב-`logAIChatPhotoScanTurn`). כאן
 * מנקים אחת ולתמיד במקום לזכור בכל אתר קריאה.
 */
function compact(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out;
}

/** `{id, text, options:[{label, itemKey}]}` — בדיוק המיפוי שהאפליקציה שומרת. */
function mapQuestions(questions) {
  return (questions || []).map(q => ({
    id: q.id,
    text: q.text,
    options: (q.options || []).map(o => ({ label: o.label, itemKey: o.itemKey ?? null })),
  }));
}

/* ═══════════════════ כתיבות ═══════════════════════════════════════════ */

/**
 * ⚠️ **הסשן נפתח בעצלתיים — בתור האמיתי הראשון, לא בטעינת הדף.**
 * באפליקציה `startAIChatLogSession` רץ ב-`useEffect` של מסך שכל תכליתו
 * היא בורר הפריטים, ולכן "ביקור במסך" = "סשן". באתר `apartment.html` הוא
 * **אשף ההזמנה כולו** — כל מי שפותח טופס הזמנה, גם מי שלא נגע ב-AI, היה
 * מייצר מסמך ריק. פתיחה עצלה שומרת על האוסף כדאטה של שיחות אמיתיות
 * במקום דאטה של צפיות בדף, ו-`createdAt` עדיין נכתב לכל סשן (עליו יושב
 * ה-`orderBy` של `subscribeToAllAIChatLogs` — בלעדיו הסשן לא נראה כלל).
 */
function ensureSession() {
  if (sessionId) return sessionId;
  sessionId = `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const userId = auth.currentUser ? auth.currentUser.uid : null;
  enqueue(() => setDoc(doc(db, COLLECTION, sessionId), {
    sessionId,
    flow: FLOW.flow,
    contextLabel: FLOW.contextLabel,
    // באתר אין מזהה טיוטה ב-Firestore — הטיוטה היא מקומית (localStorage,
    // ראו guest-checkout.js). `null` מפורש ולא `undefined`: ראו compact().
    draftOrderId: null,
    userId,
    /**
     * ⚠️ שדה שאינו קיים בסכימת האפליקציה, ובכוונה. בלעדיו מסך התובנות
     * מציג שני ערוצים שונים מאוד (אפליקציה = משתמש רשום; אתר = בעיקר
     * אורח בפעם הראשונה) כערוץ אחד, ואי אפשר לשאול "האם הפער בקטלוג
     * הוא של האתר או של האפליקציה". השדה נסבל ע"י כל הצרכנים: הטריגר
     * קורא `turns`/`contextLabel` בלבד, מסך התובנות קורא `turns`,
     * ו-`firestore.rules` אינו מגביל שדות ב-`create`.
     */
    source: 'web',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    turnCount: 0,
    finalQuantities: null,
  }).catch(err => warn('פתיחת סשן נכשלה', err)));
  // הכמויות שכבר נבחרו ידנית לפני שה-AI נכנס לתמונה הן חלק מ"לאן הכמויות
  // נחתו" לא פחות ממה שנוסף אחריו.
  scheduleFinalQuantities();
  return sessionId;
}

function logTurn(turn) {
  if (disabled || !FLOW) return;
  try {
    const id = ensureSession();
    const fullTurn = compact({ ...turn, seq: ++seq, at: new Date() });
    enqueue(() => setDoc(doc(db, COLLECTION, id), {
      turns: arrayUnion(fullTurn),
      updatedAt: serverTimestamp(),
      turnCount: increment(1),
    }, { merge: true }).catch(err => warn('כתיבת תור נכשלה', err)));
  } catch (err) {
    warn('logTurn נכשל לפני הכתיבה', err);
  }
}

/* ═══════════════════ 1. סריקה, צ'אט ושגיאות — מ-ai-vision.js ═════════ */

/**
 * `ai-vision.js` משדר אירוע בכל קריאת AI של בורר הפריטים. **לא נגענו
 * בלוגיקת הצ'אט ולא בפרומפטים** — המשדר הוא תוספת בלבד, והמאזין כאן הוא
 * סינכרוני וחסין: הוא לא מחזיר הבטחה שמישהו ממתין לה.
 */
if (FLOW) {
  observeItemPickerAI(event => {
    if (disabled) return;
    try {
      if (event.kind === 'photo_scan') {
        (event.aiQuestions || []).forEach(q => knownQuestions.set(q.id, q));
        logTurn({
          kind: 'photo_scan',
          contextLabel: event.contextLabel,
          photoCount: event.photoCount,
          // ⚠️ בלי photoUrls — ראו "תמונות" בראש הקובץ.
          aiItems: event.aiItems,
          aiQuestions: mapQuestions(event.aiQuestions),
        });
      } else if (event.kind === 'user_message') {
        (event.aiQuestions || []).forEach(q => knownQuestions.set(q.id, q));
        logTurn({
          kind: 'user_message',
          contextLabel: event.contextLabel,
          userText: event.userText,
          aiReplyText: event.aiReplyText,
          aiItems: event.aiItems,
          // ⚠️ זה האות היחיד שהטריגר בשרת באמת מגיב עליו היום
          // (`free_item` ב-notifyAdminsOnAIInsight) — הצורה חייבת להישאר
          // `{label, qty, action}` בדיוק.
          aiFreeItems: event.aiFreeItems,
          aiQuestions: mapQuestions(event.aiQuestions),
        });
      } else if (event.kind === 'error') {
        logTurn({
          kind: 'error',
          contextLabel: event.contextLabel,
          userText: event.userText,
          errorMessage: event.errorMessage,
        });
      }
    } catch (err) {
      warn('טיפול באירוע AI נכשל', err);
    }
  });
}

/* ═══════════════════ 2. תשובות לשאלות הבהרה — מה-DOM ════════════════ */

/**
 * `question_answered` נולד **בדף** (`answerQuestion`) ולא ב-`ai-vision.js`,
 * ולדפים מותרת שורת ייבוא אחת בלבד — ולכן האזנה מואצלת מ-`document`.
 *
 * ⚠️ **שלב ה-capture, לא ה-bubble.** המטפל של הדף מסיר את השאלה ומרנדר
 * מחדש את האזור; ב-bubble הכרטיס כבר לא קיים ואי אפשר לקרוא ממנו את
 * נוסח השאלה. capture רץ לפניו, ולכן ה-DOM עדיין שלם.
 *
 * ⚠️ הנוסח והתווית נקראים מה-DOM ולא מהמצב הפנימי, כי חלק מהשאלות נולדות
 * **בדף עצמו** ולא ב-AI (שאלת המשך על גודל, `id: size-…`) ואינן מוכרות
 * כאן. `selectedItemKey` נשלף מהשאלות שכן הגיעו מה-AI, ומושמט כשאינו ידוע
 * (שדה אופציונלי בסכימה) — עדיף חסר על פני `null` שקרי.
 *
 * ⚠️ האות שהטריגר וגם מסך התובנות מחפשים הוא `selectedLabel` שווה בדיוק
 * ל-"אחר — כתוב בצ'אט". `textContent` מחזיר בדיוק את מה שהוצג, כלומר את
 * אותה מחרוזת שה-AI ייצר — בלי נירמול ובלי חיתוך.
 */
if (FLOW) {
  document.addEventListener('click', ev => {
    if (disabled) return;
    try {
      const target = ev.target;
      const btn = target && target.closest ? target.closest('.question-option') : null;
      if (!btn) return;
      const card = btn.closest('.question-card');
      const questionText = card ? (card.querySelector('.question-text') || {}).textContent : null;
      if (!questionText) return;
      const known = knownQuestions.get(btn.dataset.qid);
      const option = known ? (known.options || [])[Number(btn.dataset.oi)] : null;
      logTurn({
        kind: 'question_answered',
        contextLabel: FLOW.contextLabel,
        questionText: questionText.trim(),
        selectedLabel: (btn.textContent || '').trim(),
        selectedItemKey: option ? (option.itemKey ?? null) : undefined,
      });
    } catch (err) {
      warn('תיעוד תשובה לשאלה נכשל', err);
    }
  }, true);
}

/* ═══════════════════ 3. לאן הכמויות נחתו ═════════════════════════════ */

/**
 * `finalQuantities` — הרשימה "הפריטים שנבחרו" היא ההשלכה המלאה של
 * `state.items` (כל החדרים, לא רק הפעיל), ולכן קריאה ממנה שקולה לקריאת
 * המצב עצמו. שוב: הדף אינו יכול לדחוף לנו את זה בשורה אחת.
 *
 * ⚠️ `[data-key]` בלבד — שורות הפריטים המיוחדים נושאות `data-free-i` ואין
 * להן מפתח קטלוג, בדיוק כמו `Record<string, number>` באפליקציה.
 *
 * השהיה במקום כתיבה על כל שינוי: באפליקציה זה `useEffect` על `quantities`,
 * כלומר כתיבה לכל לחיצת +/-. כאן זה חלון של 1.5 שניות ודילוג כשהתוצאה
 * זהה לקודמת — אותו נתון סופי, בלי להעמיס עשרות כתיבות על מסמך אחד
 * שממילא חסום ב-1MiB.
 */
function readQuantities() {
  const list = document.getElementById('selected-items-list');
  if (!list) return null;
  const out = {};
  list.querySelectorAll('.selected-item-row[data-key]').forEach(row => {
    const qtyEl = row.querySelector('.qty-value');
    const qty = Number((qtyEl && qtyEl.textContent || '').trim());
    if (row.dataset.key && Number.isFinite(qty) && qty > 0) out[row.dataset.key] = qty;
  });
  return out;
}

function flushFinalQuantities() {
  if (disabled || !sessionId) return;
  try {
    const quantities = readQuantities();
    if (!quantities) return;
    const json = JSON.stringify(quantities);
    if (json === lastFinalJson) return;
    lastFinalJson = json;
    enqueue(() => setDoc(doc(db, COLLECTION, sessionId), {
      finalQuantities: quantities,
      updatedAt: serverTimestamp(),
    }, { merge: true }).catch(err => warn('כתיבת הכמויות הסופיות נכשלה', err)));
  } catch (err) {
    warn('קריאת הכמויות נכשלה', err);
  }
}

function scheduleFinalQuantities() {
  if (disabled) return;
  if (finalTimer) clearTimeout(finalTimer);
  finalTimer = setTimeout(flushFinalQuantities, 1500);
}

if (FLOW) {
  const attachQuantityObserver = () => {
    try {
      const list = document.getElementById('selected-items-list');
      if (!list) return;
      new MutationObserver(() => { if (sessionId) scheduleFinalQuantities(); })
        .observe(list, { childList: true, subtree: true, characterData: true });
    } catch (err) {
      warn('חיבור מעקב הכמויות נכשל', err);
    }
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attachQuantityObserver, { once: true });
  } else {
    attachQuantityObserver();
  }

  // ניסיון אחרון לפני עזיבה — הכתיבה אולי לא תספיק לצאת, ולכן זו רשת
  // ולא המנגנון: ההשהיה למעלה כבר כתבה את המצב אחרי 1.5 שניות של שקט.
  window.addEventListener('pagehide', () => {
    if (finalTimer) clearTimeout(finalTimer);
    flushFinalQuantities();
  });
}
