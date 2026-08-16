import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { ReactElement } from "react";
import { vi } from "vitest";
import { PdfSplitPage } from "./SplitPage";
import * as pdfService from "../../services/pdf/pdfService";
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

describe("PdfSplitPage", () => {
  it("disables process button while splitting is in progress", async () => {
    const splitSpy = vi
      .spyOn(pdfService, "splitPdf")
      .mockImplementation(() => new Promise<FileProcessResult>(() => {}));

    const { container } = renderWithRouter(<PdfSplitPage />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["%PDF-1.4"], "sample.pdf", { type: "application/pdf" });
    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.change(screen.getByLabelText("Page Ranges"), { target: { value: "1-2" } });
    fireEvent.click(screen.getByRole("button", { name: "Process" }));

    await waitFor(() => {
      const processingButton = screen.getByRole("button", { name: "Processing..." });
      expect(processingButton).toBeDisabled();
      expect(processingButton).toHaveAttribute("aria-busy", "true");
    });

    splitSpy.mockRestore();
  });

  it("shows error when split fails", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(pdfService, "splitPdf").mockRejectedValue(new Error("failure"));

    const { container } = renderWithRouter(<PdfSplitPage />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["%PDF-1.4"], "sample.pdf", { type: "application/pdf" });
    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.change(screen.getByLabelText("Page Ranges"), { target: { value: "1-2" } });
    fireEvent.click(screen.getByRole("button", { name: "Process" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Unable to process this file.");
    });

    consoleError.mockRestore();
  });
});

