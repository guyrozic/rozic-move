// ⚠️ מראה של Hovalot/src/data/packingClassification.ts. `check-web-packing-sync` משווה ביניהם.
/**
 * סיווג האריזה — נגזר מהמיפוי של עזרא (`team/ezra/packing/catalog-final.tsv`, 257 פריטים)
 * לפי הכרעות 3.1-3.5 בתזכיר עמוס #3. הקובץ הזה הוא **נתון, לא לוגיקה**: החישוב עצמו
 * ב-`calculatePackingFromItems` (pricing.ts), והמספרים ב-`config/pricing`.
 *
 * שלוש הקבוצות:
 * - **א · תכולה** (70) - רהיט אחסון מייצר "כ-N ארגזים" (`PACKING_BOX_ESTIMATE`),
 *   ופריט קטן נכנס לארגז משותף (`PACKING_SHARED_BOX_KEYS`, 0.2 ארגז ליחידה).
 * - **ב · עטיפה מיוחדת** (38) - מחיר לפי מדרגה (`PACKING_WRAP_TIER`).
 * - **ג · בלי אריזה** (149) - לא נכנס לחישוב כלל.
 *
 * ⚠️ **אריזה אינה רהיטים.** ספה, מיטה ושולחן נעטפים בכל הובלה גם בלי שירות אריזה (3.5),
 * ולכן הם בקבוצה ג ואינם מתומחרים כאן. מה שנארז הוא תכולה ועטיפה מיוחדת בלבד.
 */

/** כמה ארגזי תכולה רהיט האחסון מייצר. */
export const PACKING_BOX_ESTIMATE = {
  bookshelf_kids: 2,
  bookshelf_large: 6,
  bookshelf_small: 3,
  buffet_sideboard: 3,
  desk_giant: 2,
  desk_large: 2,
  desk_medium: 1,
  desk_small: 1,
  display_cabinet: 3,
  honeycomb_shelf: 2,
  nightstand_giant: 3,
  nightstand_large: 2,
  nightstand_medium: 1,
  nightstand_small: 1,
  pantry_unit_giant: 6,
  pantry_unit_large: 4,
  pantry_unit_medium: 3,
  pantry_unit_small: 2,
  sewing_table_combo: 1,
  shoe_cabinet_medium: 2,
  shoe_cabinet_tall: 3,
  shoe_rack_open: 1,
  storage_shelf_unit_large: 4,
  storage_shelf_unit_medium: 3,
  storage_shelf_unit_small: 2,
  tv_stand_large: 2,
  tv_stand_medium: 2,
  tv_stand_small: 1,
  vanity_table_large: 2,
  vanity_table_medium: 1,
  vanity_table_small: 1,
  wardrobe_giant: 12,
  wardrobe_large: 9,
  wardrobe_medium: 6,
  wardrobe_small: 4,
  wine_rack_large: 2,
};

/** חלקו של פריט קטן בארגז משותף. */
export const SHARED_BOX_FRACTION = 0.2;

/** פריטים קטנים שנארזים יחד. */
export const PACKING_SHARED_BOX_KEYS = new Set([
  'air_fryer_large', 'blender', 'bread_machine',
  'cat_scratching_post', 'coffee_machine_large', 'coffee_machine_small',
  'countertop_oven', 'curtains', 'darbouka',
  'desk_lamp', 'desktop_tower', 'electric_kettle',
  'food_processor', 'juicer', 'keyboard_small',
  'laptop_computer', 'laundry_basket_large', 'microwave',
  'paper_shredder_small', 'pet_bed', 'pet_carrier',
  'printer_small', 'projector_device', 'sewing_machine',
  'small_pet_cage', 'sound_bar', 'speakers_medium',
  'stand_mixer', 'stereo_system', 'tami_4',
  'toaster', 'toaster_oven', 'towel_rack_large',
  'wall_clock',
]);

/** מדרגת העטיפה המיוחדת: 'small' | 'medium' | 'large'. */
export const PACKING_WRAP_TIER = {
  accordion: 'small',
  chandelier_large: 'large',
  chandelier_small: 'medium',
  desktop_monitor: 'small',
  drum_kit_large: 'large',
  drum_kit_medium: 'large',
  drum_kit_small: 'medium',
  fireplace_electric: 'medium',
  floor_lamp: 'small',
  guitar: 'small',
  home_cinema: 'medium',
  keyboard_large: 'medium',
  mattress_double: 'large',
  mattress_half: 'medium',
  mattress_king: 'large',
  mattress_single: 'medium',
  mirror_bathroom_large: 'medium',
  mirror_bathroom_small: 'small',
  mirror_standalone: 'medium',
  mirror_wall_giant: 'large',
  mirror_wall_large: 'large',
  mirror_wall_medium: 'medium',
  mirror_wall_small: 'small',
  painting_giant: 'large',
  painting_large: 'large',
  painting_medium: 'medium',
  painting_small: 'small',
  projector_screen: 'small',
  rug_l_sqm: 'large',
  rug_m_sqm: 'medium',
  rug_s_sqm: 'small',
  rug_xl_sqm: 'large',
  speakers_large: 'medium',
  subwoofer: 'small',
  tv_75_90: 'large',
  tv_90_120: 'large',
  tv_above_55: 'large',
  tv_up_to_55: 'medium',
};

