import { fireEvent, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { PdfMergePage } from "./MergePage";
import * as pdfService from "../../services/pdf/pdfService";
import type { FileProcessResult } from "../../types/tool";
import { renderWithProviders } from "../../test/renderWithProviders";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("PdfMergePage", () => {
  it("requires at least two PDF files before merging", () => {
    const { container } = renderWithProviders(<PdfMergePage />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const action = screen.getByRole("button", { name: "Process" });
    expect(action).toBeDisabled();

    fireEvent.change(input, {
      target: { files: [new File(["%PDF-1.4"], "a.pdf", { type: "application/pdf" })] },
    });
    expect(action).toBeDisabled();

    fireEvent.change(input, {
      target: { files: [new File(["%PDF-1.4"], "b.pdf", { type: "application/pdf" })] },
    });
    expect(action).toBeEnabled();
    expect(screen.queryByRole("button", { name: "Download" })).not.toBeInTheDocument();
  });

  it("disables process button while merge is in progress", async () => {
    const mergeSpy = vi
      .spyOn(pdfService, "mergePdf")
      .mockImplementation(() => new Promise<FileProcessResult>(() => {}));

    const { container } = renderWithProviders(<PdfMergePage />);
    const input = container.querySelector("input[type=\"file\"]") as HTMLInputElement;
    const fileA = new File(["%PDF-1.4"], "a.pdf", { type: "application/pdf" });
    const fileB = new File(["%PDF-1.4"], "b.pdf", { type: "application/pdf" });
    fireEvent.change(input, { target: { files: [fileA, fileB] } });
    fireEvent.click(screen.getByRole("button", { name: "Process" }));

    await waitFor(() => {
      const processingButton = screen.getByRole("button", { name: "Processing..." });
      expect(processingButton).toBeDisabled();
      expect(processingButton).toHaveAttribute("aria-busy", "true");
    });

    mergeSpy.mockRestore();
  });

  it("shows error when merge fails", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(pdfService, "mergePdf").mockRejectedValue(new Error("failure"));

    const { container } = renderWithProviders(<PdfMergePage />);
    const input = container.querySelector("input[type=\"file\"]") as HTMLInputElement;
    const fileA = new File(["%PDF-1.4"], "a.pdf", { type: "application/pdf" });
    const fileB = new File(["%PDF-1.4"], "b.pdf", { type: "application/pdf" });
    fireEvent.change(input, { target: { files: [fileA, fileB] } });
    fireEvent.click(screen.getByRole("button", { name: "Process" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Unable to process this file.");
    });

    consoleError.mockRestore();
  });
});
