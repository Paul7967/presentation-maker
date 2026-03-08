import { useState, useCallback, useRef } from "react";
import {
  API_GENERATE,
  MAX_FILE_SIZE,
  MAX_SLIDES,
  MAX_TITLE_LEN,
  MAX_ITEM_LEN,
  MAX_ITEMS_PER_SLIDE,
  MAX_JSON_FILE_SIZE,
  MESSAGES,
} from "./constants";
import { parseAndValidateSlides } from "./utils/slidesValidation";
import SlideCard from "./components/SlideCard";
import "./App.css";

const INITIAL_SLIDE = { title: "", items: [""] };

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function SlideCardWrapper(props) {
  return (
    <SlideCard
      {...props}
      maxTitleLen={MAX_TITLE_LEN}
      maxItemLen={MAX_ITEM_LEN}
      maxItemsPerSlide={MAX_ITEMS_PER_SLIDE}
    />
  );
}

export default function App() {
  const [slides, setSlides] = useState([{ ...INITIAL_SLIDE }]);
  const [inputMode, setInputMode] = useState("bySlides"); // 'bySlides' | 'byJson'
  const [jsonText, setJsonText] = useState("");
  const [jsonError, setJsonError] = useState(null);
  const [jsonFileError, setJsonFileError] = useState(null);
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState(null);
  const [formError, setFormError] = useState(null);
  const [status, setStatus] = useState("form"); // form | loading | success | error
  const [errorMessage, setErrorMessage] = useState(null);
  const [blob, setBlob] = useState(null);
  const [isDraggingJson, setIsDraggingJson] = useState(false);
  const jsonFileInputRef = useRef(null);

  const updateSlide = useCallback((index, newSlide) => {
    setSlides((prev) =>
      prev.map((s, i) => (i === index ? newSlide : s))
    );
    setFormError(null);
  }, []);

  const addSlide = useCallback(() => {
    if (slides.length >= MAX_SLIDES) {
      setFormError(MESSAGES.TOO_MANY_SLIDES);
      return;
    }
    setSlides((prev) => [...prev, { ...INITIAL_SLIDE }]);
    setFormError(null);
  }, [slides.length]);

  const removeSlide = useCallback((index) => {
    if (slides.length <= 1) return;
    setSlides((prev) => prev.filter((_, i) => i !== index));
    setFormError(null);
  }, [slides.length]);

  const onFileChange = useCallback((e) => {
    const f = e.target.files?.[0];
    setFileError(null);
    if (!f) {
      setFile(null);
      return;
    }
    if (!f.name.toLowerCase().endsWith(".pptx")) {
      setFileError(MESSAGES.NOT_PPTX);
      setFile(null);
      return;
    }
    if (f.size > MAX_FILE_SIZE) {
      setFileError(MESSAGES.FILE_TOO_BIG);
      setFile(null);
      return;
    }
    setFile(f);
  }, []);

  const validate = useCallback(() => {
    setFormError(null);
    const count = slides.filter(
      (s) =>
        (s.title && s.title.trim()) ||
        (s.items && s.items.some((i) => i && i.trim()))
    ).length;
    if (count === 0) {
      setFormError(MESSAGES.NO_SLIDES);
      return false;
    }
    if (slides.length > MAX_SLIDES) {
      setFormError(MESSAGES.TOO_MANY_SLIDES);
      return false;
    }
    for (let i = 0; i < slides.length; i++) {
      const s = slides[i];
      if ((s.title || "").length > MAX_TITLE_LEN) {
        setFormError(MESSAGES.TITLE_TOO_LONG(i + 1));
        return false;
      }
      if (Array.isArray(s.items) && s.items.length > MAX_ITEMS_PER_SLIDE) {
        setFormError(MESSAGES.TOO_MANY_ITEMS(i + 1));
        return false;
      }
      if (Array.isArray(s.items)) {
        for (let j = 0; j < s.items.length; j++) {
          if ((s.items[j] || "").length > MAX_ITEM_LEN) {
            setFormError(MESSAGES.ITEM_TOO_LONG(i + 1, j + 1));
            return false;
          }
        }
      }
    }
    if (!file) {
      setFormError(MESSAGES.NO_FILE);
      return false;
    }
    if (file.size > MAX_FILE_SIZE) {
      setFormError(MESSAGES.FILE_TOO_BIG);
      return false;
    }
    if (!file.name.toLowerCase().endsWith(".pptx")) {
      setFormError(MESSAGES.NOT_PPTX);
      return false;
    }
    return true;
  }, [slides, file]);

  const slidesForApi = slides
    .map((s) => ({
      title: (s.title || "").trim().slice(0, MAX_TITLE_LEN),
      items: (s.items || [])
        .map((i) => (i || "").trim().slice(0, MAX_ITEM_LEN))
        .filter(Boolean)
        .slice(0, MAX_ITEMS_PER_SLIDE),
    }))
    .filter((s) => s.title || s.items.length > 0);

  const buildSlidesForApi = useCallback((slidesArray) => {
    return slidesArray
      .map((s) => ({
        title: (s.title || "").trim().slice(0, MAX_TITLE_LEN),
        items: (s.items || [])
          .map((i) => (i || "").trim().slice(0, MAX_ITEM_LEN))
          .filter(Boolean)
          .slice(0, MAX_ITEMS_PER_SLIDE),
      }))
      .filter((s) => s.title || s.items.length > 0);
  }, []);

  const switchToByJson = useCallback(() => {
    if (inputMode === "byJson") return;
    setJsonText(JSON.stringify(slides, null, 2));
    setJsonError(null);
    setJsonFileError(null);
    setInputMode("byJson");
  }, [inputMode, slides]);

  const switchToBySlides = useCallback(() => {
    if (inputMode === "bySlides") return;
    const result = parseAndValidateSlides(jsonText);
    if (!result.success) {
      setJsonError(result.error);
      return;
    }
    setSlides(result.data);
    setJsonError(null);
    setJsonFileError(null);
    setInputMode("bySlides");
  }, [inputMode, jsonText]);

  const canSubmit =
    slidesForApi.length >= 1 &&
    file &&
    file.size <= MAX_FILE_SIZE &&
    slides.length <= MAX_SLIDES;

  const submit = useCallback(
    async (slidesOverride = null) => {
      const payloadSlides =
        slidesOverride != null
          ? buildSlidesForApi(slidesOverride)
          : slidesForApi;
      if (payloadSlides.length < 1) {
        if (inputMode === "byJson") setJsonError(MESSAGES.NO_SLIDES);
        else setFormError(MESSAGES.NO_SLIDES);
        return;
      }
      if (!file) {
        setFormError(MESSAGES.NO_FILE);
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        setFormError(MESSAGES.FILE_TOO_BIG);
        return;
      }
      if (!file.name.toLowerCase().endsWith(".pptx")) {
        setFormError(MESSAGES.NOT_PPTX);
        return;
      }
      setStatus("loading");
      setErrorMessage(null);
      const formData = new FormData();
      formData.append("template", file);
      formData.append("slides", JSON.stringify(payloadSlides));
      try {
        const res = await fetch(API_GENERATE, {
          method: "POST",
          body: formData,
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          let msg = data.detail;
          if (Array.isArray(msg)) {
            msg = msg.map((d) => d.msg || d.message || String(d)).join(" ");
          } else if (typeof msg !== "string") {
            msg = "Произошла ошибка";
          }
          setErrorMessage(msg || res.statusText);
          setStatus("error");
          return;
        }
        const blobResult = await res.blob();
        setBlob(blobResult);
        setStatus("success");
      } catch (err) {
        setErrorMessage(
          err.message === "Failed to fetch"
            ? "Не удалось подключиться к серверу. Запущен ли backend?"
            : err.message
        );
        setStatus("error");
      }
    },
    [
      file,
      slidesForApi,
      buildSlidesForApi,
      inputMode,
    ]
  );

  const retry = useCallback(() => {
    setStatus("loading");
    setErrorMessage(null);
    submit();
  }, [submit]);

  const download = useCallback(() => {
    if (!blob) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "presentation.pptx";
    a.click();
    URL.revokeObjectURL(a.href);
  }, [blob]);

  const createAnother = useCallback(() => {
    setStatus("form");
    setBlob(null);
    setSlides([{ ...INITIAL_SLIDE }]);
    setInputMode("bySlides");
    setJsonText("");
    setJsonError(null);
    setJsonFileError(null);
    setFile(null);
    setFileError(null);
    setFormError(null);
    setErrorMessage(null);
  }, []);

  const handleFormSubmit = useCallback(
    (e) => {
      e.preventDefault();
      if (inputMode === "byJson") {
        setJsonError(null);
        const result = parseAndValidateSlides(jsonText);
        if (!result.success) {
          setJsonError(result.error);
          return;
        }
        submit(result.data);
      } else {
        if (!validate()) return;
        submit();
      }
    },
    [inputMode, jsonText, validate, submit]
  );

  const processJsonFile = useCallback(
    (fileObj) => {
      setJsonFileError(null);
      if (!fileObj?.name?.toLowerCase().endsWith(".json")) {
        setJsonFileError(MESSAGES.JSON_FILE_INVALID);
        return;
      }
      if (fileObj.size > MAX_JSON_FILE_SIZE) {
        setJsonFileError(MESSAGES.JSON_FILE_TOO_BIG);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const text = reader.result;
        if (typeof text !== "string" || !text.trim()) {
          setJsonFileError(MESSAGES.JSON_FILE_INVALID);
          return;
        }
        const result = parseAndValidateSlides(text);
        if (!result.success) {
          setJsonFileError(result.error);
          return;
        }
        setSlides(result.data);
        if (inputMode === "byJson") {
          setJsonText(JSON.stringify(result.data, null, 2));
        }
      };
      reader.onerror = () => setJsonFileError(MESSAGES.JSON_FILE_INVALID);
      reader.readAsText(fileObj, "UTF-8");
    },
    [inputMode]
  );

  const handleJsonFileInput = useCallback(
    (e) => {
      const f = e.target.files?.[0];
      if (f) processJsonFile(f);
      e.target.value = "";
    },
    [processJsonFile]
  );

  const handleJsonDrop = useCallback(
    (e) => {
      e.preventDefault();
      setIsDraggingJson(false);
      const f = e.dataTransfer?.files?.[0];
      if (f) processJsonFile(f);
    },
    [processJsonFile]
  );

  const handleJsonDragOver = useCallback((e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    setIsDraggingJson(true);
  }, []);

  const handleJsonDragLeave = useCallback(() => {
    setIsDraggingJson(false);
  }, []);

  const saveToJson = useCallback(() => {
    const str = JSON.stringify(slides, null, 2);
    const blob = new Blob([str], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "presentation.json";
    a.click();
    URL.revokeObjectURL(a.href);
  }, [slides]);

  const canSubmitForm =
    file &&
    file.size <= MAX_FILE_SIZE &&
    (inputMode === "bySlides" ? canSubmit : jsonText.trim().length > 0);

  return (
    <div className="app">
      <header className="app-header">
        <h1>Presentation Maker</h1>
        <div className="mode-toggle" role="tablist" aria-label="Режим ввода">
          <button
            type="button"
            role="tab"
            aria-selected={inputMode === "bySlides"}
            className={`mode-btn ${inputMode === "bySlides" ? "active" : ""}`}
            onClick={switchToBySlides}
          >
            По слайдам
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={inputMode === "byJson"}
            className={`mode-btn ${inputMode === "byJson" ? "active" : ""}`}
            onClick={switchToByJson}
          >
            Через JSON
          </button>
        </div>
      </header>

      {status === "loading" && (
        <div className="loading-box" aria-busy="true" aria-live="polite">
          <div className="spinner" aria-hidden="true" />
          <p>Генерация презентации…</p>
        </div>
      )}

      {status === "success" && (
        <div className="success-box">
          <p>Презентация успешно создана</p>
          <div className="success-actions">
            <button type="button" className="btn btn-primary" onClick={download}>
              Скачать
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={createAnother}
            >
              Создать ещё
            </button>
          </div>
        </div>
      )}

      {status === "error" && (
        <div className="form-block">
          <div className="error-box" role="alert">
            {errorMessage}
          </div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={retry}
          >
            Повторить
          </button>
        </div>
      )}

      {(status === "form" || status === "error") && (
        <form
          onSubmit={handleFormSubmit}
          noValidate
        >
          {inputMode === "bySlides" && (
          <div className="form-block">
            <h2>Описание слайдов</h2>
            <p id="slide-hint" className="form-hint">
              Добавьте один и более слайдов. Максимум {MAX_SLIDES} слайдов.
              Заголовок — до {MAX_TITLE_LEN} символов, пункт — до {MAX_ITEM_LEN}, до{" "}
              {MAX_ITEMS_PER_SLIDE} пунктов на слайд.
            </p>
            {formError && (
              <div className="error-box" role="alert">
                {formError}
              </div>
            )}
            {slides.map((slide, i) => (
              <SlideCardWrapper
                key={i}
                slide={slide}
                index={i}
                onChange={updateSlide}
                onRemove={removeSlide}
                canRemove={slides.length > 1}
              />
            ))}
            <button
              type="button"
              className="btn btn-secondary add-slide-wrap"
              onClick={addSlide}
              disabled={slides.length >= MAX_SLIDES}
            >
              Добавить слайд
            </button>
          </div>
          )}

          {inputMode === "byJson" && (
          <div className="form-block">
            <h2>Ввод через JSON</h2>
            <label htmlFor="json-slides" className="visually-hidden">
              Описание слайдов в формате JSON
            </label>
            <textarea
              id="json-slides"
              className="json-textarea"
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              aria-invalid={!!jsonError}
              aria-describedby={jsonError ? "json-error" : "json-hint"}
              placeholder='[{"title": "Заголовок", "items": ["Пункт 1"]}]'
              rows={12}
            />
            <p id="json-hint" className="form-hint">
              Формат: массив объектов с полями &quot;title&quot; и &quot;items&quot;. Максимум {MAX_SLIDES} слайдов, заголовок до {MAX_TITLE_LEN} символов, пункт до {MAX_ITEM_LEN}, до {MAX_ITEMS_PER_SLIDE} пунктов на слайд.
            </p>
            {jsonError && (
              <div id="json-error" className="error-box" role="alert">
                {jsonError}
              </div>
            )}
            <div className="json-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={saveToJson}
                aria-label="Сохранить описание слайдов в файл JSON"
              >
                Сохранить в JSON
              </button>
            </div>
          </div>
          )}

          <div className="form-block json-drop-block">
            <h2>Загрузить из JSON</h2>
            <div
              className={`json-drop-zone ${isDraggingJson ? "drag-over" : ""}`}
              onDrop={handleJsonDrop}
              onDragOver={handleJsonDragOver}
              onDragLeave={handleJsonDragLeave}
              role="button"
              tabIndex={0}
              onClick={() => jsonFileInputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  jsonFileInputRef.current?.click();
                }
              }}
              aria-label="Загрузить описание слайдов из файла JSON"
              aria-describedby={jsonFileError ? "json-file-error" : undefined}
            >
              <input
                ref={jsonFileInputRef}
                type="file"
                accept=".json"
                onChange={handleJsonFileInput}
                className="visually-hidden"
                aria-hidden="true"
              />
              Перетащите файл .json сюда или нажмите для выбора
            </div>
            {jsonFileError && (
              <div id="json-file-error" className="error-box" role="alert">
                {jsonFileError}
              </div>
            )}
          </div>

          <div className="form-block">
            <h2>Файл-образец (PPTX)</h2>
            <p className="form-hint">
              Выберите файл .pptx до 20 MB. Стиль первого слайда будет применён ко всей презентации.
            </p>
            <div className="file-input-wrap">
              <input
                type="file"
                accept=".pptx"
                onChange={onFileChange}
                aria-describedby="file-hint"
                aria-invalid={!!fileError}
              />
            </div>
            {file && (
              <p id="file-hint" className="file-info">
                {file.name}, {formatFileSize(file.size)}
              </p>
            )}
            {fileError && (
              <div className="error-box" role="alert">
                {fileError}
              </div>
            )}
          </div>

          <div className="form-actions">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={status === "loading" || !canSubmitForm}
            >
              Сгенерировать
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
