import { fireEvent, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { renderWithProviders } from "../../test/renderWithProviders";
import * as conversionService from "../../services/pdf/conversionService";
import * as download from "../../utils/download";
import { PdfToImagePage } from "./PdfToImagePage";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("PdfToImagePage", () => {
  it("previews every converted page and supports individual and ZIP downloads", async () => {
    const pageOne = {
      blob: new Blob(["one"], { type: "image/png" }),
      fileName: "sample-page-01.png",
      mimeType: "image/png",
      size: 3,
    };
    const pageTwo = {
      blob: new Blob(["two"], { type: "image/png" }),
      fileName: "sample-page-02.png",
      mimeType: "image/png",
      size: 3,
    };
    vi.spyOn(conversionService, "convertPdfToImages").mockResolvedValue([pageOne, pageTwo]);
    const downloadSpy = vi.spyOn(download, "downloadBlob").mockImplementation(() => {});
    const { container } = renderWithProviders(<PdfToImagePage />);
    const file = new File(["%PDF-1.7"], "sample.pdf", { type: "application/pdf" });

    fireEvent.change(container.querySelector('input[type="file"]') as HTMLInputElement, {
      target: { files: [file] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Convert to images" }));

    expect(await screen.findByRole("img", { name: "Preview of page 1" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Preview of page 2" })).toBeInTheDocument();
    expect(screen.getByText("2 images ready")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Download page 1" }));
    expect(downloadSpy).toHaveBeenCalledWith(pageOne.blob, pageOne.fileName);
    expect(screen.getByRole("button", { name: "Download ZIP" })).toBeEnabled();
    await waitFor(() => expect(conversionService.convertPdfToImages).toHaveBeenCalledWith(file, expect.any(Function)));
  });

  it("announces an unsupported file once and keeps conversion disabled", () => {
    const { container } = renderWithProviders(<PdfToImagePage />);

    fireEvent.change(container.querySelector('input[type="file"]') as HTMLInputElement, {
      target: { files: [new File(["notes"], "notes.txt", { type: "text/plain" })] },
    });

    expect(screen.getAllByRole("alert")).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Convert to images" })).toBeDisabled();
  });

  it("locks source controls while page rendering is pending", async () => {
    vi.spyOn(conversionService, "convertPdfToImages").mockImplementation(() => new Promise(() => {}));
    const { container } = renderWithProviders(<PdfToImagePage />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(input, {
      target: { files: [new File(["%PDF"], "sample.pdf", { type: "application/pdf" })] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Convert to images" }));

    await waitFor(() => expect(screen.getByRole("button", { name: "Processing..." })).toBeDisabled());
    expect(input).toBeDisabled();
    expect(screen.getByRole("button", { name: "Clear all" })).toBeDisabled();
  });
});
