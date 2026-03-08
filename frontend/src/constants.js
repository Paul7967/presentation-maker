const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";
export const API_GENERATE = `${API_BASE}/api/presentation/generate`;

export const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB
export const MAX_SLIDES = 100;
export const MAX_TITLE_LEN = 500;
export const MAX_ITEM_LEN = 2000;
export const MAX_ITEMS_PER_SLIDE = 50;
export const MAX_JSON_FILE_SIZE = 2 * 1024 * 1024; // 2 MB

export const MESSAGES = {
  NO_SLIDES: "Введите описание хотя бы одного слайда.",
  NO_FILE: "Загрузите образец в формате PPTX.",
  NOT_PPTX: "Поддерживается только формат PPTX.",
  FILE_TOO_BIG: "Превышен максимальный размер файла (20 MB).",
  TOO_MANY_SLIDES: `Превышено максимальное количество слайдов (${MAX_SLIDES}).`,
  TITLE_TOO_LONG: (num) =>
    `Превышен лимит: заголовок слайда ${num} — не более ${MAX_TITLE_LEN} символов.`,
  ITEM_TOO_LONG: (slideNum, itemNum) =>
    `Превышен лимит: пункт не более ${MAX_ITEM_LEN} символов (слайд ${slideNum}, пункт ${itemNum}).`,
  TOO_MANY_ITEMS: (num) =>
    `Превышен лимит: не более ${MAX_ITEMS_PER_SLIDE} пунктов на слайд (слайд ${num}).`,
  /* JSON mode */
  INVALID_JSON: "Некорректный JSON.",
  INVALID_SLIDES_FORMAT: "Некорректный формат описания слайдов.",
  JSON_FILE_TOO_BIG: "Файл слишком большой (максимум 2 MB).",
  JSON_FILE_INVALID: "Файл не является корректным JSON.",
};
