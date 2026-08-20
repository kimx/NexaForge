import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { ReactElement } from "react";
import { vi } from "vitest";
import { PdfSplitPage } from "./SplitPage";
import * as pdfService from "../../services/pdf/pdfService";
import { LanguageProvider } from "../../context/LanguageContext";
import * as download from "../../utils/download";

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

describe("PdfSplitPage", () => {
  it("disables process button while splitting is in progress", async () => {
    const countSpy = vi
      .spyOn(pdfService, "getPdfPageCount")
      .mockImplementation(() => new Promise<number>(() => {}));

    const { container } = renderWithRouter(<PdfSplitPage />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["%PDF-1.4"], "sample.pdf", { type: "application/pdf" });
    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.click(screen.getByRole("button", { name: "Process" }));

    await waitFor(() => {
      const processingButton = screen.getByRole("button", { name: "Processing..." });
      expect(processingButton).toBeDisabled();
      expect(processingButton).toHaveAttribute("aria-busy", "true");
    });

    countSpy.mockRestore();
  });

  it("shows page count and exports selected pages", async () => {
    vi.spyOn(pdfService, "getPdfPageCount").mockResolvedValue(3);
    const splitSpy = vi.spyOn(pdfService, "splitPdf").mockResolvedValue({
      blob: new Blob(["pdf"], { type: "application/pdf" }),
      fileName: "split.pdf",
      mimeType: "application/pdf",
      size: 3,
    });
    const downloadSpy = vi.spyOn(download, "downloadBlob").mockImplementation(() => {});

    const { container } = renderWithRouter(<PdfSplitPage />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["%PDF-1.4"], "sample.pdf", { type: "application/pdf" });
    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.click(screen.getByRole("button", { name: "Process" }));

    await waitFor(() => expect(screen.getByText("3 pages total")).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText("1"));
    fireEvent.click(screen.getByLabelText("3"));
    fireEvent.click(screen.getByRole("button", { name: "Export" }));

    await waitFor(() => expect(splitSpy).toHaveBeenCalledWith(file, "1,3"));
    expect(downloadSpy).toHaveBeenCalledWith(expect.any(Blob), "split.pdf");
  });

  it("shows error when export fails", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(pdfService, "getPdfPageCount").mockResolvedValue(2);
    vi.spyOn(pdfService, "splitPdf").mockRejectedValue(new Error("failure"));

    const { container } = renderWithRouter(<PdfSplitPage />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["%PDF-1.4"], "sample.pdf", { type: "application/pdf" });
    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.click(screen.getByRole("button", { name: "Process" }));
    await waitFor(() => expect(screen.getByText("2 pages total")).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText("1"));
    fireEvent.click(screen.getByRole("button", { name: "Export" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Unable to process this file.");
    });

    consoleError.mockRestore();
  });
});
