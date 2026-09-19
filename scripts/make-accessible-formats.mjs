#!/usr/bin/env node
/*
 * ============================================================================
 *  make-accessible-formats.mjs — הפקת התאמות הנגישות למסמכים המשפטיים
 * ============================================================================
 *
 *  איך מריצים
 *  ----------
 *      node scripts/make-accessible-formats.mjs             # טקסט + קול לשניהם
 *      node scripts/make-accessible-formats.mjs terms       # מסמך אחד בלבד
 *      node scripts/make-accessible-formats.mjs --text-only # בלי הקראה (מהיר)
 *      node scripts/make-accessible-formats.mjs --dump-speech terms   # מה יוקרא
 *      node scripts/make-accessible-formats.mjs --check     # אימות בלבד
 *
 *  יציאה 0 = הכול תקין. יציאה 1 = כשל, או (ב---check) קבצים שהתיישנו.
 *  אין תלויות ואין node_modules — Node בלבד, בדיוק כמו check-a11y.mjs.
 *  ההקראה משתמשת ב-`say` של macOS ובקול העברי Carmit, ו-lame ממיר ל-MP3;
 *  שניהם חלק מהמכונה, לא מהפרויקט.
 *
 *  למה הקובץ הזה קיים
 *  -------------------
 *  הצהרת הנגישות באתר מבטיחה שתי התאמות לפי תקנה 29(ד) לתקנות שוויון
 *  זכויות לאנשים עם מוגבלות: **טקסט פשוט** ו**קובץ קול**. הבטחה כזו
 *  מתיישנת בשקט — מישהו מתקן סעיף בתקנון, ה-HTML מתעדכן, וקובץ הקול
 *  ממשיך להקריא את הנוסח הישן בלי ששום דבר צועק. ולכן:
 *
 *    · ההתאמות **נגזרות** מה-HTML ולא נכתבות ביד. אין נוסח שני לתחזק.
 *    · manifest.json שומר sha256 של כל קובץ מקור ואת גרסת התנאים שממנה
 *      הופק, ו---check משווה אותם למצב הנוכחי. התיישנות הופכת לכשל
 *      שאפשר לאכוף, במקום להישאר הנחה.
 *
 *  ⚠️ הסקריפט **קורא בלבד** מ-terms.html ומ-privacy.html. כל מה שהוא
 *  כותב יושב תחת accessible/ — המסמכים עצמם אינם נגזרת של שום כלי.
 *
 *  ⚠️ מאיפה מגיעה גרסת התנאים
 *  ---------------------------
 *  לא מדפי ה-HTML — שם היא לא קיימת. מקור האמת היחיד הוא
 *  `TERMS_VERSION` ב-app/legal.js, שכבר מסונכרן מול האפליקציה
 *  (`check-terms-version-sync`), ושורת "עודכן לאחרונה" בדף היא
 *  הניסוח האנושי שמלווה אותו. שניהם נכתבים לראש קובץ הטקסט ולמניפסט,
 *  כי שאלת "האם הקובץ הזה עדכני" נשאלת בשני המטבעות האלה.
 */

import { readFileSync, writeFileSync, mkdirSync, statSync, existsSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'accessible');
const MANIFEST = join(OUT_DIR, 'manifest.json');

/* ------------------------------------------------------------------ *
 * מה מפיקים
 * ------------------------------------------------------------------ */

const DOCS = [
  { slug: 'terms', source: 'terms.html', title: 'תנאי שימוש' },
  { slug: 'privacy', source: 'privacy.html', title: 'מדיניות פרטיות' },
];

/** מ-app/legal.js, ולא מה-HTML — ראו את ההערה בראש הקובץ. */
const VERSION_SOURCE = 'app/legal.js';

/* ------------------------------------------------------------------ *
 * הגדרות ההקראה
 * ------------------------------------------------------------------ */

const VOICE = 'Carmit';

/**
 * ⚠️ 145 ולא ערך "עגול" יותר, ולא ברירת המחדל.
 *
 * Carmit לא מתרגמת `-r` לקצב רציף אלא מעגלת אותו לדליים גסים. מדידה על
 * אותו משפט משפטי בן 40 מילים נתנה בדיוק ארבעה ערכים:
 *
 *      -r ≤ 100        21.96 שנ׳
 *      -r 110–154      20.14 שנ׳   ← כאן אנחנו
 *      -r 155–185      18.32 שנ׳   ← ברירת המחדל של הקול
 *      -r 190+         17.0 שנ׳ ומטה
 *
 * כלומר כל ערך בין 110 ל-154 נשמע זהה, ו-145 נבחר כדי שהכוונה תהיה
 * קריאה בקוד: הדלי **אחד מתחת** לברירת המחדל. זה מוריד את הקצב בכ-10%
 * (מ-131 מילים לדקה לכ-119) — האטה שמורגשת בתוכן משפטי צפוף, בלי לצנוח
 * לדלי הבא שהיה מותח את התקנון לכ-36 דקות של גרירה.
 */
