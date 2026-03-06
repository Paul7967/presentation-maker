"""Presentation Maker API."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

from app.api.presentation import router as presentation_router, shutdown_executor

# 20 MB — api.md
MAX_REQUEST_BODY = 20 * 1024 * 1024


class BodyLimitMiddleware(BaseHTTPMiddleware):
    """Return 413 if Content-Length exceeds MAX_REQUEST_BODY for POST generate."""

    async def dispatch(self, request: Request, call_next):
        if request.url.path != "/api/presentation/generate" or request.method != "POST":
            return await call_next(request)
        content_length = request.headers.get("content-length")
        if content_length is not None:
            try:
                if int(content_length) > MAX_REQUEST_BODY:
                    return JSONResponse(
                        status_code=413,
                        content={"detail": "Превышен максимальный размер файла (20 MB)."},
                    )
            except ValueError:
                pass
        return await call_next(request)


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    shutdown_executor()


app = FastAPI(
    title="Presentation Maker API",
    version="1.0",
    lifespan=lifespan,
)

app.add_middleware(BodyLimitMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

app.include_router(presentation_router)
