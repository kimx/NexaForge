import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import { LanguageProvider } from "../../context/LanguageContext";
import * as pageEditorService from "../../services/pdf/pageEditorService";
import * as pdfToolkit from "../../services/pdf/pdfToolkit";
import { PdfPageEditorPage } from "./PageEditorPage";

vi.mock("../../utils/download", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../utils/download")>()),
  downloadBlob: vi.fn(),
}));

function renderEditor(mode: "reorder" | "delete" | "extract"): ReturnType<typeof render> {
  return render(
    <MemoryRouter initialEntries={["/pdf/reorder-pages"]}>
      <LanguageProvider initialLocale="en">
        <PdfPageEditorPage mode={mode} />
      </LanguageProvider>
    </MemoryRouter>
  );
}

async function loadPdf(container: HTMLElement, pageCount = 3): Promise<File> {
  const file = new File(["%PDF-1.4"], "sample.pdf", { type: "application/pdf" });
  vi.spyOn(pdfToolkit, "loadPdfData").mockResolvedValueOnce({
    document: { getPageCount: () => pageCount } as never,
    bytes: new Uint8Array([37, 80, 68, 70]),
    encrypted: false,
  });
  fireEvent.change(container.querySelector('input[type="file"]') as HTMLInputElement, {
    target: { files: [file] },
  });
  await screen.findByRole("button", { name: "Page 1" });
  return file;
}

afterEach(() => vi.restoreAllMocks());

describe("PdfPageEditorPage", () => {
  it("reorders pages using the keyboard-accessible move controls", async () => {
    const { container } = renderEditor("reorder");
    await loadPdf(container);

    fireEvent.click(screen.getByRole("button", { name: "Move page 1 right" }));

    expect(
      screen.getAllByRole("button", { name: /^Page \d/ }).slice(0, 3).map((button) => button.getAttribute("aria-label"))
    ).toEqual(["Page 2", "Page 1", "Page 3"]);
  });

  it("marks pages for deletion, allows restoration, and prevents an empty export", async () => {
    const { container } = renderEditor("delete");
    await loadPdf(container, 1);

    fireEvent.click(screen.getByRole("checkbox", { name: "Select page 1 for deletion" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete selected" }));

    expect(screen.getByText("Marked for deletion")).toBeVisible();
    expect(screen.getByRole("alert")).toHaveTextContent("A PDF must contain at least one page.");
    expect(screen.getByRole("button", { name: "Export PDF" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Restore" }));
    expect(screen.queryByText("Marked for deletion")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Export PDF" })).toBeEnabled();
  });

  it("separates preview navigation from deletion selection and preserves marked pages on export", async () => {
    const exportSpy = vi.spyOn(pageEditorService, "exportPdfPages").mockResolvedValue({
      blob: new Blob(["pdf"], { type: "application/pdf" }),
      fileName: "pages-removed.pdf", mimeType: "application/pdf", size: 3,
    });
    const { container } = renderEditor("delete");
    const file = await loadPdf(container, 39);
    expect(screen.getByText("Page 1 / 39")).toBeVisible();
    expect(screen.getByRole("button", { name: "Page 1" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("checkbox", { name: "Select page 2 for deletion" }));
    for (const page of [2, 10, 39]) {
      fireEvent.click(screen.getByRole("button", { name: `Page ${page}` }));
      expect(screen.getByText(`Page ${page} / 39`)).toBeVisible();
      expect(screen.getByRole("checkbox", { name: "Select page 2 for deletion" })).toBeChecked();
      expect(screen.getByText("0 page(s) marked for deletion")).toBeVisible();
    }
    fireEvent.click(screen.getByRole("button", { name: "Delete selected" }));
    expect(screen.getByText("1 page(s) marked for deletion")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Page 2, Marked for deletion" }));
    expect(screen.getByText("Page 2 / 39")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Export PDF" }));
    await waitFor(() => expect(exportSpy).toHaveBeenCalledWith(new Uint8Array([37, 80, 68, 70]),
      expect.not.arrayContaining([expect.objectContaining({ originalIndex: 1 })]), "pages-removed.pdf"));
    fireEvent.click(screen.getByRole("button", { name: "Page 10" }));
    expect(screen.getByText("PDF created (0 KB).")).toBeVisible();
  });

  it("keeps select all and clear selection independent of the preview and resets on replacement", async () => {
    const { container } = renderEditor("delete");
    await loadPdf(container);
    fireEvent.click(screen.getByRole("button", { name: "Page 3" }));
    fireEvent.click(screen.getByRole("button", { name: "Select all" }));
    expect(screen.getAllByRole("checkbox").filter((input) => (input as HTMLInputElement).checked)).toHaveLength(3);
    fireEvent.click(screen.getByRole("button", { name: "Clear selection" }));
    expect(screen.getByText("Page 3 / 3")).toBeVisible();
    expect(screen.getByRole("button", { name: "Delete selected" })).toBeDisabled();
    await loadPdf(container, 2);
    expect(screen.getByText("Page 1 / 2")).toBeVisible();
    expect(screen.getByText("0 page(s) marked for deletion")).toBeVisible();
  });

  it("synchronizes valid page ranges with selection and exports selected pages only", async () => {
    const exportSpy = vi.spyOn(pageEditorService, "exportPdfPages").mockResolvedValue({
      blob: new Blob(["pdf"], { type: "application/pdf" }),
      fileName: "extracted-pages.pdf",
      mimeType: "application/pdf",
      size: 3,
    });
    const { container } = renderEditor("extract");
    const file = await loadPdf(container, 5);

    fireEvent.change(screen.getByRole("textbox", { name: "Pages to extract" }), {
      target: { value: "1-3,2-5" },
    });
    expect(screen.getByText("5 page(s) selected")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Export PDF" }));

    await waitFor(() => expect(exportSpy).toHaveBeenCalledWith(
      new Uint8Array([37, 80, 68, 70]),
      expect.objectContaining({ length: 5 }),
      "extracted-pages.pdf"
    ));
  });

  it("shows range validation feedback without changing the existing selection", async () => {
    const { container } = renderEditor("extract");
    await loadPdf(container, 3);

    fireEvent.change(screen.getByRole("textbox", { name: "Pages to extract" }), {
      target: { value: "1-2" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Pages to extract" }), {
      target: { value: "1000" },
    });

    expect(screen.getByRole("alert")).toHaveTextContent("Enter valid page numbers or ranges within this PDF.");
    expect(screen.getByText("2 page(s) selected")).toBeVisible();
  });
});
