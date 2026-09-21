/**
 * תחביר JavaScript — כל מודול וכל בלוק `<script type="module">` מוטבע.
 *
 * ## למה זה נוסף (21.9) — אחרי השבתה בייצור
 * עריכה אוטומטית שהוסיפה שם לרשימת ייבוא הותירה **פסיק כפול**:
 * `writeBatch,, deleteField`. הקובץ נפרס, והתוצאה הייתה
 * `SyntaxError: Unexpected token ','` על `app/orders.js` — כלומר
 * **כל דף שמייבא אותו הפסיק לעבוד**: אשף ההזמנה, עמוד הבית של האזור
 * האישי, מסך הסטטוס. הקטלוג נפתח ריק, ואי אפשר היה ליצור הזמנה.
 *
 * ⚠️⚠️ **ומה שהופך את זה לגדר ולא להערה: `node --check` עבר על הקובץ
 * השבור.** הוא מפרש `.js` כ-CommonJS, ושם `import` אינו נבדק כהצהרת
 * מודול. הרצתי אותו, קיבלתי "תקין", ופרסתי. **בדיקה שעוברת על קוד
 * שבור גרועה מאין בדיקה** — היא נתנה לי ביטחון שגוי.
 *
 * הצורה הנכונה היא `node --input-type=module --check`, והיא נבדקה:
 * על הפסיק הכפול היא נופלת, ועל הקובץ המתוקן היא עוברת.
 *
 * ## מה נבדק
 * כל `app/*.js`, `app/data/*.js`, וכל בלוק `<script type="module">`
 * מוטבע בדפי ה-HTML.
 *
 * ⚠️ **הערות HTML מוסרות לפני החילוץ.** הערת ה-CSP בראש כל דף מכילה
 * את הטקסט `<script type="module">` כדוגמה, וחילוץ נאיבי מנסה להריץ
 * פרוזה בעברית כ-JavaScript. נפלתי בזה פעמיים לפני שהבנתי.
 */
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { execFileSync } from 'child_process';

const ROOT = join(import.meta.dirname, '..');
const failures = [];
let checked = 0;

/** מריץ את הבודק כמודול. מחזיר `null` כשתקין, או הודעת השגיאה. */
function checkModule(source, label) {
  checked++;
  try {
    execFileSync('node', ['--input-type=module', '--check'], {
      input: source, stdio: ['pipe', 'pipe', 'pipe'],
    });
    return null;
  } catch (err) {
    const text = String(err.stderr ?? err.message);
    const line = text.split('\n').find(l => /Error/.test(l)) ?? text.split('\n')[0];
    failures.push(`${label} — ${line.trim().slice(0, 120)}`);
    return line;
  }
}

for (const dir of ['app', 'app/data']) {
  for (const f of readdirSync(join(ROOT, dir)).filter(f => f.endsWith('.js'))) {
    const rel = `${dir}/${f}`;
    checkModule(readFileSync(join(ROOT, rel), 'utf8'), rel);
  }
}

// ⚠️ הערות מוסרות תחילה — ראו ההערה למעלה.
const stripComments = (s) => s.replace(/<!--[\s\S]*?-->/g, (m) => ' '.repeat(m.length));

const htmlFiles = [
  ...readdirSync(join(ROOT, 'app')).filter(f => f.endsWith('.html')).map(f => `app/${f}`),
  ...readdirSync(ROOT).filter(f => f.endsWith('.html')).map(f => f),
];
for (const rel of htmlFiles) {
  const src = stripComments(readFileSync(join(ROOT, rel), 'utf8'));
  let i = 0;
  for (const m of src.matchAll(/<script type="module">([\s\S]*?)<\/script>/g)) {
    i++;
    const code = m[1];
    if (code.trim().length < 100) continue;
    checkModule(code, `${rel} (בלוק ${i})`);
  }
}

if (failures.length) {
  console.error(`\n  ✗ ${failures.length} קבצים עם שגיאת תחביר:`);
  for (const f of failures) console.error(`    · ${f}`);
  console.error('\n  ⚠️ שגיאת תחביר במודול משביתה **כל דף שמייבא אותו**.');
  console.error('  ⚠️ `node --check` לבדו אינו תופס את זה — הוא מפרש .js');
  console.error('     כ-CommonJS. חייבים `--input-type=module`.\n');
  process.exit(1);
}
console.log(`  ✓ תחביר תקין — ${checked} מודולים ובלוקים מוטבעים.`);
