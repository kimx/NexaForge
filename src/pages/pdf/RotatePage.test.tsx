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

  it("shows error when rotate fails", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(pdfService, "rotatePdf").mockRejectedValue(new Error("failure"));

    const { container } = renderWithProviders(<PdfRotatePage />);
    const input = container.querySelector("input[type=\"file\"]") as HTMLInputElement;
    const file = new File(["%PDF-1.4"], "sample.pdf", { type: "application/pdf" });
    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.click(screen.getByRole("button", { name: "Process" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Unable to process this file.");
    });

    consoleError.mockRestore();
  });
});
