import { fireEvent, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { renderWithProviders } from "../../test/renderWithProviders";
import * as markdownPdfService from "../../services/text/markdownPdfService";
import { MarkdownPreviewPage } from "./MarkdownPreviewPage";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("MarkdownPreviewPage PDF export", () => {
  it("offers a browser-local PDF export next to the rendered preview", () => {
    renderWithProviders(<MarkdownPreviewPage />);

    expect(screen.getByRole("article")).toHaveTextContent("Markdown Preview");
    expect(screen.getByRole("button", { name: "Export PDF" })).toBeEnabled();
  });

  it("labels the PDF export action in Traditional Chinese", () => {
    renderWithProviders(<MarkdownPreviewPage />, { locale: "zh-TW" });

    expect(screen.getByRole("button", { name: "匯出 PDF" })).toBeEnabled();
  });

  it("exports only the rendered preview and reports progress", async () => {
    let finishExport: (() => void) | undefined;
    const exportPromise = new Promise<void>((resolve) => {
      finishExport = resolve;
    });
    const exportSpy = vi
      .spyOn(markdownPdfService, "exportMarkdownPreviewToPdf")
      .mockReturnValue(exportPromise);
    renderWithProviders(<MarkdownPreviewPage />);

    fireEvent.click(screen.getByRole("button", { name: "Export PDF" }));

    const exportingButton = screen.getByRole("button", { name: "Creating PDF…" });
    expect(exportingButton).toBeDisabled();
    expect(exportSpy).toHaveBeenCalledWith(screen.getByRole("article"));

    finishExport?.();
    await waitFor(() => expect(screen.getByRole("button", { name: "Export PDF" })).toBeEnabled());
  });

  it("shows a clear error when local PDF generation fails", async () => {
    vi.spyOn(markdownPdfService, "exportMarkdownPreviewToPdf")
      .mockRejectedValue(new Error("canvas failed"));
    renderWithProviders(<MarkdownPreviewPage />);

    fireEvent.click(screen.getByRole("button", { name: "Export PDF" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Unable to export the PDF. Please try again."
    );
  });

  it("disables PDF export when the preview is empty", () => {
    renderWithProviders(<MarkdownPreviewPage />);

    fireEvent.click(screen.getByRole("button", { name: "Clear" }));

    expect(screen.getByRole("button", { name: "Export PDF" })).toBeDisabled();
  });
});
