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
      <LanguageProvider initialLocale="en">{ui}</LanguageProvider>
    </MemoryRouter>
  );
}

describe("PdfSplitPage", () => {
  it("requires a PDF before inspecting pages and hides download until export", () => {
    const { container } = renderWithRouter(<PdfSplitPage />);
    const action = screen.getByRole("button", { name: "Process" });
    expect(action).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Download" })).not.toBeInTheDocument();

    fireEvent.change(container.querySelector('input[type="file"]') as HTMLInputElement, {
      target: { files: [new File(["%PDF-1.4"], "sample.pdf", { type: "application/pdf" })] },
    });
    expect(action).toBeEnabled();
  });

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

  it("supports selecting and clearing every page with an updated selection summary", async () => {
    vi.spyOn(pdfService, "getPdfPageCount").mockResolvedValue(3);

    const { container } = renderWithRouter(<PdfSplitPage />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["%PDF-1.4"], "sample.pdf", { type: "application/pdf" });
    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.click(screen.getByRole("button", { name: "Process" }));

    await waitFor(() => {
      expect(screen.getByText("Selected 0 of 3 pages")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Select all" }));
    expect(screen.getByText("Selected 3 of 3 pages")).toBeInTheDocument();
    expect(screen.getByLabelText("1")).toBeChecked();
    expect(screen.getByLabelText("2")).toBeChecked();
    expect(screen.getByLabelText("3")).toBeChecked();
    expect(screen.getByRole("button", { name: "Export" })).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: "Clear selection" }));
    expect(screen.getByText("Selected 0 of 3 pages")).toBeInTheDocument();
    expect(screen.getByLabelText("1")).not.toBeChecked();
    expect(screen.getByLabelText("2")).not.toBeChecked();
    expect(screen.getByLabelText("3")).not.toBeChecked();
    expect(screen.getByRole("button", { name: "Export" })).toBeDisabled();
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
