// ============================================================
//  ROZIC MOVE — קובץ מחירון מרכזי
//  כל שינוי מחיר נעשה כאן בלבד. הקוד כולו קורא מפה.
// ============================================================
import { findItemAnywhere, getPackingInfo, getItemPriceAnyCategory } from './items.js';
/** 12.11.2026 (גיא): מחירי הקוד הם מחירי השוק אחרי כיול 1, זהים ל-config/itemPrices בייצור (×1.8 מהקודמים). זהה לאפליקציה. */
export const ITEM_PRICES = {
    bedroom: {
        single_bed: 216,
        double_bed: 324,
        king_bed: 396,
        baby_bed: 144,
        bunk_bed: 360,
        wardrobe_small: 162,
        wardrobe_medium: 252,
        wardrobe_large: 360,
        wardrobe_giant: 468,
        nightstand_small: 63,
        nightstand_medium: 81,
        nightstand_large: 99,
        nightstand_giant: 126,
        tv_up_to_55: 108,
        tv_above_55: 162,
        tv_75_90: 216,
        tv_90_120: 288,
        desktop_monitor: 81,
        bed_one_half: 270,
        electric_bed_single: 324,
        electric_bed_double: 396,
        electric_bed_half: 360,
        electric_bed_king: 450,
        mattress_single: 72,
        mattress_half: 90,
        mattress_double: 108,
        mattress_king: 135,
        clothes_rack_small: 27,
        clothes_rack_large: 45,
        ironing_board: 27,
        sewing_machine: 72,
        sewing_table_combo: 126,
        portable_ac: 90,
        radiator: 54,
        fan_floor: 36,
        suitcase_xl: 54,
        suitcase_l: 45,
        suitcase_m: 36,
        suitcase_s: 27,
        vanity_table_small: 126,
        vanity_table_medium: 162,
        vanity_table_large: 198,
        mirror_standalone: 81,
        mirror_wall_small: 63,
        mirror_wall_medium: 99,
        mirror_wall_large: 144,
        mirror_wall_giant: 216,
        ottoman_small: 54,
        ottoman_medium: 81,
        ottoman_large: 108,
        chair_bedroom: 63,
        bookshelf_small: 90,
        bookshelf_large: 144,
        rug_s_sqm: 45,
        rug_m_sqm: 81,
        rug_l_sqm: 126,
        rug_xl_sqm: 180,
        ac_unit_1hp: 162,
        ac_unit_1_2hp: 216,
        ac_unit_2_3hp: 288,
        fan_ceiling: 99,
        safe_small_light: 99,
        safe_small_heavy: 144,
        honeycomb_shelf: 81,
    },
    living_room: {
        // תזכיר נדב #167 (הוכרע 12.11): מחיר הקוד בטבלה × 1.8, מחיר השוק אחרי כיול 1
        shoe_rack_open: 45,
        shoe_cabinet_medium: 81,
        shoe_cabinet_tall: 99,
        coat_rack_stand: 27,
        armchair_1seat: 162,
        sofa_2seat: 216,
        sofa_3seat: 288,
        sofa_l_shape: 504,
        sofa_corner: 396,
        coffee_table_small: 81,
        coffee_table_medium: 126,
        coffee_table_large: 171,
        tv_stand_small: 90,
        tv_stand_medium: 135,
        tv_stand_large: 189,
        tv_up_to_55: 108,
        tv_above_55: 162,
        tv_75_90: 216,
        tv_90_120: 288,
        speakers_medium: 72,
        speakers_large: 126,
        sound_bar: 54,
        subwoofer: 63,
        floor_lamp: 45,
        desk_lamp: 36,
        chandelier_small: 108,
        chandelier_large: 180,
        rug_s_sqm: 45,
        rug_m_sqm: 81,
        rug_l_sqm: 126,
        rug_xl_sqm: 180,
        painting_large: 72,
        painting_giant: 117,
        fireplace_electric: 144,
        aquarium_small: 90,
        aquarium_medium: 126,
        aquarium_large: 216,
        sofa_4seat: 324,
        home_cinema: 108,
        stereo_system: 90,
        snooker_table: 270,
        painting_medium: 54,
        painting_small: 36,
        wall_clock: 36,
        wing_chair: 135,
        ottoman_small: 54,
        ottoman_medium: 81,
        ottoman_large: 108,
        curtains: 45,
        projector_device: 81,
        buffet_sideboard: 153,
        display_cabinet: 171,
    },
    kitchen: {
        fridge_freezer_small: 180,
        fridge_freezer_medium: 252,
        fridge_freezer_large: 360,
        fridge_freezer_giant: 450,
        washer_dryer_small: 198,
        washer_dryer_large: 252,
        dishwasher_small: 162,
        dishwasher_large: 198,
        oven_builtin: 162,
        oven_wide: 234,
        oven_standalone: 198,
        countertop_oven: 63,
        microwave: 72,
        dining_table_small: 135,
        dining_table_medium: 180,
        dining_table_large: 234,
        dining_table_giant: 306,
        dining_chair: 45,
        bar_stool: 54,
        kitchen_island_small: 180,
        kitchen_island_medium: 252,
        kitchen_island_large: 342,
        kitchen_island_giant: 468,
        coffee_machine_small: 45,
        coffee_machine_large: 72,
        bread_machine: 45,
        air_fryer_large: 45,
        stand_mixer: 54,
        toaster_oven: 36,
        cooktop: 90,
        range_hood: 72,
        blender: 27,
        food_processor: 32,
        juicer: 27,
        electric_kettle: 22,
        toaster: 22,
        tami_4: 63,
        pantry_unit_small: 126,
        pantry_unit_medium: 198,
        pantry_unit_large: 288,
        pantry_unit_giant: 396,
        wine_fridge: 108,
    },
    office: {
        desk_small: 108,
        desk_medium: 144,
        desk_large: 198,
        desk_giant: 270,
        desk_standing: 180,
        meeting_table_small: 252,
        meeting_table_medium: 360,
        meeting_table_large: 504,
        office_chair: 72,
        safe_small_light: 99,
        safe_small_heavy: 144,
        desktop_tower: 90,
        desktop_monitor: 81,
        printer_small: 72,
        printer_large: 216,
        projector_screen: 126,
        photocopier_small: 126,
        photocopier_large: 252,
        paper_shredder_small: 45,
        paper_shredder_large: 99,
        vacuum_cleaner: 45,
        laptop_computer: 54,
    },
    kids_room: {
        single_bed_kids: 162,
        bunk_bed: 360,
        play_kitchen: 99,
        trampoline_small: 126,
        bookshelf_kids: 90,
        rocking_horse: 81,
        kids_bike: 54,
        kids_car: 63,
        trampoline_large: 144,
    },
    bathroom: {
        mirror_bathroom_small: 54,
        mirror_bathroom_large: 90,
        towel_rack_large: 45,
        laundry_basket_large: 36,
    },
    storage_balcony: {
        // תזכיר נדב #167 (הוכרע 12.11): מחיר הקוד בטבלה × 1.8, מחיר השוק אחרי כיול 1
        surfboard_short: 63,
        surfboard_long: 81,
        sup_board: 108,
        kayak: 144,
        ski_snowboard: 54,
        golf_bag: 54,
        punching_bag: 72,
        balance_board: 27,
        camping_gear: 45,
        fishing_gear: 36,
        outdoor_chair: 36,
        sunshade_small: 63,
        sunshade_large: 126,
        bbq_grill_small: 99,
        bbq_grill_large: 198,
        outdoor_storage_box_small: 63,
        outdoor_storage_box_medium: 108,
        outdoor_storage_box_large: 162,
        potted_plant_small: 32,
        potted_plant_medium: 54,
        potted_plant_large: 81,
        bicycle: 108,
        electric_scooter: 81,
        storage_shelf_unit_small: 90,
        storage_shelf_unit_medium: 153,
        storage_shelf_unit_large: 234,
        generator: 180,
        water_heater: 144,
        ladder_small: 45,
        ladder_medium: 72,
        ladder_large: 117,
        stroller: 99,
        car_seat_box: 54,
        treadmill: 198,
        exercise_bike: 162,
        weight_bench: 144,
        sun_lounger: 72,
        garden_swing_small: 90,
        garden_swing_large: 153,
        outdoor_bench_small: 54,
        outdoor_bench_large: 90,
        taboon: 180,
        smoker: 144,
        lawnmower: 90,
        elliptical: 180,
        multi_trainer: 234,
        pilates_reformer: 270,
        ping_pong_table: 180,
        hammock_chair: 72,
        drying_rack_stand: 45,
        kids_slide: 108,
        vacuum_cleaner: 45,
        iron: 22,
        ironing_board: 27,
        rowing_machine: 180,
        pull_up_bar: 45,
    },
    misc: {
        keyboard_small: 63,
        keyboard_large: 135,
        piano_upright: 756,
        drum_kit_small: 108,
        drum_kit_medium: 180,
        drum_kit_large: 270,
        painting_large: 72,
        ac_unit_1hp: 162,
        ac_unit_1_2hp: 216,
        ac_unit_2_3hp: 288,
        water_cooler: 72,
        wine_rack_large: 90,
        darbouka: 54,
        guitar: 54,
        accordion: 63,
        vacuum_cleaner: 45,
        fan_floor: 36,
        pet_carrier: 36,
        pet_bed: 27,
        cat_scratching_post: 45,
        cat_tree: 63,
        small_pet_cage: 36,
        doghouse_small: 54,
        doghouse_medium: 90,
        doghouse_large: 135,
        pet_fence: 72,
        box_S: 22,
        box_M: 32,
        box_L: 45,
        box_XL: 63,
        safe_medium: 198,
    },
};
export const BOX_PRICES = {
    S: { buy: 8, move: 12, buyAndMove: 10, dimensions: '30×30×30 ס"מ' },
    M: { buy: 12, move: 18, buyAndMove: 15, dimensions: '40×40×50 ס"מ' },
    L: { buy: 18, move: 25, buyAndMove: 21, dimensions: '50×50×70 ס"מ' },
    XL: { buy: 25, move: 35, buyAndMove: 29, dimensions: '60×60×100 ס"מ' },
};
// מפתחות הפריט עבור ארגזי קרטון שה-AI שואל עליהם בסוף ניתוח כל חדר
export const BOX_ITEM_PREFIX = 'box_';
export function boxItemKey(size) {
    return `${BOX_ITEM_PREFIX}${size}`;
}
export function getBoxSizeFromKey(key) {
    if (!key.startsWith(BOX_ITEM_PREFIX))
        return null;
    const size = key.slice(BOX_ITEM_PREFIX.length);
    return BOX_PRICES[size] ? size : null;
}
export function getBoxItemInfo(key) {
    const size = getBoxSizeFromKey(key);
    if (!size)
        return null;
    return { label: `ארגז קרטון ${size} — ${BOX_PRICES[size].dimensions}`, icon: '📦', price: BOX_PRICES[size].move };
}
export const VOLUME_DISCOUNT = [
    { upTo: 200, discount: 0.00 },
    { upTo: 400, discount: 0.01 },
    { upTo: 600, discount: 0.02 },
    { upTo: 800, discount: 0.03 },
    { upTo: 1000, discount: 0.04 },
    { upTo: 1200, discount: 0.05 },
    { upTo: 1400, discount: 0.06 },
    { upTo: 1600, discount: 0.07 },
    { upTo: 1800, discount: 0.08 },
    { upTo: 2000, discount: 0.09 },
    { upTo: 2200, discount: 0.10 },
    { upTo: 2400, discount: 0.11 },
    { upTo: 2600, discount: 0.12 },
    { upTo: 2800, discount: 0.13 },
    { upTo: 3000, discount: 0.14 },
    { upTo: 3200, discount: 0.15 },
    { upTo: 3400, discount: 0.16 },
    { upTo: 3600, discount: 0.17 },
    { upTo: 3800, discount: 0.18 },
    { upTo: 4000, discount: 0.19 },
    { upTo: Infinity, discount: 0.20 },
];
/** כיול 1 (12.11.2026): מעל ₪4,000 ההנחה ממשיכה ברצף — 20% ועוד 1.5% לכל ₪100, עד 35%.
 *  זהה ל-getVolumeDiscount ב-Hovalot/src/data/pricing.ts. */
