// ‏`?src=` — קישורים מסומנים מהביו ומהפוסטים (ליאור, 12.11: "אם יש ?src= בקישור,
// לשמור גם אותו"). נשמר **רק הביקור הראשון** (first touch), ורק כשהמדידה דלוקה
// ב"הגדרות מדידה". זה נתון מדידה, ומי שכיבה מדידה לא נמדד.
//
// מודול בלי Firebase בכוונה: `analytics.js` מייבא אותו בדף הבית, ושם אסור
// למשוך את כל ה-SDK בשביל שורה ב-localStorage.
import { isMeasurementEnabled } from './measurement-state.js';

export const ATTRIBUTION_KEY = 'rozic:src';

/** רק אותיות לטיניות, ספרות, מקף וקו תחתון, עד 40 תווים. כל השאר נזרק. */
function cleanSrc(raw) {
  const v = String(raw || '').trim().toLowerCase();
  return /^[a-z0-9_-]{1,40}$/.test(v) ? v : null;
}

export function captureAttribution() {
  try {
    if (!isMeasurementEnabled()) return;
    if (localStorage.getItem(ATTRIBUTION_KEY)) return;
    const src = cleanSrc(new URLSearchParams(location.search).get('src'));
    if (src) localStorage.setItem(ATTRIBUTION_KEY, JSON.stringify({ src, at: Date.now() }));
  } catch { /* localStorage חסום (גלישה פרטית) — אין מדידה, ואין שגיאה למשתמש */ }
}

/** ה-src שנשמר, או `null`. */
export function readAttribution() {
  try {
    const v = JSON.parse(localStorage.getItem(ATTRIBUTION_KEY) || 'null');
    return cleanSrc(v?.src);
  } catch { return null; }
}
