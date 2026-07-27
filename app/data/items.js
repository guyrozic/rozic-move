import { ITEM_PRICES } from './pricing.js';
export const ALL_ROOMS = [
    {
        key: 'bedroom', label: 'חדר שינה', icon: '🛏',
        items: [
            { key: 'single_bed', label: 'מיטת יחיד (עד 90×200 ס"מ)', icon: '🛏', defaultQty: 1, heavy: true, fragile: false, needsDisassembly: true, synonyms: ['מיטה יחיד', 'מיטה בודדת', 'מיטת נוער'] },
            { key: 'double_bed', label: 'מיטה זוגית (160×200 ס"מ)', icon: '🛏', defaultQty: 1, heavy: true, fragile: false, needsDisassembly: true, synonyms: ['מיטה כפולה', 'מיטה זוגית', 'מיטת קווין'] },
            { key: 'king_bed', label: 'מיטת קינג (180×200 ס"מ)', icon: '🛏', defaultQty: 1, heavy: true, fragile: false, needsDisassembly: true, synonyms: ['מיטת קינג סייז', 'מיטה גדולה'] },
            { key: 'baby_bed', label: 'מיטת תינוק / מעבר', icon: '🛏', defaultQty: 1, heavy: false, fragile: false, needsDisassembly: true, synonyms: ['מיטת מעבר', 'מיטת פעוט'] },
            { key: 'bed_one_half', label: 'מיטה וחצי (120–140×200 ס"מ)', icon: '🛏', defaultQty: 1, heavy: true, fragile: false, needsDisassembly: true, synonyms: ['מיטה וחצי', 'מיטת קווין קטנה'] },
            { key: 'electric_bed_single', label: 'מיטה חשמלית יחיד (עד 90×200 ס"מ)', icon: '🛏', defaultQty: 1, heavy: true, fragile: false, needsDisassembly: true, synonyms: ['מיטה סיעודית יחיד'] },
            { key: 'electric_bed_double', label: 'מיטה חשמלית זוגית (160×200 ס"מ)', icon: '🛏', defaultQty: 1, heavy: true, fragile: false, needsDisassembly: true, synonyms: ['מיטה סיעודית זוגית'] },
            { key: 'electric_bed_half', label: 'מיטה וחצי חשמלית (120–140×200 ס"מ)', icon: '🛏', defaultQty: 1, heavy: true, fragile: false, needsDisassembly: true, synonyms: ['מיטה סיעודית וחצי'] },
            { key: 'electric_bed_king', label: 'מיטה חשמלית קינג (180×200 ס"מ)', icon: '🛏', defaultQty: 1, heavy: true, fragile: false, needsDisassembly: true, synonyms: ['מיטה סיעודית קינג', 'מיטה מתכווננת'] },
            { key: 'bunk_bed', label: 'מיטת קומותיים', icon: '🛏', defaultQty: 1, heavy: true, fragile: false, needsDisassembly: true, synonyms: ['מיטה דו קומתית', 'מיטות קומותיים'] },
            { key: 'wardrobe_small', label: 'ארון קטן (עד 100 ס"מ)', icon: '🗄', defaultQty: 1, heavy: true, fragile: false, needsDisassembly: false, synonyms: ['ארון בגדים קטן', 'ארון 2 דלתות'] },
            { key: 'wardrobe_medium', label: 'ארון בינוני (100–180 ס"מ)', icon: '🗄', defaultQty: 1, heavy: true, fragile: false, needsDisassembly: false, synonyms: ['ארון בגדים בינוני', 'ארון 3 דלתות'] },
            { key: 'wardrobe_large', label: 'ארון גדול (180–250 ס"מ)', icon: '🗄', defaultQty: 1, heavy: true, fragile: false, needsDisassembly: false, synonyms: ['ארון בגדים גדול', 'ארון 4 דלתות'] },
            { key: 'wardrobe_giant', label: 'ארון ענק (250–350 ס"מ)', icon: '🗄', defaultQty: 1, heavy: true, fragile: false, needsDisassembly: false, synonyms: ['ארון בגדים ענק', 'ארון קיר שלם'] },
            { key: 'nightstand_small', label: 'שידה קטנה (עד 40 ס"מ)', icon: '🗃', defaultQty: 2, heavy: false, fragile: false, needsDisassembly: false, synonyms: ['שידת לילה', 'שידת ליל קטנה'] },
            { key: 'nightstand_medium', label: 'שידה בינונית (40–60 ס"מ)', icon: '🗃', defaultQty: 1, heavy: false, fragile: false, needsDisassembly: false, synonyms: ['שידת לילה בינונית'] },
            { key: 'nightstand_large', label: 'שידה גדולה (60–90 ס"מ)', icon: '🗃', defaultQty: 1, heavy: false, fragile: false, needsDisassembly: false, synonyms: ['שידת לילה גדולה'] },
            { key: 'nightstand_giant', label: 'שידה ענקית (90–130 ס"מ)', icon: '🗃', defaultQty: 1, heavy: false, fragile: false, needsDisassembly: false, synonyms: ['שידה גדולה מאוד'] },
            { key: 'tv_up_to_55', label: 'טלוויזיה עד 55"', icon: '📺', defaultQty: 1, heavy: false, fragile: true, needsDisassembly: false, synonyms: ['טלוויזיה קטנה', 'טלוויזיה 32', 'טלוויזיה 40', 'טלוויזיה 50', 'מסך טלוויזיה'] },
            { key: 'tv_above_55', label: 'טלוויזיה 55–75"', icon: '📺', defaultQty: 1, heavy: false, fragile: true, needsDisassembly: false, synonyms: ['טלוויזיה גדולה', 'טלוויזיה 60', 'טלוויזיה 65', 'טלוויזיה 70'] },
            { key: 'tv_75_90', label: 'טלוויזיה 75–90"', icon: '📺', defaultQty: 1, heavy: true, fragile: true, needsDisassembly: false, synonyms: ['טלוויזיה גדולה מאוד'] },
            { key: 'tv_90_120', label: 'טלוויזיה 90–120"', icon: '📺', defaultQty: 1, heavy: true, fragile: true, needsDisassembly: false, synonyms: ['טלוויזיה ענקית', 'טלוויזיה 100'] },
            { key: 'vanity_table_small', label: 'שולחן איפור קטן + מראה (עד 80 ס"מ)', icon: '🪞', defaultQty: 1, heavy: false, fragile: true, needsDisassembly: false },
            { key: 'vanity_table_medium', label: 'שולחן איפור בינוני + מראה (80–120 ס"מ)', icon: '🪞', defaultQty: 1, heavy: false, fragile: true, needsDisassembly: false },
            { key: 'vanity_table_large', label: 'שולחן איפור גדול + מראה (120–160 ס"מ)', icon: '🪞', defaultQty: 1, heavy: false, fragile: true, needsDisassembly: false, synonyms: ['שולחן תצוגה'] },
            { key: 'mirror_standalone', label: 'מראת גוף (רוחב 30–45 ס"מ × גובה 150–180 ס"מ)', icon: '🪞', defaultQty: 1, heavy: false, fragile: true, needsDisassembly: false, synonyms: ['מראה', 'מראת קומה', 'מראה עצמאית'] },
            { key: 'mirror_wall_small', label: 'מראת קיר קטנה (עד 50 ס"מ)', icon: '🪞', defaultQty: 1, heavy: false, fragile: true, needsDisassembly: false, synonyms: ['מראה קטנה'] },
            { key: 'mirror_wall_medium', label: 'מראת קיר בינונית (50–100 ס"מ)', icon: '🪞', defaultQty: 1, heavy: false, fragile: true, needsDisassembly: false, synonyms: ['מראה בינונית'] },
            { key: 'mirror_wall_large', label: 'מראת קיר גדולה (100–160 ס"מ)', icon: '🪞', defaultQty: 1, heavy: false, fragile: true, needsDisassembly: false, synonyms: ['מראה גדולה'] },
            { key: 'mirror_wall_giant', label: 'מראת קיר ענקית (160–250 ס"מ)', icon: '🪞', defaultQty: 1, heavy: true, fragile: true, needsDisassembly: false, synonyms: ['מראה ענקית'] },
            { key: 'ottoman_small', label: 'פוף / הדום קטן (עד 50 ס"מ)', icon: '🪑', defaultQty: 1, heavy: false, fragile: false, needsDisassembly: false, synonyms: ['פוף'] },
            { key: 'ottoman_medium', label: 'פוף / הדום בינוני (50–80 ס"מ)', icon: '🪑', defaultQty: 1, heavy: false, fragile: false, needsDisassembly: false, synonyms: ['הדום'] },
            { key: 'ottoman_large', label: 'פוף / הדום ענק (80–120 ס"מ)', icon: '🪑', defaultQty: 1, heavy: false, fragile: false, needsDisassembly: false, synonyms: ['הדום גדול'] },
            { key: 'desktop_monitor', label: 'מסך מחשב (עד 32 אינץ\')', icon: '🖥', defaultQty: 1, heavy: false, fragile: true, needsDisassembly: false, synonyms: ['מסך', 'מוניטור'] },
            { key: 'chair_bedroom', label: 'כיסא סטנדרטי', icon: '🪑', defaultQty: 1, heavy: false, fragile: false, needsDisassembly: false, synonyms: ['כיסא חדר שינה', 'כיסא'] },
            { key: 'bookshelf_small', label: 'כוננית קטנה (עד 90 ס"מ)', icon: '📚', defaultQty: 1, heavy: false, fragile: false, needsDisassembly: false, synonyms: ['מדף ספרים קטן'] },
            { key: 'bookshelf_large', label: 'כוננית גדולה (90–180 ס"מ)', icon: '📚', defaultQty: 1, heavy: true, fragile: false, needsDisassembly: true, synonyms: ['ספרייה', 'כוננית ספרים'] },
            { key: 'rug_s_sqm', label: 'שטיח קטן (עד 10 מ"ר)', icon: '🪄', defaultQty: 1, heavy: false, fragile: false, needsDisassembly: false, synonyms: ['שטיח'] },
            { key: 'rug_m_sqm', label: 'שטיח בינוני (10–20 מ"ר)', icon: '🪄', defaultQty: 1, heavy: false, fragile: false, needsDisassembly: false, synonyms: ['שטיח'] },
            { key: 'rug_l_sqm', label: 'שטיח גדול (20–30 מ"ר)', icon: '🪄', defaultQty: 1, heavy: false, fragile: false, needsDisassembly: false, synonyms: ['שטיח', 'פרש'] },
            { key: 'rug_xl_sqm', label: 'שטיח ענק (30–45 מ"ר)', icon: '🪄', defaultQty: 1, heavy: false, fragile: false, needsDisassembly: false, synonyms: [] },
            { key: 'ac_unit_1hp', label: 'מזגן + יחידת אוויר (עד 1 כ"ס)', icon: '❄️', defaultQty: 1, heavy: true, fragile: false, needsDisassembly: false, notes: 'ללא פירוק/התקנה', synonyms: ['מזגן', 'יחידת מזגן'] },
            { key: 'ac_unit_1_2hp', label: 'מזגן + יחידת אוויר (1–2 כ"ס)', icon: '❄️', defaultQty: 1, heavy: true, fragile: false, needsDisassembly: false, notes: 'ללא פירוק/התקנה', synonyms: [] },
            { key: 'ac_unit_2_3hp', label: 'מזגן + יחידת אוויר (2–3 כ"ס)', icon: '❄️', defaultQty: 1, heavy: true, fragile: false, needsDisassembly: false, notes: 'ללא פירוק/התקנה', synonyms: [] },
            { key: 'fan_ceiling', label: 'מאוורר תקרה', icon: '💨', defaultQty: 1, heavy: false, fragile: false, needsDisassembly: true, synonyms: ['פרופלור', 'מאוורר תלוי'] },
            { key: 'safe_small_light', label: 'כספת קטנה קלה (עד 40 ס"מ)', icon: '🔒', defaultQty: 1, heavy: false, fragile: false, needsDisassembly: false, synonyms: ['כספת קלה'] },
            { key: 'safe_small_heavy', label: 'כספת קטנה כבדה (עד 40 ס"מ)', icon: '🔒', defaultQty: 1, heavy: true, fragile: false, needsDisassembly: false, synonyms: ['כספת כבדה', 'כספת'] },
            { key: 'mattress_single', label: 'מזרון יחיד (90×200 ס"מ)', icon: '🛏', defaultQty: 1, heavy: false, fragile: false, needsDisassembly: false, synonyms: ['מזרון', 'מזרון בודד'] },
            { key: 'mattress_half', label: 'מזרון וחצי (120–140×200 ס"מ)', icon: '🛏', defaultQty: 1, heavy: false, fragile: false, needsDisassembly: false, synonyms: ['מזרון מיטה וחצי'] },
            { key: 'mattress_double', label: 'מזרון זוגי (160×200 ס"מ)', icon: '🛏', defaultQty: 1, heavy: false, fragile: false, needsDisassembly: false, synonyms: ['מזרון כפול'] },
            { key: 'mattress_king', label: 'מזרון קינג (180×200 ס"מ)', icon: '🛏', defaultQty: 1, heavy: false, fragile: false, needsDisassembly: false, synonyms: ['מזרון זוגי גדול'] },
            { key: 'clothes_rack_small', label: 'עמוד מתלה בגדים קטן (עד 100 ס"מ)', icon: '👔', defaultQty: 1, heavy: false, fragile: false, needsDisassembly: true, synonyms: ['קולב עומד', 'מתלה בגדים'] },
            { key: 'clothes_rack_large', label: 'עמוד מתלה בגדים גדול (100–160 ס"מ)', icon: '👔', defaultQty: 1, heavy: false, fragile: false, needsDisassembly: true, synonyms: ['קולב עומד גדול', 'מתלה בגדים כפול'] },
            { key: 'ironing_board', label: 'קרש גיהוץ', icon: '👕', defaultQty: 1, heavy: false, fragile: false, needsDisassembly: false, synonyms: ['שולחן גיהוץ'] },
            { key: 'sewing_machine', label: 'מכונת תפירה', icon: '🧵', defaultQty: 1, heavy: false, fragile: false, needsDisassembly: false, synonyms: ['סינגר'] },
            { key: 'sewing_table_combo', label: 'שולחן תפירה + מכונה', icon: '🧵', defaultQty: 1, heavy: true, fragile: false, needsDisassembly: true, synonyms: ['שולחן תפירה'] },
            { key: 'portable_ac', label: 'מזגן נייד', icon: '❄️', defaultQty: 1, heavy: false, fragile: false, needsDisassembly: false, synonyms: ['מזגן מיני'] },
            { key: 'radiator', label: 'רדיאטור חימום', icon: '🌡', defaultQty: 1, heavy: false, fragile: false, needsDisassembly: false, synonyms: ['תנור חימום', 'רדיאטור'] },
            { key: 'fan_floor', label: 'מאוורר עמידה', icon: '💨', defaultQty: 1, heavy: false, fragile: false, needsDisassembly: false, synonyms: ['מאוורר', 'מאוורר רצפתי'] },
            { key: 'suitcase_xl', label: 'מזוודה XL (65–80 ס"מ)', icon: '🧳', defaultQty: 1, heavy: false, fragile: false, needsDisassembly: false, synonyms: ['מזוודה גדולה'] },
            { key: 'suitcase_l', label: 'מזוודה L (55–65 ס"מ)', icon: '🧳', defaultQty: 1, heavy: false, fragile: false, needsDisassembly: false, synonyms: ['מזוודה בינונית-גדולה'] },
            { key: 'suitcase_m', label: 'מזוודה M (45–55 ס"מ)', icon: '🧳', defaultQty: 1, heavy: false, fragile: false, needsDisassembly: false, synonyms: ['מזוודה בינונית'] },
            { key: 'suitcase_s', label: 'מזוודה S (עד 45 ס"מ)', icon: '🧳', defaultQty: 1, heavy: false, fragile: false, needsDisassembly: false, synonyms: ['מזוודה קטנה'] },
            { key: 'honeycomb_shelf', label: 'כוורת', icon: '📚', defaultQty: 1, heavy: false, fragile: false, needsDisassembly: true, synonyms: ['מדף כוורת'] },
        ],
    },
    {
        key: 'living_room', label: 'סלון', icon: '🛋',
        items: [
            { key: 'armchair_1seat', label: 'כורסא / ספה חד-מושבית (עד 100 ס"מ)', icon: '🪑', defaultQty: 1, heavy: false, fragile: false, needsDisassembly: false, synonyms: ['כורסה', 'ספה חד מקומית', 'כורסת ספה', 'ספת נוער', 'ספה לנוער', 'כורסה נשענת', 'כורסת טלוויזיה', 'ספת טלוויזיה', 'ריקליינר', 'כורסת מנוחה', 'כורסת נדנדה', 'כיסא נדנדה'] },
            { key: 'sofa_2seat', label: 'ספה דו-מושבית (100–160 ס"מ)', icon: '🛋', defaultQty: 1, heavy: true, fragile: false, needsDisassembly: false, synonyms: ['ספה זוגית', 'ספה דו מקומית'] },
            { key: 'sofa_3seat', label: 'ספה תלת-מושבית (160–220 ס"מ)', icon: '🛋', defaultQty: 1, heavy: true, fragile: false, needsDisassembly: false, synonyms: ['ספה משולשת', 'ספה תלת מקומית', 'ספה ל3'] },
            { key: 'sofa_l_shape', label: 'פינתית גדולה / L (250–350 ס"מ)', icon: '🛋', defaultQty: 1, heavy: true, fragile: false, needsDisassembly: true, notes: 'מפורקת ל-2 חלקים לרוב', synonyms: ['ספה פינתית', 'ספת L'] },
            { key: 'sofa_corner', label: 'פינתית קטנה (עד 250 ס"מ)', icon: '🛋', defaultQty: 1, heavy: true, fragile: false, needsDisassembly: true, synonyms: ['ספה פינתית קטנה'] },
            { key: 'coffee_table_small', label: 'שולחן סלון נמוך קטן (עד 80 ס"מ)', icon: '🪑', defaultQty: 1, heavy: false, fragile: false, needsDisassembly: false, synonyms: ['שולחן קפה קטן'] },
            { key: 'coffee_table_medium', label: 'שולחן סלון נמוך בינוני (80–140 ס"מ)', icon: '🪑', defaultQty: 1, heavy: true, fragile: true, needsDisassembly: false, synonyms: ['שולחן קפה', 'שולחן סלון'] },
            { key: 'coffee_table_large', label: 'שולחן סלון נמוך גדול (140–200 ס"מ)', icon: '🪑', defaultQty: 1, heavy: true, fragile: true, needsDisassembly: false, synonyms: ['שולחן נמוך גדול'] },
            { key: 'tv_stand_small', label: 'שידת טלוויזיה קטנה (עד 100 ס"מ)', icon: '📺', defaultQty: 1, heavy: false, fragile: false, needsDisassembly: false },
            { key: 'tv_stand_medium', label: 'שידת טלוויזיה בינונית (100–150 ס"מ)', icon: '📺', defaultQty: 1, heavy: false, fragile: false, needsDisassembly: false },
            { key: 'tv_stand_large', label: 'שידת טלוויזיה גדולה (150–220 ס"מ)', icon: '📺', defaultQty: 1, heavy: true, fragile: false, needsDisassembly: true },
            { key: 'tv_up_to_55', label: 'טלוויזיה עד 55"', icon: '📺', defaultQty: 1, heavy: false, fragile: true, needsDisassembly: false, synonyms: ['טלוויזיה קטנה', 'טלוויזיה 32', 'טלוויזיה 40', 'טלוויזיה 50'] },
            { key: 'tv_above_55', label: 'טלוויזיה 55–75"', icon: '📺', defaultQty: 1, heavy: false, fragile: true, needsDisassembly: false, synonyms: ['טלוויזיה גדולה', 'טלוויזיה 60', 'טלוויזיה 65', 'טלוויזיה 70'] },
            { key: 'tv_75_90', label: 'טלוויזיה 75–90"', icon: '📺', defaultQty: 1, heavy: true, fragile: true, needsDisassembly: false, synonyms: ['טלוויזיה גדולה מאוד'] },
            { key: 'tv_90_120', label: 'טלוויזיה 90–120"', icon: '📺', defaultQty: 1, heavy: true, fragile: true, needsDisassembly: false, synonyms: ['טלוויזיה ענקית', 'טלוויזיה 100'] },
            { key: 'speakers_medium', label: 'רמקולים בינוניים (זוג, עד 40 ס"מ)', icon: '🔊', defaultQty: 1, heavy: false, fragile: true, needsDisassembly: false, synonyms: ['רמקולים'] },
            { key: 'speakers_large', label: 'רמקולים גדולים (זוג, 40–80 ס"מ)', icon: '🔊', defaultQty: 1, heavy: true, fragile: true, needsDisassembly: false, synonyms: ['רמקולים גדולים'] },
            { key: 'sound_bar', label: 'מקרן קול', icon: '🔊', defaultQty: 1, heavy: false, fragile: true, needsDisassembly: false, synonyms: ['סאונד בר', 'סאונדבר'] },
            { key: 'subwoofer', label: 'סאבוופר', icon: '🔊', defaultQty: 1, heavy: false, fragile: true, needsDisassembly: false, synonyms: ['בס רמקול', 'סאב'] },
            { key: 'floor_lamp', label: 'מנורת עמידה', icon: '💡', defaultQty: 1, heavy: false, fragile: false, needsDisassembly: false, synonyms: ['מנורה', 'מנורת רצפה'] },
            { key: 'desk_lamp', label: 'מנורת שולחן', icon: '🪔', defaultQty: 1, heavy: false, fragile: true, needsDisassembly: false, synonyms: ['מנורת קריאה'] },
            { key: 'chandelier_small', label: 'נברשת קטנה (מפורקת, עד 50 ס"מ קוטר)', icon: '💡', defaultQty: 1, heavy: false, fragile: true, needsDisassembly: true, synonyms: ['נברשת'] },
            { key: 'chandelier_large', label: 'נברשת גדולה (מפורקת, 50–100 ס"מ קוטר)', icon: '💡', defaultQty: 1, heavy: true, fragile: true, needsDisassembly: true, synonyms: ['נברשת גדולה'] },
            { key: 'rug_s_sqm', label: 'שטיח קטן (עד 10 מ"ר)', icon: '🪄', defaultQty: 1, heavy: false, fragile: false, needsDisassembly: false, synonyms: ['שטיח'] },
            { key: 'rug_m_sqm', label: 'שטיח בינוני (10–20 מ"ר)', icon: '🪄', defaultQty: 1, heavy: false, fragile: false, needsDisassembly: false, synonyms: ['שטיח'] },
            { key: 'rug_l_sqm', label: 'שטיח גדול (20–30 מ"ר)', icon: '🪄', defaultQty: 1, heavy: false, fragile: false, needsDisassembly: false, synonyms: ['שטיח', 'פרש'] },
            { key: 'rug_xl_sqm', label: 'שטיח ענק (30–45 מ"ר)', icon: '🪄', defaultQty: 1, heavy: false, fragile: false, needsDisassembly: false, synonyms: [] },
            { key: 'painting_large', label: 'תמונה / ציור גדול (100–180 ס"מ)', icon: '🖼', defaultQty: 1, heavy: false, fragile: true, needsDisassembly: false, synonyms: ['תמונה גדולה', 'ציור גדול'] },
            { key: 'painting_giant', label: 'תמונה / ציור ענק (180–300 ס"מ)', icon: '🖼', defaultQty: 1, heavy: true, fragile: true, needsDisassembly: false, synonyms: ['תמונה ענקית'] },
            { key: 'fireplace_electric', label: 'קמין חשמלי', icon: '🔥', defaultQty: 1, heavy: true, fragile: false, needsDisassembly: false, synonyms: ['קמין'] },
            { key: 'aquarium_small', label: 'אקווריום קטן (70–130 ליטר)', icon: '🐠', defaultQty: 1, heavy: false, fragile: true, needsDisassembly: false, notes: 'יש לרוקן לפני ההובלה' },
            { key: 'aquarium_medium', label: 'אקווריום בינוני (130–250 ליטר)', icon: '🐠', defaultQty: 1, heavy: false, fragile: true, needsDisassembly: false, notes: 'יש לרוקן לפני ההובלה', synonyms: ['אקווריום בינוני'] },
            { key: 'aquarium_large', label: 'אקווריום גדול (250–400 ליטר)', icon: '🐠', defaultQty: 1, heavy: true, fragile: true, needsDisassembly: false, notes: 'יש לרוקן לפני ההובלה' },
            { key: 'sofa_4seat', label: 'ספה 4 מושבים (220–280 ס"מ)', icon: '🛋', defaultQty: 1, heavy: true, fragile: false, needsDisassembly: true, synonyms: ['ספה ל4'] },
            { key: 'home_cinema', label: 'מערכת קולנוע ביתי', icon: '🎬', defaultQty: 1, heavy: false, fragile: true, needsDisassembly: false, synonyms: ['קולנוע ביתי'] },
            { key: 'stereo_system', label: 'מערכת סטריאו', icon: '🔊', defaultQty: 1, heavy: false, fragile: true, needsDisassembly: false, synonyms: ['מערכת שמע', 'רדיו טייפ'] },
            { key: 'snooker_table', label: 'שולחן ביליארד / סנוקר', icon: '🎱', defaultQty: 1, heavy: true, fragile: false, needsDisassembly: true, synonyms: ['שולחן סנוקר'] },
            { key: 'painting_medium', label: 'תמונה / ציור בינוני (50–100 ס"מ)', icon: '🖼', defaultQty: 1, heavy: false, fragile: true, needsDisassembly: false, synonyms: ['תמונה בינונית'] },
            { key: 'painting_small', label: 'תמונה / ציור קטן (עד 50 ס"מ)', icon: '🖼', defaultQty: 1, heavy: false, fragile: true, needsDisassembly: false, synonyms: ['תמונה קטנה'] },
            { key: 'wall_clock', label: 'שעון קיר גדול', icon: '🕐', defaultQty: 1, heavy: false, fragile: true, needsDisassembly: false, synonyms: ['שעון קיר'] },
            { key: 'wing_chair', label: 'כורסת אוזניים', icon: '🪑', defaultQty: 1, heavy: false, fragile: false, needsDisassembly: false, synonyms: ['כורסת קרושה'] },
            { key: 'ottoman_small', label: 'פוף / הדום קטן (עד 50 ס"מ)', icon: '🪑', defaultQty: 1, heavy: false, fragile: false, needsDisassembly: false, synonyms: ['פוף'] },
            { key: 'ottoman_medium', label: 'פוף / הדום בינוני (50–80 ס"מ)', icon: '🪑', defaultQty: 1, heavy: false, fragile: false, needsDisassembly: false, synonyms: ['הדום'] },
            { key: 'ottoman_large', label: 'פוף / הדום ענק (80–120 ס"מ)', icon: '🪑', defaultQty: 1, heavy: false, fragile: false, needsDisassembly: false, synonyms: ['פוף גדול', 'הדום גדול'] },
            { key: 'curtains', label: 'וילונות / גלילות (לפי חלון)', icon: '🪟', defaultQty: 1, heavy: false, fragile: false, needsDisassembly: false, synonyms: ['וילון', 'גלילה'] },
            { key: 'projector_device', label: 'מקרן', icon: '📽', defaultQty: 1, heavy: false, fragile: true, needsDisassembly: false, synonyms: ['מקרן וידאו'] },
            { key: 'buffet_sideboard', label: 'מזנון', icon: '🗄', defaultQty: 1, heavy: true, fragile: false, needsDisassembly: false, synonyms: ['ארונית סלון'] },
            { key: 'display_cabinet', label: 'ויטרינה', icon: '🗄', defaultQty: 1, heavy: true, fragile: true, needsDisassembly: false, synonyms: ['ארון תצוגה'] },
        ],
    },
    {
        key: 'kitchen', label: 'מטבח', icon: '🍳',
        items: [
            { key: 'fridge_freezer_small', label: 'מקרר/מקפיא קטן (עד 200 ליטר)', icon: '🧊', defaultQty: 1, heavy: true, fragile: false, needsDisassembly: false, notes: 'לנתק 24 שעות לפני', synonyms: ['מקרר קטן', 'מקפיא קטן', 'מקרר זוגי קטן'] },
            { key: 'fridge_freezer_medium', label: 'מקרר/מקפיא בינוני (200–400 ליטר)', icon: '🧊', defaultQty: 1, heavy: true, fragile: false, needsDisassembly: false, notes: 'לנתק 24 שעות לפני' },
            { key: 'fridge_freezer_large', label: 'מקרר/מקפיא גדול (400–600 ליטר)', icon: '🧊', defaultQty: 1, heavy: true, fragile: false, needsDisassembly: false, notes: 'לנתק 24 שעות לפני', synonyms: ['מקרר גדול מאוד'] },
            { key: 'fridge_freezer_giant', label: 'מקרר/מקפיא ענק (600–850 ליטר)', icon: '🧊', defaultQty: 1, heavy: true, fragile: false, needsDisassembly: true, notes: 'לנתק 24 שעות לפני', synonyms: ['מקרר ענק'] },
            { key: 'washer_dryer_small', label: 'מכונת כביסה/מייבש קטן (עד 45 ס"מ)', icon: '🫧', defaultQty: 1, heavy: true, fragile: false, needsDisassembly: false, notes: 'לנקז ולנעול תוף אם רלוונטי', synonyms: ['מכונת כביסה', 'מייבש', 'מייבש כביסה', 'מכונה משולבת'] },
            { key: 'washer_dryer_large', label: 'מכונת כביסה/מייבש גדול (45–65 ס"מ)', icon: '🫧', defaultQty: 1, heavy: true, fragile: false, needsDisassembly: false, notes: 'לנקז ולנעול תוף אם רלוונטי', synonyms: ['מכונת כביסה גדולה', 'מייבש גדול'] },
            { key: 'dishwasher_small', label: 'מדיח כלים 45 ס"מ (קטן)', icon: '🍽', defaultQty: 1, heavy: true, fragile: false, needsDisassembly: false, synonyms: ['מדיח', 'מדיח כלים'] },
            { key: 'dishwasher_large', label: 'מדיח כלים 60 ס"מ (גדול)', icon: '🍽', defaultQty: 1, heavy: true, fragile: false, needsDisassembly: false, synonyms: ['מדיח גדול'] },
            { key: 'oven_builtin', label: 'תנור סטנדרט 60 ס"מ', icon: '🍕', defaultQty: 1, heavy: true, fragile: false, needsDisassembly: false, notes: 'ללא ניתוק/חיבור חשמל', synonyms: ['תנור אפייה בנוי', 'תנור בנוי'] },
            { key: 'oven_wide', label: 'תנור רחב (61–100 ס"מ)', icon: '🍕', defaultQty: 1, heavy: true, fragile: false, needsDisassembly: false, synonyms: ['תנור גדול'] },
            { key: 'oven_standalone', label: 'תנור סטנדרט 60 ס"מ עם יחידת כיריים', icon: '🍕', defaultQty: 1, heavy: true, fragile: false, needsDisassembly: false, synonyms: ['תנור', 'תנור גז', 'תנור עצמאי'] },
            { key: 'countertop_oven', label: 'תנור על השיש (30–50 ס"מ)', icon: '🍕', defaultQty: 1, heavy: false, fragile: false, needsDisassembly: false, synonyms: ['מיני תנור', 'תנור שולחני'] },
            { key: 'microwave', label: 'מיקרוגל', icon: '📦', defaultQty: 1, heavy: false, fragile: false, needsDisassembly: false, synonyms: ['מיקרו'] },
            { key: 'dining_table_small', label: 'שולחן אוכל קטן (עד 120 ס"מ)', icon: '🍽', defaultQty: 1, heavy: true, fragile: false, needsDisassembly: true, synonyms: ['שולחן פינת אוכל קטן'] },
            { key: 'dining_table_medium', label: 'שולחן אוכל בינוני (120–180 ס"מ)', icon: '🍽', defaultQty: 1, heavy: true, fragile: false, needsDisassembly: true, synonyms: ['שולחן פינת אוכל'] },
            { key: 'dining_table_large', label: 'שולחן אוכל גדול (180–250 ס"מ)', icon: '🍽', defaultQty: 1, heavy: true, fragile: false, needsDisassembly: true, synonyms: ['שולחן פינת אוכל גדול'] },
            { key: 'dining_table_giant', label: 'שולחן אוכל ענק (250–350 ס"מ)', icon: '🍽', defaultQty: 1, heavy: true, fragile: false, needsDisassembly: true, synonyms: [] },
            { key: 'dining_chair', label: 'כיסא אוכל', icon: '🪑', defaultQty: 4, heavy: false, fragile: false, needsDisassembly: false, synonyms: ['כיסא מטבח'] },
            { key: 'bar_stool', label: 'כיסא בר', icon: '🪑', defaultQty: 2, heavy: false, fragile: false, needsDisassembly: false, synonyms: ['שרפרף בר', 'כיסא אי'] },
            { key: 'kitchen_island_small', label: 'אי מטבח קטן (עד 90 ס"מ)', icon: '🍳', defaultQty: 1, heavy: true, fragile: false, needsDisassembly: true },
            { key: 'kitchen_island_medium', label: 'אי מטבח בינוני (90–150 ס"מ)', icon: '🍳', defaultQty: 1, heavy: true, fragile: false, needsDisassembly: true },
            { key: 'kitchen_island_large', label: 'אי מטבח גדול (150–220 ס"מ)', icon: '🍳', defaultQty: 1, heavy: true, fragile: false, needsDisassembly: true, synonyms: ['אי גדול'] },
            { key: 'kitchen_island_giant', label: 'אי מטבח ענק (220–350 ס"מ)', icon: '🍳', defaultQty: 1, heavy: true, fragile: false, needsDisassembly: true, synonyms: ['אי ענק'] },
            { key: 'coffee_machine_small', label: 'מכונת קפה קטנה (עד 20 ס"מ)', icon: '☕', defaultQty: 1, heavy: false, fragile: true, needsDisassembly: false, synonyms: ['מכונת קפה', 'נספרסו', 'מכונת קפסולות'] },
            { key: 'coffee_machine_large', label: 'מכונת קפה גדולה (20–40 ס"מ)', icon: '☕', defaultQty: 1, heavy: false, fragile: true, needsDisassembly: false, synonyms: ['מכונת אספרסו', 'מכונת קפה אוטומטית'] },
            { key: 'bread_machine', label: 'מכונת לחם', icon: '🍞', defaultQty: 1, heavy: false, fragile: false, needsDisassembly: false, synonyms: ['מאפיית לחם'] },
            { key: 'air_fryer_large', label: 'אירפראייר', icon: '🍳', defaultQty: 1, heavy: false, fragile: false, needsDisassembly: false, synonyms: ['אייר פריר', 'אוורנייר', 'אוורנייר גדול'] },
            { key: 'stand_mixer', label: 'מיקסר', icon: '🍰', defaultQty: 1, heavy: false, fragile: false, needsDisassembly: false, synonyms: ['מיקסר שף'] },
            { key: 'toaster_oven', label: 'טוסטר אובן', icon: '🍞', defaultQty: 1, heavy: false, fragile: false, needsDisassembly: false, synonyms: ['טוסטר'] },
            { key: 'cooktop', label: 'כיריים עצמאיות', icon: '🔥', defaultQty: 1, heavy: false, fragile: false, needsDisassembly: false, synonyms: ['כיריים'] },
            { key: 'range_hood', label: 'קולט אדים', icon: '💨', defaultQty: 1, heavy: false, fragile: false, needsDisassembly: false, synonyms: ['מנדף'] },
            { key: 'blender', label: 'בלנדר', icon: '🥤', defaultQty: 1, heavy: false, fragile: false, needsDisassembly: false, synonyms: [] },
            { key: 'food_processor', label: 'מעבד מזון', icon: '🍲', defaultQty: 1, heavy: false, fragile: false, needsDisassembly: false, synonyms: [] },
            { key: 'juicer', label: 'מסחטה', icon: '🍊', defaultQty: 1, heavy: false, fragile: false, needsDisassembly: false, synonyms: ['מסחטת פירות'] },
            { key: 'electric_kettle', label: 'קומקום חשמלי', icon: '☕', defaultQty: 1, heavy: false, fragile: false, needsDisassembly: false, synonyms: ['קומקום'] },
            { key: 'toaster', label: 'טוסטר', icon: '🍞', defaultQty: 1, heavy: false, fragile: false, needsDisassembly: false, synonyms: [] },
            { key: 'tami_4', label: 'תמי 4', icon: '🍲', defaultQty: 1, heavy: false, fragile: false, needsDisassembly: false, synonyms: ['רובוט מטבח', 'תרמומיקס', 'Tami 4'] },
            { key: 'pantry_unit_small', label: 'ארון מזווה נמוך קטן (עד 60 ס"מ)', icon: '🗄', defaultQty: 1, heavy: true, fragile: false, needsDisassembly: false, synonyms: ['מזווה נמוך', 'מזווה קטן'] },
            { key: 'pantry_unit_medium', label: 'ארון מזווה נמוך בינוני (60–100 ס"מ)', icon: '🗄', defaultQty: 1, heavy: true, fragile: false, needsDisassembly: false },
            { key: 'pantry_unit_large', label: 'ארון מזווה נמוך גדול (100–150 ס"מ)', icon: '🗄', defaultQty: 1, heavy: true, fragile: false, needsDisassembly: false, synonyms: ['מזווה גדול'] },
            { key: 'pantry_unit_giant', label: 'ארון מזווה נמוך ענק (150–200 ס"מ)', icon: '🗄', defaultQty: 1, heavy: true, fragile: false, needsDisassembly: false, synonyms: ['מזווה ענק'] },
            { key: 'wine_fridge', label: 'מקרר יין', icon: '🍷', defaultQty: 1, heavy: false, fragile: false, needsDisassembly: false, notes: 'לנתק לפני ההובלה', synonyms: ['ארון יין'] },
        ],
    },
    {
        key: 'kids_room', label: 'חדר ילדים', icon: '🧸',
        items: [
            { key: 'single_bed_kids', label: 'מיטת ילד', icon: '🛏', defaultQty: 1, heavy: false, fragile: false, needsDisassembly: true, synonyms: ['מיטת ילדים'] },
            { key: 'bunk_bed', label: 'מיטת קומותיים', icon: '🛏', defaultQty: 1, heavy: true, fragile: false, needsDisassembly: true, synonyms: ['מיטה דו קומתית'] },
            { key: 'play_kitchen', label: 'מטבח משחק', icon: '🍳', defaultQty: 1, heavy: false, fragile: false, needsDisassembly: false, synonyms: ['מטבחון לילדים'] },
            { key: 'trampoline_small', label: 'טרמפולינה קטנה (עד קוטר 1.5 מ׳)', icon: '⭕', defaultQty: 1, heavy: false, fragile: false, needsDisassembly: true },
            { key: 'bookshelf_kids', label: 'כוננית ילדים', icon: '📚', defaultQty: 1, heavy: false, fragile: false, needsDisassembly: false, synonyms: ['מדף ספרים לילדים'] },
            { key: 'rocking_horse', label: 'סוס / כלי נדנדה', icon: '🎠', defaultQty: 1, heavy: false, fragile: false, needsDisassembly: false, synonyms: ['סוסון נדנדה'] },
            { key: 'kids_bike', label: 'אופניים לילדים', icon: '🚲', defaultQty: 1, heavy: false, fragile: false, needsDisassembly: false, synonyms: ['אופני ילדים'] },
            { key: 'kids_car', label: 'מכונית ילדים חשמלית', icon: '🚗', defaultQty: 1, heavy: false, fragile: false, needsDisassembly: false, synonyms: ['מכונית חשמלית לילדים'] },
            { key: 'trampoline_large', label: 'טרמפולינה גדולה (עד קוטר 4 מ׳, מפורקת)', icon: '⭕', defaultQty: 1, heavy: false, fragile: false, needsDisassembly: true, notes: 'מפורקת' },
        ],
    },
    {
        key: 'bathroom', label: 'חדר אמבטיה', icon: '🚿',
        items: [
            { key: 'mirror_bathroom_small', label: 'מראת שירותים קטנה (רוחב עד 60 ס"מ)', icon: '🪞', defaultQty: 1, heavy: false, fragile: true, needsDisassembly: false, synonyms: ['מראה קטנה לשירותים'] },
            { key: 'mirror_bathroom_large', label: 'מראת שירותים גדולה (רוחב 60–120 ס"מ)', icon: '🪞', defaultQty: 1, heavy: false, fragile: true, needsDisassembly: false, synonyms: ['מראה גדולה לשירותים'] },
            { key: 'towel_rack_large', label: 'מתלה מגבות גדול (עד 100 ס"מ)', icon: '🪝', defaultQty: 1, heavy: false, fragile: false, needsDisassembly: false, synonyms: ['מתלה מגבות'] },
            { key: 'laundry_basket_large', label: 'סל כביסה גדול', icon: '🧺', defaultQty: 1, heavy: false, fragile: false, needsDisassembly: false, synonyms: ['סל בגדים', 'סל כביסה'] },
        ],
    },
    {
        key: 'storage_balcony', label: 'מרפסת / מחסן', icon: '📦',
        items: [
            { key: 'outdoor_chair', label: 'כיסא חוץ', icon: '🪑', defaultQty: 4, heavy: false, fragile: false, needsDisassembly: false, synonyms: ['כיסא גינה'] },
            { key: 'sunshade_small', label: 'שמשייה קטנה (עד 2.5 מ׳ קוטר)', icon: '⛱', defaultQty: 1, heavy: false, fragile: false, needsDisassembly: true, synonyms: ['שמשייה'] },
            { key: 'sunshade_large', label: 'שמשייה גדולה (2.5–3.5 מ׳ קוטר)', icon: '⛱', defaultQty: 1, heavy: false, fragile: false, needsDisassembly: true, synonyms: ['שמשייה גדולה'] },
            { key: 'bbq_grill_small', label: 'מנגל קטן (עד 80 ס"מ)', icon: '🍖', defaultQty: 1, heavy: false, fragile: false, needsDisassembly: false, synonyms: ['מנגל', 'גריל חשמלי'] },
            { key: 'bbq_grill_large', label: 'מנגל גדול (80–150 ס"מ)', icon: '🍖', defaultQty: 1, heavy: true, fragile: false, needsDisassembly: false, synonyms: ['מנגל גדול', 'גריל גז'] },
            { key: 'outdoor_storage_box_small', label: 'ארגז אחסון חוץ קטן (עד 300 ליטר)', icon: '📦', defaultQty: 1, heavy: false, fragile: false, needsDisassembly: false },
            { key: 'outdoor_storage_box_medium', label: 'ארגז אחסון חוץ בינוני (300–600 ליטר)', icon: '📦', defaultQty: 1, heavy: false, fragile: false, needsDisassembly: false },
            { key: 'outdoor_storage_box_large', label: 'ארגז אחסון חוץ גדול (600–1000 ליטר)', icon: '📦', defaultQty: 1, heavy: true, fragile: false, needsDisassembly: false, synonyms: ['ארגז גינה גדול'] },
            { key: 'potted_plant_small', label: 'עציץ קטן (עד 30 ס"מ)', icon: '🪴', defaultQty: 2, heavy: false, fragile: false, needsDisassembly: false, synonyms: ['עציץ חרס קטן'] },
            { key: 'potted_plant_medium', label: 'עציץ בינוני (30–60 ס"מ)', icon: '🪴', defaultQty: 2, heavy: false, fragile: true, needsDisassembly: false, synonyms: ['אדנית'] },
            { key: 'potted_plant_large', label: 'עציץ גדול (60–100 ס"מ)', icon: '🪴', defaultQty: 1, heavy: true, fragile: true, needsDisassembly: false, notes: 'שביר אם מחרס', synonyms: ['עציץ חרס גדול', 'אדנית גדולה'] },
            { key: 'bicycle', label: 'אופני מבוגרים', icon: '🚲', defaultQty: 1, heavy: false, fragile: false, needsDisassembly: false, synonyms: ['אופניים', 'אופני כביש', 'אופני הרים'] },
            { key: 'electric_scooter', label: 'קורקינט חשמלי', icon: '🛴', defaultQty: 1, heavy: false, fragile: false, needsDisassembly: false, synonyms: ['קורקינט'] },
            { key: 'storage_shelf_unit_small', label: 'יחידת מדפים למחסן קטנה (עד 90 ס"מ)', icon: '📦', defaultQty: 1, heavy: false, fragile: false, needsDisassembly: true },
            { key: 'storage_shelf_unit_medium', label: 'יחידת מדפים למחסן בינונית (90–150 ס"מ)', icon: '📦', defaultQty: 1, heavy: false, fragile: false, needsDisassembly: true },
            { key: 'storage_shelf_unit_large', label: 'יחידת מדפים למחסן גדולה (150–250 ס"מ)', icon: '📦', defaultQty: 1, heavy: true, fragile: false, needsDisassembly: true },
            { key: 'generator', label: 'גנרטור', icon: '⚡', defaultQty: 1, heavy: true, fragile: false, needsDisassembly: false, synonyms: ['מחולל חשמל'] },
            { key: 'car_seat_box', label: 'ארגז מושב ילד לרכב', icon: '🚗', defaultQty: 1, heavy: false, fragile: false, needsDisassembly: false, synonyms: ['כיסא בטיחות לרכב'] },
            { key: 'water_heater', label: 'דוד מים (מנותק)', icon: '🚰', defaultQty: 1, heavy: true, fragile: false, needsDisassembly: false, synonyms: ['דוד שמש', 'בויילר'] },
            { key: 'ladder_small', label: 'סולם קטן (עד 1.5 מ׳)', icon: '🪜', defaultQty: 1, heavy: false, fragile: false, needsDisassembly: false, synonyms: ['שרפרף'] },
            { key: 'ladder_medium', label: 'סולם בינוני (1.5–2.5 מ׳)', icon: '🪜', defaultQty: 1, heavy: false, fragile: false, needsDisassembly: false },
            { key: 'ladder_large', label: 'סולם גדול (2.5–4 מ׳)', icon: '🪜', defaultQty: 1, heavy: true, fragile: false, needsDisassembly: false, synonyms: ['סולם שלוב'] },
            { key: 'stroller', label: 'עגלת תינוק', icon: '👶', defaultQty: 1, heavy: false, fragile: false, needsDisassembly: false, synonyms: ['עגלה'] },
            { key: 'treadmill', label: 'הליכון', icon: '🏃', defaultQty: 1, heavy: true, fragile: false, needsDisassembly: true, synonyms: ['מסילת ריצה'] },
            { key: 'exercise_bike', label: 'אופני כושר', icon: '🚴', defaultQty: 1, heavy: true, fragile: false, needsDisassembly: false, synonyms: ['אופניים סטציונריים', 'אופני ספינינג'] },
            { key: 'weight_bench', label: 'ספסל כוח + משקולות', icon: '🏋', defaultQty: 1, heavy: true, fragile: false, needsDisassembly: false, synonyms: ['ספסל משקולות'] },
            { key: 'sun_lounger', label: 'מיטת שיזוף', icon: '🌞', defaultQty: 1, heavy: false, fragile: false, needsDisassembly: false, synonyms: ['כסא שיזוף'] },
            { key: 'garden_swing_small', label: 'נדנדת גינה קטנה (עד 150 ס"מ)', icon: '🪢', defaultQty: 1, heavy: false, fragile: false, needsDisassembly: true, synonyms: ['נדנדה'] },
            { key: 'garden_swing_large', label: 'נדנדת גינה גדולה (150–220 ס"מ)', icon: '🪢', defaultQty: 1, heavy: true, fragile: false, needsDisassembly: true, synonyms: ['נדנדה גדולה'] },
            { key: 'outdoor_bench_small', label: 'ספסל גינה קטן (עד 150 ס"מ)', icon: '🪑', defaultQty: 1, heavy: false, fragile: false, needsDisassembly: false, synonyms: ['ספסל'] },
            { key: 'outdoor_bench_large', label: 'ספסל גינה גדול (150–220 ס"מ)', icon: '🪑', defaultQty: 1, heavy: true, fragile: false, needsDisassembly: false, synonyms: ['ספסל גדול'] },
            { key: 'taboon', label: 'טאבון', icon: '🔥', defaultQty: 1, heavy: true, fragile: false, needsDisassembly: false, synonyms: ['טאבון'] },
            { key: 'smoker', label: 'מעשנת בשר', icon: '🍖', defaultQty: 1, heavy: true, fragile: false, needsDisassembly: false, synonyms: ['מעשנה'] },
            { key: 'lawnmower', label: 'מכסחת דשא', icon: '🌿', defaultQty: 1, heavy: false, fragile: false, needsDisassembly: false, synonyms: ['מכסחה'] },
            { key: 'elliptical', label: 'אליפטיקל', icon: '🏃', defaultQty: 1, heavy: true, fragile: false, needsDisassembly: false, synonyms: ['מכונת אליפטיקל'] },
            { key: 'multi_trainer', label: 'מולטי-טריינר', icon: '🏋', defaultQty: 1, heavy: true, fragile: false, needsDisassembly: true, synonyms: ['מתקן כושר'] },
            { key: 'ping_pong_table', label: 'שולחן פינג-פונג', icon: '🏓', defaultQty: 1, heavy: true, fragile: false, needsDisassembly: true, synonyms: ['שולחן טניס שולחן'] },
            { key: 'hammock_chair', label: 'כיסא ערסל (מעמד + ערסל)', icon: '🪢', defaultQty: 1, heavy: false, fragile: false, needsDisassembly: true, synonyms: ['ערסל'] },
            { key: 'drying_rack_stand', label: 'מתקן ייבוש כביסה', icon: '🧺', defaultQty: 1, heavy: false, fragile: false, needsDisassembly: false, synonyms: ['מייבש כביסה עומד'] },
            { key: 'kids_slide', label: 'מגלשת ילדים', icon: '🛝', defaultQty: 1, heavy: false, fragile: false, needsDisassembly: true, synonyms: ['מגלשה'] },
            { key: 'vacuum_cleaner', label: 'שואב אבק', icon: '🧹', defaultQty: 1, heavy: false, fragile: false, needsDisassembly: false, synonyms: ['רובוט שואב אבק', 'שואב אבק רובוטי'] },
            { key: 'iron', label: 'מגהץ', icon: '🔥', defaultQty: 1, heavy: false, fragile: false, needsDisassembly: false, synonyms: [] },
            { key: 'ironing_board', label: 'קרש גיהוץ', icon: '👕', defaultQty: 1, heavy: false, fragile: false, needsDisassembly: false, synonyms: ['שולחן גיהוץ'] },
            { key: 'rowing_machine', label: 'מכשיר חתירה', icon: '🚣', defaultQty: 1, heavy: true, fragile: false, needsDisassembly: false, synonyms: [] },
            { key: 'pull_up_bar', label: 'מוט מתח', icon: '🏋', defaultQty: 1, heavy: false, fragile: false, needsDisassembly: true, synonyms: [] },
        ],
    },
    {
        key: 'office', label: 'משרד', icon: '💼',
        items: [
            { key: 'desk_small', label: 'שולחן עבודה קטן (עד 100 ס"מ)', icon: '🖥', defaultQty: 1, heavy: false, fragile: false, needsDisassembly: false, synonyms: ['שולחן כתיבה', 'שולחן מחשב'] },
            { key: 'desk_medium', label: 'שולחן עבודה בינוני (100–140 ס"מ)', icon: '🖥', defaultQty: 1, heavy: false, fragile: false, needsDisassembly: false, synonyms: ['שולחן משרדי', 'שולחן עבודה', 'שולחן עבודה רגיל'] },
            { key: 'desk_large', label: 'שולחן עבודה גדול (140–200 ס"מ)', icon: '🖥', defaultQty: 1, heavy: true, fragile: false, needsDisassembly: true, synonyms: ['שולחן L', 'שולחן עבודה גדול'] },
            { key: 'desk_giant', label: 'שולחן עבודה ענק (200–260 ס"מ)', icon: '🖥', defaultQty: 1, heavy: true, fragile: false, needsDisassembly: true, synonyms: [] },
            { key: 'desk_standing', label: 'שולחן עמידה חשמלי', icon: '🖥', defaultQty: 1, heavy: true, fragile: false, needsDisassembly: true, synonyms: ['שולחן עמידה'] },
            { key: 'meeting_table_small', label: 'שולחן ישיבות קטן (עד 200 ס"מ)', icon: '🪑', defaultQty: 1, heavy: true, fragile: false, needsDisassembly: true, synonyms: [] },
            { key: 'meeting_table_medium', label: 'שולחן ישיבות בינוני (200–350 ס"מ)', icon: '🪑', defaultQty: 1, heavy: true, fragile: false, needsDisassembly: true, synonyms: ['שולחן ועידה'] },
            { key: 'meeting_table_large', label: 'שולחן ישיבות גדול (350–500 ס"מ)', icon: '🪑', defaultQty: 1, heavy: true, fragile: false, needsDisassembly: true, synonyms: [] },
            { key: 'office_chair', label: 'כיסא משרדי', icon: '🪑', defaultQty: 1, heavy: false, fragile: false, needsDisassembly: false, synonyms: ['כיסא משרד', 'כיסא מנהלים', 'כיסא ארגונומי', 'כיסא אורתופדי'] },
            { key: 'safe_small_light', label: 'כספת קטנה קלה (עד 40 ס"מ)', icon: '🔒', defaultQty: 1, heavy: false, fragile: false, needsDisassembly: false, synonyms: ['כספת קלה'] },
            { key: 'safe_small_heavy', label: 'כספת קטנה כבדה (עד 40 ס"מ)', icon: '🔒', defaultQty: 1, heavy: true, fragile: false, needsDisassembly: false, synonyms: ['כספת כבדה', 'כספת'] },
            { key: 'desktop_tower', label: 'מחשב נייח מגדל', icon: '💻', defaultQty: 1, heavy: false, fragile: true, needsDisassembly: false, synonyms: ['מחשב', 'מגדל מחשב'] },
            { key: 'desktop_monitor', label: 'מסך מחשב (עד 32 אינץ\')', icon: '🖥', defaultQty: 1, heavy: false, fragile: true, needsDisassembly: false, synonyms: ['מסך', 'מוניטור'] },
            { key: 'printer_small', label: 'מדפסת קטנה (עד 45 ס"מ)', icon: '🖨', defaultQty: 1, heavy: false, fragile: false, needsDisassembly: false, synonyms: ['מדפסת'] },
            { key: 'printer_large', label: 'מדפסת גדולה (45–70 ס"מ)', icon: '🖨', defaultQty: 1, heavy: true, fragile: false, needsDisassembly: false, synonyms: ['מדפסת לייזר גדולה'] },
            { key: 'projector_screen', label: 'מסך הקרנה', icon: '🎬', defaultQty: 1, heavy: false, fragile: false, needsDisassembly: true, synonyms: ['מקרן', 'מסך הקרנה'] },
            { key: 'photocopier_small', label: 'מכונת צילום קטנה (עד 60 ס"מ)', icon: '🖨', defaultQty: 1, heavy: true, fragile: false, needsDisassembly: false, synonyms: ['פוטוקופי'] },
            { key: 'photocopier_large', label: 'מכונת צילום גדולה (60–100 ס"מ)', icon: '🖨', defaultQty: 1, heavy: true, fragile: false, needsDisassembly: false, synonyms: ['פוטוקופי גדול'] },
            { key: 'paper_shredder_small', label: 'מגרסת נייר קטנה (עד 35 ס"מ)', icon: '📄', defaultQty: 1, heavy: false, fragile: false, needsDisassembly: false, synonyms: ['קורע מסמכים', 'גרסת נייר'] },
            { key: 'paper_shredder_large', label: 'מגרסת נייר גדולה (35–60 ס"מ)', icon: '📄', defaultQty: 1, heavy: true, fragile: false, needsDisassembly: false, synonyms: ['מגרסה תעשייתית'] },
            { key: 'vacuum_cleaner', label: 'שואב אבק', icon: '🧹', defaultQty: 1, heavy: false, fragile: false, needsDisassembly: false, synonyms: ['שואב אבק'] },
            { key: 'laptop_computer', label: 'מחשב נייד', icon: '💻', defaultQty: 1, heavy: false, fragile: true, needsDisassembly: false, synonyms: ['לפטופ'] },
        ],
    },
    {
        key: 'misc', label: 'שונות', icon: '📦',
        items: [
            { key: 'keyboard_small', label: 'קיבורד קטן / נייד (ללא רגליים)', icon: '🎹', defaultQty: 1, heavy: false, fragile: true, needsDisassembly: false, synonyms: ['קיבורד', 'פסנתר חשמלי קטן', 'סינטיסייזר'] },
            { key: 'keyboard_large', label: 'פסנתר חשמלי / אורגן גדול (עם רגליים)', icon: '🎹', defaultQty: 1, heavy: true, fragile: true, needsDisassembly: false, synonyms: ['פסנתר חשמלי', 'אורגן', 'פסנתר דיגיטלי'] },
            { key: 'piano_upright', label: 'פסנתר אקוסטי', icon: '🎹', defaultQty: 1, heavy: true, fragile: true, needsDisassembly: false, notes: 'דורש מובילים מיומנים', synonyms: ['פסנתר'] },
            { key: 'drum_kit_small', label: 'תופים קטן / למתחילים (עד 4 חלקים, מפורק)', icon: '🥁', defaultQty: 1, heavy: false, fragile: false, needsDisassembly: true },
            { key: 'drum_kit_medium', label: 'תופים סטנדרטי (5 חלקים, מפורק)', icon: '🥁', defaultQty: 1, heavy: true, fragile: false, needsDisassembly: true },
            { key: 'drum_kit_large', label: 'תופים גדול / מקצועי (7–12 חלקים, מפורק)', icon: '🥁', defaultQty: 1, heavy: true, fragile: false, needsDisassembly: true, synonyms: ['סט תופים גדול'] },
            { key: 'painting_large', label: 'תמונה / ציור גדול (100–180 ס"מ)', icon: '🖼', defaultQty: 1, heavy: false, fragile: true, needsDisassembly: false, synonyms: ['תמונה גדולה'] },
            { key: 'ac_unit_1hp', label: 'מזגן + יחידת אוויר (עד 1 כ"ס)', icon: '❄️', defaultQty: 1, heavy: true, fragile: false, needsDisassembly: false, notes: 'ללא פירוק/התקנה', synonyms: ['מזגן'] },
            { key: 'ac_unit_1_2hp', label: 'מזגן + יחידת אוויר (1–2 כ"ס)', icon: '❄️', defaultQty: 1, heavy: true, fragile: false, needsDisassembly: false, notes: 'ללא פירוק/התקנה', synonyms: [] },
            { key: 'ac_unit_2_3hp', label: 'מזגן + יחידת אוויר (2–3 כ"ס)', icon: '❄️', defaultQty: 1, heavy: true, fragile: false, needsDisassembly: false, notes: 'ללא פירוק/התקנה', synonyms: [] },
            { key: 'water_cooler', label: 'קולר מים', icon: '💧', defaultQty: 1, heavy: false, fragile: false, needsDisassembly: false, synonyms: ['קולר'] },
            { key: 'wine_rack_large', label: 'מתלה יין גדול (עד 100 ס"מ)', icon: '🍷', defaultQty: 1, heavy: false, fragile: true, needsDisassembly: false, synonyms: ['מתלה בקבוקים'] },
            { key: 'darbouka', label: 'דרבוקה', icon: '🥁', defaultQty: 1, heavy: false, fragile: false, needsDisassembly: false, synonyms: ['תוף ערבי'] },
            { key: 'guitar', label: 'גיטרה', icon: '🎸', defaultQty: 1, heavy: false, fragile: true, needsDisassembly: false, synonyms: ['גיטרה בס', 'בס'] },
            { key: 'accordion', label: 'אקורדיון', icon: '🎹', defaultQty: 1, heavy: false, fragile: true, needsDisassembly: false, synonyms: [] },
            { key: 'vacuum_cleaner', label: 'שואב אבק', icon: '🧹', defaultQty: 1, heavy: false, fragile: false, needsDisassembly: false, synonyms: ['שואב אבק'] },
            { key: 'fan_floor', label: 'מאוורר עמידה', icon: '💨', defaultQty: 1, heavy: false, fragile: false, needsDisassembly: false, synonyms: ['מאוורר'] },
            { key: 'pet_carrier', label: 'כלוב נשיאה', icon: '🐾', defaultQty: 1, heavy: false, fragile: false, needsDisassembly: false, synonyms: ['תיק נשיאה לחיה'] },
            { key: 'pet_bed', label: 'מיטת כלב/חתול', icon: '🐾', defaultQty: 1, heavy: false, fragile: false, needsDisassembly: false, synonyms: [] },
            { key: 'cat_scratching_post', label: 'עמוד גירוד', icon: '🐱', defaultQty: 1, heavy: false, fragile: false, needsDisassembly: false, synonyms: [] },
            { key: 'cat_tree', label: 'מגדל טיפוס לחתולים', icon: '🐱', defaultQty: 1, heavy: false, fragile: false, needsDisassembly: true, synonyms: ['עץ לחתול', 'חתלטול'] },
            { key: 'small_pet_cage', label: 'כלוב לחיה קטנה (המסטר/ארנב)', icon: '🐹', defaultQty: 1, heavy: false, fragile: false, needsDisassembly: false, synonyms: ['כלוב'] },
            { key: 'doghouse_small', label: 'מלונה קטנה (עד 60 ס"מ)', icon: '🐕', defaultQty: 1, heavy: false, fragile: false, needsDisassembly: false },
            { key: 'doghouse_medium', label: 'מלונה בינונית (60–100 ס"מ)', icon: '🐕', defaultQty: 1, heavy: true, fragile: false, needsDisassembly: false },
            { key: 'doghouse_large', label: 'מלונה גדולה (100–150 ס"מ)', icon: '🐕', defaultQty: 1, heavy: true, fragile: false, needsDisassembly: true },
            { key: 'pet_fence', label: 'גדר תוחמת לחיות', icon: '🐾', defaultQty: 1, heavy: false, fragile: false, needsDisassembly: true, synonyms: ['גדר לחיות', 'מכלאה'] },
            { key: 'box_S', label: 'ארגז קרטון קטן (S, עד 30 ס"מ לצד)', icon: '📦', defaultQty: 1, heavy: false, fragile: false, needsDisassembly: false, synonyms: ['ארגז קטן', 'קרטון קטן'] },
            { key: 'box_M', label: 'ארגז קרטון בינוני (M, 30–40 ס"מ לצד)', icon: '📦', defaultQty: 1, heavy: false, fragile: false, needsDisassembly: false, synonyms: ['ארגז קרטון', 'קרטון', 'ארגז אריזה', 'קופסת קרטון'] },
            { key: 'box_L', label: 'ארגז קרטון גדול (L, 40–50 ס"מ לצד)', icon: '📦', defaultQty: 1, heavy: false, fragile: false, needsDisassembly: false, synonyms: ['ארגז קרטון גדול', 'קרטון גדול'] },
            { key: 'box_XL', label: 'ארגז קרטון ענק (XL, 50–70 ס"מ לצד)', icon: '📦', defaultQty: 1, heavy: false, fragile: false, needsDisassembly: false, synonyms: ['ארגז קרטון ענק', 'קרטון ענק', 'ארגז גדול מאוד'] },
            { key: 'safe_medium', label: 'כספת בינונית', icon: '🔒', defaultQty: 1, heavy: true, fragile: false, needsDisassembly: false, synonyms: ['כספת'] },
        ],
    },
];
export function getRoomByKey(key) {
    return ALL_ROOMS.find(r => r.key === key);
}
export function getItem(roomKey, itemKey) {
    return getRoomByKey(roomKey)?.items.find(i => i.key === itemKey);
}
export function getItemPrice(roomKey, itemKey) {
    return ITEM_PRICES[roomKey]?.[itemKey] ?? 0;
}
/** Finds an item's definition regardless of which room category it's filed under. */
export function findItemAnywhere(itemKey) {
    for (const room of ALL_ROOMS) {
        const found = room.items.find(i => i.key === itemKey);
        if (found)
            return found;
    }
    return undefined;
}
/** Price lookup that falls back across all categories — for items added to a room they don't natively belong to. */
export function getItemPriceAnyCategory(itemKey) {
    for (const categoryKey of Object.keys(ITEM_PRICES)) {
        const price = ITEM_PRICES[categoryKey]?.[itemKey];
        if (price !== undefined)
            return price;
    }
    return 0;
}
/** Full catalog of every item across every room, deduped by key, tagged with its native room. */
export function getAllItemsFlat() {
    const seen = new Set();
    const result = [];
    for (const room of ALL_ROOMS) {
        for (const item of room.items) {
            if (seen.has(item.key))
                continue;
            seen.add(item.key);
            result.push({ item, nativeRoomKey: room.key, nativeRoomLabel: room.label, nativeRoomIcon: room.icon });
        }
    }
    return result;
}
const SIZE_SUFFIX_RE = /^(.+)_(small|medium|large|giant)$/;
/**
 * Other size tiers of the same physical item (e.g. desk_medium → desk_small/large/giant),
 * detected from the catalog's own "<base>_<small|medium|large|giant>" key naming — used to
 * ask a size follow-up after a category-level pick (e.g. "which kind of table?" → "desk" →
 * "which size desk?"), instead of silently defaulting to one size. Returns [] for items that
 * aren't part of a size-tiered family (e.g. beds, which use unrelated key names per size).
 */
