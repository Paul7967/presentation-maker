"""Unit tests for validation of slides input (_validate_slides)."""

import pytest

from app.api.presentation import _validate_slides
from app.services.pptx_service import (
    MAX_ITEM_LEN,
    MAX_ITEMS_PER_SLIDE,
    MAX_NOTES_LEN,
    MAX_SLIDES,
    MAX_TITLE_LEN,
)


class TestValidateSlides:
    """Tests for _validate_slides."""

    def test_empty_array_raises(self):
        """Empty array raises with message about at least one slide."""
        with pytest.raises(ValueError, match="хотя бы одного слайда"):
            _validate_slides([])

    def test_more_than_max_slides_raises(self):
        """More than MAX_SLIDES raises."""
        slides = [{"title": "", "items": []} for _ in range(MAX_SLIDES + 1)]
        with pytest.raises(ValueError, match="Превышено максимальное количество"):
            _validate_slides(slides)

    def test_valid_single_slide(self):
        """Valid single slide returns normalized list with notes."""
        out = _validate_slides([{"title": "Hi", "items": ["A", "B"]}])
        assert out == [{"title": "Hi", "items": ["A", "B"], "notes": ""}]

    def test_missing_title_defaults_to_empty(self):
        """Missing 'title' key defaults to empty string."""
        out = _validate_slides([{"items": ["x"]}])
        assert out == [{"title": "", "items": ["x"], "notes": ""}]

    def test_missing_items_defaults_to_empty_list(self):
        """Missing 'items' key defaults to []."""
        out = _validate_slides([{"title": "T"}])
        assert out == [{"title": "T", "items": [], "notes": ""}]

    def test_title_too_long_raises(self):
        """Title longer than MAX_TITLE_LEN raises."""
        long_title = "x" * (MAX_TITLE_LEN + 1)
        with pytest.raises(ValueError, match="заголовок слайда 1"):
            _validate_slides([{"title": long_title, "items": []}])

    def test_item_too_long_raises(self):
        """Item longer than MAX_ITEM_LEN raises."""
        long_item = "y" * (MAX_ITEM_LEN + 1)
        with pytest.raises(ValueError, match="пункт не более"):
            _validate_slides([{"title": "", "items": [long_item]}])

    def test_too_many_items_per_slide_raises(self):
        """More than MAX_ITEMS_PER_SLIDE items on one slide raises."""
        items = ["a"] * (MAX_ITEMS_PER_SLIDE + 1)
        with pytest.raises(ValueError, match="пунктов на слайд"):
            _validate_slides([{"title": "", "items": items}])

    def test_not_dict_raises(self):
        """Element that is not a dict raises."""
        with pytest.raises(ValueError, match="Некорректный формат"):
            _validate_slides([{"title": "Ok", "items": []}, "not a dict"])

    def test_title_not_string_raises(self):
        """Title that is not a string raises."""
        with pytest.raises(ValueError, match="Некорректный формат"):
            _validate_slides([{"title": 123, "items": []}])

    def test_items_not_list_raises(self):
        """Items that is not a list raises."""
        with pytest.raises(ValueError, match="Некорректный формат"):
            _validate_slides([{"title": "", "items": "not a list"}])

    def test_item_not_string_raises(self):
        """Item that is not a string raises."""
        with pytest.raises(ValueError, match="Некорректный формат"):
            _validate_slides([{"title": "", "items": [1, 2]}])

    def test_max_slides_accepted(self):
        """Exactly MAX_SLIDES slides is valid."""
        slides = [{"title": "", "items": []} for _ in range(MAX_SLIDES)]
        out = _validate_slides(slides)
        assert len(out) == MAX_SLIDES

    def test_max_title_len_accepted(self):
        """Title of exactly MAX_TITLE_LEN is valid."""
        title = "a" * MAX_TITLE_LEN
        out = _validate_slides([{"title": title, "items": []}])
        assert out[0]["title"] == title

    def test_max_item_len_accepted(self):
        """Item of exactly MAX_ITEM_LEN is valid."""
        item = "b" * MAX_ITEM_LEN
        out = _validate_slides([{"title": "", "items": [item]}])
        assert out[0]["items"] == [item]

    def test_max_items_per_slide_accepted(self):
        """Exactly MAX_ITEMS_PER_SLIDE items is valid."""
        items = ["x"] * MAX_ITEMS_PER_SLIDE
        out = _validate_slides([{"title": "", "items": items}])
        assert len(out[0]["items"]) == MAX_ITEMS_PER_SLIDE
        assert out[0]["notes"] == ""

    def test_layout_id_int_accepted(self):
        """layoutId as int is accepted and passed through."""
        out = _validate_slides([{"title": "", "items": [], "layoutId": 1}])
        assert out[0]["layoutId"] == 1
        assert out[0]["notes"] == ""

    def test_layout_id_str_accepted(self):
        """layoutId as string is accepted and passed through."""
        out = _validate_slides([{"title": "", "items": [], "layoutId": "Title and Content"}])
        assert out[0]["layoutId"] == "Title and Content"
        assert out[0]["notes"] == ""

    def test_layout_id_invalid_type_raises(self):
        """layoutId that is not int or str raises."""
        with pytest.raises(ValueError, match="layoutId"):
            _validate_slides([{"title": "", "items": [], "layoutId": []}])

    def test_layout_id_str_too_long_raises(self):
        """layoutId string longer than 200 raises."""
        with pytest.raises(ValueError, match="имя layout"):
            _validate_slides([{"title": "", "items": [], "layoutId": "x" * 201}])

    def test_notes_accepted(self):
        """notes as string is accepted and passed through."""
        out = _validate_slides([{"title": "", "items": [], "notes": "Speaker note"}])
        assert out[0]["notes"] == "Speaker note"

    def test_notes_missing_defaults_to_empty(self):
        """Missing notes defaults to empty string."""
        out = _validate_slides([{"title": "T", "items": []}])
        assert out[0]["notes"] == ""

    def test_notes_too_long_raises(self):
        """notes longer than MAX_NOTES_LEN raises."""
        long_notes = "n" * (MAX_NOTES_LEN + 1)
        with pytest.raises(ValueError, match="заметки слайда 1"):
            _validate_slides([{"title": "", "items": [], "notes": long_notes}])

    def test_notes_not_string_raises(self):
        """notes that is not a string raises."""
        with pytest.raises(ValueError, match="notes"):
            _validate_slides([{"title": "", "items": [], "notes": 123}])
