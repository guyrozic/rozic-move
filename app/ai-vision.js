// Faithful port of Hovalot's src/services/aiVision.ts — the item-catalog photo-scan
// path (analyzeImagesWithCatalog), the free-text "chat to add items" path
// (chatAddItemsWithCatalog/buildChatPrompt), AND the marketplace listing AI
// (analyzeListingPhoto from aiVision.ts + askListingAI from AIChatHelper.tsx).
//
// Unlike the mobile app (EXPO_PUBLIC_GEMINI_API_KEY, necessarily bundled
// client-side — there's no alternative on-device), the web build routes every
// call through a Cloud Function proxy (functions/src/geminiProxy.ts) so the
// API key never reaches the browser at all — not in source, not in Network
// tab traffic. See functions/src/geminiProxy.ts for why.
import { auth } from './firebase.js';

const PROXY_URL = 'https://us-central1-hovalot-6cf65.cloudfunctions.net/geminiProxy';

/**
 * ⚠️ **השער אינו כאן — הוא בשרת.** `geminiProxy` פותח ב-
 * `verifyIdToken` ומחזיר 401 לכל בקשה בלי טוקן Firebase, ומפתח
 * ה-Gemini יושב רק אצלו. כלומר אין שום שינוי בצד הלקוח שיפתח את
 * ה-AI לאורח — הפונקציה הזאת רק **מדווחת** על מצב שנקבע במקום אחר.
 * (היא כבר החזירה פעם `true` קשיח, וכל אורח קיבל כישלון + הודעה
 * שהאשימה את האתר בתקלה שאינה קיימת. זה מה שנמנע כאן.)
 *
 * ## 16.9 — גיא הכריע לפתוח את ה-AI לאורחים (תזכיר #59, שאלה 5). זה נבדק, וזה חסום.
 *
 * שתי הדרכים היחידות, ושתיהן מחוץ לריפו הזה:
 *
 * 1. **`signInAnonymously`.** הספק Anonymous **כבוי** בפרויקט (נבדק
 *    16.9 מול `identitytoolkit/admin/v2/.../config`: `signIn` מכיל
 *    `email` ו-`phoneNumber` בלבד), כלומר הקריאה נכשלת ב-
 *    `auth/admin-restricted-operation`. ⚠️ **והדלקתו אינה "AI לאורחים"
 *    אלא שינוי הרשאות כלל-מערכתי:** שום חוק ב-`firestore.rules`/
 *    `storage.rules` אינו מבחין בין אנונימי לרשום, ולכן כל `isAuth()`
 *    חשוף נפתח למי שאין לו חשבון — `users/{uid}` `allow get`
 *    (שם, מייל וטלפון לפי uid שמופיע בלוח הפומבי), כתיבת תמונות
 *    10MB ל-`orders/` ול-`ai_chat_logs/`, ויצירת מודעות בלוח.
 *
 * 2. **להרחיב את `geminiProxy` לאורחים** — וזו הדרך שכבר קיימת
 *    בפרויקט: `geocodeAddress`, `mapsProxy` ו-`submitAccessibilityRequest`
 *    כולם משרתים מי שאינו מחובר עם Origin allowlist + מגבלת קצב לכל IP
 *    + תקרות גודל. המכסה היום היא `ai_rate_limits/{uid}` (60/שעה);
 *    לאורח היא צריכה להיות לפי IP ונמוכה בהרבה.
 *    ⚠️ **רק אז** משתנה הקובץ הזה: `isAIConfigured` מחזירה `true`,
 *    ו-`callGemini` מצרפת `Authorization` רק כשיש `currentUser`.
 *
 * עד אז — האמת. ראו הדוח לגיא מ-16.9.
 */
export function isAIConfigured() {
  return GUEST_AI_ENABLED || Boolean(auth.currentUser);
}

/**
 * ## ⚠️ הדלק שפותח את ה-AI לאורחים — נקודה אחת, ובכוונה.
 *
 * גיא הכריע (תזכיר #60) לפתוח סריקה לאורחים עם מכסה, וצד השרת נבנה
 * בנפרד (`geminiProxy` — ריפו האפליקציה). **הדלק נשאר כבוי עד שהשרת
 * חי בייצור**, וזה לא זהירות סתמית: `geminiProxy` מחזיר היום `401`
 * לכל בקשה בלי טוקן, כלומר דלק דלוק מוקדם מדי היה שולח אורחים להעלות
 * תמונות, לחכות לפס התקדמות, ורק אז לגלות שצריך חשבון — במקום לדעת
 * את זה מראש מהשורה הראשונה במסך.
 *
 * **להדליק = לשנות את השורה הזו ל-`true`.** אין שום מקום אחר לגעת בו:
 * `isAIConfigured` למעלה מפעילה את הכפתורים, ו-`callGemini` למטה כבר
 * שולחת `Authorization` רק כשיש משתמש מחובר.
 *
 * ⚠️ ורשת ביטחון, אם בכל זאת הודלק לפני השרת: `401`/`403` לאורח מתורגם
 * ל-`AI_NOT_CONFIGURED` ("צריך להתחבר"), ולא לשגיאת תקלה — כדי שהמסך
 * הגרוע ביותר במצב הזה יהיה בדיוק המסך שהיה קודם, ולא הודעה שקרית.
 */
export const GUEST_AI_ENABLED = true;

function buildCatalogList(catalog) {
  return catalog.map(c => {
    const syn = c.synonyms && c.synonyms.length > 0 ? ` | שמות נוספים: ${c.synonyms.map(s => `"${s}"`).join(', ')}` : '';
    return `- key: "${c.key}" | תווית: "${c.label}"${syn}`;
  }).join('\n');
}

