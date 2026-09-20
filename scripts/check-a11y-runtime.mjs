/**
 * בדיקות נגישות **בזמן ריצה** — ניגודיות, סדר מיקוד, וזום 200%.
 *
 * ## למה זה נוסף (21.9)
 * `check-a11y.mjs` סורק **מקור**: HTML ו-CSS כטקסט. הוא לא מריץ דפדפן,
 * ולכן אינו יכול לדעת מה הצבע שנוצר בפועל אחרי הקסקדה, מה סדר המיקוד
 * בפועל, או מה קורה בזום.
 *
 * ⚠️ **וזו לא הערה תיאורטית — ההצהרה המשפטית טוענת אחרת.**
 * `accessibility.html` §9 מצהיר במפורש: *"לצד הבדיקה הידנית מריצים
 * בדיקות מדידה שכתבנו לעצמנו, ושרצות על כל דפי האתר: יחסי ניגודיות של
 * כל טקסט מול הרקע שעליו הוא מוצג בפועל... סדר המיקוד במקלדת,
 * והתנהגות התוכן בהגדלה של 200%."*
 *
 * שלוש הטענות האלה לא היו מגובות בשום קוד. ההצהרה היא **התחייבות
 * משפטית**, והבחירה בין לרכך אותה לבין להפוך אותה לנכונה היא לא
 * באמת בחירה. הקובץ הזה הוא הצד השני.
 *
 * ## ⚠️ למה הניגודיות נמדדת ע"י axe ולא ביד
 * הגרסה הראשונה של הקובץ הזה חישבה ניגודיות בעצמה, בהליכה על שרשרת
 * ההורים עד רקע אטום. היא דיווחה 1.05:1 על לוגו הניווט — **ונכונה
 * אריתמטית**: הלוגו לבן, וכל ההורים שקופים עד `body` הבהיר.
 *
 * אבל הרקע שנצבע בפועל מתחתיו הוא **ההירו הירוק הכהה**, שאינו הורה
 * אלא אלמנט שיושב מתחת בסדר הציור. שרשרת ה-DOM אינה יודעת דבר על
 * סדר ציור, ולכן כל אלמנט ממוקם (`fixed`/`absolute`) מייצר ממצא שקרי.
 * **בדיקה שצועקת על טקסט קריא לחלוטין מאמנת להתעלם ממנה** — וזה גרוע
 * מלא לבדוק כלל.
 *
 * `axe-core` פותר בדיוק את זה (הוא מטפל בחפיפה, בשקיפות ובסדר ציור),
 * וזה בעיה עדינה שאין שום טעם לממש מחדש גרוע יותר. הוא נטען מ-CDN
 * כי הריפו הזה הוא וניל בלי `node_modules` — וזה סקריפט פיתוח, לא
 * קוד שנשלח ללקוח.
 *
 * ## למה קובץ נפרד ולא הרחבה של `check-a11y.mjs`
 * זה דורש דפדפן ושרת מקומי. `check-a11y` חייב להישאר מהיר וחסר-תלויות
 * כדי שירוץ לפני כל קומיט; זה רץ כשיש סביבה. **בלי סביבה הוא מדלג
 * בקול ולא נכשל** — אותה מדיניות כמו `check-app-web-const-sync`
 * כשריפו האפליקציה חסר.
 *
 * ## ⚠️ למה נדרש stub לאימות
 * דפי `app/` מפנים ל-`login.html` למי שאינו מחובר. בלי stub הבדיקה
 * טוענת 18 פעמים את **דף ההתחברות**, מכריזה "25 דפים נקיים", ולא
 * בדקה את המסכים עצמם ולו פעם אחת. נתפס כשהזרקתי ניגודיות שבורה
 * ל-`settings.html` והבדיקה **לא צעקה** — הסימן שהיא מודדת דף אחר.
 *
 * ה-stub נגזר **מהקובץ האמיתי** ולא נכתב ביד: כל ייצוא חסר מפיל את
 * המודול ב-`SyntaxError` והדף נשאר ריק — מה שנראה בדיוק כמו באג בדף.
 *
 * ## הפעלה
 *   python3 -m http.server 8898           # מתוך שורש הריפו
 *   chrome --remote-debugging-port=9222
 *   node scripts/check-a11y-runtime.mjs
 */
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const ROOT = join(import.meta.dirname, '..');
const BASE = process.env.A11Y_BASE ?? 'http://localhost:8898';
const CDP = process.env.A11Y_CDP ?? 'http://localhost:9222';

