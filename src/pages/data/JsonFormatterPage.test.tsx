import { fireEvent, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { JsonFormatterPage } from "./JsonFormatterPage";
import * as fileService from "../../services/file/fileService";
import * as jsonService from "../../services/json/jsonService";
import { renderWithProviders } from "../../test/renderWithProviders";

describe("JsonFormatterPage", () => {
  beforeEach(() => {
    window.localStorage.setItem("nexaforge-locale", "en");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("starts empty and loads an explicit sample on request", () => {
    renderWithProviders(<JsonFormatterPage />, { route: "/data/json-formatter" });

    const editor = screen.getByRole("textbox", { name: "JSON input" });
    expect(editor).toHaveValue("");
    expect(screen.getByRole("button", { name: "Process" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Load sample" }));

    expect(JSON.parse((editor as HTMLTextAreaElement).value)).toEqual({
      name: "NexaForge",
      active: true,
      tags: ["json", "sample"],
    });
    expect(screen.getByRole("button", { name: "Process" })).toBeEnabled();
  });

  it("associates debounced parse feedback with the source field and clears it after correction", async () => {
    renderWithProviders(<JsonFormatterPage />, { route: "/data/json-formatter" });
    const editor = screen.getByRole("textbox", { name: "JSON input" });

    fireEvent.change(editor, { target: { value: '{"broken":}' } });

    await waitFor(() => expect(editor).toHaveAttribute("aria-invalid", "true"), {
      timeout: 1200,
    });
    const errorId = editor.getAttribute("aria-describedby");
    expect(errorId).toBeTruthy();
    expect(document.getElementById(errorId ?? "")).toHaveTextContent("Invalid JSON");

    fireEvent.change(editor, { target: { value: '{"valid":true}' } });

    await waitFor(() => expect(editor).toHaveAttribute("aria-invalid", "false"), {
      timeout: 1200,
    });
    expect(screen.queryByText(/Invalid JSON/)).not.toBeInTheDocument();
  });

  it("does not invent a line and column when the parser omits a position", async () => {
    renderWithProviders(<JsonFormatterPage />, { route: "/data/json-formatter" });
    const editor = screen.getByRole("textbox", { name: "JSON input" });

    fireEvent.change(editor, { target: { value: '{"broken":}' } });

    await waitFor(() => expect(editor).toHaveAttribute("aria-invalid", "true"), {
      timeout: 1200,
    });
    const feedback = document.getElementById(
      editor.getAttribute("aria-describedby") ?? ""
    );
    expect(feedback).toHaveTextContent("Invalid JSON");
    expect(feedback).not.toHaveTextContent(/line 1, column 1/i);
  });

  it("runs the primary action with Ctrl or Meta plus Enter", async () => {
    const formatSpy = vi.spyOn(jsonService, "formatJson");
    renderWithProviders(<JsonFormatterPage />, { route: "/data/json-formatter" });
    const editor = screen.getByRole("textbox", { name: "JSON input" });
    fireEvent.change(editor, { target: { value: '{"a":1}' } });

    fireEvent.keyDown(editor, { key: "Enter", ctrlKey: true });

    await waitFor(() => expect(formatSpy).toHaveBeenCalledWith('{"a":1}'));
    expect(screen.getByText(/"a": 1/)).toBeInTheDocument();
  });

  it("preserves source text when processing reports an error", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(jsonService, "formatJson").mockImplementation(() => {
      throw new Error("Transformer unavailable");
    });
    renderWithProviders(<JsonFormatterPage />, { route: "/data/json-formatter" });
    const editor = screen.getByRole("textbox", { name: "JSON input" });
    fireEvent.change(editor, { target: { value: '{"keep":"me"}' } });

    fireEvent.click(screen.getByRole("button", { name: "Process" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Unable to process this file.");
    });
    expect(editor).toHaveValue('{"keep":"me"}');
  });

  it("defers automatic validation for very large input", async () => {
    renderWithProviders(<JsonFormatterPage />, { route: "/data/json-formatter" });
    const editor = screen.getByRole("textbox", { name: "JSON input" });
    const largeJson = `{"payload":"${"x".repeat(250_000)}"}`;

    fireEvent.change(editor, { target: { value: largeJson } });

    expect(
      await screen.findByText("Large input: validation will run when you process.")
    ).toBeInTheDocument();
    expect(editor).toHaveAttribute("aria-invalid", "false");
    expect(screen.getByRole("button", { name: "Process" })).toBeEnabled();
  });

  it("disables the process button while reading a selected file", async () => {
    vi.spyOn(fileService, "readFileAsText").mockImplementation(
      () => new Promise<string>(() => {})
    );

    const { container } = renderWithProviders(<JsonFormatterPage />, {
      route: "/data/json-formatter",
    });
    fireEvent.change(screen.getByRole("combobox", { name: "Input source" }), {
      target: { value: "file" },
    });
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, {
      target: {
        files: [new File(['{"a":1}'], "sample.json", { type: "application/json" })],
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "Process" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Processing..." })).toBeDisabled();
    });
  });

  it("uses minify mode for a valid selected file", async () => {
    vi.spyOn(fileService, "readFileAsText").mockResolvedValue('{"a":1}');
    const minifySpy = vi.spyOn(jsonService, "minifyJson");

    const { container } = renderWithProviders(<JsonFormatterPage />, {
      route: "/data/json-formatter",
    });
    fireEvent.change(screen.getByRole("combobox", { name: "Input source" }), {
      target: { value: "file" },
    });
    fireEvent.change(screen.getByRole("combobox", { name: "Mode" }), {
      target: { value: "minify" },
    });
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, {
      target: {
        files: [new File(['{"a":1}'], "sample.json", { type: "application/json" })],
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "Process" }));

    await waitFor(() => expect(minifySpy).toHaveBeenCalledWith('{"a":1}'));
  });
});
