import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../App";

// Mock fetch for submit
const mockFetch = vi.fn();
beforeEach(() => {
  global.fetch = mockFetch;
  mockFetch.mockReset();
});

describe("App – форма слайдов", () => {
  it("рендерит заголовок и форму", () => {
    render(<App />);
    expect(screen.getByRole("heading", { name: /presentation maker/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /описание слайдов/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /добавить слайд/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /сгенерировать/i })).toBeInTheDocument();
  });

  it("кнопка «Сгенерировать» недоступна без файла и без заполненных слайдов", () => {
    render(<App />);
    const submitBtn = screen.getByRole("button", { name: /сгенерировать/i });
    expect(submitBtn).toBeDisabled();
  });

  it("добавление слайда: кнопка «Добавить слайд» добавляет слайд", async () => {
    const user = userEvent.setup();
    render(<App />);
    const addSlideBtn = screen.getByRole("button", { name: /добавить слайд/i });
    await user.click(addSlideBtn);
    expect(screen.getAllByText(/слайд \d+/i).length).toBeGreaterThanOrEqual(2);
  });

  it("валидация: без контента слайдов и без файла кнопка «Сгенерировать» недоступна", () => {
    render(<App />);
    const submitBtn = screen.getByRole("button", { name: /сгенерировать/i });
    expect(submitBtn).toBeDisabled();
  });

  it("валидация: файл не .pptx — показывается ошибка и файл не принимается", async () => {
    render(<App />);
    const file = new File(["x"], "document.txt", { type: "text/plain" });
    const fileInput = document.querySelector('input[type="file"]');
    fireEvent.change(fileInput, { target: { files: [file] } });
    await waitFor(() => {
      expect(screen.getByText(/только формат PPTX/i)).toBeInTheDocument();
    });
  });

  it("после ввода заголовка и выбора .pptx кнопка «Сгенерировать» активна", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByLabelText(/заголовок/i), "Slide 1");
    const file = new File(["y"], "template.pptx", { type: "application/octet-stream" });
    await user.upload(document.querySelector('input[type="file"]'), file);
    expect(screen.getByRole("button", { name: /сгенерировать/i })).not.toBeDisabled();
  });

  it("подсказка про максимум 100 слайдов отображается", () => {
    render(<App />);
    expect(screen.getByText(/максимум 100 слайдов/i)).toBeInTheDocument();
  });

  it("блок файла: подсказка про .pptx до 20 MB", () => {
    render(<App />);
    expect(screen.getByText(/выберите файл .pptx до 20 mb/i)).toBeInTheDocument();
  });
});

describe("App – состояния", () => {
  it("состояние загрузки: спиннер и текст «Генерация…», форма скрыта", async () => {
    const user = userEvent.setup();
    render(<App />);
    const titleInput = screen.getByLabelText(/заголовок/i);
    await user.type(titleInput, "T");
    const file = new File(["b"], "p.pptx", { type: "application/octet-stream" });
    const fileInput = document.querySelector('input[type="file"]');
    await user.upload(fileInput, file);
    mockFetch.mockImplementation(() => new Promise(() => {}));
    await user.click(screen.getByRole("button", { name: /сгенерировать/i }));
    expect(screen.getByText(/генерация презентации/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /сгенерировать/i })).not.toBeInTheDocument();
  });

  it("состояние успех: кнопки «Скачать» и «Создать ещё»", async () => {
    const user = userEvent.setup();
    render(<App />);
    const titleInput = screen.getByLabelText(/заголовок/i);
    await user.type(titleInput, "T");
    const file = new File(["b"], "p.pptx", { type: "application/octet-stream" });
    const fileInput = document.querySelector('input[type="file"]');
    await user.upload(fileInput, file);
    const blob = new Blob(["pk"], { type: "application/vnd.openxmlformats-officedocument.presentationml.presentation" });
    mockFetch.mockResolvedValueOnce({ ok: true, blob: () => Promise.resolve(blob) });
    await user.click(screen.getByRole("button", { name: /сгенерировать/i }));
    await screen.findByRole("button", { name: /скачать/i });
    expect(screen.getByRole("button", { name: /скачать/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /создать ещё/i })).toBeInTheDocument();
  });

  it("состояние ошибка: отображение сообщения и кнопка «Повторить»", async () => {
    const user = userEvent.setup();
    render(<App />);
    const titleInput = screen.getByLabelText(/заголовок/i);
    await user.type(titleInput, "T");
    const file = new File(["c"], "e.pptx", { type: "application/octet-stream" });
    const fileInput = document.querySelector('input[type="file"]');
    await user.upload(fileInput, file);
    mockFetch.mockResolvedValueOnce({ ok: false, json: async () => ({ detail: "Ошибка сервера" }) });
    await user.click(screen.getByRole("button", { name: /сгенерировать/i }));
    await screen.findByRole("alert");
    expect(screen.getByRole("alert")).toHaveTextContent("Ошибка сервера");
    expect(screen.getByRole("button", { name: /повторить/i })).toBeInTheDocument();
  });
});
