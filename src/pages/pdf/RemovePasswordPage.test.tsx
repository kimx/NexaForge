import { fireEvent, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import * as downloadUtils from "../../utils/download";
import * as passwordService from "../../services/pdf/passwordService";
import type { PdfPasswordRemovalInfo } from "../../services/pdf/passwordService";
import type { FileProcessResult } from "../../types/tool";
import { renderWithProviders } from "../../test/renderWithProviders";
import { RemovePasswordPage } from "./RemovePasswordPage";

afterEach(() => vi.restoreAllMocks());

function selectPdf(file: File): void {
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  fireEvent.change(input, { target: { files: [file] } });
}

describe("RemovePasswordPage", () => {
  it("clearly reports an unencrypted PDF without offering to re-export it", async () => {
    const file = new File(["plain"], "plain.pdf", { type: "application/pdf" });
    const inspectSpy = vi.spyOn(passwordService, "inspectPdfForPasswordRemoval").mockResolvedValue({
      encrypted: false,
      pageCount: 2,
      firstPageWidth: 612,
      firstPageHeight: 792,
      firstPageIsLandscape: false,
    });

    renderWithProviders(<RemovePasswordPage />);
    selectPdf(file);

    expect(await screen.findByText(/This PDF is not encrypted/)).toBeInTheDocument();
    expect(screen.getByText("Pages")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Remove Password & Download" })).not.toBeInTheDocument();
    expect(inspectSpy).toHaveBeenCalledWith(file);
  });

  it("downloads an unlocked copy while preserving the selected original", async () => {
    const file = new File(["original encrypted content"], "report.pdf", {
      type: "application/pdf",
    });
    const unlockedBytes = new Uint8Array([37, 80, 68, 70, 45, 49]);
    const info: PdfPasswordRemovalInfo = {
      encrypted: true,
      pageCount: 3,
      firstPageWidth: 792,
      firstPageHeight: 612,
      firstPageIsLandscape: true,
      unlockedBytes,
    };
    const output: FileProcessResult = {
      blob: new Blob([unlockedBytes.slice().buffer], { type: "application/pdf" }),
      fileName: "report-unlocked.pdf",
      mimeType: "application/pdf",
      size: 6,
    };
    const createSpy = vi
      .spyOn(passwordService, "createUnlockedPdfResult")
      .mockReturnValue(output);
    vi.spyOn(passwordService, "inspectPdfForPasswordRemoval").mockResolvedValue(info);
    const downloadSpy = vi.spyOn(downloadUtils, "downloadBlob").mockImplementation(() => {});

    renderWithProviders(<RemovePasswordPage />);
    selectPdf(file);

    expect(await screen.findByText(/unlocked locally and ready to download/)).toBeInTheDocument();
    expect(screen.getByText("Landscape")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Remove Password & Download" }));

    await waitFor(() => expect(downloadSpy).toHaveBeenCalledWith(output.blob, "report-unlocked.pdf"));
    expect(createSpy).toHaveBeenCalledWith(file, unlockedBytes);
    expect(await screen.findByText("An unlocked PDF copy has been downloaded.")).toBeInTheDocument();
    expect(screen.getByText("report.pdf")).toBeInTheDocument();
  });
});
