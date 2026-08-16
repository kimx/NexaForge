import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { ReactElement } from "react";
import { vi } from "vitest";
import { JsonFormatterPage } from "./JsonFormatterPage";
import * as fileService from "../../services/file/fileService";
import * as jsonService from "../../services/json/jsonService";

afterEach(() => {
  vi.restoreAllMocks();
});

function renderWithRouter(ui: ReactElement): ReturnType<typeof render> {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      {ui}
    </MemoryRouter>
  );
}

describe("JsonFormatterPage", () => {
  it("disables process button while formatting is in progress", async () => {
    const readSpy = vi
      .spyOn(fileService, "readFileAsText")
      .mockImplementation(() => new Promise<string>(() => {}));

    const { container } = renderWithRouter(<JsonFormatterPage />);
    const input = container.querySelector("input[type=\"file\"]") as HTMLInputElement;
    const file = new File(["{\\\"a\\\":1}"], "sample.json", { type: "application/json" });
    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.click(screen.getByRole("button", { name: "Process" }));

    await waitFor(() => {
      const processingButton = screen.getByRole("button", { name: "Processing..." });
      expect(processingButton).toBeDisabled();
    });

    readSpy.mockRestore();
  });

  it("shows error when formatting fails", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(fileService, "readFileAsText").mockResolvedValue("{invalid");
    vi.spyOn(jsonService, "formatJson").mockImplementation(() => {
      throw new Error("parse");
    });

    const { container } = renderWithRouter(<JsonFormatterPage />);
    const input = container.querySelector("input[type=\"file\"]") as HTMLInputElement;
    const file = new File(["{invalid"], "sample.json", { type: "application/json" });
    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.click(screen.getByRole("button", { name: "Process" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Unable to process this file.");
    });

    consoleError.mockRestore();
  });

  it("uses minify mode when selected", async () => {
    const readSpy = vi
      .spyOn(fileService, "readFileAsText")
      .mockResolvedValue("{\"a\":1}");
    const minifySpy = vi.spyOn(jsonService, "minifyJson");

    const { container } = renderWithRouter(<JsonFormatterPage />);
    const input = container.querySelector("input[type=\"file\"]") as HTMLInputElement;
    const file = new File(["{\"a\":1}"], "sample.json", { type: "application/json" });
    const modeSelect = screen.getByRole("combobox");

    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.change(modeSelect, { target: { value: "minify" } });
    fireEvent.click(screen.getByRole("button", { name: "Process" }));

    await waitFor(() => {
      expect(minifySpy).toHaveBeenCalledWith("{\"a\":1}");
    });

    readSpy.mockRestore();
  });
});