/** לא נכנס לחישוב האריזה. */
export const PACKING_NO_PACKING_KEYS = new Set([
  'ac_unit_1_2hp', 'ac_unit_1hp', 'ac_unit_2_3hp',
  'aquarium_large', 'aquarium_medium', 'aquarium_small',
  'armchair_1seat', 'baby_bed', 'balance_board',
  'bar_stool', 'bbq_grill_large', 'bbq_grill_small',
  'bed_one_half', 'bicycle', 'box_L',
  'box_M', 'box_S', 'box_XL',
  'bunk_bed', 'camping_gear', 'car_seat_box',
  'cat_tree', 'chair_bedroom', 'clothes_rack_large',
  'clothes_rack_small', 'coat_rack_stand', 'coffee_table_large',
  'coffee_table_medium', 'coffee_table_small', 'cooktop',
  'desk_standing', 'dining_chair', 'dining_table_giant',
  'dining_table_large', 'dining_table_medium', 'dining_table_small',
  'dishwasher_large', 'dishwasher_small', 'doghouse_large',
  'doghouse_medium', 'doghouse_small', 'double_bed',
  'drying_rack_stand', 'electric_bed_double', 'electric_bed_half',
  'electric_bed_king', 'electric_bed_single', 'electric_scooter',
  'elliptical', 'exercise_bike', 'fan_ceiling',
  'fan_floor', 'fishing_gear', 'fridge_freezer_giant',
  'fridge_freezer_large', 'fridge_freezer_medium', 'fridge_freezer_small',
  'garden_swing_large', 'garden_swing_small', 'generator',
  'golf_bag', 'hammock_chair', 'iron',
  'ironing_board', 'kayak', 'kids_bike',
  'kids_car', 'kids_slide', 'king_bed',
  'kitchen_island_giant', 'kitchen_island_large', 'kitchen_island_medium',
  'kitchen_island_small', 'ladder_large', 'ladder_medium',
  'ladder_small', 'lawnmower', 'meeting_table_large',
  'meeting_table_medium', 'meeting_table_small', 'multi_trainer',
  'office_chair', 'ottoman_large', 'ottoman_medium',
  'ottoman_small', 'outdoor_bench_large', 'outdoor_bench_small',
  'outdoor_chair', 'outdoor_storage_box_large', 'outdoor_storage_box_medium',
  'outdoor_storage_box_small', 'oven_builtin', 'oven_standalone',
  'oven_wide', 'paper_shredder_large', 'pet_fence',
  'photocopier_large', 'photocopier_small', 'piano_upright',
  'pilates_reformer', 'ping_pong_table', 'play_kitchen',
  'portable_ac', 'potted_plant_large', 'potted_plant_medium',
  'potted_plant_small', 'printer_large', 'pull_up_bar',
  'punching_bag', 'radiator', 'range_hood',
  'rocking_horse', 'rowing_machine', 'safe_medium',
  'safe_small_heavy', 'safe_small_light', 'single_bed',
  'single_bed_kids', 'ski_snowboard', 'smoker',
  'snooker_table', 'sofa_2seat', 'sofa_3seat',
  'sofa_4seat', 'sofa_corner', 'sofa_l_shape',
  'stroller', 'suitcase_l', 'suitcase_m',
  'suitcase_s', 'suitcase_xl', 'sun_lounger',
  'sunshade_large', 'sunshade_small', 'sup_board',
  'surfboard_long', 'surfboard_short', 'taboon',
  'trampoline_large', 'trampoline_small', 'treadmill',
  'vacuum_cleaner', 'washer_dryer_large', 'washer_dryer_small',
  'water_cooler', 'water_heater', 'weight_bench',
  'wine_fridge', 'wing_chair',
]);

/**
 * תכולת מטבח - פריט שקיים **רק במסך שירות האריזה** ואינו בקטלוג ההובלה (3.4).
 * ארונות מטבח בנויים ואין להם פריט בקטלוג, ולכן התכולה שלהם לעולם לא נספרה.
 * אין לו מחיר הובלה: מה שמובילים הם הארגזים שייצאו ממנו.
 */
export const KITCHEN_CONTENTS = [
  { key: 'kitchen_contents_small',  label: 'תכולת מטבח קטן',   boxes: 6 },
  { key: 'kitchen_contents_medium', label: 'תכולת מטבח בינוני', boxes: 10 },
  { key: 'kitchen_contents_large',  label: 'תכולת מטבח גדול',  boxes: 15 },
];

export const KITCHEN_CONTENTS_BOXES =
  Object.fromEntries(KITCHEN_CONTENTS.map(k => [k.key, k.boxes]));