export const VOLUME_DISCOUNT_STEP_FROM = 4000;
export const VOLUME_DISCOUNT_STEP_PER_100 = 0.015;
export const VOLUME_DISCOUNT_MAX = 0.35;
export function getVolumeDiscount(subtotal) {
    if (subtotal > VOLUME_DISCOUNT_STEP_FROM) {
        return Math.min(VOLUME_DISCOUNT_MAX, 0.20 + ((subtotal - VOLUME_DISCOUNT_STEP_FROM) / 100) * VOLUME_DISCOUNT_STEP_PER_100);
    }
    for (const tier of VOLUME_DISCOUNT) {
        if (subtotal <= tier.upTo)
            return tier.discount;
    }
    return 0.20;
}
export let BASE_PRICE = 175; // 12.11.2026: כמו בייצור. זהה לאפליקציה
/** מחיר בסיס "מובילים בקטנה" — אוחד לכאן מ-small-move.html (היה const BASE=100 מקומי),
 *  כדי שיתעדכן מ-config/pricing.smallMoveBasePrice כמו כל שאר הקצבים (60.5). */
export let SMALL_MOVE_BASE_PRICE = 600;
/** כיול 1: הבסיס בקטנה כולל 15 ק"מ, ואחריהם ₪4 לק"מ. פריטים בקטנה ממחירי הקוד × מקדם (לא config/itemPrices).
 *  תוספת 10% כשהמוצא או היעד בשרון או במחוז ירושלים (data/pricing-regions.js). זהה לאפליקציה. */
