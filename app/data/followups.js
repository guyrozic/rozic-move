/**
 * שאלות ההמשך של הצ'אט — **תאום ל-`~/Hovalot/src/data/items.ts`.**
 *
 * ## למה זה קובץ נפרד ולא בתוך `items.js`
 * `app/data/items.js` נבדק מול האפליקציה ע"י `check-web-catalog-sync.ts`,
 * שמשווה את **הקטלוג**. הוספת פונקציות לשם הייתה מערבבת נתונים עם לוגיקה
 * בקובץ שכל תפקידו להיות ניתן להשוואה. הלוגיקה יושבת כאן.
 *
 * ## למה זה קיים בכלל
 * גיא (20.9): "לגבי השאלות בצ'אט בוקס אין את המנגנון כמו באפליקציה -
 * כאשר נשאלת שאלה על מיטה לא מגיעה שאלת המשך על מזרון."
 *
 * ⚠️ **הכללים בפרומפט לבדם אינם מספיקים, וזה תועד באפליקציה אחרי באג
 * אמיתי.** כלל 7 ב-`buildChatPrompt` מורה ל-AI לשאול על מזרון בכל פעם
 * שנוספה מיטה — אבל **פריט שנוסף בלחיצת כפתור לא עובר דרך ה-AI כלל.**
 * מי שכתב "מיטה", נשאל איזה גודל ולחץ — לא קיבל שאלת מזרון לעולם.
 * זו הרשת התחתונה בצד הלקוח, בדיוק כמו באפליקציה.
 *
 * ⚠️ **כל הזרקה חייבת לבדוק את התור החי קודם.** באפליקציה נמצא ב-11.8
 * שסריקת תמונות שייצרה שאלת-גודל **וגם** שאלת-מזרון באותה מנה, ואז
 * לחיצה על תשובת הגודל הוסיפה מזרון שני על גביה — הלקוח ענה על שתיהן
 * והמזרון נספר פעמיים. `hasMattressOptions` / `hasDiningChairOptions`
 * הן ההגנה, והן נבדקות מול התור כולו ולא מול מנה אחת.
 */

/** מיטות שמצדיקות שאלת מזרון. תאום ל-BED_ITEM_KEYS ב-items.ts. */
export const BED_ITEM_KEYS = new Set([
  'single_bed', 'double_bed', 'king_bed', 'bed_one_half',
  'electric_bed_single', 'electric_bed_double', 'electric_bed_half', 'electric_bed_king',
  'bunk_bed', 'single_bed_kids',
]);

const BED_TO_MATTRESS_KEY = {
  single_bed: 'mattress_single', electric_bed_single: 'mattress_single', single_bed_kids: 'mattress_single',
  bed_one_half: 'mattress_half', electric_bed_half: 'mattress_half',
  double_bed: 'mattress_double', electric_bed_double: 'mattress_double',
  king_bed: 'mattress_king', electric_bed_king: 'mattress_king',
  bunk_bed: 'mattress_single',
};

const MATTRESS_SIZE_LABELS = [
  { itemKey: 'mattress_single', label: 'מזרון יחיד (90×200 ס"מ)' },
  { itemKey: 'mattress_half',   label: 'מזרון וחצי (120–140×200 ס"מ)' },
  { itemKey: 'mattress_double', label: 'מזרון זוגי (160×200 ס"מ)' },
  { itemKey: 'mattress_king',   label: 'מזרון קינג (180×200 ס"מ)' },
];

/**
 * ⚠️ מחזירה `null` למיטה שאין לה מזרון תואם בקטלוג — כרגע `baby_bed`
 * בלבד, שאין לו מידת מזרון ייעודית ולכן אין מה להציע.
 * מיטת קומותיים צריכה **שניים**, לא אחד.
 */
export function buildMattressFollowUpQuestion(bedItemKey, bedQty) {
  if (!BED_TO_MATTRESS_KEY[bedItemKey]) return null;
  const isBunk = bedItemKey === 'bunk_bed';
  const qty = isBunk ? 2 : bedQty;
  return {
    id: `mattress-followup-${bedItemKey}-${Date.now()}`,
    text: isBunk ? 'רוצה להוסיף גם מזרונים? (מיטת קומותיים — בדרך כלל 2)' : 'רוצה להוסיף גם מזרון למיטה?',
    options: [
      ...MATTRESS_SIZE_LABELS.map(m => ({ label: m.label, itemKey: m.itemKey, qty })),
      { label: 'לא צריך מזרון', itemKey: null, qty: 0 },
    ],
  };
}

