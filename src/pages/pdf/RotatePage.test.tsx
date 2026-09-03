import { fireEvent, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { PdfRotatePage } from "./RotatePage";
import * as pdfService from "../../services/pdf/pdfService";
import type { FileProcessResult } from "../../types/tool";
import { renderWithProviders } from "../../test/renderWithProviders";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("PdfRotatePage", () => {
  it("requires a PDF and hides download until rotation succeeds", () => {
    const { container } = renderWithProviders(<PdfRotatePage />);
    const action = screen.getByRole("button", { name: "Process" });
    expect(action).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Download" })).not.toBeInTheDocument();

    fireEvent.change(container.querySelector('input[type="file"]') as HTMLInputElement, {
      target: { files: [new File(["%PDF-1.4"], "sample.pdf", { type: "application/pdf" })] },
    });
    expect(action).toBeEnabled();
  });

  it("disables process button while rotate is in progress", async () => {
    const rotateSpy = vi
      .spyOn(pdfService, "rotatePdf")
      .mockImplementation(() => new Promise<FileProcessResult>(() => {}));

    const { container } = renderWithProviders(<PdfRotatePage />);
    const input = container.querySelector("input[type=\"file\"]") as HTMLInputElement;
    const file = new File(["%PDF-1.4"], "sample.pdf", { type: "application/pdf" });
    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.click(screen.getByRole("button", { name: "Process" }));

    await waitFor(() => {
      const processingButton = screen.getByRole("button", { name: "Processing..." });
      expect(processingButton).toBeDisabled();
      expect(processingButton).toHaveAttribute("aria-busy", "true");
    });

    rotateSpy.mockRestore();
  });

  it("processes selected PDFs as a batch and offers their ZIP download", async () => {
    vi.spyOn(pdfService, "rotatePdf").mockImplementation(async (file) => {
      const blob = new Blob([file.name], { type: "application/pdf" });
      return { blob, fileName: `rotated-${file.name}`, mimeType: "application/pdf", size: blob.size };
    });

    const { container } = renderWithProviders(<PdfRotatePage />);
    const input = container.querySelector("input[type=\"file\"]") as HTMLInputElement;
    const files = [
      new File(["%PDF-1.4"], "first.pdf", { type: "application/pdf" }),
      new File(["%PDF-1.4"], "second.pdf", { type: "application/pdf" }),
    ];
    fireEvent.change(input, { target: { files } });
    fireEvent.click(screen.getByRole("button", { name: "Process" }));

    await waitFor(() => {
      expect(pdfService.rotatePdf).toHaveBeenCalledTimes(2);
      expect(screen.getByRole("button", { name: "Download rotated-first.pdf" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Download rotated-second.pdf" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Download ZIP" })).toBeInTheDocument();
    });
  });

  it("shows an error when every batch rotation fails", async () => {
    vi.spyOn(pdfService, "rotatePdf").mockRejectedValue(new Error("failure"));

    const { container } = renderWithProviders(<PdfRotatePage />);
    const input = container.querySelector("input[type=\"file\"]") as HTMLInputElement;
    fireEvent.change(input, {
      target: { files: [new File(["%PDF-1.4"], "sample.pdf", { type: "application/pdf" })] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Process" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Unable to process this file.");
    });
  });
});
