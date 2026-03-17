import {
  MAX_SLIDES,
  MAX_TITLE_LEN,
  MAX_ITEM_LEN,
  MAX_ITEMS_PER_SLIDE,
  MAX_NOTES_LEN,
  MESSAGES,
} from "../constants";

/**
 * Parse and validate JSON string as slides array.
 * Uses only JSON.parse() (no eval). Returns { success, data } or { success: false, error }.
 */
export function parseAndValidateSlides(jsonString) {
  if (typeof jsonString !== "string" || !jsonString.trim()) {
    return { success: false, error: MESSAGES.INVALID_JSON };
  }
  let parsed;
  try {
    parsed = JSON.parse(jsonString);
  } catch (e) {
    return { success: false, error: MESSAGES.INVALID_JSON };
  }
  if (!Array.isArray(parsed)) {
    return { success: false, error: MESSAGES.INVALID_SLIDES_FORMAT };
  }
  if (parsed.length === 0) {
    return { success: false, error: MESSAGES.NO_SLIDES };
  }
  if (parsed.length > MAX_SLIDES) {
    return { success: false, error: MESSAGES.TOO_MANY_SLIDES };
  }
  for (let i = 0; i < parsed.length; i++) {
    const slide = parsed[i];
    if (slide === null || typeof slide !== "object") {
      return { success: false, error: MESSAGES.INVALID_SLIDES_FORMAT };
    }
    if (typeof slide.title !== "string") {
      return { success: false, error: MESSAGES.INVALID_SLIDES_FORMAT };
    }
    if (!Array.isArray(slide.items)) {
      return { success: false, error: MESSAGES.INVALID_SLIDES_FORMAT };
    }
    if (slide.title.length > MAX_TITLE_LEN) {
      return { success: false, error: MESSAGES.TITLE_TOO_LONG(i + 1) };
    }
    if (slide.items.length > MAX_ITEMS_PER_SLIDE) {
      return { success: false, error: MESSAGES.TOO_MANY_ITEMS(i + 1) };
    }
    for (let j = 0; j < slide.items.length; j++) {
      const item = slide.items[j];
      if (typeof item !== "string") {
        return { success: false, error: MESSAGES.INVALID_SLIDES_FORMAT };
      }
      if (item.length > MAX_ITEM_LEN) {
        return { success: false, error: MESSAGES.ITEM_TOO_LONG(i + 1, j + 1) };
      }
    }
    if (slide.layoutId !== undefined && slide.layoutId !== null) {
      if (typeof slide.layoutId !== "number" && typeof slide.layoutId !== "string") {
        return { success: false, error: "Некорректный формат: поле \"layoutId\" должно быть числом или строкой." };
      }
      if (typeof slide.layoutId === "string" && slide.layoutId.length > 200) {
        return { success: false, error: "Превышен лимит: имя layout не более 200 символов." };
      }
    }
    if (slide.notes !== undefined && slide.notes !== null) {
      if (typeof slide.notes !== "string") {
        return { success: false, error: "Некорректный формат: поле \"notes\" должно быть строкой." };
      }
      if (slide.notes.length > MAX_NOTES_LEN) {
        return { success: false, error: MESSAGES.NOTES_TOO_LONG(i + 1) };
      }
    }
  }
  return { success: true, data: parsed };
}
