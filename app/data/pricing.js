// ============================================================
//  ROZIC MOVE — קובץ מחירון מרכזי
//  כל שינוי מחיר נעשה כאן בלבד. הקוד כולו קורא מפה.
// ============================================================
import { findItemAnywhere, getPackingInfo, getItemPriceAnyCategory } from './items.js';
export const ITEM_PRICES = {
    bedroom: {
        single_bed: 120,
        double_bed: 180,
        king_bed: 220,
        baby_bed: 80,
        bunk_bed: 200,
        wardrobe_small: 90,
        wardrobe_medium: 140,
        wardrobe_large: 200,
        wardrobe_giant: 260,
        nightstand_small: 35,
        nightstand_medium: 45,
        nightstand_large: 55,
        nightstand_giant: 70,
        tv_up_to_55: 60,
        tv_above_55: 90,
        tv_75_90: 120,
        tv_90_120: 160,
        desktop_monitor: 45,
        bed_one_half: 150,
        electric_bed_single: 180,
        electric_bed_double: 220,
        electric_bed_half: 200,
        electric_bed_king: 250,
        mattress_single: 40,
        mattress_half: 50,
        mattress_double: 60,
        mattress_king: 75,
        clothes_rack_small: 15,
        clothes_rack_large: 25,
        ironing_board: 15,
        sewing_machine: 40,
        sewing_table_combo: 70,
        portable_ac: 50,
        radiator: 30,
        fan_floor: 20,
        suitcase_xl: 30,
        suitcase_l: 25,
        suitcase_m: 20,
        suitcase_s: 15,
        vanity_table_small: 70,
        vanity_table_medium: 90,
        vanity_table_large: 110,
        mirror_standalone: 45,
        mirror_wall_small: 35,
        mirror_wall_medium: 55,
        mirror_wall_large: 80,
        mirror_wall_giant: 120,
        ottoman_small: 30,
        ottoman_medium: 45,
        ottoman_large: 60,
        chair_bedroom: 35,
        bookshelf_small: 50,
        bookshelf_large: 80,
        rug_s_sqm: 25,
        rug_m_sqm: 45,
        rug_l_sqm: 70,
        rug_xl_sqm: 100,
        ac_unit_1hp: 90,
        ac_unit_1_2hp: 120,
        ac_unit_2_3hp: 160,
        fan_ceiling: 55,
        safe_small_light: 55,
        safe_small_heavy: 80,
        honeycomb_shelf: 45,
    },
    living_room: {
        armchair_1seat: 90,
        sofa_2seat: 120,
        sofa_3seat: 160,
        sofa_l_shape: 280,
        sofa_corner: 220,
        coffee_table_small: 45,
        coffee_table_medium: 70,
        coffee_table_large: 95,
        tv_stand_small: 50,
        tv_stand_medium: 75,
        tv_stand_large: 105,
        tv_up_to_55: 60,
        tv_above_55: 90,
        tv_75_90: 120,
        tv_90_120: 160,
        speakers_medium: 40,
        speakers_large: 70,
        sound_bar: 30,
        subwoofer: 35,
        floor_lamp: 25,
        desk_lamp: 20,
        chandelier_small: 60,
        chandelier_large: 100,
        rug_s_sqm: 25,
        rug_m_sqm: 45,
        rug_l_sqm: 70,
        rug_xl_sqm: 100,
        painting_large: 40,
        painting_giant: 65,
        fireplace_electric: 80,
        aquarium_small: 50,
        aquarium_medium: 70,
        aquarium_large: 120,
        sofa_4seat: 180,
        home_cinema: 60,
        stereo_system: 50,
        snooker_table: 150,
        painting_medium: 30,
        painting_small: 20,
        wall_clock: 20,
        wing_chair: 75,
        ottoman_small: 30,
        ottoman_medium: 45,
        ottoman_large: 60,
        curtains: 25,
        projector_device: 45,
        buffet_sideboard: 85,
        display_cabinet: 95,
    },
    kitchen: {
        fridge_freezer_small: 100,
        fridge_freezer_medium: 140,
        fridge_freezer_large: 200,
        fridge_freezer_giant: 250,
        washer_dryer_small: 110,
        washer_dryer_large: 140,
        dishwasher_small: 90,
        dishwasher_large: 110,
        oven_builtin: 90,
        oven_wide: 130,
        oven_standalone: 110,
        countertop_oven: 35,
        microwave: 40,
        dining_table_small: 75,
        dining_table_medium: 100,
        dining_table_large: 130,
        dining_table_giant: 170,
        dining_chair: 25,
        bar_stool: 30,
        kitchen_island_small: 100,
        kitchen_island_medium: 140,
        kitchen_island_large: 190,
        kitchen_island_giant: 260,
        coffee_machine_small: 25,
        coffee_machine_large: 40,
        bread_machine: 25,
        air_fryer_large: 25,
        stand_mixer: 30,
        toaster_oven: 20,
        cooktop: 50,
        range_hood: 40,
        blender: 15,
        food_processor: 18,
        juicer: 15,
        electric_kettle: 12,
        toaster: 12,
        tami_4: 35,
        pantry_unit_small: 70,
        pantry_unit_medium: 110,
        pantry_unit_large: 160,
        pantry_unit_giant: 220,
        wine_fridge: 60,
    },
    office: {
        desk_small: 60,
        desk_medium: 80,
        desk_large: 110,
        desk_giant: 150,
        desk_standing: 100,
        meeting_table_small: 140,
        meeting_table_medium: 200,
        meeting_table_large: 280,
        office_chair: 40,
        safe_small_light: 55,
        safe_small_heavy: 80,
        desktop_tower: 50,
        desktop_monitor: 45,
        printer_small: 40,
        printer_large: 120,
        projector_screen: 70,
        photocopier_small: 70,
        photocopier_large: 140,
        paper_shredder_small: 25,
        paper_shredder_large: 55,
        vacuum_cleaner: 25,
        laptop_computer: 30,
    },
    kids_room: {
        single_bed_kids: 90,
        bunk_bed: 200,
        play_kitchen: 55,
        trampoline_small: 70,
        bookshelf_kids: 50,
        rocking_horse: 45,
        kids_bike: 30,
        kids_car: 35,
        trampoline_large: 80,
    },
    bathroom: {
        mirror_bathroom_small: 30,
        mirror_bathroom_large: 50,
        towel_rack_large: 25,
        laundry_basket_large: 20,
    },
    storage_balcony: {
        outdoor_chair: 20,
        sunshade_small: 35,
        sunshade_large: 70,
        bbq_grill_small: 55,
        bbq_grill_large: 110,
        outdoor_storage_box_small: 35,
        outdoor_storage_box_medium: 60,
        outdoor_storage_box_large: 90,
        potted_plant_small: 18,
        potted_plant_medium: 30,
        potted_plant_large: 45,
        bicycle: 60,
        electric_scooter: 45,
        storage_shelf_unit_small: 50,
        storage_shelf_unit_medium: 85,
        storage_shelf_unit_large: 130,
        generator: 100,
        water_heater: 80,
        ladder_small: 25,
        ladder_medium: 40,
        ladder_large: 65,
        stroller: 55,
        car_seat_box: 30,
        treadmill: 110,
        exercise_bike: 90,
        weight_bench: 80,
        sun_lounger: 40,
        garden_swing_small: 50,
        garden_swing_large: 85,
        outdoor_bench_small: 30,
        outdoor_bench_large: 50,
        taboon: 100,
        smoker: 80,
        lawnmower: 50,
        elliptical: 100,
        multi_trainer: 130,
        ping_pong_table: 100,
        hammock_chair: 40,
        drying_rack_stand: 25,
        kids_slide: 60,
        vacuum_cleaner: 25,
        iron: 12,
        ironing_board: 15,
        rowing_machine: 100,
        pull_up_bar: 25,
    },
    misc: {
        keyboard_small: 35,
        keyboard_large: 75,
        piano_upright: 420,
        drum_kit_small: 60,
        drum_kit_medium: 100,
        drum_kit_large: 150,
        painting_large: 40,
        ac_unit_1hp: 90,
        ac_unit_1_2hp: 120,
        ac_unit_2_3hp: 160,
        water_cooler: 40,
        wine_rack_large: 50,
        darbouka: 30,
        guitar: 30,
        accordion: 35,
        vacuum_cleaner: 25,
        fan_floor: 20,
        pet_carrier: 20,
        pet_bed: 15,
        cat_scratching_post: 25,
        cat_tree: 35,
        small_pet_cage: 20,
        doghouse_small: 30,
        doghouse_medium: 50,
        doghouse_large: 75,
        pet_fence: 40,
        box_S: 12,
        box_M: 18,
        box_L: 25,
        box_XL: 35,
        safe_medium: 110,
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
export function getVolumeDiscount(subtotal) {
    for (const tier of VOLUME_DISCOUNT) {
        if (subtotal <= tier.upTo)
            return tier.discount;
    }
    return 0.20;
}
export const BASE_PRICE = 150;
export const PRICE_PER_KM = 9;
export const FLOOR_SURCHARGE_PER_FLOOR = 40;
/**
 * Surcharge added on top of every order's total in calculatePrice() (customer-facing —
 * baked into the final price, not broken out as a separate line item on any screen).
 * Not the same as PLATFORM_FEE_RATE below, which is deducted from the driver's payout.
 */
export const CURRENT_COMMISSION_RATE = 0.05;
/**
 * Cut the platform keeps from the customer's payment before paying out the
 * driver (escrow model: customer pays the platform in full, the platform
 * later pays the driver their share). Not the same as CURRENT_COMMISSION_RATE
 * above, which is a separate customer-side surcharge baked into calculatePrice().
 */
export const PLATFORM_FEE_RATE = 0.05;
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
export const PACKING_BASE_FEE = 149;
/** Percentage of the packed items' own ₪ price subtotal (not the full order — excludes travel/floors/insurance/etc) added to PACKING_BASE_FEE. */
export const PACKING_PERCENT_RATE = 0.30;
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
/** Convenience wrapper over calculatePackingFromClassified() for items.ts-backed selections (by item key). */
export function calculatePackingFromItems(selections) {
    const entries = [];
    for (const { itemKey, qty } of selections) {
        if (qty <= 0)
            continue;
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
export function getSurgePricing(date) {
    const day = date.getDay(); // 0=Sun … 5=Fri … 6=Sat
    if (day === 6)
        return { label: 'שבת', rate: 0.50 };
    if (day === 5)
        return { label: 'שישי', rate: 0.25 };
    return null;
}