export let SMALL_MOVE_INCLUDED_KM = 15;
export let SMALL_MOVE_PRICE_PER_KM = 4;
export let SMALL_MOVE_ITEM_FACTOR = 1 / 1.8; // 12.11.2026: מחירי הקוד הם מחירי דירה, ולכן בקטנה ÷1.8 = המחיר הקודם. זהה לאפליקציה
export let REGION_SURCHARGE_RATE = 0.10;
export let PRICE_PER_KM = 9;
export let FLOOR_SURCHARGE_PER_FLOOR = 40;
/**
 * העמלה שהפלטפורמה מנכה מתשלום הלקוח לפני העברת חלק המוביל.
 *
 * ⚠️ **לתצוגה ולהתמצאות בלבד — האתר אינו מחשב את החלוקה.**
 * הפיצול בפועל נגזר תמיד בשרת (`functions/src/platformFee.ts`) ברגע
 * שיבוץ המוביל, לפי `platformFeeRate` שב-Firestore.
 *
 * 11.9 — תוקן מ-0.05 ל-0.10. הערך השגוי סתר את האפליקציה ואת השרת
 * בלי שאף אחד ראה את זה, כי איש לא קורא אותו.
 */
export let PLATFORM_FEE_RATE = 0.10;
// ── Crane pricing (based on Israeli market research 2024-2026) ──
export const APARTMENT_CRANE_PRICE_PER_HOUR = {
    'floor_1_6': 500, // קומה 1-6
    'floor_7_10': 700, // קומה 7-10
    'floor_11': 1200, // קומה 11+
};
export const INDUSTRIAL_CRANE_PRICES = {
    small: { label: 'קטן', armLength: 'עד 20 מ׳', basePrice: 1000, perHourAfter: 400 },
    medium: { label: 'בינוני', armLength: '20-40 מ׳', basePrice: 1500, perHourAfter: 600 },
    large: { label: 'גדול', armLength: '40-55 מ׳', basePrice: 2800, perHourAfter: 900 },
    xlarge: { label: 'ענק', armLength: '55-65 מ׳', basePrice: 4200, perHourAfter: 1300 },
};
export const CRANE_ITEMS = [
    // 🌍 אדמה וחצץ
    { key: 'soil', label: 'אדמה כתמת', icon: '🌱', unit: 'טון', pricePerUnit: 130, weightTons: 1, unloadMinutes: 15, category: 'earth' },
    { key: 'gravel', label: 'חצץ / שפכת', icon: '🪨', unit: 'טון', pricePerUnit: 110, weightTons: 1.5, unloadMinutes: 15, category: 'earth' },
    { key: 'sand', label: 'חול בנייה', icon: '⏳', unit: 'טון', pricePerUnit: 100, weightTons: 1.5, unloadMinutes: 12, category: 'earth' },
    { key: 'hamra', label: 'חמרה / טוף', icon: '🟫', unit: 'טון', pricePerUnit: 120, weightTons: 1, unloadMinutes: 15, category: 'earth' },
    { key: 'topsoil', label: 'אדמת גינה', icon: '🌿', unit: 'משטח', pricePerUnit: 150, weightTons: 1, unloadMinutes: 12, category: 'earth' },
    // 🧱 אבני ריצוף
    { key: 'pavers', label: 'אבני מדרכה', icon: '🛤️', unit: 'משטח', pricePerUnit: 200, weightTons: 1.5, unloadMinutes: 10, category: 'paving' },
    { key: 'interlock', label: 'אבנים משתלבות', icon: '◼️', unit: 'משטח', pricePerUnit: 220, weightTons: 1.5, unloadMinutes: 10, category: 'paving' },
    { key: 'garden_st', label: 'אבני גינה / נוי', icon: '🪨', unit: 'משטח', pricePerUnit: 180, weightTons: 1, unloadMinutes: 10, category: 'paving' },
    { key: 'concrete_s', label: 'מדרגות בטון', icon: '🪜', unit: 'יחידה', pricePerUnit: 280, weightTons: 0.5, unloadMinutes: 20, category: 'paving' },
    { key: 'curb', label: 'אבני שפה / גבול', icon: '📏', unit: 'משטח', pricePerUnit: 190, weightTons: 1.2, unloadMinutes: 12, category: 'paving' },
    // 🏗️ חומרי בנייה
    { key: 'blocks', label: 'בלוקי בטון', icon: '🧱', unit: 'משטח', pricePerUnit: 180, weightTons: 1.5, unloadMinutes: 10, category: 'construction' },
    { key: 'bricks', label: 'לבנים', icon: '🔴', unit: 'משטח', pricePerUnit: 160, weightTons: 1.5, unloadMinutes: 10, category: 'construction' },
    { key: 'cement_b', label: 'שקי צמנט', icon: '⚪', unit: 'משטח', pricePerUnit: 150, weightTons: 1, unloadMinutes: 10, category: 'construction' },
    { key: 'concrete_p', label: 'לוחות בטון', icon: '🟥', unit: 'יחידה', pricePerUnit: 380, weightTons: 2, unloadMinutes: 25, category: 'construction' },
    { key: 'prefab', label: 'יסודות / פרפאב', icon: '🏛️', unit: 'יחידה', pricePerUnit: 450, weightTons: 3, unloadMinutes: 30, category: 'construction' },
    { key: 'timber_b', label: 'קורות עץ / בניין', icon: '🪵', unit: 'חבילה', pricePerUnit: 200, weightTons: 1, unloadMinutes: 15, category: 'construction' },
    // 🌿 גינון
    { key: 'turf', label: 'דשא (גלילים)', icon: '🌱', unit: 'משטח', pricePerUnit: 160, weightTons: 0.5, unloadMinutes: 10, category: 'landscape' },
    { key: 'tree', label: 'עץ בוגר', icon: '🌳', unit: 'עץ', pricePerUnit: 420, weightTons: 0.4, unloadMinutes: 35, category: 'landscape' },
    { key: 'planter', label: 'עציץ / ארגז גדול', icon: '🪴', unit: 'יחידה', pricePerUnit: 220, weightTons: 0.3, unloadMinutes: 20, category: 'landscape' },
    { key: 'decor_st', label: 'אבני נוי (ענק)', icon: '⛰️', unit: 'יחידה', pricePerUnit: 300, weightTons: 1, unloadMinutes: 20, category: 'landscape' },
    // 🔩 מתכת וברזל
    { key: 'mesh', label: 'רשתות ברזל', icon: '🔗', unit: 'משטח', pricePerUnit: 250, weightTons: 1.5, unloadMinutes: 15, category: 'metal' },
    { key: 'beams', label: 'קורות ברזל / פלדה', icon: '⚙️', unit: 'יחידה', pricePerUnit: 320, weightTons: 1, unloadMinutes: 20, category: 'metal' },
    { key: 'rebar', label: 'פלדות / ברזל עיגון', icon: '🪝', unit: 'חבילה', pricePerUnit: 240, weightTons: 1, unloadMinutes: 15, category: 'metal' },
    { key: 'container', label: 'מכולת מתכת', icon: '📦', unit: 'יחידה', pricePerUnit: 850, weightTons: 4, unloadMinutes: 60, category: 'metal' },
    { key: 'pipes', label: 'צנרת / צינורות', icon: '🔩', unit: 'חבילה', pricePerUnit: 220, weightTons: 0.8, unloadMinutes: 15, category: 'metal' },
    // 🪟 קרמיקה ואבן
    { key: 'ceramic', label: 'משטח קרמיקה', icon: '🟦', unit: 'משטח', pricePerUnit: 180, weightTons: 1, unloadMinutes: 10, category: 'ceramic' },
    { key: 'granite', label: 'גרניט / שיש', icon: '⬛', unit: 'משטח', pricePerUnit: 260, weightTons: 1.5, unloadMinutes: 15, category: 'ceramic' },
    { key: 'natural_st', label: 'אבן טבעית', icon: '🪨', unit: 'משטח', pricePerUnit: 230, weightTons: 1.5, unloadMinutes: 12, category: 'ceramic' },
    // ⚙️ ציוד וחשמל
    { key: 'ac_unit', label: 'מזגן מרכזי', icon: '❄️', unit: 'יחידה', pricePerUnit: 520, weightTons: 0.5, unloadMinutes: 35, category: 'equipment' },
    { key: 'generator', label: 'גנרטור', icon: '⚡', unit: 'יחידה', pricePerUnit: 620, weightTons: 1.5, unloadMinutes: 45, category: 'equipment' },
    { key: 'cistern', label: 'מכל / בור ספיגה', icon: '🛢️', unit: 'יחידה', pricePerUnit: 720, weightTons: 2, unloadMinutes: 55, category: 'equipment' },
    { key: 'solar', label: 'מערכת סולארית', icon: '☀️', unit: 'יחידה', pricePerUnit: 450, weightTons: 0.8, unloadMinutes: 40, category: 'equipment' },
    // ✨ פריטים מיוחדים
    { key: 'jacuzzi', label: 'ג\'קוזי / ספא חוץ', icon: '🛁', unit: 'יחידה', pricePerUnit: 650, weightTons: 0.8, unloadMinutes: 50, category: 'special', special: true },
    { key: 'pool', label: 'בריכת פייברגלס', icon: '🏊', unit: 'יחידה', pricePerUnit: 1300, weightTons: 1.5, unloadMinutes: 90, category: 'special', special: true },
    { key: 'safe', label: 'כספת גדולה', icon: '🔒', unit: 'יחידה', pricePerUnit: 520, weightTons: 1, unloadMinutes: 30, category: 'special', special: true },
    { key: 'sculpture', label: 'פסל / אמנות גדולה', icon: '🗿', unit: 'יחידה', pricePerUnit: 650, weightTons: 0.8, unloadMinutes: 45, category: 'special', special: true },
    { key: 'tractor', label: 'טרקטור / מחפרון', icon: '🚜', unit: 'יחידה', pricePerUnit: 950, weightTons: 5, unloadMinutes: 60, category: 'special', special: true },
    { key: 'custom', label: 'פריט מיוחד אחר', icon: '🔧', unit: 'יחידה', pricePerUnit: 0, weightTons: 0, unloadMinutes: 0, category: 'special', special: true },
];
export const CRANE_ITEM_CATEGORIES = {
    earth: { label: 'אדמה וחצץ', icon: '🌍' },
    paving: { label: 'אבני ריצוף', icon: '🛤️' },
    construction: { label: 'חומרי בנייה', icon: '🏗️' },
    landscape: { label: 'גינון', icon: '🌿' },
    metal: { label: 'מתכת וברזל', icon: '🔩' },
    ceramic: { label: 'קרמיקה ואבן', icon: '🪟' },
    equipment: { label: 'ציוד וחשמל', icon: '⚙️' },
    special: { label: '✨ פריטים מיוחדים', icon: '⭐' },
};
export const CRANE_LOAD_TYPES = [
    { key: 'furniture', label: 'ריהוט כבד', icon: '🛋️' },
    { key: 'construction', label: 'חומרי בניין', icon: '🧱' },
    { key: 'industrial', label: 'ציוד תעשייתי', icon: '⚙️' },
    { key: 'container', label: 'מכולות / לוחות', icon: '📦' },
    { key: 'agriculture', label: 'ציוד חקלאי', icon: '🚜' },
    { key: 'other', label: 'אחר', icon: '🔧' },
];
export const CRANE_WEIGHT_OPTIONS = [
    { key: 'up_2t', label: 'עד 2 טון' },
    { key: '2_5t', label: '2-5 טון' },
    { key: '5_15t', label: '5-15 טון' },
    { key: '15_50t', label: '15-50 טון' },
    { key: '50t_plus', label: '50+ טון' },
];
export const CANCELLATION_POLICY = [
    { hoursBeforeMin: 168, hoursBeforeMax: Infinity, feePct: 0, label: 'ביטול חינם', description: 'ביטול 7+ ימים לפני — ללא חיוב' },
    { hoursBeforeMin: 48, hoursBeforeMax: 168, feePct: 0.15, label: 'דמי ביטול 15%', description: 'ביטול 2–7 ימים לפני — חיוב 15%' },
    { hoursBeforeMin: 24, hoursBeforeMax: 48, feePct: 0.30, label: 'דמי ביטול 30%', description: 'ביטול 24–48 שעות לפני — חיוב 30%' },
    { hoursBeforeMin: 0, hoursBeforeMax: 24, feePct: 0.50, label: 'דמי ביטול 50%', description: 'ביטול פחות מ-24 שעות לפני — חיוב 50%' },
    { hoursBeforeMin: -Infinity, hoursBeforeMax: 0, feePct: 0.75, label: 'אי-הופעה 75%', description: 'לקוח לא נמצא בנקודת האיסוף — חיוב 75%' },
];
export function getCancellationFee(totalPrice, hoursUntilPickup) {
    const tier = CANCELLATION_POLICY.find(t => hoursUntilPickup >= t.hoursBeforeMin && hoursUntilPickup < t.hoursBeforeMax);
    return Math.round((tier?.feePct ?? 0.5) * totalPrice);
}
/** Fixed component of the packing-service price (Option B — priced from the customer's actual items), added on top of the percentage below. Set 2026-07-21 per business decision — was a bottom-up box/wrap unit-price calculation before. */
export let PACKING_BASE_FEE = 149;
/** Percentage of the packed items' own ₪ price subtotal (not the full order — excludes travel/floors/insurance/etc) added to PACKING_BASE_FEE. */
export let PACKING_PERCENT_RATE = 0.15; // 12.11.2026: כמו בייצור. זהה לאפליקציה
/**
 * Single source of packing pricing math — catalog-agnostic on purpose, so both the
 * items.ts-backed flows (apartment/smallMove add-on) and the separately-maintained
 * smallMoveItems.ts catalog can share it after each classifies its own items into
 * this shape. Box/wrap counts are still tracked here —
 * not for pricing, just to describe to the customer what the crew will actually be
 * doing (X boxes, Y wrapped pieces). The price itself is PACKING_BASE_FEE plus
 * PACKING_PERCENT_RATE of the packed items' own price subtotal.
 */