const RATE = 145;

/**
 * lame ולא ffmpeg, למרות ששניהם מותקנים: הוא מקודד MP3 ייעודי שקורא AIFF
 * ישירות, בלי ניחוש קונטיינר ובלי שרשרת פילטרים שיכולה להשתנות בין
 * גרסאות — ו-`say` פולט AIFF, כך שאין כאן שלב המרה שאפשר לטעות בו.
 *
 * ⚠️ 32kbps מונו, ולא 64. זה נמדד ולא הוערך: `say` פולט 22050Hz מונו,
 * ו-lame בקצב הזה מפעיל lowpass ב-8.3kHz. באקסרפט של ארבע וחצי דקות
 * מהתקנון, האנרגיה מעל 8.3kHz יושבת על 45- dB מול 15- dB של האות כולו —
 * שלושים דציבל מתחת, כלומר כעשירית האחוז מהאנרגיה. לעומת זאת 24kbps
 * חותך כבר ב-5.9kHz, ושם נמצא כ-25- dB — זה כן נשמע.
 *
 * ומה שנחסך אינו זניח: התקנון יורד מ-16MB ל-8MB. מי שזקוק להתאמה הזו
 * מוריד אותה לעיתים בסלולר, וקובץ שלא מסיים להיטען אינו התאמה.
 */
const LAME = '/opt/homebrew/bin/lame';
const FFPROBE = '/opt/homebrew/bin/ffprobe';
const MP3_KBPS = 32;

/* ------------------------------------------------------------------ *
 * פענוח HTML — ידני, בלי ספרייה
 * ------------------------------------------------------------------ */

