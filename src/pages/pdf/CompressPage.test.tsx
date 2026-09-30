import { act, fireEvent, screen } from "@testing-library/react";
import { renderWithProviders } from "../../test/renderWithProviders";
import * as service from "../../services/pdf/compressService";
import { PdfToolkitError } from "../../services/pdf/pdfToolkit";
import { PdfCompressPage } from "./CompressPage";

const output: service.PdfCompressionResult = { blob: new Blob(["pdf"]), fileName: "report.pdf", mimeType: "application/pdf", size: 3, originalSize: 3, attemptedSize: 5, status: "original-kept", mode: "preserve-text" };

function select(container: HTMLElement, name = "report.pdf") {
  fireEvent.change(container.querySelector('input[type="file"]')!, { target: { files: [new File(["%PDF"], name, { type: "application/pdf" })] } });
}
afterEach(() => vi.restoreAllMocks());

describe("PdfCompressPage", () => {
  it("explains keeping the original and invalidates downloads on every option or source change", async () => {
    vi.spyOn(service, "compressPdf").mockResolvedValue(output);
    const { container } = renderWithProviders(<PdfCompressPage />, { route: "/en/pdf/compress" });
    select(container);
    fireEvent.click(screen.getByRole("button", { name: "Compress PDF" }));
    expect(await screen.findByText(/No smaller file was produced/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Download original PDF" })).toBeEnabled();
    fireEvent.change(screen.getByLabelText("Compression mode"), { target: { value: "raster" } });
    expect(screen.queryByRole("button", { name: "Download original PDF" })).not.toBeInTheDocument();
    expect(screen.getByText(/removes selectable text, search, links, forms and digital signatures/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Compress PDF" }));
    await screen.findByRole("button", { name: "Download original PDF" });
    select(container, "other.pdf");
    expect(screen.queryByRole("button", { name: "Download original PDF" })).not.toBeInTheDocument();
  });

  it("allows cancellation without accepting a late result", async () => {
    let resolve!: (result: service.PdfCompressionResult) => void;
    let signal!: AbortSignal;
    vi.spyOn(service, "compressPdf").mockImplementation((_file, options) => { signal = options.signal!; return new Promise((done) => { resolve = done; }); });
    const { container } = renderWithProviders(<PdfCompressPage />);
    select(container);
    fireEvent.click(screen.getByRole("button", { name: "Compress PDF" }));
    expect(container.querySelector('input[type="file"]')).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(signal.aborted).toBe(true);
    await act(async () => resolve(output));
    expect(screen.queryByRole("button", { name: "Download original PDF" })).not.toBeInTheDocument();
    expect(screen.getByText("Compression cancelled. You can try again.")).toBeInTheDocument();
  });

  it("aborts pending work on unmount", () => {
    let signal!: AbortSignal;
    vi.spyOn(service, "compressPdf").mockImplementation((_file, options) => { signal = options.signal!; return new Promise(() => {}); });
    const { container, unmount } = renderWithProviders(<PdfCompressPage />);
    select(container);
    fireEvent.click(screen.getByRole("button", { name: "Compress PDF" }));
    unmount();
    expect(signal.aborted).toBe(true);
  });

  it("gives an actionable encrypted-document error", async () => {
    vi.spyOn(service, "compressPdf").mockRejectedValue(new PdfToolkitError("encrypted-pdf", "encrypted"));
    const { container } = renderWithProviders(<PdfCompressPage />);
    select(container);
    fireEvent.click(screen.getByRole("button", { name: "Compress PDF" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/password-protected.*unlocked copy/i);
  });

  it("localizes the mode controls and raster warning in Traditional Chinese", () => {
    renderWithProviders(<PdfCompressPage />, { locale: "zh-TW", route: "/pdf/compress" });
    fireEvent.change(screen.getByLabelText("壓縮模式"), { target: { value: "raster" } });
    expect(screen.getByLabelText("JPEG 品質")).toBeInTheDocument();
    expect(screen.getByText(/JPEG 模式會移除可選取文字、搜尋、連結、表單及數位簽章/)).toBeInTheDocument();
  });
});