export function calculatePackingFromClassified(entries) {
    let totalBoxes = 0;
    let wrapCount = 0;
    let itemsSubtotal = 0;
    for (const e of entries) {
        if (e.qty <= 0)
            continue;
        itemsSubtotal += e.itemPrice * e.qty;
        if (e.packingType === 'box') {
            totalBoxes += (e.boxCount ?? 0.2) * e.qty;
        }
        else {
            wrapCount += e.qty;
        }
    }
    const hasAny = totalBoxes > 0 || wrapCount > 0;
    const total = hasAny ? Math.round(PACKING_BASE_FEE + PACKING_PERCENT_RATE * itemsSubtotal) : 0;
    return {
        totalBoxes: Math.round(totalBoxes * 10) / 10,
        wrapCount,
        itemsSubtotal: Math.round(itemsSubtotal),
        total,
    };
}
export function classifyRoomItemForPacking(item) {
    const info = getPackingInfo(item);
    if (info.packingType === 'none')
        return null;
    const itemPrice = getItemPriceAnyCategory(item.key);
    if (info.packingType === 'wrap') {
        const wrapTier = /_(giant|large)$/.test(item.key) || item.heavy ? 'large' : /_small$/.test(item.key) ? 'small' : 'medium';
        return { packingType: 'wrap', wrapTier, fragile: item.fragile, qty: 0, itemPrice };
    }
    return { packingType: 'box', boxCount: info.boxCount, fragile: item.fragile, qty: 0, itemPrice };
}
/**
 * ארגז קרטון שהלקוח סימן בשאלת ה-AI, כשהוא הצהיר במסך תמחור האריזה שהתכולה
 * **עדיין לא ארוזה** — כלומר הצוות הוא זה שימלא ויסגור אותו.
 *
 * `boxCount: 1` ולא שבריר: פריט רגיל בקטלוג מקבל 0.2–0.5 ארגז כי כמה פריטים
 * נכנסים לארגז אחד, אבל כאן הארגז *הוא* היחידה — 18 ארגזים הם 18 ארגזים.
 *
 * מחוץ למצב הזה `box_S/M/L/XL` נשארים ב-PACKING_NONE_KEYS (ראו items.js) ואינם
 * חלק מהאריזה כלל — זו ההתנהגות כשהלקוח מצהיר שהארגזים כבר סגורים ומוכנים.
 *
 * מקבילה מדויקת ל-classifyCustomerBoxForPacking ב-Hovalot/src/data/pricing.ts.
 */
