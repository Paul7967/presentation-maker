/**
 * Card for editing one slide: title and items list.
 * Enforces MAX_TITLE_LEN, MAX_ITEM_LEN, MAX_ITEMS_PER_SLIDE via validation props.
 */
function SlideCard({ slide, index, onChange, onRemove, canRemove, maxTitleLen, maxItemLen, maxItemsPerSlide }) {
  const setTitle = (v) => onChange(index, { ...slide, title: v });
  const setItems = (items) => onChange(index, { ...slide, items });
  const addItem = () => {
    if (slide.items.length >= maxItemsPerSlide) return;
    setItems([...slide.items, ""]);
  };
  const removeItem = (i) => setItems(slide.items.filter((_, j) => j !== i));
  const setItem = (i, val) =>
    setItems(slide.items.map((it, j) => (j === i ? val : it)));

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
    </div>
  );
}

export default SlideCard;