function pages() {
  const roots = readdirSync(ROOT).filter(f => f.endsWith('.html') && !f.startsWith('preview-'));
  const app = readdirSync(join(ROOT, 'app')).filter(f => f.endsWith('.html')).map(f => `app/${f}`);
  return [...roots, ...app];
}

/**
 * בונה מודול חלופי שמייצא בדיוק את מה שהמקור מייצא.
 * ⚠️ נגזר מהמקור ולא נכתב ביד — ראו ההערה למעלה.
 */
function stubFor(rel, overrides = {}) {
  const src = readFileSync(join(ROOT, rel), 'utf8');
  const names = [
    ...src.matchAll(/^export\s+(?:async\s+)?function\s+(\w+)/gm),
    ...src.matchAll(/^export\s+const\s+(\w+)/gm),
  ].map(m => m[1]);
  return [...new Set(names)].map(n => {
    if (overrides[n]) return `export ${overrides[n]}`;
    if (n.startsWith('subscribe')) return `export function ${n}(a, cb) { if (typeof cb === 'function') cb([]); return () => {}; }`;
    if (/^[A-Z0-9_]+$/.test(n)) return `export const ${n} = [];`;
    return `export async function ${n}() { return null; }`;
  }).join('\n');
}

const STUBS = {
  'auth.js': () => stubFor('app/auth.js', {
    
    getAuthOptional: `async function getAuthOptional() { return { authUser: { uid: 'A11Y' }, profile: { name: 'בדיקה' } }; }`,
    currentProviderId: `function currentProviderId() { return 'password'; }`,
    isValidFullName: `const isValidFullName = () => true;`,
    FULL_NAME_ERROR: `const FULL_NAME_ERROR = '';`,
  }),
  'firebase.js': () => `export const auth = { currentUser: { uid: 'A11Y', providerData: [{ providerId: 'password' }] }, onAuthStateChanged(cb) { cb(this.currentUser); return () => {}; } };
export const db = {};`,
  'orders.js': () => stubFor('app/orders.js', {
    STATUS_LABELS: `const STATUS_LABELS = {};`,
    hasActiveOrders: `async function hasActiveOrders() { return false; }`,
  }),
  'account.js': () => stubFor('app/account.js'),
};

const findings = [];
const note = (page, rule, msg) => findings.push({ page, rule, msg });

async function connect() {
  const res = await fetch(`${CDP}/json/new?${encodeURIComponent('about:blank')}`, { method: 'PUT' });
  const tab = await res.json();
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  let id = 0;
  const pending = new Map();
  const api = { onPaused: null };
  ws.addEventListener('message', (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); return; }
    if (m.method === 'Fetch.requestPaused' && api.onPaused) api.onPaused(m.params);
  });
  await new Promise(r => ws.addEventListener('open', r));
  const send = (method, params = {}) => new Promise(r => {
    const i = ++id; pending.set(i, r);
    ws.send(JSON.stringify({ id: i, method, params }));
  });
  Object.assign(api, { send, ws, targetId: tab.id });
  return api;
}

/** ⚠️ גרסה נעוצה ולא `latest` — בדיקה שמשנה התנהגות מעצמה בין הרצות
    אינה בדיקה. שדרוג הוא החלטה, לא תופעת לוואי של הרשת. */
const AXE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.10.2/axe.min.js';

/** סדר מיקוד — `tabindex` חיובי שובר אותו. זו טענה מבנית, לא ויזואלית,
    ולכן היא נמדדת כאן ולא ע"י axe. */
const FOCUS_PROBE = `JSON.stringify([...document.querySelectorAll('[tabindex]')]
  .filter(e => +e.getAttribute('tabindex') > 0)
  .map(e => e.tagName.toLowerCase() + '[tabindex=' + e.getAttribute('tabindex') + ']'))`;

