import { ITEM_PRICES } from './pricing.js';
import { findItemAnywhere } from './items.js';
/**
 * "מובילים בקטנה" (smallMove) uses items.ts's ALL_ROOMS catalog directly — no separate
 * item list. This file holds only the two concepts unique to this flow: box-only-move
 * inventory (BOX_ITEMS) and van-capacity estimation (estimateVolume/MAX_VOLUME).
 */
export const BOX_ITEMS = [
    { key: 'box_s', label: 'קופסה S — 30×30×30 ס"מ', icon: '📦', price: ITEM_PRICES.misc.box_S, volume: 1 },
    { key: 'box_m', label: 'קופסה M — 40×40×50 ס"מ', icon: '📦', price: ITEM_PRICES.misc.box_M, volume: 1 },
    { key: 'box_l', label: 'קופסה L — 50×50×70 ס"מ', icon: '📦', price: ITEM_PRICES.misc.box_L, volume: 2 },
];
export const MAX_VOLUME = 10;
/** Van-capacity units (1-4) for an items.ts RoomItem — no stored data, derived on the fly from its physical-handling flags. */
export function estimateVolume(item) {
    if (item.heavy && item.needsDisassembly)
        return 4;
    if (item.heavy)
        return 3;
    if (item.needsDisassembly)
        return 2;
    return 1;
}
/** נפח יחידה בודדת לפי מפתח — מאחד את שני מקורות הפריטים של הזרימה (קטלוג + קרטונים). */
export function unitVolumeOf(itemKey) {
    const item = findItemAnywhere(itemKey);
    if (item)
        return estimateVolume(item);
    return BOX_ITEMS.find(b => b.key === itemKey)?.volume ?? 1;
}
export function totalVolumeOf(quantities) {
    return Object.entries(quantities).reduce((sum, [key, qty]) => sum + unitVolumeOf(key) * qty, 0);
}
/**
 * מחיל שינויי כמויות תחת תקרת נפח הטנדר — **הנתיב היחיד** שכל דרכי ההוספה
 * במסך הפריטים של "מובילים בקטנה" צריכות לעבור בו. פורט מ-smallMoveItems.ts
 * (17.9, אכיפת קיבולת בנתיבי ה-AI באתר — ראו applyWithinCapacity שם לתיעוד
 * המלא של הבאג שזה סוגר).
 *
 * הוספה חלקית ולא הכל-או-כלום: אם התבקשו 8 כיסאות ויש מקום ל-5, נכנסים 5
 * ומדווח מה נחסם, כדי שהקורא יסביר למשתמש במקום להשתיק. הורדות מוחלות
 * תמיד ולפני ההוספות — כך ש"תוריד ספה ותוסיף מיטה" בהודעה אחת מפנה מקום
 * לפני שממלאים אותו.
 */
export function applyWithinCapacity(current, changes) {
    const next = { ...current };
    let volume = totalVolumeOf(next);
    const blocked = [];
    const isIncrease = (c) => c.action === 'set' ? Math.max(0, c.qty) > (next[c.itemKey] || 0) : c.action !== 'remove';
    const ordered = [...changes].sort((a, b) => Number(isIncrease(a)) - Number(isIncrease(b)));
    for (const change of ordered) {
        const unit = unitVolumeOf(change.itemKey);
        const cur = next[change.itemKey] || 0;
        const target = change.action === 'remove' ? Math.max(0, cur - change.qty)
            : change.action === 'set' ? Math.max(0, change.qty)
                : cur + change.qty;
        const delta = target - cur;
        if (delta <= 0) {
            next[change.itemKey] = target;
            volume += delta * unit;
            continue;
        }
        // unit=0 לא אמור לקרות (estimateVolume מחזיר 1-4), אבל חלוקה באפס כאן
        // הייתה מחזירה Infinity ומבטלת את התקרה לגמרי — לא שווה את הסיכון.
        const room = Math.max(0, MAX_VOLUME - volume);
        const canAdd = unit > 0 ? Math.floor(room / unit) : delta;
        const applied = Math.min(delta, canAdd);
        if (applied < delta)
            blocked.push({ itemKey: change.itemKey, requested: delta, applied });
        next[change.itemKey] = cur + applied;
        volume += applied * unit;
    }
    return { next, blocked };
}