export function classifyCustomerBoxForPacking(itemKey) {
    const size = getBoxSizeFromKey(itemKey);
    if (!size) return null;
    return { packingType: 'box', boxCount: 1, fragile: false, qty: 0, itemPrice: BOX_PRICES[size].move };
}
/**
 * Convenience wrapper over calculatePackingFromClassified() for items.js-backed selections (by item key).
 *
 * `countCustomerBoxes` — ברירת המחדל `false` משמרת את ההתנהגות ההיסטורית
 * (ארגזי הלקוח מחוץ לאריזה). זרימת "עוברים דירה" מעבירה `true` כשהלקוח ענה
 * שהארגזים עדיין לא ארוזים. **חשוב:** לא לשנות את הסיווג ב-items.js גלובלית
 * במקום זה — שם השינוי היה נוזל לכל נתיב אחר (מחיר ההובלה עצמו, smallMove).
 *
 * מקבילה מדויקת ל-calculatePackingFromItems ב-Hovalot/src/data/pricing.ts.
 */
export function calculatePackingFromItems(selections, opts = {}) {
    const entries = [];
    for (const { itemKey, qty } of selections) {
        if (qty <= 0)
            continue;
        if (opts.countCustomerBoxes) {
            const asBox = classifyCustomerBoxForPacking(itemKey);
            if (asBox) { entries.push({ ...asBox, qty }); continue; }
        }
        const item = findItemAnywhere(itemKey);
        if (!item)
            continue;
        const classified = classifyRoomItemForPacking(item);
        if (!classified)
            continue;
        entries.push({ ...classified, qty });
    }
    return calculatePackingFromClassified(entries);
}
/** כיול 1 (163.2): שישי ביום בלי תוספת; ערב שישי (משבצת מ-17:00) ושבת כמו קודם. זהה לאפליקציה. */
export const FRIDAY_EVENING_FROM_HOUR = 17;
export function timeSlotStartHour(timeSlot) {
    const m = /^(\d{1,2}):\d{2}/.exec(String(timeSlot || '').trim());
    return m ? Number(m[1]) : null;
}
export function getSurgePricing(date, timeSlot) {
    const day = date.getDay(); // 0=Sun … 5=Fri … 6=Sat
    if (day === 6)
        return { label: 'שבת', rate: 0.50 };
    if (day === 5 && (timeSlotStartHour(timeSlot) ?? 0) >= FRIDAY_EVENING_FROM_HOUR)
        return { label: 'ערב שישי', rate: 0.25 };
    return null;
}

