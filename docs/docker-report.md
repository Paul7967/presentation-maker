# Отчёт: контейнеризация (п. 9.1)

## Что сделано

- **backend/Dockerfile** — образ FastAPI на Python 3.12-slim: установка зависимостей из `requirements.txt`, запуск через `uvicorn app.main:app --host 0.0.0.0 --port 8000 --timeout 120`. Лимит тела 20 MB реализован в коде приложения (`app/main.py`).
- **frontend/Dockerfile** — двухэтапная сборка: (1) Node 22 — `npm ci`, сборка Vite с переменной `VITE_API_URL` (ARG/ENV), выход в `dist/`; (2) nginx:alpine — раздача статики из `dist/`, конфиг в `frontend/nginx.conf` (SPA: `try_files` на `index.html`).
- **docker-compose.yml** в корне — сервисы `frontend` и `backend`, общая сеть `app`, backend на порту 8000, frontend на порту 80; у frontend задан `build.args.VITE_API_URL` (по умолчанию `http://localhost:8000` для доступа браузера к API при работе через localhost), зависимость `depends_on: backend`.

## Как запускать

```bash
# из корня проекта (presentationMaker/)
docker-compose up --build
```

При первом запуске или после изменений кода — `--build`. Дальше достаточно:

```bash
docker-compose up
```

- Фронт: http://localhost (порт 80).
- API: http://localhost:8000.

## Переменные окружения для docker-compose

- **VITE_API_URL** — URL бекенда, с которым браузер будет обращаться к API. Задаётся при **сборке** фронтенда (build args). По умолчанию в `docker-compose.yml`: `http://localhost:8000` (подходит, когда пользователь открывает фронт на localhost и бекенд проброшен на 8000). Для другого окружения можно задать в `.env` в корне или передать при сборке, например:
  ```bash
  VITE_API_URL=https://api.example.com docker-compose up --build
  ```
  После смены `VITE_API_URL` нужна пересборка фронта: `docker-compose build frontend` или `docker-compose up --build`.

У бекенда отдельные переменные в текущем составе не требуются; таймаут 120 с зашит в CMD Dockerfile.

## Итог

По команде `docker-compose up` (с `--build` при необходимости) поднимаются frontend и backend; приложением можно пользоваться, фронт обращается к бекенду по `VITE_API_URL`.

Выполнено агентом: devops
