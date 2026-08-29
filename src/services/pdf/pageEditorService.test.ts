import { PDFDocument } from "pdf-lib";
import { createPdfPageItems, exportPdfPages } from "./pageEditorService";

describe("PDF page editor service", () => {
  it("creates stable page items and exports only the supplied pages in their chosen order", async () => {
    const source = await PDFDocument.create();
    source.addPage();
    source.addPage();
    source.addPage();
    const file = new File([new Uint8Array(await source.save())], "source.pdf", {
      type: "application/pdf",
    });
    const pages = createPdfPageItems(3);

    const result = await exportPdfPages(file, [pages[2], pages[0]], "reordered.pdf");
    const output = await PDFDocument.load(await result.blob.arrayBuffer());

    expect(pages.map(({ id, originalIndex, rotation }) => [id, originalIndex, rotation])).toEqual([
      ["page-0", 0, 0],
      ["page-1", 1, 0],
      ["page-2", 2, 0],
    ]);
    expect(output.getPageCount()).toBe(2);
    expect(result.fileName).toBe("reordered.pdf");
  });

  it("refuses to create a zero-page PDF", async () => {
    const file = new File([""], "source.pdf", { type: "application/pdf" });

    await expect(exportPdfPages(file, [], "empty.pdf")).rejects.toThrow(
      "A PDF must contain at least one page."
    );
  });
});
