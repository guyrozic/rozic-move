import { ITEM_PRICES } from './pricing.js';
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
