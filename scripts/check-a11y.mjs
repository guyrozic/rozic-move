#!/usr/bin/env node
/*
 * ============================================================================
 *  check-a11y.mjs — בדיקת נגישות סטטית לאתר ROZIC MOVE
 * ============================================================================
 *
 *  איך מריצים
 *  ----------
 *      node scripts/check-a11y.mjs            # סורק את כל דפי ה-HTML
 *      node scripts/check-a11y.mjs --verbose  # מדפיס גם כמה בדיקות עברו
 *      node scripts/check-a11y.mjs index.html app/login.html   # דפים נבחרים
 *
 *  יציאה 0 = נקי. יציאה 1 = נמצאו כשלים. אין תלויות, אין node_modules,
 *  אין דפדפן — Node בלבד, כדי שאפשר יהיה להריץ אותה בכל מקום ובכל רגע.
 *
 *  מה היא בודקת
 *  -------------
 *      img-alt        · <img> בלי אטריביוט alt
 *      control-name   · כפתור/קישור בלי שם נגיש (טקסט, aria-label, title…)
 *      field-label    · שדה קלט בלי <label for>, aria-label או aria-labelledby
 *      svg-name       · <svg> שאינו aria-hidden ואין לו <title>/aria-label
 *      page-h1        · דף בלי <h1>
 *      heading-skip   · דילוג ברמות כותרות (h1 ואחריו h3)
 *      viewport-zoom  · user-scalable=no או maximum-scale ב-viewport
 *      raw-color      · ערך צבע גולמי שאינו בפלטה בכלל CSS שצובע טקסט
 *      unresolved-var · var(--x) בדף שאינו טוען את הגיליון שמגדיר אותו
 *
 *  מה היא **לא** בודקת — ולמה
 *  ---------------------------
 *  שלושת הדברים האלה דורשים דפדפן שמחשב פריסה בפועל, ולכן אינם כאן:
 *
 *   • **ניגודיות מחושבת.** היחס האמיתי תלוי בצבע הרקע שנוחת מתחת לטקסט
 *     אחרי ירושה, שכבות שקופות וגרדיאנטים — ערך שאי-אפשר לגזור מהמקור.
 *     `raw-color` הוא הקירוב הסטטי: הוא לא מודד יחס, הוא רק אוכף שכל צבע
 *     טקסט בא מהפלטה שכבר נמדדה.
 *   • **סדר Tab ומלכודות מיקוד.** תלויים בעץ המסמך אחרי JS, ב-tabindex
 *     ובמה שמוצג בפועל.
 *   • **זום 200% וחיתוך טקסט.** דורש מדידה של תיבות בפועל.
 *
 *  לשלושתם יש סורק Playwright נפרד שרץ ידנית מחוץ לריפו (ראו דוח 15.9).
 *  הבדיקה הזו היא מה שרץ תמיד; הסורק ההוא הוא מה שרץ בסבב ביקורת.
 *
 *  ⚠️ `raw-color` מתיר ערך גולמי **שזהה לערך של טוקן קיים**. זה מכוון:
 *  listing.html, payment-success.html ו-verify-redirect.html הם דפים
 *  עצמאיים שאינם טוענים את style.css כלל, ולכן אינם יכולים להשתמש
 *  ב-var(). הפלטה היא רשימת הצבעים המותרים, לא רשימת התחביר המותר —
 *  וצבע חדש שלא נמדד ייפסל בין אם נכתב כמספר ובין אם דרך טוקן חדש
 *  שיתווסף ל-:root, שהוא בדיוק המקום שבו כתובה המדידה.
 *
 *  ⚠️ הבדיקה סורקת גם markup שנמצא בתוך <script> (תבניות template literal),
 *  כי רוב ממשק האפליקציה באתר נבנה שם. ערך דינמי (`alt="${x}"`) נחשב כקיים —
 *  הבדיקה מאמתת שהאטריביוט מחובר, לא שהתוכן שלו טוב.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/* ------------------------------------------------------------------ *
 * עזרי פענוח
 * ------------------------------------------------------------------ */

