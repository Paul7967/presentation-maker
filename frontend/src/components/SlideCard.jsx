/**
 * Card for editing one slide: title, items list, layoutId, notes.
 * Enforces MAX_TITLE_LEN, MAX_ITEM_LEN, MAX_ITEMS_PER_SLIDE, MAX_NOTES_LEN via validation props.
 */
function SlideCard({ slide, index, onChange, onRemove, canRemove, maxTitleLen, maxItemLen, maxItemsPerSlide, maxNotesLen }) {
  const setTitle = (v) => onChange(index, { ...slide, title: v });
  const setItems = (items) => onChange(index, { ...slide, items });
  const setLayoutId = (v) => {
    const raw = v.trim();
    if (raw === "") {
      onChange(index, { ...slide, layoutId: undefined });
      return;
    }
    const num = Number(raw);
    if (!Number.isNaN(num) && String(num) === raw) {
      onChange(index, { ...slide, layoutId: num });
    } else {
      onChange(index, { ...slide, layoutId: raw });
    }
  };
  const setNotes = (v) => onChange(index, { ...slide, notes: v ?? "" });
  const addItem = () => {
    if (slide.items.length >= maxItemsPerSlide) return;
    setItems([...slide.items, ""]);
  };
  const removeItem = (i) => setItems(slide.items.filter((_, j) => j !== i));
  const setItem = (i, val) =>
    setItems(slide.items.map((it, j) => (j === i ? val : it)));

  const layoutIdDisplay = slide.layoutId !== undefined && slide.layoutId !== null && slide.layoutId !== ""
    ? String(slide.layoutId)
    : "";
  const notesValue = slide.notes ?? "";

  return (
    <div className="slide-card">
      <div className="slide-card-header">
        <h3>Слайд {index + 1}</h3>
        {canRemove && (
          <button
            type="button"
            className="btn btn-danger"
            onClick={() => onRemove(index)}
            aria-label={`Удалить слайд ${index + 1}`}
          >
            Удалить слайд
          </button>
        )}
      </div>
      <div className="form-group">
        <label htmlFor={`slide-title-${index}`}>Заголовок</label>
        <input
          id={`slide-title-${index}`}
          type="text"
          value={slide.title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Заголовок слайда"
          maxLength={maxTitleLen}
          aria-describedby={index === 0 ? "slide-hint" : undefined}
        />
        {maxTitleLen && (
          <span className="char-hint" aria-live="polite">
            {slide.title.length}/{maxTitleLen}
          </span>
        )}
      </div>
      <div className="form-group">
        <label>Пункты</label>
        {slide.items.map((item, i) => (
          <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <input
              type="text"
              value={item}
              onChange={(e) => setItem(i, e.target.value)}
              placeholder={`Пункт ${i + 1}`}
              maxLength={maxItemLen}
              style={{ flex: 1 }}
            />
            {slide.items.length > 1 && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => removeItem(i)}
                aria-label={`Удалить пункт ${i + 1}`}
              >
                ×
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          className="btn btn-secondary add-slide-wrap"
          onClick={addItem}
          disabled={slide.items.length >= maxItemsPerSlide}
        >
          Добавить пункт
        </button>
      </div>
      <div className="form-group">
        <label htmlFor={`slide-layout-${index}`}>Тип шаблона (layoutId)</label>
        <input
          id={`slide-layout-${index}`}
          type="text"
          value={layoutIdDisplay}
          onChange={(e) => setLayoutId(e.target.value)}
          placeholder="Индекс (0, 1, …) или имя layout. Пусто — первый шаблон"
          aria-describedby={`slide-layout-hint-${index}`}
        />
        <span id={`slide-layout-hint-${index}`} className="form-hint-inline">
          Индекс или имя layout из образца. Оставьте пустым для первого шаблона.
        </span>
      </div>
      <div className="form-group">
        <label htmlFor={`slide-notes-${index}`}>Заметки докладчика</label>
        <textarea
          id={`slide-notes-${index}`}
          value={notesValue}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Заметки докладчика для этого слайда (необязательно)"
          maxLength={maxNotesLen}
          rows={3}
          aria-describedby={`slide-notes-hint-${index}`}
        />
        {maxNotesLen && (
          <span id={`slide-notes-hint-${index}`} className="char-hint" aria-live="polite">
            {notesValue.length}/{maxNotesLen}
          </span>
        )}
      </div>
    </div>
  );
}

export default SlideCard;
