import { describe, it, expect } from "vitest";
import { parseAndValidateSlides } from "../utils/slidesValidation";
import {
  MESSAGES,
  MAX_SLIDES,
  MAX_TITLE_LEN,
  MAX_ITEM_LEN,
  MAX_ITEMS_PER_SLIDE,
} from "../constants";

const validSlides = [
  { title: "Slide 1", items: ["Item 1", "Item 2"] },
  { title: "Slide 2", items: [] },
];

describe("parseAndValidateSlides", () => {
  describe("валидный ввод", () => {
    it("принимает валидный массив слайдов и возвращает { success: true, data }", () => {
      const json = JSON.stringify(validSlides);
      const result = parseAndValidateSlides(json);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(validSlides);
    });

    it("принимает один слайд с одним пунктом", () => {
      const slides = [{ title: "T", items: ["I"] }];
      const result = parseAndValidateSlides(JSON.stringify(slides));
      expect(result.success).toBe(true);
      expect(result.data).toEqual(slides);
    });

    it("принимает слайд с пустым массивом items", () => {
      const slides = [{ title: "Only title", items: [] }];
      const result = parseAndValidateSlides(JSON.stringify(slides));
      expect(result.success).toBe(true);
      expect(result.data).toEqual(slides);
    });

    it("принимает ровно MAX_SLIDES слайдов", () => {
      const slides = Array.from({ length: MAX_SLIDES }, (_, i) => ({
        title: `Slide ${i + 1}`,
        items: ["x"],
      }));
      const result = parseAndValidateSlides(JSON.stringify(slides));
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(MAX_SLIDES);
    });

    it("принимает заголовок длиной ровно MAX_TITLE_LEN", () => {
      const title = "a".repeat(MAX_TITLE_LEN);
      const slides = [{ title, items: ["x"] }];
      const result = parseAndValidateSlides(JSON.stringify(slides));
      expect(result.success).toBe(true);
      expect(result.data[0].title).toHaveLength(MAX_TITLE_LEN);
    });

    it("принимает пункт длиной ровно MAX_ITEM_LEN", () => {
      const item = "b".repeat(MAX_ITEM_LEN);
      const slides = [{ title: "T", items: [item] }];
      const result = parseAndValidateSlides(JSON.stringify(slides));
      expect(result.success).toBe(true);
      expect(result.data[0].items[0]).toHaveLength(MAX_ITEM_LEN);
    });

    it("принимает ровно MAX_ITEMS_PER_SLIDE пунктов на слайд", () => {
      const items = Array.from({ length: MAX_ITEMS_PER_SLIDE }, (_, i) => `item ${i}`);
      const slides = [{ title: "T", items }];
      const result = parseAndValidateSlides(JSON.stringify(slides));
      expect(result.success).toBe(true);
      expect(result.data[0].items).toHaveLength(MAX_ITEMS_PER_SLIDE);
    });
  });

  describe("невалидный JSON (синтаксис)", () => {
    it("возвращает { success: false, error: INVALID_JSON } при битой строке", () => {
      const result = parseAndValidateSlides("{ invalid json }");
      expect(result.success).toBe(false);
      expect(result.error).toBe(MESSAGES.INVALID_JSON);
    });

    it("возвращает ошибку при незакрытой скобке", () => {
      const result = parseAndValidateSlides('[{"title":"x","items":[]}');
      expect(result.success).toBe(false);
      expect(result.error).toBe(MESSAGES.INVALID_JSON);
    });

    it("возвращает ошибку при лишней запятой", () => {
      const result = parseAndValidateSlides('[{"title":"x","items":[]},]');
      expect(result.success).toBe(false);
      expect(result.error).toBe(MESSAGES.INVALID_JSON);
    });

    it("возвращает ошибку при неверных кавычках", () => {
      const result = parseAndValidateSlides("[{'title':'x','items':[]}]");
      expect(result.success).toBe(false);
      expect(result.error).toBe(MESSAGES.INVALID_JSON);
    });
  });

  describe("не строка или пустая строка", () => {
    it("пустая строка возвращает INVALID_JSON", () => {
      const result = parseAndValidateSlides("");
      expect(result.success).toBe(false);
      expect(result.error).toBe(MESSAGES.INVALID_JSON);
    });

    it("строка из пробелов возвращает INVALID_JSON", () => {
      const result = parseAndValidateSlides("   \n\t  ");
      expect(result.success).toBe(false);
      expect(result.error).toBe(MESSAGES.INVALID_JSON);
    });

    it("не строка (число) — передаётся в JSON.parse, после парса не массив", () => {
      const result = parseAndValidateSlides("42");
      expect(result.success).toBe(false);
      expect(result.error).toBe(MESSAGES.INVALID_SLIDES_FORMAT);
    });
  });

  describe("не массив", () => {
    it("объект вместо массива возвращает INVALID_SLIDES_FORMAT", () => {
      const result = parseAndValidateSlides('{"title":"x","items":[]}');
      expect(result.success).toBe(false);
      expect(result.error).toBe(MESSAGES.INVALID_SLIDES_FORMAT);
    });

    it("число возвращает INVALID_SLIDES_FORMAT", () => {
      const result = parseAndValidateSlides("0");
      expect(result.success).toBe(false);
      expect(result.error).toBe(MESSAGES.INVALID_SLIDES_FORMAT);
    });

    it("строка в корне возвращает INVALID_SLIDES_FORMAT", () => {
      const result = parseAndValidateSlides('"hello"');
      expect(result.success).toBe(false);
      expect(result.error).toBe(MESSAGES.INVALID_SLIDES_FORMAT);
    });

    it("null в корне возвращает INVALID_SLIDES_FORMAT", () => {
      const result = parseAndValidateSlides("null");
      expect(result.success).toBe(false);
      expect(result.error).toBe(MESSAGES.INVALID_SLIDES_FORMAT);
    });
  });

  describe("пустой массив", () => {
    it("[] возвращает NO_SLIDES", () => {
      const result = parseAndValidateSlides("[]");
      expect(result.success).toBe(false);
      expect(result.error).toBe(MESSAGES.NO_SLIDES);
    });
  });

  describe("отсутствие или неверный тип title/items", () => {
    it("отсутствует title возвращает INVALID_SLIDES_FORMAT", () => {
      const result = parseAndValidateSlides('[{"items":["x"]}]');
      expect(result.success).toBe(false);
      expect(result.error).toBe(MESSAGES.INVALID_SLIDES_FORMAT);
    });

    it("title не строка (число) возвращает INVALID_SLIDES_FORMAT", () => {
      const result = parseAndValidateSlides('[{"title":1,"items":[]}]');
      expect(result.success).toBe(false);
      expect(result.error).toBe(MESSAGES.INVALID_SLIDES_FORMAT);
    });

    it("title null возвращает INVALID_SLIDES_FORMAT", () => {
      const result = parseAndValidateSlides('[{"title":null,"items":[]}]');
      expect(result.success).toBe(false);
      expect(result.error).toBe(MESSAGES.INVALID_SLIDES_FORMAT);
    });

    it("отсутствует items возвращает INVALID_SLIDES_FORMAT", () => {
      const result = parseAndValidateSlides('[{"title":"x"}]');
      expect(result.success).toBe(false);
      expect(result.error).toBe(MESSAGES.INVALID_SLIDES_FORMAT);
    });

    it("items не массив возвращает INVALID_SLIDES_FORMAT", () => {
      const result = parseAndValidateSlides('[{"title":"x","items":"not array"}]');
      expect(result.success).toBe(false);
      expect(result.error).toBe(MESSAGES.INVALID_SLIDES_FORMAT);
    });

    it("элемент items не строка возвращает INVALID_SLIDES_FORMAT", () => {
      const result = parseAndValidateSlides('[{"title":"x","items":[123]}]');
      expect(result.success).toBe(false);
      expect(result.error).toBe(MESSAGES.INVALID_SLIDES_FORMAT);
    });

    it("элемент items — объект возвращает INVALID_SLIDES_FORMAT", () => {
      const result = parseAndValidateSlides('[{"title":"x","items":[{}]}]');
      expect(result.success).toBe(false);
      expect(result.error).toBe(MESSAGES.INVALID_SLIDES_FORMAT);
    });
  });

  describe("элемент слайда не объект", () => {
    it("элемент массива null возвращает INVALID_SLIDES_FORMAT", () => {
      const result = parseAndValidateSlides('[null]');
      expect(result.success).toBe(false);
      expect(result.error).toBe(MESSAGES.INVALID_SLIDES_FORMAT);
    });

    it("элемент массива число возвращает INVALID_SLIDES_FORMAT", () => {
      const result = parseAndValidateSlides("[1,2,3]");
      expect(result.success).toBe(false);
      expect(result.error).toBe(MESSAGES.INVALID_SLIDES_FORMAT);
    });

    it("элемент массива строка возвращает INVALID_SLIDES_FORMAT", () => {
      const result = parseAndValidateSlides('["slide"]');
      expect(result.success).toBe(false);
      expect(result.error).toBe(MESSAGES.INVALID_SLIDES_FORMAT);
    });
  });

  describe("лимиты: превышение", () => {
    it("слайдов больше MAX_SLIDES возвращает TOO_MANY_SLIDES", () => {
      const slides = Array.from({ length: MAX_SLIDES + 1 }, (_, i) => ({
        title: `S${i}`,
        items: ["x"],
      }));
      const result = parseAndValidateSlides(JSON.stringify(slides));
      expect(result.success).toBe(false);
      expect(result.error).toBe(MESSAGES.TOO_MANY_SLIDES);
    });

    it("заголовок длиннее MAX_TITLE_LEN возвращает TITLE_TOO_LONG(1)", () => {
      const slides = [
        { title: "a".repeat(MAX_TITLE_LEN + 1), items: ["x"] },
      ];
      const result = parseAndValidateSlides(JSON.stringify(slides));
      expect(result.success).toBe(false);
      expect(result.error).toBe(MESSAGES.TITLE_TOO_LONG(1));
    });

    it("заголовок второго слайда слишком длинный — TITLE_TOO_LONG(2)", () => {
      const slides = [
        { title: "First", items: [] },
        { title: "b".repeat(MAX_TITLE_LEN + 1), items: [] },
      ];
      const result = parseAndValidateSlides(JSON.stringify(slides));
      expect(result.success).toBe(false);
      expect(result.error).toBe(MESSAGES.TITLE_TOO_LONG(2));
    });

    it("пункт длиннее MAX_ITEM_LEN возвращает ITEM_TOO_LONG(1, 1)", () => {
      const slides = [
        { title: "T", items: ["x".repeat(MAX_ITEM_LEN + 1)] },
      ];
      const result = parseAndValidateSlides(JSON.stringify(slides));
      expect(result.success).toBe(false);
      expect(result.error).toBe(MESSAGES.ITEM_TOO_LONG(1, 1));
    });

    it("второй пункт слишком длинный — ITEM_TOO_LONG(1, 2)", () => {
      const slides = [
        {
          title: "T",
          items: ["ok", "y".repeat(MAX_ITEM_LEN + 1)],
        },
      ];
      const result = parseAndValidateSlides(JSON.stringify(slides));
      expect(result.success).toBe(false);
      expect(result.error).toBe(MESSAGES.ITEM_TOO_LONG(1, 2));
    });

    it("пунктов на слайд больше MAX_ITEMS_PER_SLIDE возвращает TOO_MANY_ITEMS(1)", () => {
      const items = Array.from(
        { length: MAX_ITEMS_PER_SLIDE + 1 },
        (_, i) => `item ${i}`
      );
      const slides = [{ title: "T", items }];
      const result = parseAndValidateSlides(JSON.stringify(slides));
      expect(result.success).toBe(false);
      expect(result.error).toBe(MESSAGES.TOO_MANY_ITEMS(1));
    });

    it("превышение пунктов на втором слайде — TOO_MANY_ITEMS(2)", () => {
      const slides = [
        { title: "First", items: ["a"] },
        {
          title: "Second",
          items: Array.from({ length: MAX_ITEMS_PER_SLIDE + 1 }, (_, i) => `i${i}`),
        },
      ];
      const result = parseAndValidateSlides(JSON.stringify(slides));
      expect(result.success).toBe(false);
      expect(result.error).toBe(MESSAGES.TOO_MANY_ITEMS(2));
    });
  });
});