/** האם שאלה כלשהי (שלנו או של ה-AI) כבר שואלת על מזרון. */
export function hasMattressOptions(question) {
  return question.id.includes('mattress-followup-')
    || question.options.some(o => o.itemKey && o.itemKey.startsWith('mattress_'));
}

/**
 * מוצע אחרי ששאלת המזרון נענתה — לכל כיוון. למצעים, כריות ומגבות אין
 * פריט קטלוגי, ולכן מוצע ארגז: אותה תבנית של "פריטים קטנים נכנסים
 * לארגז" שכבר קיימת בכלל 9a בפרומפט, ולא פריט קטלוגי חדש שנולד לצורך.
 */
export function buildBeddingBoxFollowUpQuestion() {
  return {
    id: `bedding-followup-${Date.now()}`,
    text: 'רוצה להוסיף גם ארגז למצעים, כריות ומגבות?',
    options: [
      { label: 'ארגז קרטון קטן (S, עד 30 ס"מ לצד)', itemKey: 'box_S', qty: 1 },
      { label: 'ארגז קרטון בינוני (M, 30–40 ס"מ לצד)', itemKey: 'box_M', qty: 1 },
      { label: 'ארגז קרטון גדול (L, 40–50 ס"מ לצד)', itemKey: 'box_L', qty: 1 },
      { label: 'לא צריך', itemKey: null, qty: 0 },
    ],
  };
}

/** שולחנות אוכל שמצדיקים שאלת כיסאות. ⚠️ שולחן עבודה ושולחן סלון לא
 *  נכללים בכוונה — שם כיסא אינו מובן מאליו והשאלה תהיה רעש. */
export const DINING_TABLE_ITEM_KEYS = new Set([
  'dining_table_small', 'dining_table_medium', 'dining_table_large', 'dining_table_giant',
]);

const DINING_TABLE_TYPICAL_CHAIRS = {
  dining_table_small: 4, dining_table_medium: 4, dining_table_large: 6, dining_table_giant: 8,
};
const DINING_CHAIR_OPTION_COUNT = 4;

export function hasDiningChairOptions(question) {
  return question.id.includes('dining-chairs-followup-')
    || question.options.some(o => o.itemKey === 'dining_chair' || o.itemKey === 'bar_stool');
}

/**
 * "רוצה להוסיף גם כיסאות, וכמה?" — שאלה אחת שעונה על שתיהן, כמו שאלת
 * המזרון, ולא שתי שאלות שמאריכות את השיחה.
 * ⚠️ רצף **רציף** סביב המספר האופייני ולא קפיצות של 2, כדי שגם מספר
 * אי-זוגי יהיה לחיצה אחת.
 */
export function buildDiningChairsFollowUpQuestion(tableItemKey, tableQty) {
  if (!DINING_TABLE_ITEM_KEYS.has(tableItemKey)) return null;
  const typical = DINING_TABLE_TYPICAL_CHAIRS[tableItemKey] ?? 4;
  const target = typical * Math.max(1, tableQty);
  const start = Math.max(1, target - 1);
  const counts = Array.from({ length: DINING_CHAIR_OPTION_COUNT }, (_, i) => start + i);
  return {
    id: `dining-chairs-followup-${tableItemKey}-${Date.now()}`,
    text: 'רוצה להוסיף גם כיסאות לשולחן? כמה?',
    options: [
      // ⚠️ "1 כיסאות" הוא רבים-על-אחד — הפרויקט מתקן את זה בכל מקום.
      ...counts.map(n => ({ label: n === 1 ? 'כיסא אחד' : `${n} כיסאות`, itemKey: 'dining_chair', qty: n })),
      { label: 'מספר אחר — כתוב בצ\'אט 💬', itemKey: null, qty: 0, isChat: true },
      { label: 'לא צריך כיסאות', itemKey: null, qty: 0 },
    ],
  };
}

