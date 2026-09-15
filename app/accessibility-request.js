/**
 * טופס הבקשה למידע בדרך נגישה (תקנה 29(ד)) — הצד של האתר.
 *
 * ## מה זה סוגר
 * הצהרת הנגישות מפרסמת התחייבות עם מועדים: "קובץ קול — לא יאוחר משלושה
 * שבועות מהבקשה". עד היום לא היה שום מנגנון שמקיים אותה — לא טופס, לא
 * רשומה, לא התראה, ולא מי שסופר את שלושת השבועות. ⚠️ **פער בין ההצהרה
 * למציאות הוא בדיוק העילה שההצהרה נועדה למנוע.**
 *
 * ## ⚠️ שלושה כללים שאסור לשבור בקובץ הזה
 *
 * 1. **הטופס אינו הדרך היחידה, והוא לא מתיימר להיות.** ההצהרה כותבת
 *    ש"בקשה מתקבלת בכל אחת מדרכי הפנייה". שלושת הקישורים — טלפון,
 *    וואטסאפ, דואר אלקטרוני — יושבים ב-HTML הסטטי **תמיד**, גם כשהכול
 *    עובד; ה-JS רק ממלא בהם את נוסח הבקשה. כך גם מי שכיבה JavaScript,
 *    וגם מי שהטופס עצמו אינו נוח לו, מקבל מסלול מלא.
 * 2. **אין מבוי סתום.** כששליחה נכשלת — או כל עוד `submitAccessibilityRequest`
 *    לא נפרסה — הדף **אינו** מציג שגיאה טכנית אלא מפנה לאותה בקשה בדיוק
 *    בוואטסאפ או בדואר. הבקשה מגיעה ליעד בכל מצב.
 * 3. **ההודעה מוכרזת לקורא מסך.** תיבת התשובה היא `role="status"` —
 *    בלעדיה מי שמשתמש בקורא מסך לוחץ "שליחה", שום דבר לא נאמר לו, והוא
 *    לוחץ שוב.
 *
 * ⚠️ **הרשימות כאן חייבות להסכים עם `Hovalot/src/constants/accessibility.ts`
 * ועם `Hovalot/functions/src/accessibilityFormats.ts`.** שלושת העותקים
 * נאכפים ע"י `npx tsx scripts/check-accessibility-formats-sync.ts` מ-Hovalot,
 * שמשווה מפתחות ו-`slaDays` ונופל על כל פער. הסיבה לשלושה עותקים היא
 * טכנית בלבד: `functions` הוא פרויקט TS נפרד עם `rootDir: "src"`, והאתר
 * הוא JS של דפדפן בלי bundler.
 */

const SUBMIT_URL = 'https://us-central1-hovalot-6cf65.cloudfunctions.net/submitAccessibilityRequest';

const SUPPORT_EMAIL = 'support@rozicmove.com';
const PHONE_E164 = '+972508811085';

/** ⚠️ `slaDays` הוא המועד **הסטטוטורי**, לא הערכת עבודה. ראו את ההסבר בקובץ האפליקציה. */
const ACCESSIBILITY_FORMATS = [
  { key: 'digital_text',  label: 'קובץ טקסט להקראה',      slaDays: 21 },
  { key: 'audio',         label: 'קובץ קול',               slaDays: 21 },
  { key: 'large_print',   label: 'דפוס נגיש',              slaDays: 21 },
  { key: 'human_reading', label: 'הקראה בקול על ידי אדם',  slaDays: 7  },
  { key: 'braille',       label: 'כתב ברייל',              slaDays: 21 },
  { key: 'other',         label: 'התאמה אחרת',             slaDays: 21 },
];

const ACCESSIBILITY_DOCS = [
  { key: 'terms',         label: 'תנאי השימוש (התקנון)' },
  { key: 'privacy',       label: 'מדיניות הפרטיות' },
  { key: 'accessibility', label: 'הצהרת הנגישות' },
  { key: 'order',         label: 'פרטי הזמנה או אישור הזמנה' },
  { key: 'other',         label: 'מידע אחר על השירות' },
];

const ACCESSIBILITY_CONTACT_METHODS = [
  { key: 'phone',    label: 'שיחת טלפון' },
  { key: 'whatsapp', label: 'וואטסאפ' },
  { key: 'sms',      label: 'מסרון (SMS)' },
  { key: 'email',    label: 'דואר אלקטרוני' },
  { key: 'post',     label: 'דואר' },
];

const labelOf = (list, key) => (list.find((x) => x.key === key) || {}).label || key;

/**
 * המועד הסטטוטורי של בקשה שכוללת כמה התאמות — **המוקדם מביניהם**.
 * ⚠️ לא המאוחר: מי שביקש הקראה בקול (7) וגם ברייל (21) זכאי לשמוע את
 * המסמך תוך שבוע, ובקשה בת שבועיים כבר הפרה את ההבטחה.
 */
function dueDaysOf(keys) {
  const days = keys.map((k) => (ACCESSIBILITY_FORMATS.find((f) => f.key === k) || {}).slaDays).filter((d) => typeof d === 'number');
  return days.length ? Math.min.apply(null, days) : 21;
}

