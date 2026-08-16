import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { ReactElement } from "react";
import { vi } from "vitest";
import { JsonToCsvPage } from "./JsonToCsvPage";
import * as csvService from "../../services/csv/csvService";
import type { FileProcessResult } from "../../types/tool";

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

describe("JsonToCsvPage", () => {
  it("disables process button while converting is in progress", async () => {
    const convertSpy = vi
      .spyOn(csvService, "jsonToCsv")
      .mockImplementation(() => new Promise<FileProcessResult>(() => {}));

    const { container } = renderWithRouter(<JsonToCsvPage />);
    const input = container.querySelector("input[type=\"file\"]") as HTMLInputElement;
    const file = new File(["[{\"name\":\"A\"}]"], "sample.json", { type: "application/json" });
    fireEvent.change(input, { target: { files: [file] } });
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
    const input = container.querySelector("input[type=\"file\"]") as HTMLInputElement;
    const file = new File(["[{\"name\":\"A\"}]"], "sample.json", { type: "application/json" });
    fireEvent.change(input, { target: { files: [file] } });
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
    const input = container.querySelector("input[type=\"file\"]") as HTMLInputElement;
    const file = new File(["[{\"name\":\"A\"}]"], "sample.json", { type: "application/json" });
    const checkbox = container.querySelector("input[type=\"checkbox\"]") as HTMLInputElement;

    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.click(checkbox);
    fireEvent.click(screen.getByRole("button", { name: "Process" }));

    await waitFor(() => {
      expect(convertSpy).toHaveBeenCalledWith(file, false);
    });
  });
});
