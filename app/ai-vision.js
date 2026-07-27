// Faithful port of Hovalot's src/services/aiVision.ts — photo-scan path only
// (analyzeImagesWithCatalog + its exact prompt/parsing). The free-text "chat to
// add items" path (chatAddItemsWithCatalog/buildChatPrompt) is intentionally not
// ported — the existing manual +/- item picker already covers "AI missed
// something, add it by hand," so this file only needs to carry photo analysis.
import { GEMINI_API_KEY } from './ai-config.js';

const GEMINI_MODEL = 'gemini-flash-latest';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

export function isAIConfigured() {
  return !!GEMINI_API_KEY;
}

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
  if (!GEMINI_API_KEY) {
    throw new Error('AI_NOT_CONFIGURED');
  }

  const response = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: { responseMimeType: 'application/json' },
    }),
  });

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error('AI_RATE_LIMITED');
    }
    const errText = await response.text().catch(() => '');
    throw new Error(`AI_REQUEST_FAILED: ${response.status} ${errText}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('AI_EMPTY_RESPONSE');

  try {
    return JSON.parse(text);
  } catch {
    throw new Error('AI_INVALID_JSON');
  }
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

export function friendlyAIError(err) {
  const msg = String(err && err.message || err);
  if (msg.includes('AI_NOT_CONFIGURED')) return 'AI לא מוגדר כרגע באתר. נסה שוב מאוחר יותר, או פנה לתמיכה 💬';
  if (msg.includes('AI_RATE_LIMITED')) return 'הגענו למגבלת השימוש החינמית של ה-AI לכמה דקות. נסה שוב עוד רגע.';
  return 'לא הצלחנו לנתח את התמונות. בדוק את החיבור לאינטרנט ונסה שוב.';
}