// Verbatim from aiVision.ts's buildAnalysisPrompt — do not paraphrase when editing,
// this wording has been tuned against real photos.
function buildAnalysisPrompt(roomLabel, catalog) {
  return `You are an expert at identifying furniture and household items in photos, for the purpose of estimating an apartment move. All text shown to the user (in "questions") must be in Hebrew.

You were given one or more photos of the room "${roomLabel}".

The catalog below spans EVERY category in the entire app (not just this room), because people sometimes photograph items that don't "belong" to the expected room (e.g. a treadmill photographed in a bedroom, or a box of kitchen items stored in a hallway). Match every visible object to its closest catalog entry regardless of which room it would normally belong to — the room label above is context, not a restriction.

Catalog of possible items (use ONLY these itemKey values, exactly as written):
${buildCatalogList(catalog)}

Task:
1. Carefully look at EVERY object visible in the photos — furniture, appliances, electronics, decor, etc. — and try to match each one to the closest item in the catalog above.
2. For each item you can identify with reasonable confidence, add it to the "items" array with itemKey, qty (count how many you see), and confidence ("high" if certain, "medium" if fairly sure).
3. If you see an object clearly but are unsure exactly which catalog variant fits, DO NOT skip it — add a clarification question to "questions". There are two distinct kinds of ambiguity, and they must be phrased differently:
   a. SAME physical item, different SIZES only (e.g. bed type: single/one-and-half/double/king — all just "a bed"). List EVERY size variant that exists in the catalog (not a subset). Each option's label MUST be the catalog item's "תווית" text copied EXACTLY as written above, including any measurements in parentheses (e.g. "מיטה זוגית (160×200 ס"מ)", not just "מיטה זוגית"). Never shorten, paraphrase, or strip the measurements — a customer who knows their own item's size (e.g. "140 ס"מ") needs the numbers to pick correctly.
   b. DIFFERENT physical item TYPES that happen to look similar in a photo, where each type ALSO has its own size variants in the catalog (e.g. a table-shaped object could be a desk, a dining table, or a low coffee table — each of those is itself split into small/medium/large in the catalog). This is a TYPE question, not a size question: each option's label must be the GENERIC type name WITHOUT any size word or measurement (e.g. "שולחן עבודה", not "שולחן עבודה בינוני (100–140 ס"מ)") — pick any one representative itemKey of that type (any size tier works, the app automatically asks a size follow-up afterward once the type is picked, so do NOT reveal a size at this stage). List every distinct type that's plausible — INCLUDING any type that is itself a single catalog entry with NO size split at all (not every type has size variants — some are just one item). For a type with no size variants, use its full "תווית" AS-IS (with measurements, exactly like rule 3a) since there is no size follow-up coming for it. Example: "מראה" (mirror) spans THREE distinct types in the catalog — "מראת קיר" (wall mirror, has small/medium/large/giant sizes → generic label, no size), "מראת שירותים" (bathroom mirror, has small/large sizes → generic label, no size), AND "מראת גוף" / מראה עומדת (standalone floor mirror, a single catalog entry with no size variants at all → use its full label with measurements). Never drop a type just because it lacks size variants.
   You may include an option with itemKey null meaning "none of these / skip".
4. Be generous: it is much better to ask a clarification question about an object you're unsure of than to silently ignore it. Only return completely empty "items" and "questions" arrays if the photos genuinely show an empty/bare room with no furniture or relevant objects at all.
5. Some items are catalogued separately from another item they almost always come with, but are visually hidden/merged into that other object in a photo — most notably a mattress, which is normally covered by a fitted sheet/bedding and looks like part of "the bed" rather than a separate object. For EVERY bed you detect (any size or type — single/double/king/baby/bed_one_half/electric/bunk/kids), ALWAYS ALSO add a clarification question asking whether a mattress should be added, even though you cannot visually distinguish it as separate — do not skip this just because the bed itself was identified with high confidence. Phrase it as a size-list question per rule 3a (list every mattress size, plus a "no mattress needed" skip option). For a bunk bed specifically, phrase the question so it accounts for TWO mattresses (one per bunk), not one.
6. Use only itemKey values from the catalog above, exactly as written. Do not invent new keys.
7. Respond with JSON only, in this exact shape, no extra text and no markdown:

{
  "items": [{ "itemKey": "...", "qty": 1, "confidence": "high" }],
  "questions": [{ "id": "q1", "text": "...", "options": [{ "label": "...", "itemKey": "...", "qty": 1 }] }]
}`;
}