/**
 * מחיר הביטוח, לפי סוג השירות.
 *
 * ⚠️ 12.9 — **חייב להישאר זהה ל-`INSURANCE_PRICE_APARTMENT` ו-
 * `INSURANCE_PRICE_SMALL_MOVE` באפליקציה** (`src/data/pricing.ts`).
 * `check-web-pricing-sync` משווה ביניהם ויפיל שינוי חד-צדדי.
 *
 * עד היום הם היו קשיחים **בתוך ה-HTML** של שני הדפים — עותק שלישי
 * של אותו מספר, מעבר לשני המסכים באפליקציה. שינוי מחיר היה דורש
 * עריכה בשלושה מקומות.
 */
export let INSURANCE_PRICE_APARTMENT = 99;
export let INSURANCE_PRICE_SMALL_MOVE = 49;

// ══════════════════════════════════════════════════════════════════
//  סנכרון מחירים חי מ-config/pricing + config/itemPrices (60.5)
//  פורט מ-Hovalot/src/data/pricing.ts. האדמין כותב את המסמכים האלה דרך
//  מסך התמחור באפליקציה; pricing-config.js טוען אותם בכל דף שמציג מחיר
//  ומחיל אותם כאן מעל ברירות המחדל המקומפלות, כך ששינוי מחיר באפליקציה
//  מופיע גם באתר. ITEM_PRICES מוגדר בקובץ הזה, לכן ה-override נוגע באותו
//  אובייקט ש-items.js קורא ממנו — עדכון חי בשני הצדדים.
// ══════════════════════════════════════════════════════════════════