export function getSizeSiblings(itemKey) {
    const match = itemKey.match(SIZE_SUFFIX_RE);
    if (!match)
        return [];
    const base = match[1];
    const siblings = [];
    for (const { item } of getAllItemsFlat()) {
        if (item.key === itemKey)
            continue;
        const m = item.key.match(SIZE_SUFFIX_RE);
        if (m && m[1] === base)
            siblings.push(item);
    }
    return siblings;
}
/** Full catalog in the {key,label,synonyms} shape the AI service expects, deduped across all rooms/categories. */
export function getFullAICatalog() {
    return getAllItemsFlat().map(({ item }) => ({ key: item.key, label: item.label, synonyms: item.synonyms }));
}
export function recommendedWorkers(selectedItems, floorsNoElevator) {
    let score = 0;
    for (const { roomKey, itemKey, qty } of selectedItems) {
        const item = getItem(roomKey, itemKey);
        if (item?.heavy)
            score += qty;
    }
    score += floorsNoElevator * 2;
    if (score <= 3)
        return 1;
    if (score <= 7)
        return 2;
    return 3;
}
export function recommendedTruckSize(selectedItems) {
    const bigKeys = ['wardrobe_large', 'wardrobe_giant', 'sofa_l_shape', 'piano_upright', 'fridge_freezer_giant', 'meeting_table'];
    let bigItems = 0;
    for (const { itemKey, qty } of selectedItems) {
        if (bigKeys.includes(itemKey))
            bigItems += qty;
    }
    if (bigItems >= 4)
        return 'large';
    if (bigItems >= 2)
        return 'medium';
    return 'small';
}
/**
 * Items the packing service doesn't touch: appliances/climate/plumbing (handled by
 * the move itself, not "packing"), self-contained luggage/containers, vehicles,
 * outdoor/gym equipment moved as-is, plants, pets, and empty boxes the customer
 * already owns (that's the separate "bring your own box" flow, see BOX_PRICES).
 */