/** מחליף קטע בתווי רווח באותו אורך — השורות והאופסטים נשארים נכונים. */
const blank = (s) => s.replace(/[^\n]/g, ' ');

/** מסיר הערות HTML, והערות JS בתוך <script>, בלי להזיז שום אופסט. */
function stripComments(src) {
  let out = src.replace(/<!--[\s\S]*?-->/g, blank);
  out = out.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gi, (m, body, off) => {
    const cleaned = body
      .replace(/\/\*[\s\S]*?\*\//g, blank)
      .replace(/(^|[^:"'`\\])\/\/[^\n]*/g, (mm, p1) => p1 + blank(mm.slice(p1.length)));
    return m.slice(0, m.length - body.length - '</script>'.length) + cleaned + '</script>';
  });
  return out;
}

const lineOf = (src, idx) => src.slice(0, idx).split('\n').length;

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
  while ((m = ATTR_RE.exec(raw))) {
    o[m[1].toLowerCase()] = m[2] ?? m[3] ?? m[4] ?? '';
  }
  return o;
}

const VOID = new Set(['img', 'input', 'br', 'hr', 'meta', 'link', 'source',
  'track', 'area', 'base', 'col', 'embed', 'param', 'wbr', 'path', 'circle',
  'rect', 'line', 'polygon', 'polyline', 'ellipse', 'use', 'stop']);

/** מחזיר את ה-HTML הפנימי של האלמנט שהטוקן i פותח, או '' אם אין. */
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

const textOf = (html) =>
  html.replace(/<[^>]*>/g, ' ')
      .replace(/&[a-zA-Z#0-9]+;/g, 'x')
      .replace(/\s+/g, ' ')
      .trim();

/* ------------------------------------------------------------------ *
 * הפלטה
 * ------------------------------------------------------------------ */

function normColor(v) {
  const s = v.trim().toLowerCase();
  let m = /^#([0-9a-f]{3,8})$/.exec(s);
  if (m) {
    let h = m[1];
    if (h.length === 3 || h.length === 4) h = [...h].map((c) => c + c).join('');
    return `${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)}`;
  }
  m = /^rgba?\(\s*([\d.]+)\s*[, ]\s*([\d.]+)\s*[, ]\s*([\d.]+)/.exec(s);
  if (m) return `${Math.round(+m[1])},${Math.round(+m[2])},${Math.round(+m[3])}`;
  return null;
}

/** כל `--token: value` בקובץ CSS — בכל סלקטור, לא רק :root. */
function declaredVars(css) {
  const out = new Set();
  for (const m of css.matchAll(/(--[\w-]+)\s*:/g)) out.add(m[1]);
  return out;
}

function loadPalette() {
  const set = new Set(['255,255,255', '0,0,0']); // לבן ושחור הם תמיד לגיטימיים
  for (const f of ['style.css', 'app/style-app.css']) {
    const css = readFileSync(join(ROOT, f), 'utf8');
    for (const block of css.match(/:root\s*\{[\s\S]*?\}/g) || []) {
      for (const d of block.match(/--[\w-]+\s*:\s*[^;]+/g) || []) {
        const n = normColor(d.split(':').slice(1).join(':'));
        if (n) set.add(n);
      }
    }
  }
  return set;
}

/* ------------------------------------------------------------------ *
 * הבדיקות
 * ------------------------------------------------------------------ */

const KEYWORD_COLORS = new Set(['inherit', 'currentcolor', 'transparent',
  'unset', 'initial', 'revert', 'white', 'black', 'none', 'auto']);

const LABELLABLE = /^(input|select|textarea)$/;
const NO_LABEL_INPUT_TYPES = new Set(['hidden', 'submit', 'button', 'reset', 'image']);

function checkDocument(file, src, palette) {
  const found = [];
  const add = (rule, idx, msg) =>
    found.push({ file, rule, line: lineOf(src, idx), msg });

  const clean = stripComments(src);
  const toks = tokenize(clean);
  const attrsOf = (t) => parseAttrs(t.raw);

  /* --- מיפוי label for=… --- */
  const labelledIds = new Set();
  for (let i = 0; i < toks.length; i++) {
    if (toks[i].name === 'label' && !toks[i].close) {
      const a = attrsOf(toks[i]);
      if (a.for) labelledIds.add(a.for);
    }
  }
  /* --- שדות שעטופים ב-<label> --- */
  /* ⚠️ הגבול התחתון הוא >= ולא >: ב-`<label><input …>` ה-input מתחיל
     בדיוק באינדקס שבו נגמרת תגית ה-label, ו-> פספס אותו. זו הייתה
     התבנית של כל תיבות הסימון בזרימת ההזמנה. */
  const wrappedByLabel = new Set();
  for (let i = 0; i < toks.length; i++) {
    if (toks[i].name !== 'label' || toks[i].close) continue;
    const end = toks[i].end + innerHTML(clean, toks, i).length;
    for (const t of toks) {
      if (!t.close && LABELLABLE.test(t.name) && t.start >= toks[i].end && t.start < end) {
        wrappedByLabel.add(t.start);
      }
    }
  }

  const headings = [];

  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    if (t.close) continue;
    const a = attrsOf(t);

    /* ---------- img-alt ---------- */
    if (t.name === 'img' && !('alt' in a)) {
      add('img-alt', t.start, '<img> בלי alt — קורא מסך יקריא את שם הקובץ');
    }

    /* ---------- svg-name ---------- */
    if (t.name === 'svg') {
      const hidden = a['aria-hidden'] === 'true' || a.role === 'presentation' || a.role === 'none';
      const named = !!(a['aria-label'] || a['aria-labelledby']) ||
        /<title[\s>]/i.test(innerHTML(clean, toks, i));
      if (!hidden && !named) {
        add('svg-name', t.start,
          '<svg> בלי aria-hidden="true" ובלי <title>/aria-label — אייקון דקורטיבי מוכרז כ"גרפיקה"');
      }
    }

    /* ---------- control-name ---------- */
    const isButton = t.name === 'button' || a.role === 'button' ||
      (t.name === 'input' && ['submit', 'button', 'reset'].includes((a.type || '').toLowerCase()));
    const isLink = t.name === 'a' && 'href' in a;
    if (isButton || isLink) {
      let name = (a['aria-label'] || '').trim() || (a.title || '').trim() ||
        (a['aria-labelledby'] || '').trim() || (a.value || '').trim();
      if (!name && t.name !== 'input') {
        const inner = innerHTML(clean, toks, i);
        name = textOf(inner);
        if (!name) {
          // תמונה עם alt, או svg עם שם, בתוך הפקד
          for (const it of tokenize(inner)) {
            if (it.close) continue;
            const ia = parseAttrs(it.raw);
            if (it.name === 'img' && (ia.alt || '').trim()) { name = ia.alt; break; }
            if ((ia['aria-label'] || '').trim()) { name = ia['aria-label']; break; }
          }
          if (!name && /<title[\s>]/i.test(inner)) name = 'svg-title';
        }
      }
      if (!name && a['aria-hidden'] !== 'true') {
        add('control-name', t.start,
          `<${t.name}> בלי שם נגיש — קורא מסך מכריז "כפתור" בלי לומר איזה`);
      }
    }

    /* ---------- field-label ---------- */
    if (LABELLABLE.test(t.name)) {
      const type = (a.type || 'text').toLowerCase();
      const skip = t.name === 'input' && NO_LABEL_INPUT_TYPES.has(type);
      if (!skip) {
        const ok = (a['aria-label'] || '').trim() || a['aria-labelledby'] ||
          (a.title || '').trim() || (a.id && labelledIds.has(a.id)) ||
          wrappedByLabel.has(t.start);
        if (!ok) {
          add('field-label', t.start,
            `<${t.name}${a.type ? ' type=' + a.type : ''}> בלי <label for>, aria-label או aria-labelledby`);
        }
      }
    }

    /* ---------- headings ---------- */
    if (/^h[1-6]$/.test(t.name)) headings.push({ level: +t.name[1], start: t.start });

    /* ---------- viewport-zoom ---------- */
    if (t.name === 'meta' && (a.name || '').toLowerCase() === 'viewport') {
      const c = (a.content || '').toLowerCase();
      if (/user-scalable\s*=\s*(no|0)/.test(c)) {
        add('viewport-zoom', t.start, 'user-scalable=no — חוסם זום, כשל WCAG 1.4.4');
      }
      const ms = /maximum-scale\s*=\s*([\d.]+)/.exec(c);
      if (ms && +ms[1] < 2) {
        add('viewport-zoom', t.start, `maximum-scale=${ms[1]} — מגביל זום מתחת ל-200%`);
      }
    }
  }

  /* ---------- page-h1 / heading-skip ---------- */
  if (!headings.some((h) => h.level === 1)) {
    add('page-h1', 0, 'אין <h1> בדף — לקורא מסך אין שם לעמוד');
  }
  let prev = 0;
  for (const h of headings) {
    if (prev && h.level > prev + 1) {
      add('heading-skip', h.start, `דילוג מ-h${prev} ל-h${h.level} — רמה חסרה בעץ הכותרות`);
    }
    prev = h.level;
  }

  /* ---------- unresolved-var ----------
     ⚠️ הדף מגדיר צבעים ב-<style> משלו, אבל הטוקנים חיים ב-style.css.
     דף שאינו טוען את הגיליון הזה ומעתיק כלל שמשתמש ב-var() מקבל צבע
     ריק — הטקסט יורש את צבע ההורה בשקט, בלי שגיאה ובלי שום סימן.
     זה בדיוק מה שיקרה למי שיעתיק כלל מ-style.css אל listing.html. */
  const available = new Set();
  for (const m of clean.matchAll(/<link\b[^>]*rel\s*=\s*["']?stylesheet["']?[^>]*>/gi)) {
    const href = /href\s*=\s*["']([^"']+)["']/.exec(m[0]);
    if (!href) continue;
    const target = href[1].startsWith('/')
      ? join(ROOT, href[1].slice(1))
      : resolve(ROOT, dirname(file), href[1]);
    try { for (const v of declaredVars(readFileSync(target, 'utf8'))) available.add(v); }
    catch { /* גיליון חיצוני (גופנים) — אין מה לקרוא */ }
  }
  /* הערות CSS מנוטרלות: הן מצטטות שמות טוקנים (למשל בהסבר "היה
     var(--x)"), וציטוט אינו שימוש. */
  const inlineCss = [...clean.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)]
    .map((m) => m[1].replace(/\/\*[\s\S]*?\*\//g, blank)).join('\n');
  for (const v of declaredVars(inlineCss)) available.add(v);

  const seenVar = new Set();
  for (const m of [...inlineCss.matchAll(/var\(\s*(--[\w-]+)/g),
                   ...clean.matchAll(/\sstyle\s*=\s*"[^"]*var\(\s*(--[\w-]+)/gi)]) {
    if (available.has(m[1]) || seenVar.has(m[1])) continue;
    seenVar.add(m[1]);
    add('unresolved-var', m.index, `var(${m[1]}) — הדף אינו טוען שום גיליון שמגדיר את הטוקן הזה`);
  }

  /* ---------- raw-color (בתוך <style> ובתוך style="…") ---------- */
  for (const m of clean.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)) {
    scanCssText(m[1], m.index + m[0].indexOf(m[1]), file, src, palette, found);
  }
  for (const m of clean.matchAll(/\sstyle\s*=\s*"([^"]*)"/gi)) {
    scanDecls(m[1], m.index, file, src, palette, found);
  }

  return found;
}

/** `color:` בלבד — הוא מה שצובע טקסט. רקעים נבדקים בסורק הדפדפן. */
function scanDecls(text, baseIdx, file, src, palette, found) {
  for (const m of text.matchAll(/(^|[;{}\s])color\s*:\s*([^;}{]+)/gi)) {
    const value = m[2].trim().replace(/!important\s*$/i, '').trim();
    if (value.startsWith('var(')) continue;
    if (KEYWORD_COLORS.has(value.toLowerCase())) continue;
    const n = normColor(value);
    if (n === null) continue;               // gradient/עיבוד אחר — לא צבע טקסט פשוט
    if (palette.has(n)) continue;
    found.push({
      file,
      rule: 'raw-color',
      line: lineOf(src, baseIdx),
      msg: `color: ${value} — ערך גולמי שאינו בפלטה. צבע טקסט חייב לבוא מ-var(--…) שנמדד`,
    });
  }
}

function scanCssText(css, baseIdx, file, src, palette, found) {
  const stripped = css.replace(/\/\*[\s\S]*?\*\//g, blank);
  for (const m of stripped.matchAll(/(^|[;{}\s])color\s*:\s*([^;}{]+)/gi)) {
    const value = m[2].trim().replace(/!important\s*$/i, '').trim();
    if (value.startsWith('var(')) continue;
    if (KEYWORD_COLORS.has(value.toLowerCase())) continue;
    const n = normColor(value);
    if (n === null || palette.has(n)) continue;
    found.push({
      file,
      rule: 'raw-color',
      line: lineOf(src, baseIdx + m.index),
      msg: `color: ${value} — ערך גולמי שאינו בפלטה. צבע טקסט חייב לבוא מ-var(--…) שנמדד`,
    });
  }
}

function checkStylesheet(file, css, palette) {
  const found = [];
  scanCssText(css, 0, file, css, palette, found);
  return found;
}

/* ------------------------------------------------------------------ *
 * הרצה
 * ------------------------------------------------------------------ */

function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    if (e === 'node_modules' || e === '.git' || e === 'scripts') continue;
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(html|css)$/.test(e)) out.push(p);
  }
  return out;
}

const argv = process.argv.slice(2);
const verbose = argv.includes('--verbose');
const targets = argv.filter((a) => !a.startsWith('--'));

const files = targets.length
  ? targets.map((f) => resolve(ROOT, f))
  : walk(ROOT).sort();

const palette = loadPalette();
let findings = [];
let htmlCount = 0;

for (const f of files) {
  const rel = relative(ROOT, f);
  const src = readFileSync(f, 'utf8');
  if (f.endsWith('.css')) findings.push(...checkStylesheet(rel, src, palette));
  else { htmlCount++; findings.push(...checkDocument(rel, src, palette)); }
}

findings.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);

const RULES = ['img-alt', 'control-name', 'field-label', 'svg-name', 'page-h1',
  'heading-skip', 'viewport-zoom', 'raw-color', 'unresolved-var'];

if (findings.length) {
  let last = '';
  for (const f of findings) {
    if (f.file !== last) { console.log(`\n  ${f.file}`); last = f.file; }
    console.log(`    ${String(f.line).padStart(5)}  [${f.rule}]  ${f.msg}`);
  }
  const byRule = {};
  for (const f of findings) byRule[f.rule] = (byRule[f.rule] || 0) + 1;
  console.log(`\n  ✗ ${findings.length} ממצאים ב-${new Set(findings.map((f) => f.file)).size} קבצים`);
  console.log('    ' + RULES.filter((r) => byRule[r]).map((r) => `${r}=${byRule[r]}`).join('  '));
  process.exit(1);
}

console.log(`  ✓ נגישות סטטית נקייה — ${htmlCount} דפי HTML, ${files.length - htmlCount} גיליונות סגנון, ${RULES.length} בדיקות`);
if (verbose) console.log('    ' + RULES.join('  '));
process.exit(0);
