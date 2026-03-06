"""Pydantic schemas for API request/response."""

from pydantic import BaseModel, Field


class SlideInput(BaseModel):
    """One slide in the presentation description."""

    title: str = ""
    items: list[str] = Field(default_factory=list, max_length=50)