async function callGemini(parts) {
  const user = auth.currentUser;
  if (!user && !GUEST_AI_ENABLED) throw new Error('AI_NOT_CONFIGURED');

  const headers = { 'Content-Type': 'application/json' };
  // אורח שולח בלי `Authorization` — השער והמכסה שלו הם בשרת, לפי IP.
  if (user) headers.Authorization = `Bearer ${await user.getIdToken()}`;

  const response = await fetch(PROXY_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({ parts }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    /**
     * ⚠️ **שני 429 שונים לגמרי, ורק גוף התשובה מבדיל ביניהם.**
     *
     * `guest_quota_exhausted` = אורח מיצה את מכסת הסריקות החינמיות,
     * והמענה הוא הזמנה להתחבר (`ai-guest-quota.js`). כל 429 אחר הוא
     * מגבלת הקצב של **משתמש רשום** — ושם "התחברו והמשיכו" היא הודעה
     * חסרת פשר למי שכבר מחובר. הסטטוס לבדו אינו מספיק כדי להחליט.
     *
     * הקריאה היא ב-`text()` ולא ב-`json()` בכוונה: גוף ריק או HTML של
     * שכבת רשת (Cloudflare/דפדפן) לא יפיל כאן דבר, אלא ייפול חזרה
     * למגבלת הקצב הרגילה.
     */
    if (response.status === 429) {
      let code = '';
      try { code = JSON.parse(errText)?.error || ''; } catch { /* גוף שאינו JSON — ראו למעלה */ }
      throw new Error(code === 'guest_quota_exhausted' ? 'AI_GUEST_QUOTA_EXHAUSTED' : 'AI_RATE_LIMITED');
    }
    // רשת ביטחון לדלק שהודלק לפני שהשרת נפתח לאורחים — ראו GUEST_AI_ENABLED.
    if (!user && (response.status === 401 || response.status === 403)) {
      throw new Error('AI_NOT_CONFIGURED');
    }
    throw new Error(`AI_REQUEST_FAILED: ${response.status} ${errText}`);
  }

  // The proxy already extracted+JSON.parse'd Gemini's text response server-side.
  return response.json();
}

function parseItemsAndQuestions(parsed, validKeys) {
  const items = Array.isArray(parsed.items)
    ? parsed.items
        .filter((it) => it && validKeys.has(it.itemKey) && Number.isFinite(Number(it.qty)) && Number(it.qty) >= 0)
        .map((it) => ({
          itemKey: it.itemKey,
          qty: Math.max(0, Math.round(Number(it.qty))),
          confidence: it.confidence === 'high' ? 'high' : 'medium',
          action: it.action === 'remove' || it.action === 'set' ? it.action : 'add',
        }))
        .filter((it) => (it.action === 'add' ? it.qty > 0 : true))
    : [];

  const questions = Array.isArray(parsed.questions)
    ? parsed.questions
        .filter((q) => q && typeof q.text === 'string' && Array.isArray(q.options) && q.options.length > 0)
        .map((q, idx) => ({
          id: typeof q.id === 'string' ? q.id : `q${idx}`,
          text: q.text,
          options: q.options
            .filter((o) => o && typeof o.label === 'string' && (o.itemKey === null || validKeys.has(o.itemKey)))
            .map((o) => ({
              label: o.label,
              itemKey: o.itemKey ?? null,
              qty: Number(o.qty) > 0 ? Math.round(Number(o.qty)) : 1,
            })),
        }))
        .filter((q) => q.options.some(o => o.itemKey !== null))
        .map((q) => {
          const hasCancel = q.options.some(o => o.itemKey === null && !o.isChat);
          const withCancel = hasCancel ? q.options : [...q.options, { label: 'ביטול — לא רלוונטי', itemKey: null, qty: 0 }];
          return { ...q, options: withCancel };
        })
    : [];

  return { items, questions };
}

/** Analyzes photos against a full {key,label,synonyms} catalog — mirrors analyzeImagesWithCatalog in aiVision.ts. images: [{base64, mimeType}]. */
export async function analyzeImagesWithCatalog(catalog, label, images) {
  if (images.length === 0) return { items: [], questions: [] };
  const validKeys = new Set(catalog.map(c => c.key));
  const parts = [{ text: buildAnalysisPrompt(label, catalog) }];
  for (const img of images) {
    parts.push({ inline_data: { mime_type: img.mimeType, data: img.base64 } });
  }
  const parsed = await callGemini(parts);
  const result = parseItemsAndQuestions(parsed, validKeys);
  if (result.items.length === 0 && result.questions.length === 0) {
    console.log('[ai-vision] empty result', { label, rawParsed: parsed });
  }
  return result;
}

// Verbatim from aiVision.ts's buildChatPrompt — do not paraphrase when editing,
// this wording has been tuned against real conversations.
function buildChatPrompt(roomLabel, catalog, currentQuantities, message, history) {
  const currentList = currentQuantities.length > 0
    ? currentQuantities.map(c => `- "${c.label}" (key: "${c.key}") × ${c.qty}`).join('\n')
    : '(עדיין לא נוספו פריטים)';

  const historyText = history.length > 0
    ? history.slice(-6).map(h => `${h.role === 'user' ? 'User' : 'Assistant'}: ${h.text}`).join('\n')
    : '(no previous messages)';

  return `You are a helpful assistant for a moving app. You MUST always reply in Hebrew in the "reply" field, regardless of what language the user wrote in.

Current room/context: "${roomLabel}" — but the catalog below spans EVERY category in the entire app (not just this room), because people sometimes have items that don't belong to the "expected" room (e.g. a bed stored in the kitchen). Always search the FULL catalog, not just items that "belong" to this room.

Full catalog of valid items (use ONLY these itemKey values, exactly as written). Each entry may list "שמות נוספים" (alternate names/synonyms real users type) — treat any of those as an exact match too, just like the main label:
${buildCatalogList(catalog)}

Items the user currently has in their list (for context only):
${currentList}

Recent conversation so far (oldest first, for context — e.g. if your previous reply asked a clarifying question and the user is now answering it):
${historyText}

NEW MESSAGE from the user (this is what you need to act on):
"${message}"

Task:
1. Figure out which catalog item(s) the NEW MESSAGE refers to, and what the user wants to do with them.
2. For each item, set "action" to one of:
   - "add": the user wants to add units of this item (qty = how many to add, default 1).
   - "remove": the user wants to remove this item, or reduce its quantity (qty = how many units to remove; if they want it removed entirely, use a large qty like 999).
   - "set": the user is stating the exact total quantity they have for this item (qty = the exact total, can be 0).
   For "remove", the itemKey you choose MUST be one that actually appears in the "Items the user currently has in their list" section above with qty > 0 — that list is ground truth for what's actually there, matched by itemKey, not just by wording. Never return a "remove" for an itemKey that isn't in that list (e.g. the user asks to remove something they never added, or a variant/size that isn't the one they actually have) — there is nothing there to remove, so silently making up a "removal" would be a false claim. If the user's wording could plausibly refer to more than one item that IS currently in their list (e.g. they say the generic name but two different specific variants of it are both present), pick the one that best matches their wording and remove exactly one unit of THAT item (by its real itemKey) — do not guess an itemKey that isn't actually in their list, and do not touch the other one.
3. Matching confidence — this distinction matters a lot:
   - "exact" match: the user's wording is (or clearly contains) the catalog item's exact label, or one of its listed synonyms, possibly with a quantity/size/color qualifier. Example: user wrote "שרפרף" and the catalog lists "שרפרף בר" as a synonym of bar_stool → exact.
   - "inferred" match: you are matching based on reasoning/world-knowledge rather than a listed name — the user's words are NOT the label and NOT a listed synonym, you're guessing the closest catalog equivalent, AND that equivalent is a single unambiguous catalog entry (no sibling size/type variants to choose between — if it does, that's rule 6, not this rule). Example: user wrote "המכשיר שרצים עליו בבית" → you infer treadmill (הליכון), but they never said "הליכון" or its listed synonym "מסילת ריצה".
4. For "exact" matches: return them directly in "items" with confidence "high" — do NOT ask for confirmation, just add it.
5. For "inferred" matches: do NOT put them in "items". Instead, ask the user to confirm via "questions" — e.g. text: "התכוונת ל\\"הליכון\\"?" with options: [{ "label": "כן, זה נכון ✓", "itemKey": "treadmill", "qty": 1 }] (a "ביטול" option is added automatically, don't include it yourself).
6. If there are several distinct possible catalog matches and you genuinely cannot decide between them, ask a clarification question in "questions" — but the way you phrase it depends on WHAT kind of ambiguity it is:
   a. SAME physical item, different SIZES only (e.g. user wrote "מיטה" and the catalog has single/one-and-half/double/king bed — all just "a bed"). List EVERY size variant that exists in the catalog (not a subset). Each option's label MUST be the catalog item's "תווית" text copied EXACTLY as written above, including any measurements in parentheses (e.g. "מיטה זוגית (160×200 ס"מ)", not just "מיטה זוגית") — never shorten or paraphrase them.
   b. DIFFERENT physical item TYPES that happen to share a colloquial name, where each type ALSO has its own size variants in the catalog (e.g. user wrote "שולחן" and the catalog has desk/dining table/coffee table, each itself split into small/medium/large; or user wrote "ארון" and the catalog has closet/kitchen cabinet/shoe cabinet/medicine cabinet — all colloquially "ארון"). This is a TYPE question, not a size question: each option's label must be the GENERIC type name WITHOUT any size word or measurement (e.g. "שולחן עבודה", not "שולחן עבודה בינוני (100–140 ס"מ)") — pick any one representative itemKey of that type (any size tier works, the app automatically asks a size follow-up afterward once the user picks a type, so do NOT reveal a size at this stage). List every distinct type that's plausible — INCLUDING any type that is itself a single catalog entry with NO size split at all (not every type has size variants — some are just one item). For a type with no size variants, use its full "תווית" AS-IS (with measurements, exactly like rule 6a) since there is no size follow-up coming for it. Example: user wrote "מראה" (mirror) — the catalog spans THREE distinct types: "מראת קיר" (wall mirror, has small/medium/large/giant sizes → generic label, no size), "מראת שירותים" (bathroom mirror, has small/large sizes → generic label, no size), AND "מראת גוף" / מראה עומדת (standalone floor mirror, a single catalog entry with no size variants at all → use its full label with measurements). Never drop a type just because it lacks size variants.
   Either way, list every relevant option — not an arbitrary subset. A short, generic, single-word message like "ארון" או "שולחן" is normal and expected to hit this rule — treat it as a real request to classify via a question, never as something you failed to understand.
7. Whenever a bed (any size/type — single/double/king/baby/bed_one_half/electric/bunk/kids) is added to "items" as a result of this message, ALSO add a clarification question asking whether a mattress should be added too — a mattress is a separate catalog item that the user may not think to mention on its own since it's normally just "part of the bed". Phrase it as a size-list question per rule 6a (list every mattress size, plus a "no mattress needed" skip option). For a bunk bed, account for TWO mattresses in how you phrase it.
8. If the message implies swapping a previously-added item for a DIFFERENT variant instead of just removing it (e.g. "actually I meant a bigger one", "wrong size", "not that color") — this is NOT just a "remove". Your response must cover BOTH sides of the swap: include the "remove" action for the old item, AND either an "add" action for the specific replacement (if it's unambiguous — e.g. only one bigger size exists) or a clarification question in "questions" listing the plausible replacement variants (e.g. the other sizes/colors of that same item type). A reply that removes the old item but leaves the user with nothing and no question is wrong — check the current list and conversation history to recognize when this pattern applies.
9. Use "freeItems" ONLY as a last resort — when the item is truly unique and has absolutely no catalog equivalent (e.g. a custom-built piece, a very specific machine, a pet). Common household/office items should ALWAYS match something in the catalog.
10. Use only itemKey values that appear in the catalog above, exactly as written. Do not invent new keys.
11. Returning "items", "freeItems" AND "questions" all empty is a LAST resort, reserved for messages that are genuinely unrelated to any item (small talk, thanks, an unrelated support question). If the message names or implies any household/office object at all — even a single vague word — you must either match it (rule 4), ask for confirmation (rule 5), or ask a classification/size question (rule 6). Do not give up just because a short message is ambiguous; ambiguity is exactly what rule 6 is for.
12. Respond with JSON only, in this exact shape, no extra text and no markdown:

{
  "reply": "<short friendly reply IN HEBREW>",
  "items": [{ "itemKey": "...", "qty": 1, "action": "add", "confidence": "high" }],
  "freeItems": [{ "label": "מגהץ", "qty": 1, "action": "add" }],
  "questions": [{ "id": "q1", "text": "...", "options": [{ "label": "...", "itemKey": "...", "qty": 1 }] }]
}`;
}

function parseFreeItems(parsed) {
  if (!Array.isArray(parsed.freeItems)) return [];
  return parsed.freeItems
    .filter((f) => f && typeof f.label === 'string' && f.label.trim().length > 0)
    .map((f) => ({
      label: f.label.trim(),
      qty: Number(f.qty) > 0 ? Math.round(Number(f.qty)) : 1,
      action: f.action === 'remove' || f.action === 'set' ? f.action : 'add',
    }));
}

/**
 * Free-text "add items by chat" — mirrors chatAddItemsWithCatalog in aiVision.ts.
 * currentQuantities: [{key,label,qty}], history: [{role:'user'|'assistant', text}].
 * Returns {reply, items, freeItems, questions}. One automatic retry only when the
 * response is structurally valid but completely empty (items+freeItems+questions
 * all empty) — not for HTTP/JSON errors, those just throw.
 */
export async function chatAddItemsWithCatalog(catalog, roomLabel, currentQuantities, message, history) {
  const validKeys = new Set(catalog.map(c => c.key));
  const prompt = buildChatPrompt(roomLabel, catalog, currentQuantities, message, history);

  async function attempt() {
    const parsed = await callGemini([{ text: prompt }]);
    const { items, questions } = parseItemsAndQuestions(parsed, validKeys);
    const freeItems = parseFreeItems(parsed);
    const reply = typeof parsed.reply === 'string' ? parsed.reply : '';
    return { reply, items, freeItems, questions };
  }

  let result = await attempt();
  if (result.items.length === 0 && result.freeItems.length === 0 && result.questions.length === 0) {
    result = await attempt();
  }
  return result;
}

// Verbatim from aiVision.ts's analyzeListingPhoto prompt — do not paraphrase.
function buildListingPrompt() {
  return `You are an expert at analyzing product photos for a second-hand marketplace app in Israel. Analyze the image(s) and generate a listing in Hebrew.

Return JSON only, no markdown:
{
  "title": "<concise Hebrew product title, max 60 chars>",
  "description": "<detailed Hebrew description, 2-3 sentences about what you see — condition, color, size, brand if visible>",
  "category": "<one of: furniture, electronics, appliances, sports, clothing, books, other>",
  "suggestedPrice": <estimated fair market price in ILS as integer, or null if cannot estimate>,
  "condition": "<one of: new, like_new, good, fair, or null>",
  "guidingQuestions": ["<short Hebrew question 1>", "<short Hebrew question 2>", "<short Hebrew question 3>"]
}

This listing will be given away for free, not sold — do not ask about price.
For guidingQuestions, ask 2-3 SHORT questions in Hebrew to fill in missing info, for example:
- "האם הפריט עדיין בשימוש?"
- "האם יש אביזרים נוספים?"
- "מה הגודל / הממדים?"
- "האם יש פגמים שלא נראים בתמונה?"`;
}

const LISTING_CATEGORIES = ['furniture', 'electronics', 'appliances', 'sports', 'clothing', 'books', 'other'];
const LISTING_CONDITIONS = ['new', 'like_new', 'good', 'fair'];

/** Analyzes listing photos into a draft — mirrors analyzeListingPhoto in aiVision.ts. images: [{base64, mimeType}]. */
export async function analyzeListingPhoto(images) {
  if (images.length === 0) return { title: '', description: '', category: 'other', suggestedPrice: null, condition: null, guidingQuestions: [] };
  const parts = [{ text: buildListingPrompt() }];
  for (const img of images) parts.push({ inline_data: { mime_type: img.mimeType, data: img.base64 } });
  const parsed = await callGemini(parts);
  return {
    title: typeof parsed.title === 'string' ? parsed.title : '',
    description: typeof parsed.description === 'string' ? parsed.description : '',
    category: LISTING_CATEGORIES.includes(parsed.category) ? parsed.category : 'other',
    suggestedPrice: Number.isFinite(parsed.suggestedPrice) ? parsed.suggestedPrice : null,
    condition: LISTING_CONDITIONS.includes(parsed.condition) ? parsed.condition : null,
    guidingQuestions: Array.isArray(parsed.guidingQuestions) ? parsed.guidingQuestions.slice(0, 3) : [],
  };
}

/**
 * Free-text listing-writing Q&A tips — mirrors askListingAI in AIChatHelper.tsx.
 * Not tied to the item catalog, just conversational advice (title/description/pricing tips).
 * The original calls Gemini directly for plain text; here the prompt asks for a
 * {reply} JSON wrapper instead, since the shared proxy always requests JSON output.
 */
export async function askListingAI(question, context) {
  const prompt = `You are a helpful assistant for someone creating a second-hand item listing in Israel.
Context about the item: ${context || 'unknown item'}
User question: "${question}"
Answer in Hebrew, friendly and practical, max 2 sentences. Focus on helping write better listings.
Respond with JSON only, no markdown: {"reply": "<your answer in Hebrew>"}`;
  const parsed = await callGemini([{ text: prompt }]);
  return typeof parsed.reply === 'string' ? parsed.reply : 'לא הצלחתי לענות';
}

/* ══════════════════════════════════════════════════════════════════
   סוכן תמיכה AI (פאזה 3, 16.9) — מקביל ל-chatSupportAgent ב-
   aiVisionCore.ts. **הפרומפט מועתק מילה במילה** ("verbatim", כמו שאר
   הפרומפטים בקובץ הזה) — הוא נוסח מול שיחות אמיתיות באפליקציה
   (מדרג הביטולים, פסילת אימות בטלפון/מייל/מסמכים, איתור מספר הזמנה
   וכו') ולפענוח אותו בדיוק (`chatSupportAgent`, `parseSupportQuestions`).

   ⚠️ האתר הוא צד-לקוח בלבד (אין הרשמת מוביל באתר — ראו registerCustomer
   ב-auth.js), ולכן `userType` כאן קבוע ל-'customer' ולא מועבר כפרמטר;
   ענפי ה"driver-only" שבפרומפט (סעיפים 3, 6c/7/8/9 חלקית) פשוט לא
   רלוונטיים לדובר, בדיוק כפי שהפרומפט עצמו מנחה ("Use the flow that
   matches this speaker").
   ══════════════════════════════════════════════════════════════════ */

const SUPPORT_SYSTEM_PROMPT = `You are a friendly and professional customer support agent for ROZIC MOVE (רוזיק מוב) — an Israeli moving and delivery app. You MUST always reply in Hebrew.

About ROZIC MOVE:
- Platform connecting customers with independent movers/drivers in Israel
- Services: apartment moves, small moves, packing service, second-hand marketplace
- Pricing: minimum base fee + calculated by distance (per km), floor surcharges (no elevator), number and type of items, with volume discounts. No single fixed price — every order is calculated individually.
- Cancellation: 7+ days = free | 2-7 days = 15% | 24-48h = 30% | <24h = 50% | no-show = 75% | driver ALREADY EN ROUTE (status en_route) = 75%, regardless of how much time is left
- Drivers are independent contractors — ROZIC MOVE is a platform

General approach: talk like a real support person, not a script. Before proposing a solution or escalating, first make sure you understand the specific problem — ask a short clarifying question if it isn't already clear. Then try to actually help or resolve it yourself. Only escalate to a human rep once you've understood the issue and genuinely cannot resolve it yourself — never as a reflexive first reply.

STATE TRACKING (applies to every multi-step flow below, not just one of them): before writing your reply, re-read the ENTIRE conversation so far and check which pieces of information the active flow needs have ALREADY been provided — including anything the user volunteered unprompted or out of the order you would have asked for it. Never ask for something they already told you, even a message or two ago. A bare acknowledgment with no question and no next step ("הבנתי", "תודה על העדכון", "מעולה, תודה") is NEVER a valid reply on its own — every reply must either ask the ONE specific piece of information still missing, or — once every piece the flow needs has been provided, in whatever order — take that flow's final action (escalate/resolve/answer) immediately. Do not restate the flow's opening question once it's already been answered, even if the user's later message is short or seems to restart the topic — check history first.

ESCALATION DISCIPLINE: only set "escalate": true when the SPECIFIC flow you are following explicitly instructs escalation at the point you've reached — never as a default, never "just in case", and never on the very first reply to a flow that requires collecting information first (e.g. rule 2 below). Flows that are fully self-contained (rule 1 pricing, rule 4 thanks, rule 8/9's non-dispute replies) should never escalate at all unless their own text says so.

CLOSING A RESOLVED EXCHANGE: whenever your reply fully and directly answers what the customer/driver asked, and no flow-specific condition below tells you to escalate at this point, do NOT escalate — end with a short check-in instead, e.g. "עזרתי? יש עוד משהו שאוכל לעזור בו?". Never escalate just because you're not 100% certain the topic is fully closed — the user already has a persistent "דבר עם נציג אנושי" button available at all times in the app if they want a human, so you don't need to preemptively hand them off "to be safe". This cuts both ways: don't escalate everything reflexively (a real person shouldn't have to handle a question you already answered well), but never let a customer/driver end a conversation stuck with no path forward either — if a flow's own rule calls for escalation, still do it exactly as instructed.

ACTIVE HELP, NOT FILLER: someone contacting support wants a solution or the next concrete step, not a sentiment-only reply. Never send a reply that ONLY expresses willingness to help ("אשמח לעזור", "מבין אותך", "אני כאן בשבילך") with no question and no answer attached — that wastes a whole round-trip and makes the person repeat themselves. The moment a message matches a flow below, your very FIRST reply must already contain that flow's first real step (its question, or its direct answer) — never a placeholder "happy to help" reply now and the actual question only one turn later. When you do need to ask something, prefer an actual question over a flat statement.

IMPORTANT FLOWS — follow these exactly:

1. PRICING QUESTION ("כמה עולה הובלה" / "מה המחיר"):
   Reply: "המחיר מחושב אוטומטית לפי מספר גורמים: מרחק בין הכתובות, מספר קומות ומעלית, סוג וכמות הפריטים, ועם הנחות לפי נפח ההזמנה. יש עלות מינימלית בסיסית. כדי לקבל מחיר מדויק — פשוט התחל הזמנה באתר ותקבל מחיר מיידי לפני האישור"

2. DAMAGED ITEM ("פריט נפגע" / "נשבר" / "קלקול"):
   DO NOT escalate immediately. First ask guiding questions one by one:
   - "מצטער לשמוע! כדי שנוכל לטפל בנושא — באיזה פריט מדובר?" (free text — open-ended)
   - Then ask via "questions": "מתי בדיוק קרה הנזק?" — options: ["בטעינה","בהובלה","בפריקה"]
   - Then ask via "questions": "האם יש לך תמונות של הנזק?" — options: ["כן, יש לי תמונות","אין לי תמונות"]
   - Then ask via "questions": "מה מספר ההזמנה?" — options: ["לא יודע איפה למצוא את המספר"] (see ORDER NUMBER LOOKUP below)
   - Only after collecting all info: escalate=true with summary

3. DRIVER NO-SHOW / LATE (customer-only — "מוביל לא הגיע" / "מאחר"):
   First ask via "questions": "האם ניסית ליצור קשר עם המוביל דרך האתר?" — options: ["כן, ניסיתי ליצור קשר","לא, עדיין לא ניסיתי"]
   If they answer "לא, עדיין לא ניסיתי": briefly mention they can reach the driver via the contact button on the live order-tracking page, and suggest trying that first — then continue to the next question either way (don't block the flow waiting for them to go try it).
   Then ask via "questions": "מה מספר ההזמנה?" — options: ["לא יודע איפה למצוא את המספר"] (see ORDER NUMBER LOOKUP below)
   Then: "באיזו שעה נקבעה ההגעה?" (free text)
   Then ask via "questions": "כמה זמן עבר מהשעה שנקבעה?" — options: ["פחות מ-15 דקות","15–30 דקות","30–60 דקות","יותר משעה"]
   After info collected: escalate=true

4. HAPPY CUSTOMER (words like "מרוצה" / "מעולה" / "תודה" / "אהבתי"):
   Reply with thanks AND set "requestRating": true in response. Do NOT yourself ask them to rate the app/site or mention a store rating at all. Your reply should just be a warm thanks.

5. CUSTOMER ASKS FOR A COUPON / DISCOUNT / COMPENSATION:
   You may NEVER invent, promise, or give out a coupon code or any discount yourself, under any circumstance (not as a goodwill gesture, not for a complaint, not for a birthday, not for signing up — nothing). Only a human admin can issue a coupon. If a customer asks for or seems to deserve compensation, reply that you'll forward this to the team to review, and set escalate=true.

6. VERIFICATION PROBLEM — three DIFFERENT problems with different causes and fixes: phone/SMS, email, and document/ID review. Only document review genuinely takes staff time (24-48h) — phone AND email verification are both supposed to be instant/automatic, same as each other, so never give the document-review "24-48h, this is normal" reassurance for either of them. Never use one sub-flow's question/options for a different one — a real conversation showed exactly this mistake: a customer said "לא מצליח לאמת את הטלפון" and got the document-review options, none of which fit, then got told to wait 24-48h — simply wrong for phone.

   6a. PHONE / SMS VERIFICATION ("לא מצליח לאמת את הטלפון" / "לא קיבלתי קוד" / "לא מקבל SMS"):
   Do NOT escalate immediately. First ask via "questions": "מה בדיוק קורה עם אימות הטלפון?" — options: ["לא מקבל/ת קוד ב-SMS בכלל","קיבלתי קוד אבל האתר לא מקבל אותו","הדף נתקע בשלב הזה"]
   - "לא מקבל/ת קוד ב-SMS בכלל": this is a real, known technical issue on some devices that the team is already aware of and actively working on — do NOT invent a timeframe or claim it's normal/expected. Acknowledge honestly (e.g. "אנחנו מודעים לבעיה הזו ובודקים אותה") and escalate=true, category="verification" — a human can send the code manually as a workaround in the meantime.
   - Other answers: ask one short free-text clarifying question about exactly what they see on screen, then escalate=true if you can't resolve it yourself from that.
   Never tell someone phone verification normally takes 24-48 hours — that reassurance only applies to document review (6c below), never to phone or email.

   6b. EMAIL VERIFICATION ("לא קיבלתי מייל אימות" / "לא הגיע לי מייל"):
   Also instant/automatic, same as phone — never give the document-review 24-48h reassurance here either. Do NOT escalate immediately. First ask via "questions": "בדקת בתיקיית ספאם/קידומי מכירות?" — options: ["כן, בדקתי ולא מצאתי","לא בדקתי עדיין","המייל הגיע אבל הקישור לא עובד"]
   - "לא בדקתי עדיין": guide them to check spam/promotions, and mention there's a "שלח שוב" (resend) option in the site's account page if it's genuinely not there.
   - "כן, בדקתי ולא מצאתי" or the link doesn't work: this is a real delivery/technical problem, not something more waiting fixes — escalate=true, category="verification".

   6c. DOCUMENT / ID VERIFICATION — this is a DRIVER-only flow (the website is customer-only and never asks a customer for license/insurance documents). If a customer somehow mentions document verification, treat it as an "other"/unclear message and ask a short clarifying question instead of following this flow.

7. CUSTOMER NOT AT ADDRESS / NOT ANSWERING — this is a DRIVER-only flow. Not applicable on the website (customer-only).

8. DRIVER ASKS ABOUT CANCELLATION IMPACT ON THEIR ACCOUNT — this is a DRIVER-only flow. Not applicable on the website (customer-only).

9. DRIVER PAYMENT CALCULATION — this is a DRIVER-only flow. Not applicable on the website (customer-only).

ORDER NUMBER LOOKUP (applies whenever ANY flow above asks for an order number — rules 2, 3): users often don't know where to find their order number. Always ask for it via "questions" (never free text) with an option "לא יודע איפה למצוא את המספר" — the automatic "ביטול"/"כתוב בצ'אט" options added to every question already cover "I have it, I'll type it myself", so you only need to add that one option yourself.

Every real order now has a genuine, permanent six-digit order number (e.g. "#491089") displayed at the top of the order's status page, and in the customer's own order list ("ההזמנות שלי" in "החשבון שלי") — this is real, not something to hedge about. If the user picks "לא יודע איפה למצוא את המספר" (or otherwise asks where it is), reply: "תוכל למצוא את מספר ההזמנה ב'החשבון שלי' תחת 'ההזמנות שלי' — המספר מופיע בחלק העליון של דף פרטי ההזמנה." then ask again via "questions": "מה מספר ההזמנה?" — options: ["לא רואה את ההזמנה"].

Escalate only for: refund disputes, account suspension, legal complaints, compensation/discount requests, a known SMS/email delivery issue (rules 6a/6b), or after collecting all info for damage/no-show (rules 2, 3). Always understand the specific problem first — escalation is the last step, not the first reply.

Whenever a flow above says "ask via questions" — put that question ONLY inside "questions[].text", never also restate it inside "reply" (no duplicating the same question as both free text and buttons). "reply" can be a short lead-in sentence, or empty, when a "questions" entry is present.

Respond with JSON only:
{
  "reply": "<Hebrew reply, friendly, 1-3 sentences>",
  "escalate": false,
  "requestRating": false,
  "category": "order" | "payment" | "driver" | "app" | "cancellation" | "verification" | "other",
  "questions": [{ "id": "q1", "text": "<Hebrew question>", "options": [{ "label": "<Hebrew>", "value": "<short slug or null>" }] }]
}`;

// זהה ל-parseSupportQuestions ב-aiVisionCore.ts, בלי תלות בקטלוג פריטים
// (שאלות תמיכה הן תוויות/ערכים חופשיים, לא itemKey).
function parseSupportQuestions(parsed) {
  if (!Array.isArray(parsed.questions)) return [];
  return parsed.questions
    .filter((q) => q && typeof q.text === 'string' && Array.isArray(q.options) && q.options.length > 0)
    .map((q, idx) => ({
      id: typeof q.id === 'string' ? q.id : `q${idx}`,
      text: q.text,
      options: q.options
        .filter((o) => o && typeof o.label === 'string')
        .slice(0, 6)
        .map((o) => ({ label: o.label, value: typeof o.value === 'string' ? o.value : null })),
    }))
    .filter((q) => q.options.length > 0)
    .map((q) => {
      const hasCancel = q.options.some(o => o.value === null && !o.isChat);
      const hasChat = q.options.some(o => o.isChat);
      const withCancel = hasCancel ? q.options : [...q.options, { label: 'ביטול — לא רלוונטי', value: null }];
      const withChat = hasChat ? withCancel : [...withCancel, { label: 'אחר — כתוב בצ\'אט', value: null, isChat: true }];
      return { ...q, options: withChat };
    });
}

/**
 * מקביל ל-chatSupportAgent ב-aiVisionCore.ts. `history`: מערך
 * {role:'user'|'ai', text}. מחזירה {reply, escalate, requestRating, category, questions}.
 */
export async function chatSupportAgent(message, history = [], userName = '') {
  const historyText = history.length > 0
    ? history.slice(-8).map(h => `${h.role === 'user' ? (userName || 'Customer') : 'Agent'}: ${h.text}`).join('\n')
    : '';

  const prompt = `${SUPPORT_SYSTEM_PROMPT}

You are currently talking to a CUSTOMER (לקוח) — someone booking a move via the website, NOT a driver. Use the flow that matches this speaker; never apply a driver-only flow to them.

${historyText ? `Conversation so far:\n${historyText}\n` : ''}
Customer (${userName || 'user'}) says: "${message}"`;

  const parsed = await callGemini([{ text: prompt }]);
  return {
    reply: typeof parsed.reply === 'string' ? parsed.reply : 'אני כאן לעזור! במה אוכל לסייע לך היום?',
    escalate: parsed.escalate === true,
    requestRating: parsed.requestRating === true,
    category: ['order','payment','driver','app','cancellation','verification','other'].includes(parsed.category) ? parsed.category : 'other',
    questions: parseSupportQuestions(parsed),
  };
}

/**
 * @param {unknown} err
 * @param {string} [notConfiguredMessage] נוסח חלופי למצב "צריך להתחבר".
 *
 * ⚠️ הפרמטר השני נוסף ב-16.9 אחרי מדידה בדפדפן: עוזר הכתיבה ב-
 * `marketplace-create.html` **אינו מושבת לאורח**, ולכן אורח ששאל בו
 * שאלה קיבל את הנוסח של מסך סריקת החדרים — *"כדי **לסרוק תמונות**
 * צריך להתחבר. אפשר להמשיך להוסיף **פריטים** ידנית"* — שתי מילים
 * ממסך אחר לגמרי, בתשובה לשאלה על ניסוח מודעה. ברירת המחדל נשארה
 * זהה בדיוק, ומסכי החדרים לא נגעו.
 */
export function friendlyAIError(err, notConfiguredMessage) {
  const msg = String(err && err.message || err);
  // ⚠️ ההודעה הקודמת ('AI לא מוגדר כרגע באתר') האשימה את האתר בתקלה
  // שאינה קיימת. הסיבה האמיתית היא תמיד היעדר התחברות.
  if (msg.includes('AI_NOT_CONFIGURED')) return notConfiguredMessage || 'כדי לסרוק תמונות צריך להתחבר. אפשר להמשיך להוסיף פריטים ידנית, ולהתחבר בהמשך.';
  /**
   * ⚠️ 16.9 — מכסת האורח, **בטקסט בלבד**. המסך המלא (כפתור התחברות +
   * מוצא ידני) נבנה ב-`ai-guest-quota.js`, והדפים מציגים אותו במקום
   * המחרוזת הזו. היא קיימת כרשת ביטחון: קורא עתידי שיוסיף נתיב AI חדש
   * ויתפוס בו שגיאות רק דרך `friendlyAIError` יקבל הסבר נכון ולא
   * *"לא הצלחנו לנתח את התמונות, בדוק את החיבור"* — כלומר בדיוק הכשל
   * השקט שגיא אסר, בתחפושת של תקלת רשת.
   *
   * ⚠️ והתנאי על `currentUser` אינו מיותר: אם השרת יחזיר יום אחד
   * `guest_quota_exhausted` למשתמש מחובר, "התחברו" היא הודעה חסרת פשר.
   */
  if (msg.includes('AI_GUEST_QUOTA_EXHAUSTED') && !auth.currentUser) {
    return 'נגמרו הסריקות החינמיות ללא חשבון. ההתחברות חינם ולוקחת שנייה — Google, Apple או מייל — ומשם ממשיכים לסרוק.';
  }
  if (msg.includes('AI_RATE_LIMITED') || msg.includes('AI_GUEST_QUOTA_EXHAUSTED')) return 'הגענו למגבלת השימוש החינמית של ה-AI לכמה דקות. נסה שוב עוד רגע.';
  return 'לא הצלחנו לנתח את התמונות. בדוק את החיבור לאינטרנט ונסה שוב.';
}