/**
 * זום 200% — **גלילה אופקית בלבד, לא "תוכן נחתך".**
 *
 * ⚠️ הגרסה הראשונה חיפשה כל אלמנט עם `overflow:hidden` שתוכנו גבוה
 * מהקופסה, ודיווחה 14 ממצאים — **כולם שקריים**: `.sr-only` נחתך
 * בהגדרה (זה כל המנגנון שלו), `.auth-shell` חותך שני עיגולים
 * דקורטיביים ב-`::before`/`::after`, ו-`.scan` הוא פריים אנימציה
 * שנחתך בכוונה. אי-אפשר להבחין בין קישוט לתוכן מתוך ה-DOM לבד, ובדיקה
 * שמדווחת על שלושתם מאמנת להתעלם ממנה.
 *
 * מה ש-WCAG 1.4.10 (Reflow) באמת דורש הוא שלא תידרש **גלילה
 * דו-כיוונית**: התוכן חייב להסתדר ברוחב 320px שקול בלי גלילה אופקית.
 * זה מדיד חד-משמעית, וזו הטענה שההצהרה מבטיחה. שתי נקודות מדידה:
 * 640px (זום 200% על דסקטופ 1280) ו-320px (התקרה של התקן עצמו).
 */
const REFLOW_PROBE = `(function () {
  const de = document.documentElement;
  /* +2 סובלנות לעיגול תת-פיקסלי; מתחת לזה אין גלילה אמיתית. */
  const overflowBy = de.scrollWidth - de.clientWidth;
  return JSON.stringify({
    overflowBy: overflowBy > 2 ? overflowBy : 0,
    /* מי גורם לה — בלי זה הממצא אינו ניתן לתיקון. */
    widest: overflowBy > 2 ? [...document.querySelectorAll('body *')]
      .filter(e => e.getBoundingClientRect().width > de.clientWidth + 2)
      .slice(0, 2)
      .map(e => e.tagName.toLowerCase() + '.' + String(e.className || '').trim().split(/\\s+/)[0]) : [],
  });
})()`;