const PACKING_NONE_KEYS = new Set([
    'ac_unit_1hp', 'ac_unit_1_2hp', 'ac_unit_2_3hp', 'portable_ac', 'radiator', 'fan_ceiling', 'fan_floor',
    'fridge_freezer_small', 'fridge_freezer_medium', 'fridge_freezer_large', 'fridge_freezer_giant',
    'washer_dryer_small', 'washer_dryer_large', 'dishwasher_small', 'dishwasher_large',
    'oven_builtin', 'oven_wide', 'oven_standalone', 'cooktop', 'range_hood', 'water_heater', 'water_cooler',
    'safe_small_light', 'safe_small_heavy', 'safe_medium', 'wine_fridge',
    'suitcase_xl', 'suitcase_l', 'suitcase_m', 'suitcase_s',
    'outdoor_storage_box_small', 'outdoor_storage_box_medium', 'outdoor_storage_box_large',
    'box_S', 'box_M', 'box_L', 'box_XL',
    'bicycle', 'electric_scooter', 'kids_bike', 'kids_car', 'stroller', 'car_seat_box',
    'treadmill', 'exercise_bike', 'weight_bench', 'elliptical', 'multi_trainer', 'rowing_machine', 'pull_up_bar',
    'ladder_small', 'ladder_medium', 'ladder_large', 'sunshade_small', 'sunshade_large',
    'bbq_grill_small', 'bbq_grill_large', 'taboon', 'smoker', 'lawnmower', 'generator',
    'garden_swing_small', 'garden_swing_large', 'outdoor_bench_small', 'outdoor_bench_large',
    'sun_lounger', 'hammock_chair', 'drying_rack_stand', 'kids_slide',
    'storage_shelf_unit_small', 'storage_shelf_unit_medium', 'storage_shelf_unit_large',
    'outdoor_chair', 'trampoline_small', 'trampoline_large', 'rocking_horse', 'play_kitchen',
    'potted_plant_small', 'potted_plant_medium', 'potted_plant_large',
    'doghouse_small', 'doghouse_medium', 'doghouse_large', 'pet_fence', 'cat_tree',
    'snooker_table', 'ping_pong_table',
    'vacuum_cleaner', 'iron', 'ironing_board', 'clothes_rack_small', 'clothes_rack_large',
]);
/** Large furniture the packing crew wraps in protective blankets/shrink-wrap (never boxed). */
const PACKING_WRAP_KEYS = new Set([
    'single_bed', 'double_bed', 'king_bed', 'baby_bed', 'bed_one_half',
    'electric_bed_single', 'electric_bed_double', 'electric_bed_half', 'electric_bed_king',
    'bunk_bed', 'single_bed_kids',
    'wardrobe_small', 'wardrobe_medium', 'wardrobe_large', 'wardrobe_giant',
    'nightstand_small', 'nightstand_medium', 'nightstand_large', 'nightstand_giant',
    'mirror_standalone', 'mirror_wall_small', 'mirror_wall_medium', 'mirror_wall_large', 'mirror_wall_giant',
    'mirror_bathroom_small', 'mirror_bathroom_large', 'vanity_table_small', 'vanity_table_medium', 'vanity_table_large',
    'bookshelf_small', 'bookshelf_large', 'bookshelf_kids',
    'armchair_1seat', 'sofa_2seat', 'sofa_3seat', 'sofa_4seat', 'sofa_l_shape', 'sofa_corner', 'wing_chair',
    'coffee_table_small', 'coffee_table_medium', 'coffee_table_large',
    'tv_stand_small', 'tv_stand_medium', 'tv_stand_large',
    'tv_up_to_55', 'tv_above_55', 'tv_75_90', 'tv_90_120',
    'dining_table_small', 'dining_table_medium', 'dining_table_large', 'dining_table_giant',
    'kitchen_island_small', 'kitchen_island_medium', 'kitchen_island_large', 'kitchen_island_giant',
    'desk_small', 'desk_medium', 'desk_large', 'desk_giant', 'desk_standing',
    'meeting_table_small', 'meeting_table_medium', 'meeting_table_large',
    'chandelier_small', 'chandelier_large', 'fireplace_electric', 'home_cinema',
    'ottoman_small', 'ottoman_medium', 'ottoman_large',
    'piano_upright', 'keyboard_large', 'drum_kit_small', 'drum_kit_medium', 'drum_kit_large',
    'rug_s_sqm', 'rug_m_sqm', 'rug_l_sqm', 'rug_xl_sqm',
    'aquarium_small', 'aquarium_medium', 'aquarium_large',
    'painting_large', 'painting_giant', 'painting_medium', 'painting_small',
    'floor_lamp', 'buffet_sideboard', 'display_cabinet', 'honeycomb_shelf',
    'pantry_unit_small', 'pantry_unit_medium', 'pantry_unit_large', 'pantry_unit_giant',
]);
/**
 * Category-level default for how the packing service handles an item, derived from the
 * existing catalog attributes rather than hand-tagging all 250+ items individually — see
 * the packing-pricing project notes. Everything not explicitly listed above defaults to
 * 'box', with boxCount estimated from the item's own heavy/fragile flags.
 */
export function getPackingInfo(item) {
    if (PACKING_NONE_KEYS.has(item.key))
        return { packingType: 'none', boxCount: 0 };
    if (PACKING_WRAP_KEYS.has(item.key))
        return { packingType: 'wrap', boxCount: 0 };
    const boxCount = item.fragile ? 0.34 : item.heavy ? 0.5 : 0.2;
    return { packingType: 'box', boxCount };
}
