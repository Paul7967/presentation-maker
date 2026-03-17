import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SlideCard from "../components/SlideCard";

const defaultProps = {
  slide: { title: "Test title", items: ["Item 1", "Item 2"], notes: "" },
  index: 0,
  onChange: vi.fn(),
  onRemove: vi.fn(),
  canRemove: true,
  maxTitleLen: 500,
  maxItemLen: 2000,
  maxItemsPerSlide: 50,
  maxNotesLen: 4000,
};

describe("SlideCard", () => {
  it("рендерит заголовок слайда и поля ввода", () => {
    render(<SlideCard {...defaultProps} />);
    expect(screen.getByText("Слайд 1")).toBeInTheDocument();
    expect(screen.getByLabelText(/заголовок/i)).toHaveValue("Test title");
    expect(screen.getByPlaceholderText(/пункт 1/i)).toHaveValue("Item 1");
    expect(screen.getByPlaceholderText(/пункт 2/i)).toHaveValue("Item 2");
  });

  it("кнопка «Удалить слайд» вызывается при canRemove true", async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    render(<SlideCard {...defaultProps} onRemove={onRemove} canRemove={true} />);
    await user.click(screen.getByRole("button", { name: /удалить слайд 1/i }));
    expect(onRemove).toHaveBeenCalledWith(0);
  });

  it("кнопка «Удалить слайд» не отображается при canRemove false", () => {
    render(<SlideCard {...defaultProps} canRemove={false} />);
    expect(screen.queryByRole("button", { name: /удалить слайд/i })).not.toBeInTheDocument();
  });

  it("изменение заголовка вызывает onChange с обновлённым слайдом", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<SlideCard {...defaultProps} onChange={onChange} />);
    const input = screen.getByLabelText(/заголовок/i);
    await user.type(input, "!");
    expect(onChange).toHaveBeenCalled();
    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1];
    expect(lastCall[1].title).toBe("Test title!");
  });

  it("добавление пункта: кнопка «Добавить пункт» видна и активна", () => {
    render(<SlideCard {...defaultProps} />);
    const addItemBtn = screen.getByRole("button", { name: /добавить пункт/i });
    expect(addItemBtn).toBeInTheDocument();
    expect(addItemBtn).not.toBeDisabled();
  });

  it("при maxItemsPerSlide достигнутом кнопка «Добавить пункт» disabled", () => {
    const slide = { title: "", items: Array(50).fill("x") };
    render(<SlideCard {...defaultProps} slide={slide} maxItemsPerSlide={50} />);
    expect(screen.getByRole("button", { name: /добавить пункт/i })).toBeDisabled();
  });

  it("отображает счётчик символов заголовка при maxTitleLen", () => {
    render(<SlideCard {...defaultProps} slide={{ title: "Hi", items: [] }} />);
    expect(screen.getByText("2/500")).toBeInTheDocument();
  });
});