/** ערך קביל בלבד — מחרוזת/NaN/שלילי/מעל התקרה נזרקים ונשארת ברירת המחדל (זהה ל-acceptedValue ב-pricing.ts). */
function acceptedValue(value, max) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value < max ? value : null;
}
const MAX_RATE = 1;      // שיעורים (0-1) — חוסם הקלדת 12 במקום 0.12
const MAX_FEE = 100000;  // תקרת שפיות לשדות ₪ מפני ערך משובש
const MAX_ITEM_FACTOR = 10; // מקדם פריטים — מכפיל, לא אחוז

/** מחיל את config/pricing מעל הקבועים. ערך לא-קביל נזרק. מקבילה ל-applyPricingRates ב-pricing.ts. */
export function applyPricingRates(rates) {
  const applied = {
    basePrice: acceptedValue(rates.basePrice, MAX_FEE),
    smallMoveBasePrice: acceptedValue(rates.smallMoveBasePrice, MAX_FEE),
    pricePerKm: acceptedValue(rates.pricePerKm, MAX_FEE),
    floorSurchargePerFloor: acceptedValue(rates.floorSurchargePerFloor, MAX_FEE),
    platformFeeRate: acceptedValue(rates.platformFeeRate, MAX_RATE),
    packingBaseFee: acceptedValue(rates.packingBaseFee, MAX_FEE),
    packingPercentRate: acceptedValue(rates.packingPercentRate, MAX_RATE),
    insurancePriceApartment: acceptedValue(rates.insurancePriceApartment, MAX_FEE),
    insurancePriceSmallMove: acceptedValue(rates.insurancePriceSmallMove, MAX_FEE),
    smallMoveIncludedKm: acceptedValue(rates.smallMoveIncludedKm, MAX_FEE),
    smallMovePricePerKm: acceptedValue(rates.smallMovePricePerKm, MAX_FEE),
    smallMoveItemFactor: acceptedValue(rates.smallMoveItemFactor, MAX_ITEM_FACTOR),
    regionSurchargeRate: acceptedValue(rates.regionSurchargeRate, MAX_RATE),
  };
  if (applied.basePrice != null) BASE_PRICE = applied.basePrice;
  if (applied.smallMoveBasePrice != null) SMALL_MOVE_BASE_PRICE = applied.smallMoveBasePrice;
  if (applied.pricePerKm != null) PRICE_PER_KM = applied.pricePerKm;
  if (applied.floorSurchargePerFloor != null) FLOOR_SURCHARGE_PER_FLOOR = applied.floorSurchargePerFloor;
  if (applied.platformFeeRate != null) PLATFORM_FEE_RATE = applied.platformFeeRate;
  if (applied.packingBaseFee != null) PACKING_BASE_FEE = applied.packingBaseFee;
  if (applied.packingPercentRate != null) PACKING_PERCENT_RATE = applied.packingPercentRate;
  if (applied.insurancePriceApartment != null) INSURANCE_PRICE_APARTMENT = applied.insurancePriceApartment;
  if (applied.insurancePriceSmallMove != null) INSURANCE_PRICE_SMALL_MOVE = applied.insurancePriceSmallMove;
  if (applied.smallMoveIncludedKm != null) SMALL_MOVE_INCLUDED_KM = applied.smallMoveIncludedKm;
  if (applied.smallMovePricePerKm != null) SMALL_MOVE_PRICE_PER_KM = applied.smallMovePricePerKm;
  if (applied.smallMoveItemFactor != null) SMALL_MOVE_ITEM_FACTOR = applied.smallMoveItemFactor;
  if (applied.regionSurchargeRate != null) REGION_SURCHARGE_RATE = applied.regionSurchargeRate;
}

