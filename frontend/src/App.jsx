import { useState, useCallback } from "react";
import {
  API_GENERATE,
  MAX_FILE_SIZE,
  MAX_SLIDES,
  MAX_TITLE_LEN,
  MAX_ITEM_LEN,
  MAX_ITEMS_PER_SLIDE,
  MESSAGES,
} from "./constants";
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
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState(null);
  const [formError, setFormError] = useState(null);
  const [status, setStatus] = useState("form"); // form | loading | success | error
  const [errorMessage, setErrorMessage] = useState(null);
  const [blob, setBlob] = useState(null);

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

  const canSubmit =
    slidesForApi.length >= 1 &&
    file &&
    file.size <= MAX_FILE_SIZE &&
    slides.length <= MAX_SLIDES;

  const submit = useCallback(async () => {
    if (!validate()) return;
    setStatus("loading");
    setErrorMessage(null);
    const formData = new FormData();
    formData.append("template", file);
    formData.append("slides", JSON.stringify(slidesForApi));
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
  }, [file, slidesForApi, validate]);

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
    setFile(null);
    setFileError(null);
    setFormError(null);
    setErrorMessage(null);
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <h1>Presentation Maker</h1>
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
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          noValidate
        >
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
              disabled={status === "loading" || !canSubmit}
            >
              Сгенерировать
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
