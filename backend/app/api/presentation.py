"""Presentation generation API."""

import asyncio
import json
from concurrent.futures import ThreadPoolExecutor
from io import BytesIO

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import Response

from app.services.pptx_service import (
    MAX_FILE_SIZE,
    MAX_ITEMS_PER_SLIDE,
    MAX_ITEM_LEN,
    MAX_SLIDES,
    MAX_TITLE_LEN,
    generate_presentation,
)

router = APIRouter(prefix="/api/presentation", tags=["presentation"])
GENERATE_TIMEOUT_SEC = 120
_executor = ThreadPoolExecutor(max_workers=2)


def shutdown_executor():
    """Shutdown thread pool on app lifespan shutdown."""
    _executor.shutdown(wait=True)


# Allowed MIME for pptx (api.md)
PPTX_MIMES = {
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/octet-stream",
}


CHUNK_SIZE = 1024 * 1024  # 1 MB per chunk


def _is_pptx_signature(content: bytes) -> bool:
    """Check OOXML signature: ZIP with ppt/ in first bytes."""
    if len(content) < 4:
        return False
    if content[:2] != b"PK":
        return False
    return b"ppt/" in content[:4096]


def _validate_slides(slides_raw: list) -> list[dict]:
    """Validate and normalize slides array. Returns list of {title, items}. Raises ValueError with message."""
    if not slides_raw:
        raise ValueError("Введите описание хотя бы одного слайда.")
    if len(slides_raw) > MAX_SLIDES:
        raise ValueError(f"Превышено максимальное количество слайдов ({MAX_SLIDES}).")
    out = []
    for i, s in enumerate(slides_raw):
        if not isinstance(s, dict):
            raise ValueError("Некорректный формат описания слайдов.")
        title = s.get("title")
        if title is None:
            title = ""
        if not isinstance(title, str):
            raise ValueError("Некорректный формат описания слайдов.")
        if len(title) > MAX_TITLE_LEN:
            raise ValueError(
                f"Превышен лимит: заголовок слайда {i + 1} — не более {MAX_TITLE_LEN} символов."
            )
        items = s.get("items")
        if items is None:
            items = []
        if not isinstance(items, list):
            raise ValueError("Некорректный формат описания слайдов.")
        if len(items) > MAX_ITEMS_PER_SLIDE:
            raise ValueError(
                f"Превышен лимит: не более {MAX_ITEMS_PER_SLIDE} пунктов на слайд (слайд {i + 1})."
            )
        out_items = []
        for j, it in enumerate(items):
            if not isinstance(it, str):
                raise ValueError("Некорректный формат описания слайдов.")
            if len(it) > MAX_ITEM_LEN:
                raise ValueError(
                    f"Превышен лимит: пункт не более {MAX_ITEM_LEN} символов (слайд {i + 1}, пункт {j + 1})."
                )
            out_items.append(it)
        out.append({"title": title, "items": out_items})
    return out


@router.post("/generate")
async def generate(
    template: UploadFile = File(..., alias="template"),
    slides: str = Form(..., alias="slides"),
):
    """
    Generate PPTX from template file and slides JSON.
    Returns 200 with binary pptx or 4xx/5xx with JSON detail.
    """
    # 400: missing template
    if not template or not template.filename:
        raise HTTPException(
            status_code=400,
            detail="Загрузите образец в формате PPTX.",
        )
    # 400: missing slides
    if not slides or not slides.strip():
        raise HTTPException(
            status_code=400,
            detail="Передайте описание слайдов в поле slides.",
        )
    # Parse JSON
    try:
        slides_parsed = json.loads(slides)
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=400,
            detail="Некорректный формат описания слайдов.",
        )
    if not isinstance(slides_parsed, list):
        raise HTTPException(
            status_code=400,
            detail="Некорректный формат описания слайдов.",
        )
    # Validate slide count and content
    try:
        slides_valid = _validate_slides(slides_parsed)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Read template file with size limit (protects against chunked uploads without Content-Length)
    try:
        body = BytesIO()
        total = 0
        while True:
            chunk = await template.read(CHUNK_SIZE)
            if not chunk:
                break
            total += len(chunk)
            if total > MAX_FILE_SIZE:
                raise HTTPException(
                    status_code=413,
                    detail="Превышен максимальный размер файла (20 MB).",
                )
            body.write(chunk)
        body = body.getvalue()
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Файл образца повреждён или не может быть прочитан.",
        )
    if len(body) == 0:
        raise HTTPException(
            status_code=400,
            detail="Поддерживается только формат PPTX.",
        )
    # MIME or signature
    content_type = (template.content_type or "").strip().lower()
    if content_type and content_type not in PPTX_MIMES and content_type != "application/zip":
        raise HTTPException(
            status_code=400,
            detail="Поддерживается только формат PPTX.",
        )
    if not _is_pptx_signature(body):
        raise HTTPException(
            status_code=400,
            detail="Поддерживается только формат PPTX.",
        )

    loop = asyncio.get_event_loop()
    try:
        pptx_bytes = await asyncio.wait_for(
            loop.run_in_executor(
                _executor,
                lambda: generate_presentation(body, slides_valid),
            ),
            timeout=GENERATE_TIMEOUT_SEC,
        )
    except asyncio.TimeoutError:
        raise HTTPException(
            status_code=504,
            detail="Превышено время ожидания. Попробуйте уменьшить количество слайдов или размер образца.",
        )
    except ValueError as e:
        if e.args and e.args[0] == "no_slides":
            raise HTTPException(
                status_code=500,
                detail="В файле образца не найден ни один слайд.",
            )
        if e.args and e.args[0] == "invalid_slide_count":
            raise HTTPException(
                status_code=400,
                detail="Введите описание хотя бы одного слайда.",
            )
        raise HTTPException(
            status_code=500,
            detail="Не удалось сгенерировать презентацию.",
        )
    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Не удалось сгенерировать презентацию.",
        )

    return Response(
        content=pptx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation",
        headers={
            "Content-Disposition": 'attachment; filename="presentation.pptx"',
        },
    )
