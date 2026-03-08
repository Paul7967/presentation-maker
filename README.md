# Presentation Maker

Веб-приложение для создания презентаций PPTX из текстового описания слайдов и файла-образца в формате PPTX.

## Стек

- **Frontend:** React (Vite)
- **Backend:** FastAPI
- **Работа с PPTX:** python-pptx

## Требования

- Node.js 18+ (для frontend)
- Python 3.10+ (для backend)

## Запуск

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate   # Windows
# source .venv/bin/activate  # Linux/macOS
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 --timeout 120
```

- **Таймаут 120 с:** для длительной генерации (до 100 слайдов) задайте `--timeout 120` в uvicorn; при превышении API вернёт 504.
- **Лимит тела 20 MB:** приложение само отклоняет запросы с `Content-Length` > 20 MB (413). Если используете reverse proxy, при необходимости задайте там лимит тела 20 MB.

API: <http://localhost:8000/docs>

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Откройте <http://localhost:5173>

### Порты

- Backend: **8000**
- Frontend (dev): **5173** (Vite)

Убедитесь, что backend запущен до отправки запроса генерации с frontend.

## Переменные окружения

### Frontend

| Переменная | Описание | По умолчанию |
|------------|----------|--------------|
| `VITE_API_URL` | URL бекенда API (без завершающего слэша) | `http://localhost:8000` |

Пример для production: создайте в каталоге `frontend` файл `.env.production` с содержимым `VITE_API_URL=https://api.example.com` (или задайте переменную при сборке).

### Backend

Для локальной разработки переменные окружения не требуются. При деплое рекомендуется задавать (через окружение или reverse proxy):

- Лимит тела запроса: **20 MB** (если прокси не передаёт `Content-Length`, приложение само отклоняет запросы > 20 MB).
- Таймаут запроса генерации: **120** секунд (при запуске uvicorn укажите `--timeout 120`).
- CORS: в `app/main.py` разрешены origin’ы `localhost:5173`, `localhost:3000` и их 127.0.0.1-варианты; для production ограничьте `allow_origins` списком доверенных доменов (при необходимости вынести в переменную окружения).

## Использование

Приложение поддерживает два режима ввода описания слайдов (переключатель в шапке страницы):

### Режим «По слайдам»

1. Введите описание слайдов: заголовок и пункты для каждого слайда (кнопки «Добавить слайд» / «Удалить слайд»).
2. При необходимости загрузите готовое описание из файла .json — перетащите файл в зону «Загрузить из JSON» или выберите его по клику.
3. Выберите файл-образец в формате .pptx (до 20 MB).
4. Нажмите «Сгенерировать».
5. После завершения нажмите «Скачать» для сохранения PPTX или «Создать ещё» для новой презентации.

### Режим «Через JSON»

1. Переключитесь на «Через JSON» в шапке — в поле подставится текущее описание слайдов в формате JSON.
2. Редактируйте JSON вручную (формат: массив объектов с полями `title` и `items`, см. подсказку под полем).
3. Либо загрузите описание из файла .json (зона «Загрузить из JSON»).
4. Сохранить текущее описание в файл можно кнопкой «Сохранить в JSON» (скачивается `presentation.json`).
5. Выберите файл-образец .pptx и нажмите «Сгенерировать».

При переключении обратно в «По слайдам» содержимое JSON проверяется; при невалидном формате или нарушении лимитов отображается ошибка, данные не подменяются.

Лимиты: не более 100 слайдов; заголовок — до 500 символов, пункт — до 2000 символов, до 50 пунктов на слайд (см. [docs/api.md](docs/api.md)). Файл .json при загрузке ограничен 2 MB.

## Структура проекта

```
presentationMaker/
├── frontend/       # React (Vite)
│   ├── public/
│   └── src/
├── backend/        # FastAPI
│   ├── app/
│   │   ├── api/
│   │   ├── services/
│   │   ├── models/
│   │   └── main.py
│   └── requirements.txt
├── docs/           # Документация
└── README.md
```

Подробнее — в [docs/architecture.md](docs/architecture.md).

## Документация и онбординг

- **API:** [docs/api.md](docs/api.md) — эндпоинты, форматы запроса/ответа, коды ошибок, лимиты.
- **Архитектура:** [docs/architecture.md](docs/architecture.md) — структура приложения.
- **ADR (Architecture Decision Records):** [docs/adr/](docs/adr/) — принятые архитектурные решения (структура проекта, API, библиотека pptx, NFR и безопасность).
- **План разработки:** [docs/dev_plan.md](docs/dev_plan.md) — этапы и агенты.

Для новых разработчиков: клонируйте репозиторий, установите зависимости (см. «Запуск»), ознакомьтесь с docs/architecture.md и docs/api.md.

## Тестирование

### Backend (pytest)

Из каталога `backend`:

```bash
cd backend
pip install -r requirements.txt   # если ещё не установлены зависимости
pytest tests/ -v
```

- Unit-тесты: парсинг образца pptx, генерация презентации (`test_pptx_service.py`), валидация слайдов (`test_validation.py`).
- Интеграционные тесты API: POST /api/presentation/generate — успешный ответ, ошибки 400/413/422 (`test_api_presentation.py`).

Подробнее — [docs/test-plan.md](docs/test-plan.md).

### Frontend (Vitest + React Testing Library)

Из каталога `frontend`:

```bash
cd frontend
npm install
npm run test:run
```

Покрытие: форма слайдов (добавление/удаление, валидация), выбор файла (.pptx/ошибка размера), состояния загрузки/успеха/ошибки.

### E2E

Автоматические E2E (Playwright/Cypress) не настроены. Сценарии для ручной проверки описаны в [docs/e2e-checklist.md](docs/e2e-checklist.md).