/** כיול 1: מחירי הפריטים כפי שהם בקוד, לפני config/itemPrices. נלקח בטעינת המודול (לפני pricing-config.js). */
const CODE_ITEM_PRICES = (() => {
  const out = {};
  for (const category of Object.keys(ITEM_PRICES)) {
    for (const [key, price] of Object.entries(ITEM_PRICES[category])) {
      if (!(key in out)) out[key] = price;
    }
  }
  return out;
})();
/** מחיר יחידה של פריט קטלוג בהובלה קטנה, או null כשאינו בקטלוג. זהה ל-smallMoveCatalogUnitPrice באפליקציה. */
export function smallMoveCatalogUnitPrice(itemKey) {
  const price = CODE_ITEM_PRICES[itemKey];
  return price === undefined ? null : Math.round(price * SMALL_MOVE_ITEM_FACTOR);
}
/** עלות נסיעה בקטנה: הק"מ הכלולים חינם. זהה ל-smallMoveTravelCost באפליקציה. */
export function smallMoveTravelCost(distanceKm) {
  return Math.round(Math.max(0, (distanceKm || 0) - SMALL_MOVE_INCLUDED_KM) * SMALL_MOVE_PRICE_PER_KM);
}

/** מחיל את config/itemPrices — override למחיר פריט בכל קטגוריה שהוא מופיע בה. זהה ל-applyItemPriceOverrides ב-pricing.ts. */
export function applyItemPriceOverrides(overrides) {
  for (const [itemKey, price] of Object.entries(overrides)) {
    for (const category of Object.keys(ITEM_PRICES)) {
      if (itemKey in ITEM_PRICES[category]) ITEM_PRICES[category][itemKey] = price;
    }
  }
}
