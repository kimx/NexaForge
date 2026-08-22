import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { ReactElement } from "react";
import { vi } from "vitest";
import { JsonToCsvPage } from "./JsonToCsvPage";
import * as csvService from "../../services/csv/csvService";
import type { FileProcessResult } from "../../types/tool";
import { LanguageProvider } from "../../context/LanguageContext";

afterEach(() => {
  vi.restoreAllMocks();
});

function renderWithRouter(ui: ReactElement): ReturnType<typeof render> {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <LanguageProvider>{ui}</LanguageProvider>
    </MemoryRouter>
  );
}

function selectFileInput(container: HTMLElement, file: File): void {
  fireEvent.change(screen.getByRole("combobox", { name: "Input source" }), {
    target: { value: "file" },
  });
  const input = container.querySelector("input[type=\"file\"]") as HTMLInputElement;
  fireEvent.change(input, { target: { files: [file] } });
}

describe("JsonToCsvPage", () => {
  it("starts with an editable JSON array sample that can be converted", async () => {
    renderWithRouter(<JsonToCsvPage />);

    const input = screen.getByRole("textbox", { name: "Paste / edit JSON text" }) as HTMLTextAreaElement;
    expect(Array.isArray(JSON.parse(input.value))).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Process" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Download" })).toBeEnabled();
    });
  });

  it("disables process button while converting is in progress", async () => {
    const convertSpy = vi
      .spyOn(csvService, "jsonToCsv")
      .mockImplementation(() => new Promise<FileProcessResult>(() => {}));

    const { container } = renderWithRouter(<JsonToCsvPage />);
    const file = new File(["[{\"name\":\"A\"}]"], "sample.json", { type: "application/json" });
    selectFileInput(container, file);
    fireEvent.click(screen.getByRole("button", { name: "Process" }));

    await waitFor(() => {
      const processingButton = screen.getByRole("button", { name: "Processing..." });
      expect(processingButton).toBeDisabled();
      expect(processingButton).toHaveAttribute("aria-busy", "true");
    });

    convertSpy.mockRestore();
  });

  it("shows error when conversion fails", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(csvService, "jsonToCsv").mockRejectedValue(new Error("convert failed"));

    const { container } = renderWithRouter(<JsonToCsvPage />);
    const file = new File(["[{\"name\":\"A\"}]"], "sample.json", { type: "application/json" });
    selectFileInput(container, file);
    fireEvent.click(screen.getByRole("button", { name: "Process" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Unable to process this file.");
    });

    consoleError.mockRestore();
  });

  it("toggles header option and triggers convert", async () => {
    const convertSpy = vi.spyOn(csvService, "jsonToCsv").mockResolvedValue({
      blob: new Blob(["name\\nage"], { type: "text/csv" }),
      fileName: "sample.csv",
      mimeType: "text/csv",
      size: 8,
    });

    const { container } = renderWithRouter(<JsonToCsvPage />);
    const file = new File(["[{\"name\":\"A\"}]"], "sample.json", { type: "application/json" });
    const checkbox = container.querySelector("input[type=\"checkbox\"]") as HTMLInputElement;

    selectFileInput(container, file);
    fireEvent.click(checkbox);
    fireEvent.click(screen.getByRole("button", { name: "Process" }));

    await waitFor(() => {
      expect(convertSpy).toHaveBeenCalledWith(file, false);
    });
  });
});