async function main() {
  let cdp;
  try {
    cdp = await connect();
  } catch {
    console.log('  ⚠️  אין דפדפן על ' + CDP + ' — מדלג. (ראו ההוראות בראש הקובץ.)');
    process.exit(0);
  }
  const { send } = cdp;
  try {
    const probe = await fetch(`${BASE}/index.html`);
    if (!probe.ok) throw new Error('bad status');
  } catch {
    console.log('  ⚠️  אין שרת על ' + BASE + ' — מדלג.');
    process.exit(0);
  }

  // ⚠️ נטען פעם אחת ומוזרק לכל דף — הורדה פר-דף הייתה מכפילה את זמן
  // הריצה ותלויה ברשת 26 פעמים במקום אחת.
  let axeSrc;
  try { axeSrc = await (await fetch(AXE_URL)).text(); }
  catch { console.log('  ⚠️  לא ניתן להוריד את axe — מדלג.'); process.exit(0); }

  /* ⚠️ `requestStage: 'Request'` — מחליפים לפני שהרשת בכלל פונה. */
  await send('Fetch.enable', {
    patterns: Object.keys(STUBS).map(f => ({ urlPattern: `*/app/${f}*`, requestStage: 'Request' })),
  });
  cdp.onPaused = async ({ requestId, request }) => {
    const hit = Object.keys(STUBS).find(f => request.url.includes(`/app/${f}`));
    const body = hit ? STUBS[hit]() : '';
    await send('Fetch.fulfillRequest', {
      requestId, responseCode: 200,
      responseHeaders: [{ name: 'content-type', value: 'application/javascript; charset=utf-8' }],
      body: Buffer.from(body, 'utf8').toString('base64'),
    });
  };

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Network.enable');
  await send('Network.setCacheDisabled', { cacheDisabled: true });

  const list = pages();
  for (const page of list) {
    // 1280×900 — רוחב דסקטופ טיפוסי.
    await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
    await send('Page.navigate', { url: `${BASE}/${page}` });
    await new Promise(r => setTimeout(r, 1500));

    /* ⚠️ **הטענה שמונעת את הכשל השקט של הבדיקה עצמה.** אם דף `app/`
       מרונדר כדף ההתחברות, כל מה שיימדד אחריו הוא דף אחר — והבדיקה
       תכריז "נקי" על מסך שלא נבדק מעולם. זה קרה בפועל: 18 דפים נמדדו
       כדף התחברות עד שזה נתפס. */
    const idRaw = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `JSON.stringify({ path: location.pathname, len: document.body.innerText.trim().length })`,
    });
    const idv = idRaw?.result?.value ? JSON.parse(idRaw.result.value) : null;
    if (idv && !idv.path.endsWith(page.replace(/^.*\//, ''))) {
      note(page, 'not-rendered', `הדף הופנה ל-${idv.path} — לא נבדק בפועל`);
      continue;
    }
    if (idv && idv.len < 200) {
      note(page, 'not-rendered', `הדף רונדר כמעט ריק (${idv.len} תווים) — לא נבדק בפועל`);
      continue;
    }

    await send('Runtime.evaluate', { expression: axeSrc });
    const araw = await send('Runtime.evaluate', {
      /* ⚠️ `{ type: 'rule', values: [...] }` ולא מערך חשוף. מערך חשוף
         מתפרש ב-axe כ**תגיות** (`wcag2aa` וכו'), ו-`color-contrast`
         הוא מזהה **כלל** — כלומר הוא לא תאם שום תגית ו-axe הריץ אפס
         כללים והחזיר אפס הפרות. הבדיקה הכריזה "נקי" על 25 דפים בלי
         לבדוק ניגודיות ולו פעם אחת, ונתפסה רק כשהזרקתי #DDD על #FFF
         והיא שתקה. */
      expression: `axe.run(document, { runOnly: { type: 'rule', values: ['color-contrast'] } })
        .then(r => JSON.stringify(r.violations.flatMap(v => v.nodes.map(n => ({
          target: n.target[0], msg: (n.any[0] && n.any[0].message) || v.help })))))`,
      awaitPromise: true, returnByValue: true,
    });
    const viol = araw?.result?.value ? JSON.parse(araw.result.value) : null;
    if (viol === null) { note(page, 'runtime', 'axe לא רץ על הדף'); }
    for (const v of (viol ?? []).slice(0, 5)) {
      note(page, 'contrast', `${v.target} — ${v.msg}`);
    }

    const fraw = await send('Runtime.evaluate', { expression: FOCUS_PROBE, returnByValue: true });
    for (const f of JSON.parse(fraw?.result?.value ?? '[]')) {
      note(page, 'focus-order', `tabindex חיובי שובר את סדר המיקוד: ${f}`);
    }

    // 2. Reflow — 640px (זום 200% על דסקטופ) ואז 320px (תקרת התקן).
    for (const [w, label] of [[640, 'זום 200%'], [320, 'רוחב 320px']]) {
      await send('Emulation.setDeviceMetricsOverride', { width: w, height: 600, deviceScaleFactor: 1, mobile: false });
      await new Promise(r => setTimeout(r, 500));
      const zraw = await send('Runtime.evaluate', { expression: REFLOW_PROBE, returnByValue: true });
      const z = zraw?.result?.value ? JSON.parse(zraw.result.value) : null;
      if (z?.overflowBy) {
        note(page, 'reflow', `${label}: גלילה אופקית של ${z.overflowBy}px${z.widest.length ? ' — ' + z.widest.join(', ') : ''}`);
      }
    }
  }

  if (findings.length) {
    console.error(`\n  ✗ ${findings.length} ממצאי נגישות בזמן ריצה:`);
    let last = '';
    for (const f of findings.slice(0, 40)) {
      if (f.page !== last) { console.error(`\n  ${f.page}`); last = f.page; }
      console.error(`      [${f.rule}]  ${f.msg}`);
    }
    console.error('\n  ⚠️ הצהרת הנגישות (§9) מתחייבת שהבדיקות האלה רצות על כל דפי האתר.');
    process.exit(1);
  }
  console.log(`  ✓ נגישות בזמן ריצה נקייה — ${list.length} דפים · ניגודיות (axe), סדר מיקוד, ו-reflow ב-640/320px.`);
  process.exit(0);
}

await main();