const form = document.getElementById('a11y-request-form');
if (form) {
  const statusBox = document.getElementById('a11y-request-status');
  const waLink = document.getElementById('a11y-request-whatsapp');
  const mailLink = document.getElementById('a11y-request-mail');
  const submitBtn = document.getElementById('a11y-request-submit');
  const docOtherWrap = document.getElementById('a11y-doc-other-wrap');

  const read = () => {
    const data = new FormData(form);
    return {
      formats: data.getAll('format').map(String),
      doc: String(data.get('doc') || 'terms'),
      docOther: String(data.get('docOther') || '').trim(),
      contactName: String(data.get('contactName') || '').trim(),
      contactMethod: String(data.get('contactMethod') || 'phone'),
      contactDetail: String(data.get('contactDetail') || '').trim(),
      notes: String(data.get('notes') || '').trim(),
    };
  };

  /** ⚠️ זהה בתוכנו למה שנשלח לפונקציה — כדי שגיא יקבל את אותו מידע בכל מסלול. */
  const compose = (v) => {
    const docLabel = v.doc === 'other' && v.docOther ? v.docOther : labelOf(ACCESSIBILITY_DOCS, v.doc);
    const lines = [
      'בקשה לקבלת מידע בדרך נגישה (תקנה 29(ד)).',
      '',
      'ההתאמה המבוקשת: ' + (v.formats.map((f) => labelOf(ACCESSIBILITY_FORMATS, f)).join(', ') || '(טרם נבחרה)'),
      'המסמך או המידע: ' + docLabel,
      'דרך החזרה אליי: ' + labelOf(ACCESSIBILITY_CONTACT_METHODS, v.contactMethod) + ' — ' + (v.contactDetail || '(טרם נמסרה)'),
    ];
    if (v.contactName) lines.push('שם: ' + v.contactName);
    if (v.notes) lines.push('', 'פרטים נוספים: ' + v.notes);
    lines.push('', 'המועד הסטטוטורי למענה: ' + dueDaysOf(v.formats) + ' ימים מהבקשה.');
    return lines.join('\n');
  };

  /** הקישורים הסטטיים מתעדכנים בכל הקלדה, כדי שהם תמיד יישאו את הבקשה הנוכחית. */
  const refreshLinks = () => {
    const text = compose(read());
    if (waLink) waLink.href = 'https://wa.me/' + PHONE_E164.replace('+', '') + '?text=' + encodeURIComponent(text);
    if (mailLink) {
      mailLink.href = 'mailto:' + SUPPORT_EMAIL
        + '?subject=' + encodeURIComponent('בקשה לקבלת מידע בדרך נגישה')
        + '&body=' + encodeURIComponent(text);
    }
    if (docOtherWrap) docOtherWrap.hidden = read().doc !== 'other';
  };

  form.addEventListener('input', refreshLinks);
  form.addEventListener('change', refreshLinks);
  refreshLinks();

  const say = (html) => {
    if (!statusBox) return;
    statusBox.innerHTML = html;
    statusBox.hidden = false;
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const v = read();

    // ⚠️ אימות בצד הלקוח מסביר מה חסר ואינו חוסם בשקט — כפתור שלא עושה
    // כלום הוא בדיוק מבוי סתום שאסור שיהיה בטופס נגישות.
    if (v.formats.length === 0) {
      say('<strong>צריך לבחור לפחות דרך אחת</strong> מתוך "מה תרצו לקבל".');
      return;
    }
    if (!v.contactDetail) {
      say('<strong>צריך למלא איך לחזור אליכם</strong> — טלפון, דואר אלקטרוני או כתובת.');
      return;
    }

    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'שולח…'; }
    say('שולח את הבקשה…');

    let reference = null;
    try {
      const res = await fetch(SUBMIT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formats: v.formats,
          doc: v.doc,
          docOther: v.docOther,
          contactName: v.contactName,
          contactMethod: v.contactMethod,
          contactDetail: v.contactDetail,
          notes: v.notes,
          surface: 'web',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.ok && data.reference) reference = String(data.reference);
      }
    } catch (err) {
      // נבלע בכוונה. מה שהמשתמש צריך לדעת הוא איך הבקשה כן תגיע, לא איזו
      // שגיאת רשת קרתה — ראו כלל 2 בראש הקובץ.
      reference = null;
    }

    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'שליחת הבקשה'; }

    if (reference) {
      say(
        '<strong>הבקשה התקבלה. מספר הבקשה שלכם: ' + reference + '.</strong>'
        + ' נחזור אליכם ב' + labelOf(ACCESSIBILITY_CONTACT_METHODS, v.contactMethod)
        + ' כדי לתאם את ההתאמה המדויקת, ונמסור אותה תוך ' + dueDaysOf(v.formats) + ' ימים לכל היותר.'
        + ' כדאי לשמור את המספר — אפשר להקריא אותו בטלפון כדי לבדוק מה קורה עם הבקשה.'
      );
    } else {
      say(
        '<strong>הבקשה שלכם מוכנה ומנוסחת, ונשאר רק לשלוח אותה.</strong>'
        + ' לחצו על "שליחה בוואטסאפ" או על "שליחה בדואר אלקטרוני" שכאן למטה — הנוסח כבר ממולא,'
        + ' והיא תגיע אלינו בדיוק כמו מהטופס. אפשר גם להתקשר אל 050-881-1085.'
      );
    }
  });
}