const TAG_RE = /<(\/?)([a-zA-Z][a-zA-Z0-9:-]*)((?:"[^"]*"|'[^']*'|[^>"'])*?)(\/?)>/g;

function tokenize(src) {
  const toks = [];
  TAG_RE.lastIndex = 0;
  let m;
  while ((m = TAG_RE.exec(src))) {
    toks.push({
      name: m[2].toLowerCase(),
      close: m[1] === '/',
      selfClose: m[4] === '/',
      raw: m[3] || '',
      start: m.index,
      end: TAG_RE.lastIndex,
    });
  }
  return toks;
}

const ATTR_RE = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>`]+)))?/g;

function parseAttrs(raw) {
  const o = {};
  ATTR_RE.lastIndex = 0;
  let m;
  while ((m = ATTR_RE.exec(raw))) o[m[1].toLowerCase()] = m[2] ?? m[3] ?? m[4] ?? '';
  return o;
}

const VOID = new Set(['img', 'input', 'br', 'hr', 'meta', 'link', 'source',
  'track', 'area', 'base', 'col', 'embed', 'param', 'wbr']);

/** ה-HTML הפנימי של האלמנט שהטוקן i פותח. זהה בהתנהגות ל-check-a11y.mjs. */
function innerHTML(src, toks, i) {
  const t = toks[i];
  if (t.selfClose || VOID.has(t.name)) return '';
  let depth = 1;
  for (let j = i + 1; j < toks.length; j++) {
    const k = toks[j];
    if (k.name !== t.name) continue;
    if (k.close) {
      if (--depth === 0) return src.slice(t.end, k.start);
    } else if (!k.selfClose && !VOID.has(k.name)) {
      depth++;
    }
  }
  return src.slice(t.end);
}

/* ------------------------------------------------------------------ *
 * ישויות HTML
 * ------------------------------------------------------------------ */

/* ⚠️ nbsp מפוענח לרווח **רגיל** ולא ל-U+00A0. רווח קשיח נראה כמו רווח
   אבל לא נתפס ב-\s של המנוע הישן, וכך היה שורד את ניקוי הרווחים
   הכפולים ונוחת בקובץ הסופי כרצף שאי-אפשר לראות. */
const NAMED_ENTITIES = {
  quot: '"', apos: "'", amp: '&', lt: '<', gt: '>', nbsp: ' ',
  ensp: ' ', emsp: ' ', thinsp: ' ', shy: '', zwnj: '', zwj: '',
  lrm: '‎', rlm: '‏',
  ndash: '–', mdash: '—', minus: '−', hyphen: '-',
  hellip: '…', bull: '•', middot: '·',
  lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”',
  laquo: '«', raquo: '»', sbquo: '‚', bdquo: '„',
  larr: '←', rarr: '→', uarr: '↑', darr: '↓',
  copy: '©', reg: '®', trade: '™', sect: '§',
  para: '¶', deg: '°', times: '×', divide: '÷',
  euro: '€', pound: '£', yen: '¥', cent: '¢',
  frac12: '½', frac14: '¼', frac34: '¾',
  plusmn: '±', sup2: '²', sup3: '³',
};

function decodeEntities(s) {
  return s.replace(/&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z][a-zA-Z0-9]*);/g, (m, body) => {
    if (body[0] === '#') {
      const code = body[1] === 'x' || body[1] === 'X'
        ? parseInt(body.slice(2), 16)
        : parseInt(body.slice(1), 10);
      if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return m;
      try { return String.fromCodePoint(code); } catch { return m; }
    }
    const hit = NAMED_ENTITIES[body];
    return hit === undefined ? m : hit;
  });
}

/* ------------------------------------------------------------------ *
 * חילוץ הטקסט
 * ------------------------------------------------------------------ */

/** ⚠️ ההערות נמחקות **לפני** חיפוש ה-main, כי בשני הדפים יש הערה שמצטטת
 *  את `<main id="main-content" tabindex="-1">` בתוך ההסבר על קישור
 *  הדילוג — ציטוט שהטוקנייזר קורא כתגית פתיחה אמיתית. */
function stripNoise(src) {
  return src
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '');
}

function extractMain(src, file) {
  const clean = stripNoise(src);
  const toks = tokenize(clean);
  const i = toks.findIndex((t) => t.name === 'main' && !t.close);
  if (i === -1) throw new Error(`${file}: אין <main> בדף — אין מאיפה לחלץ תוכן`);
  return innerHTML(clean, toks, i);
}

/* אלמנטים שמוסרים עם כל מה שבתוכם: הם ניווט ולא תוכן, וקורא שמקבל
   קובץ טקסט לא צריך את תפריט האתר בין הסעיפים. */
const DROP_ELEMENTS = /^(nav|footer|header|aside|template|noscript|svg|button|form|dialog)$/;
/* ⚠️ `updated` אינו נמחק אלא **מורם**: שורת "עודכן לאחרונה" נכתבת לכותרת
   הקובץ יחד עם מספר הגרסה, ולולא ההסרה כאן היא הייתה נשמעת פעמיים ברצף
   בהקראה — פעם מהכותרת שהסקריפט מייצר ופעם מגוף המסמך. */
const DROP_CLASSES = /(^|\s)(back-link|skip-link|nav-cta|breadcrumb|updated)(\s|$)/;

function dropChrome(html) {
  let out = html;
  for (let pass = 0; pass < 8; pass++) {
    const toks = tokenize(out);
    let cut = null;
    for (let i = 0; i < toks.length; i++) {
      const t = toks[i];
      if (t.close) continue;
      const a = parseAttrs(t.raw);
      if (DROP_ELEMENTS.test(t.name) || DROP_CLASSES.test(a.class || '')) {
        const inner = innerHTML(out, toks, i);
        const after = t.selfClose || VOID.has(t.name)
          ? t.end
          : out.indexOf('>', t.end + inner.length) + 1;
        cut = [t.start, after > 0 ? after : t.end + inner.length];
        break;
      }
    }
    if (!cut) break;
    out = out.slice(0, cut[0]) + ' ' + out.slice(cut[1]);
  }
  return out;
}

/* אלמנטים inline נמחקים בלי להשאיר רווח במקומם; כל השאר משאירים רווח.
   ⚠️ ההבחנה הזו אינה קוסמטית. `<span>טקסט</span>.` עם רווח במקום התגית
   הופך ל-"טקסט ." — רווח לפני נקודה, שקורא מסך מקריא כהיסוס — ובלי
   רווח בכלל, `</li><li>` היה מדביק שני פריטי רשימה למילה אחת. */
const INLINE = /^(span|b|strong|i|em|u|s|small|sup|sub|a|code|abbr|mark|time|bdi|bdo|wbr|q|cite|var|kbd|samp|data|ruby|rt|rp|del|ins|font)$/;

function inlineText(html) {
  let s = html.replace(/<(\/?)([a-zA-Z][a-zA-Z0-9:-]*)((?:"[^"]*"|'[^']*'|[^>"'])*?)(\/?)>/g,
    (m, _c, name) => (INLINE.test(name.toLowerCase()) ? '' : ' '));
  s = decodeEntities(s);
  s = s.replace(/\s+/g, ' ').trim();
  /* רווח שנשאר תלוי לפני פיסוק או אחרי סוגר פותח — שריד של מחיקת תגית
     block שישבה שם, לא משהו שהמחבר כתב. */
  s = s.replace(/\s+([,.;:!?…)\]}])/g, '$1').replace(/([(\[{])\s+/g, '$1');
  return s;
}

const BLOCK = /^(h1|h2|h3|h4|h5|h6|p|li|dt|dd|blockquote|figcaption|caption|th|td)$/;

/** פורס את ה-main לרשימת בלוקים בסדר הופעתם. אחרי שבלוק נאסף, מדלגים על
 *  כל הטוקנים שבתוכו — אחרת `<li>` בתוך `<li>` היה נפלט פעמיים. */
function htmlToBlocks(html) {
  const toks = tokenize(html);
  const blocks = [];
  let i = 0;
  while (i < toks.length) {
    const t = toks[i];
    if (!t.close && BLOCK.test(t.name)) {
      const inner = innerHTML(html, toks, i);
      const text = inlineText(inner);
      if (text) blocks.push({ type: t.name, text });
      const end = t.end + inner.length;
      while (i < toks.length && toks[i].start < end) i++;
      continue;
    }
    i++;
  }
  return blocks;
}

/* ⚠️ פסקה נשארת שורה אחת ארוכה, בלי גלישה ידנית ל-80 תווים. גלישה כזו
   נראית מסודרת בעורך וגרועה בשני הערוצים שבשבילם הקובץ קיים: קורא מסך
   מכריז שבירת שורה כגבול, ו-`say` עוצר בה — כלומר פסקה אחת נשמעת כחמישה
   משפטים קטועים. גבול השורה כאן הוא גבול משמעות, לא גבול רוחב. */
const BULLET = '•';

/* ⚠️ ה-`<li>` במקור כבר נושא תו תבליט משלו: style.css מכבה את list-style
   ומסתמך על תו שכתוב בתוך ה-HTML עצמו. בלי ההסרה הזו כל פריט היה מקבל
   תבליט שני ונפתח ב-"• •". ההסרה כללית ולא צמודה לתו אחד, כדי שגם מקף
   או כוכבית שייכתבו שם מחר ייבלעו באותה צורה. */
const LEADING_BULLET = /^[•·‣⁃∙*–—-]\s*/;

function blocksToText(blocks) {
  const lines = [];
  blocks.forEach((b, i) => {
    const next = blocks[i + 1];
    if (/^h[1-6]$/.test(b.type)) {
      lines.push('', b.text, '');
    } else if (b.type === 'li') {
      lines.push(`${BULLET} ${b.text.replace(LEADING_BULLET, '')}`);
      if (!next || next.type !== 'li') lines.push('');
    } else {
      lines.push(b.text, '');
    }
  });
  return tidy(lines.join('\n'));
}

/** הניקוי האחרון: בלי רצף רווחים, בלי רווח בסוף שורה, ובלי שורה ריקה
 *  שלישית. שלוש שורות ריקות אינן "עוד קצת אוויר" — קורא מסך מכריז כל
 *  אחת מהן, ו-`say` עוצר על כל אחת מהן. */
function tidy(s) {
  return s
    .replace(/\r\n?/g, '\n')
    .replace(/[^\S\n]+/g, ' ')
    .replace(/ +\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim() + '\n';
}

/* ------------------------------------------------------------------ *
 * גרסה ותאריך
 * ------------------------------------------------------------------ */

function readTermsVersion() {
  const src = readFileSync(join(ROOT, VERSION_SOURCE), 'utf8');
  /* ההערות נמחקות קודם: מעליו יושבות הערות שמצטטות `-2` ו-`-3`, ולולא
     זה היה נתפס ציטוט במקום ההצהרה. */
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const m = /TERMS_VERSION\s*=\s*['"]([^'"]+)['"]/.exec(code);
  if (!m) throw new Error(`${VERSION_SOURCE}: לא נמצא TERMS_VERSION`);
  return m[1];
}

/** שורת "עודכן לאחרונה" מהדף — הניסוח האנושי שמלווה את מספר הגרסה. */
function readUpdatedLine(src) {
  const m = /<p[^>]*class="[^"]*\bupdated\b[^"]*"[^>]*>([\s\S]*?)<\/p>/i.exec(src);
  return m ? inlineText(m[1]) : '';
}

const pad2 = (n) => String(n).padStart(2, '0');
const humanDate = (d) => `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${d.getFullYear()}`;

const RULE = '='.repeat(60);

function buildHeader(doc, version, updated, now) {
  const lines = [
    `${doc.title} — ROZIC MOVE`,
    RULE,
    `גרסת תנאים: ${version}`,
  ];
  if (updated) lines.push(updated);
  lines.push(
    `הופק אוטומטית מתוך ${doc.source} שבאתר rozicmove.com בתאריך ${humanDate(now)}.`,
    /* ⚠️ משפט אחד בשורה אחת, בלי גלישה ידנית. עיבוד ההקראה סוגר כל שורה
       בנקודה כדי לייצר הפסקה, ולכן משפט שנחתך לשתי שורות נשמע כשני
       משפטים קטועים. */
    'זוהי גרסת טקסט פשוט, התאמת נגישות לפי תקנה 29(ד) לתקנות שוויון זכויות לאנשים עם מוגבלות.',
    'הנוסח המחייב הוא זה שמתפרסם באתר.',
    RULE,
  );
  return lines.join('\n');
}

/* ------------------------------------------------------------------ *
 * עיבוד הטקסט להקראה
 * ------------------------------------------------------------------ */

const TERMINAL = /[.!?;:,…]$/;

const HEB = /[א-ת]/;

/** עוצמת ההפסקה שכל סימן פיסוק מייצר בהקראה — נקודה עוצרת, נקודה-פסיק
 *  מפרידה, פסיק רק מהסס. */
const punctRank = (c) => ('.!?…'.includes(c) ? 3 : ';:'.includes(c) ? 2 : 1);

/**
 * מסיר מרכאות כפולות ששימשו ציטוט, ומשאיר גרשיים שהן חלק מהמילה.
 *
 * ⚠️ ההבחנה אינה "מה יש לפני המרכאה". הניסיון הראשון היה כזה — מרכאה
 * שנשענת על רווח היא ציטוט — והוא נפל על `כ"סטרייק"`, שבו אות תחילית
 * דבוקה למרכאה הפותחת ונראית בדיוק כמו בע"מ. ההבחנה האמיתית היא צורנית:
 * **גרשיים בעברית יושבות תמיד לפני האות האחרונה** של ראשי התיבות —
 * ש"ח, בע"מ, עו"ד, תשמ"א. ולכן: אות עברית לפני, ואות עברית **אחת
 * בלבד** אחרי, זו גרשיים; כל צירוף אחר הוא מרכאת ציטוט ויורד.
 *
 * מרכאה שנשארת בטעות עולה ביוקר: Carmit הוגה "ש"ח" כ"שח" רק כשהגרשיים
 * במקומן, וכשהן מופיעות סביב מילה שלמה היא עוצרת באמצע המשפט.
 */
function stripQuoteMarks(line) {
  const ch = [...line];
  const out = [];
  for (let i = 0; i < ch.length; i++) {
    if (ch[i] !== '"') { out.push(ch[i]); continue; }
    const gershayim = HEB.test(ch[i - 1] || '') && HEB.test(ch[i + 1] || '') && !HEB.test(ch[i + 2] || '');
    if (gershayim) out.push(ch[i]);
  }
  return out.join('');
}

/**
 * הטקסט שנשמע אינו הטקסט שנקרא בעין, וזו לא רשלנות אלא ההבדל בין שני
 * ערוצים. מה שמשתנה, ולמה:
 *
 *   1. שורות קישוט (`====`) יורדות. `say` מקריא אותן כרצף "שווה שווה".
 *   2. תו התבליט יורד. הוא סימן ויזואלי לרשימה; בהקראה הוא נשמע כמילה.
 *   3. כל שורה שאינה נגמרת בפיסוק מקבלת נקודה. זה כל מנגנון ההפסקה של
 *      `say` — בלי זה כותרת נשפכת לתוך הפסקה שאחריה, ופריט רשימה לתוך
 *      הפריט הבא, והמאזין מאבד את הגבול בין שני סעיפים משפטיים.
 *   4. "N." בראש כותרת הופך ל-"סעיף N." — המסמך עצמו מפנה לסעיפיו בשם
 *      הזה ("כאמור בסעיף 5"), ומאזין שלא רואה את המספור זקוק לעוגן.
 *   5. מקף ארוך בין מילים הופך לפסיק. הוא מפריד ויזואלית ואינו נהגה;
 *      פסיק הוא אותו תפקיד בדיוק בערוץ הקולי.
 *   6. סוגריים הופכים לפסיקים. Carmit אינה משנה אינטונציה בסוגריים,
 *      אז הם נעלמים לגמרי בהקראה ומשפט מוסגר מתמזג למשפט העיקרי.
 *   7. מרכאות כפולות יורדות — **רק** כשהן מרכאות. גרשיים בתוך מילה
 *      (תשמ"א, ש"ח, בע"מ) נשארות, אחרת Carmit הייתה הוגה "תשמא".
 *      התנאי הוא מיקום: מרכאה שנשענת על רווח או על פיסוק היא ציטוט,
 *      מרכאה בין שתי אותיות היא חלק מהמילה.
 *   8. חץ ניווט (←) הופך לפסיק. הוא מופיע במסלול בממשק ("פרופיל
 *      והגדרות ← התראות") ואין לו הגייה; פסיק שומר על ההפרדה בין השלבים.
 *
 * מה **לא** משתנה, במכוון: שם המותג ROZIC MOVE נשאר באותיות לטיניות
 * (מדידה הראתה ש-Carmit הוגה אותו באורך זהה לתעתיק העברי, ותעתיק היה
 * משנה שם מסחרי בנוסח משפטי), וכתובות דוא"ל ומספרי עוסק נשארים כפי
 * שהם — הקראה תו-אחר-תו של מספר מזהה היא התנהגות נכונה ולא תקלה.
 */
function toSpeech(text) {
  const out = [];
  for (const raw of text.split('\n')) {
    let line = raw.trim();
    if (!line) { out.push(''); continue; }
    if (/^[\s=\-_*~#·••–—─-╿]+$/.test(line)) continue;

    line = line.replace(new RegExp(`^${BULLET}\\s*`), '');
    line = line.replace(/[‎‏‪-‮⁦-⁩­]/g, '');
    line = line.replace(/\s*[←→↑↓⇐⇒]\s*/g, ', ');
    line = line.replace(/(\d)\s*[–—−]\s*(\d)/g, '$1 עד $2');
    line = line.replace(/(^|\s)[–—−]+(\s|$)/g, ', ');
    line = line.replace(/[([{]/g, ', ').replace(/[)\]}]/g, ', ');
    line = stripQuoteMarks(line);
    line = line.replace(/^(\d+)\.\s+/, 'סעיף $1. ');

    /* איחוד פיסוק אחרי ההמרות: פסיק שנולד מסוגר ונחת ליד פיסוק שהמחבר
       כתב היה גורם ל-Carmit לעצור פעמיים באותו מקום. השורד הוא **החזק
       מביניהם** ולא האחרון — `(א) … ; (ב)` יצר רצף "; ," וויתור על
       הנקודה-פסיק היה מוחק את הגבול בין תת-סעיפים. */
    line = line.replace(/\s+([,.;:!?…])/g, '$1');
    for (let guard = 0; guard < 4; guard++) {
      const merged = line.replace(/([,.;:!?…])\s*([,.;:!?…])/g,
        (m, a, b) => (punctRank(b) > punctRank(a) ? b : a));
      if (merged === line) break;
      line = merged;
    }
    line = line.replace(/\s{2,}/g, ' ').trim();
    line = line.replace(/^[,;:.\s]+/, '').trim();

    if (!line) continue;
    if (!TERMINAL.test(line)) line += '.';
    out.push(line);
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}

/* ------------------------------------------------------------------ *
 * הפקת האודיו
 * ------------------------------------------------------------------ */

function have(bin) {
  try { execFileSync(bin, ['--version'], { stdio: 'ignore' }); return true; }
  catch { return existsSync(bin); }
}

function audioSeconds(file) {
  if (!existsSync(FFPROBE)) return null;
  try {
    const out = execFileSync(FFPROBE,
      ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file],
      { encoding: 'utf8' });
    const n = Number(out.trim());
    return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
  } catch { return null; }
}

/** ⚠️ ה-AIFF הביניימי נכתב לתיקיית הזמניים של המערכת ולא ל-accessible/:
 *  הוא שוקל עשרות מגה-בייט לחצי שעת דיבור, והתיקייה הזו נכנסת לגיט. */
function renderAudio(speechText, mp3Path, slug) {
  const aiff = join(tmpdir(), `rozic-a11y-${slug}-${process.pid}.aiff`);
  const txt = join(tmpdir(), `rozic-a11y-${slug}-${process.pid}.txt`);
  try {
    writeFileSync(txt, speechText, 'utf8');
    execFileSync('say', ['-v', VOICE, '-r', String(RATE), '-o', aiff, '-f', txt],
      { stdio: 'inherit', timeout: 0, maxBuffer: 1 << 26 });
    execFileSync(LAME, ['-m', 'm', '-b', String(MP3_KBPS), '--quiet', aiff, mp3Path],
      { stdio: 'inherit', timeout: 0, maxBuffer: 1 << 26 });
  } finally {
    for (const f of [aiff, txt]) { try { rmSync(f, { force: true }); } catch { /* כבר איננו */ } }
  }
}

/* ------------------------------------------------------------------ *
 * מניפסט
 * ------------------------------------------------------------------ */

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');
const sizeOf = (p) => (existsSync(p) ? statSync(p).size : null);

/* ⚠️ החותמת שמזריק `scripts/stamp-assets.mjs` (`data-build-stamp`) משתנה בכל
   הרצה, אך אינה חלק מהנוסח המשפטי ואינה נכנסת להתאמות — היא יושבת מחוץ
   ל-<main> ש-extractMain קורא. כל עוד ה-sha חושב על הקובץ הגולמי, **כל** הרצת
   stamp ייתמה מיד את הנגישות: שתי בדיקות הקבלה החובה לא היו יכולות להיות
   ירוקות בו-זמנית, והכשל של --check היה מדבר על "נוסח ישן" גם כשהנוסח זהה.
   לכן החותמת מנוקה לפני החישוב — בהפקה וב---check באותה פונקציה בדיוק,
   שאחרת השתיים היו מחשבות שני מספרים שונים לאותו קובץ. */
/* ⚠️ 20.9 — **המופע השלישי של אותה משפחה**, אחרי החותמת ואחרי `?v=`.
   `stamp-assets` מזריק עכשיו גם `<script src="/version-check.js">` לצד
   החותמת, בכל דף ובכל הרצה. הוא מטא-דאטה של בנייה בדיוק כמוה: יושב
   מחוץ ל-<main>, אינו נכנס להתאמות, ואינו נושא שום משמעות משפטית —
   ובכל זאת הוא פסל את `terms.mp3` ואת `privacy.mp3` ברגע שנוסף.
   שלוש פעמים זה כבר דפוס: **כל דבר ש-`stamp-assets` מזריק לכל הדפים
   חייב להיות מנוטרל כאן באותה הרצה.** */
const STAMP_RE = /<div data-build-stamp[\s\S]*?<\/div>\n?(?:\s*<script src="\/version-check\.js(?:\?v=[0-9a-f]*)?" defer><\/script>\n?)*/;
/* ⚠️ 16.9 — מופע שני של אותה משפחת באג, ונמצא אחרי שהראשון תוקן: גם
   `?v=<hash>` שמזריק `stamp-assets` על style.css ועל קבצי ה-JS משתנה בכל
   עריכת CSS. שינוי צבע אחד בגיליון פסל את `privacy.mp3` — 13 דקות קול —
   למרות שאף מילה בנוסח המשפטי לא זזה. גרסת הנכס היא מטא-דאטה של בנייה,
   בדיוק כמו החותמת, ולכן היא מנוטרלת כאן ולא נמחקת: המחרוזת `?v=` נשמרת
   בלי הערך, כדי שהוספה או הסרה של הפניה לנכס **כן** תישבר את ההתאמה. */
const ASSET_VER_RE = /(\?v=)[0-9a-f]{8}/g;
const canonicalSource = (buf) =>
  Buffer.from(
    buf.toString('utf8').replace(STAMP_RE, '').replace(ASSET_VER_RE, '$1'),
    'utf8',
  );

function readManifest() {
  if (!existsSync(MANIFEST)) return null;
  try { return JSON.parse(readFileSync(MANIFEST, 'utf8')); }
  catch { return null; }
}

/* ------------------------------------------------------------------ *
 * --check
 * ------------------------------------------------------------------ */

/** ⚠️ ההשוואה היא מול **המקור**, לא מול הפלט. זו כל הנקודה: קובץ קול
 *  תקין לחלוטין שהופק מנוסח ישן הוא בדיוק המקרה שהמצב הזה נועד לתפוס,
 *  ושום בדיקה על הקובץ עצמו לא הייתה רואה אותו. */
function runCheck(docs) {
  const manifest = readManifest();
  if (!manifest) {
    console.log('  ✗ אין accessible/manifest.json — ההתאמות מעולם לא הופקו');
    return 1;
  }
  const version = readTermsVersion();
  const problems = [];

  for (const doc of docs) {
    const rec = (manifest.documents || {})[doc.slug];
    if (!rec) { problems.push(`${doc.slug}: אינו במניפסט — ההתאמה לא הופקה מעולם`); continue; }

    const current = sha256(canonicalSource(readFileSync(join(ROOT, doc.source))));

    for (const [kind, key, file] of [['הטקסט', 'text', `${doc.slug}.txt`],
                                     ['הקול', 'audio', `${doc.slug}.mp3`]]) {
      const art = rec[key];
      if (!art || !art.sourceSha256) {
        problems.push(`${doc.slug}: ${kind} מעולם לא הופק`);
        continue;
      }
      if (!existsSync(join(OUT_DIR, file))) {
        problems.push(`${doc.slug}: קובץ ${kind} (${file}) חסר על הדיסק`);
        continue;
      }
      if (art.sourceSha256 !== current) {
        problems.push(`${doc.slug}: ${doc.source} השתנה מאז ש${kind} הופק — ${file} מציג נוסח ישן`);
      }
      if (art.termsVersion !== version) {
        problems.push(`${doc.slug}: ${kind} הופק מגרסה ${art.termsVersion}, ובקוד ${version}`);
      }
    }
  }

  if (problems.length) {
    for (const p of problems) console.log(`    ✗ ${p}`);
    console.log('\n  הרץ  node scripts/make-accessible-formats.mjs  כדי להפיק מחדש');
    return 1;
  }
  console.log(`  ✓ התאמות הנגישות מעודכנות — ${docs.length} מסמכים, גרסה ${version}`);
  return 0;
}

/* ------------------------------------------------------------------ *
 * הרצה
 * ------------------------------------------------------------------ */

const argv = process.argv.slice(2);
const flags = new Set(argv.filter((a) => a.startsWith('--')));
const picked = argv.filter((a) => !a.startsWith('--')).map((a) => a.replace(/\.html$/, ''));
const docs = picked.length ? DOCS.filter((d) => picked.includes(d.slug)) : DOCS;

if (picked.length && docs.length !== picked.length) {
  console.error(`  ✗ מסמך לא מוכר. אפשריים: ${DOCS.map((d) => d.slug).join(', ')}`);
  process.exit(1);
}

if (flags.has('--check')) process.exit(runCheck(docs));

/* ⚠️ שתי הבדיקות האלה קודמות להפקה ולא מתגלות תוך כדי: ההקראה של התקנון
   רצה דקה וחצי, ואבחון שמגיע בסופה עולה את כל הזמן הזה. הקול נבדק בשמו
   ולא רק בקיום `say` — Carmit היא התקנה נפרדת, ו-`say` בלעדיה מצליח
   בשקט ומקריא עברית בקול אנגלי. */
const textOnly = flags.has('--text-only') || flags.has('--dump-speech');
if (!textOnly) {
  if (!have(LAME)) {
    console.error(`  ✗ ${LAME} אינו מותקן — התקן lame או הרץ עם --text-only`);
    process.exit(1);
  }
  let voices = '';
  try { voices = execFileSync('say', ['-v', '?'], { encoding: 'utf8' }); }
  catch { console.error('  ✗ הפקודה `say` אינה זמינה — הסקריפט דורש macOS'); process.exit(1); }
  if (!new RegExp(`^${VOICE}\\b`, 'm').test(voices)) {
    console.error(`  ✗ הקול ${VOICE} אינו מותקן — הוסף אותו בהגדרות · נגישות · תוכן מדובר`);
    process.exit(1);
  }
}

mkdirSync(OUT_DIR, { recursive: true });

const now = new Date();
const version = readTermsVersion();
const manifest = readManifest() || {};
manifest.generator = 'scripts/make-accessible-formats.mjs';
manifest.regulation = 'תקנה 29(ד) — טקסט פשוט וקובץ קול';
manifest.voice = { name: VOICE, rate: RATE, engine: 'macOS say', mp3: `lame ${MP3_KBPS}kbps mono` };
manifest.documents = manifest.documents || {};

for (const doc of docs) {
  const srcPath = join(ROOT, doc.source);
  const raw = readFileSync(srcPath);
  const src = raw.toString('utf8');

  const blocks = htmlToBlocks(dropChrome(extractMain(src, doc.source)));
  const body = blocksToText(blocks);
  const header = buildHeader(doc, version, readUpdatedLine(src), now);
  const text = tidy(`${header}\n\n${body}`);

  /* ⚠️ הטקסט שנשמע אינו הטקסט שנקרא, וההקראה המלאה אורכת עשרות דקות.
     בלי דרך לראות את הנוסח המדובר בשנייה אחת, כל תיקון בעיבוד ההקראה
     היה נבדק בהמתנה של חצי שעה — כלומר לא נבדק. המצב הזה אינו כותב
     דבר לדיסק, כדי שבדיקה לא תיראה אחר כך כהפקה. */
  if (flags.has('--dump-speech')) {
    process.stdout.write(toSpeech(text));
    continue;
  }

  const txtPath = join(OUT_DIR, `${doc.slug}.txt`);
  writeFileSync(txtPath, text, 'utf8');

  const mp3Path = join(OUT_DIR, `${doc.slug}.mp3`);
  const rendered = !textOnly;
  if (rendered) {
    console.log(`  · ${doc.slug}: מקריא ${blocks.length} בלוקים בקול ${VOICE} (-r ${RATE})…`);
    renderAudio(toSpeech(text), mp3Path, doc.slug);
  }

  /* ⚠️ טביעת האצבע של המקור נרשמת **לכל התאמה בנפרד**, ולא פעם אחת
     למסמך. הרישום המשותף נראה נכון עד שמריצים --text-only אחרי שינוי
     בתקנון: הטקסט מתרענן, קובץ הקול נשאר מהנוסח הישן, וה-sha המשותף
     מתעדכן לחדש — כלומר --check היה מאשר בדיוק את המצב שהוא נבנה לתפוס.
     כאן רשומת האודיו נוגעת רק כשבאמת הוקרא, ואחרת נשמרת כמו שהייתה. */
  const stamp = { sourceSha256: sha256(canonicalSource(raw)), termsVersion: version,
                  generatedAt: now.toISOString() };
  const prev = manifest.documents[doc.slug] || {};

  manifest.documents[doc.slug] = {
    title: doc.title,
    source: doc.source,
    versionSource: VERSION_SOURCE,
    text: { path: `accessible/${doc.slug}.txt`, bytes: sizeOf(txtPath), blocks: blocks.length, ...stamp },
    audio: rendered
      ? {
          path: `accessible/${doc.slug}.mp3`,
          bytes: sizeOf(mp3Path),
          seconds: audioSeconds(mp3Path),
          ...stamp,
        }
      : prev.audio || { path: `accessible/${doc.slug}.mp3`, bytes: null, seconds: null,
                        sourceSha256: null, termsVersion: null, generatedAt: null },
  };

  const rec = manifest.documents[doc.slug];
  const mins = rec.audio.seconds
    ? ` · ${Math.floor(rec.audio.seconds / 60)}:${pad2(Math.round(rec.audio.seconds % 60))} דק׳`
    : '';
  const audioNote = rendered
    ? ` · ${rec.audio.bytes} בתים MP3${mins}`
    : ' · הקול לא הופק בהרצה הזו';
  console.log(`  ✓ ${doc.slug}: ${rec.text.bytes} בתים טקסט${audioNote}`);
}

if (flags.has('--dump-speech')) process.exit(0);

writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
console.log(`  ✓ accessible/manifest.json — גרסה ${version}`);
process.exit(0);