/**
 * שלוש ההגנות מפני ספירה כפולה של כיסאות, במקום אחד:
 *  1. כיסאות שנוספו **באותה פעולה** — הכמויות מתעדכנות אחרי, וכיסאות
 *     כמעט תמיד מצולמים יחד עם השולחן.
 *  2. כיסאות שכבר ברשימה מסריקה קודמת.
 *  3. שאלת כיסאות שכבר ממתינה בתור — שלנו או של ה-AI.
 */
export function diningChairsFollowUpFor(tableItemKey, tableQty, opts) {
  if (!DINING_TABLE_ITEM_KEYS.has(tableItemKey)) return null;
  const chairsInSameBatch = (opts.sameBatchItems ?? []).some(
    i => i.action !== 'remove' && (i.itemKey === 'dining_chair' || i.itemKey === 'bar_stool'),
  );
  if (chairsInSameBatch) return null;
  if (opts.getQty('dining_chair') > 0 || opts.getQty('bar_stool') > 0) return null;
  if ((opts.existingQuestions ?? []).some(hasDiningChairOptions)) return null;
  return buildDiningChairsFollowUpQuestion(tableItemKey, tableQty);
}

/**
 * הפריפיקס המשותף הארוך ביותר — לבניית "איזה גודל <בסיס>?".
 *
 * ⚠️ **לא חיתוך סוגריים.** באג אמיתי שדווח באפליקציה: חיתוך `(...)`
 * מ"ארון בינוני (100–180 ס"מ)" משאיר "ארון בינוני", והשאלה יצאה
 * "איזה גודל ארון בינוני?". מילות הגודל בעברית גם משתנות במין
 * (בינוני/בינונית) לפי שם העצם, ולכן רשימת מילים קבועה לא עוזרת.
 * הפריפיקס המשותף בין כל הגדלים עובד לכל משפחה בקטלוג.
 */
export function longestCommonPrefix(strings) {
  if (!strings.length) return '';
  let prefix = strings[0];
  for (const s of strings.slice(1)) {
    while (prefix && !s.startsWith(prefix)) prefix = prefix.slice(0, -1);
    if (!prefix) return '';
  }
  return prefix.trim();
}

/**
 * שאלת אישור לפריט שזוהה ב**סריקה חוזרת** וכבר קיים ברשימה.
 * תאום ל-`buildDuplicateCheckQuestion` ב-`items.ts:533`.
 *
 * ⚠️ **זו הגנה על המחיר, לא על הנוחות.** בסריקה חוזרת נשלחות ל-AI רק
 * התמונות החדשות (זה זול, וזו גם ההתנהגות באפליקציה) — כלומר למודל אין
 * שום דרך לדעת אם הוא רואה את אותה מיטה מזווית אחרת או מיטה שנייה
 * באמת. שתי ההכרעות האוטומטיות שגויות: הוספה שקטה סופרת פעמיים ומנפחת
 * את המחיר, והשמטה שקטה מחסירה פריט אמיתי מההובלה. לכן ההכרעה עוברת
 * ללקוח, שהוא היחיד שיודע.
 *
 * הממשק באתר **מזמין** את התרחיש: ליד "נתח עם AI" יושב "+ הוסף תמונות",
 * ולקוח שסורק חדר, מקבל מיטה, ואז מוסיף זווית נוספת של אותו חדר — קיבל
 * עד עכשיו שתי מיטות בלי מילה.
 *
 * ה-id נושא את הפריפיקס `dup-check-`, ו-`answerQuestion` מזהה אותו —
 * אותה מוסכמה כמו `mattress-followup-`.
 */
export function buildDuplicateCheckQuestion(itemKey, qty, label) {
  return {
    id: `dup-check-${itemKey}-${Date.now()}`,
    text: `בתמונות החדשות זיהינו גם "${label}" — זה פריט נוסף, או שזה אותו אחד שכבר נספר בתמונות הקודמות?`,
    options: [
      { label: qty > 1 ? `זה פריט נוסף (הוסף ${qty})` : 'זה פריט נוסף — הוסף', itemKey, qty },
      { label: 'זה אותו אחד שכבר נספר — לא להוסיף', itemKey: null, qty: 0 },
    ],
  };
}
