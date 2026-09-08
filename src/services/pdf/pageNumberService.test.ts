import { PDFDocument } from "pdf-lib";
import {
  addPageNumbersToPdf,
  formatPageNumber,
  parsePdfColor,
} from "./pageNumberService";

describe("PDF page number service", () => {
  it("formats all supported page number patterns", () => {
    expect(formatPageNumber("{n}", 4, 12)).toBe("4");
    expect(formatPageNumber("Page {n}", 4, 12)).toBe("Page 4");
    expect(formatPageNumber("{n} / {total}", 4, 12)).toBe("4 / 12");
    expect(formatPageNumber("Page {n} of {total}", 4, 12)).toBe("Page 4 of 12");
  });

  it("parses short and full hexadecimal colors", () => {
    expect(parsePdfColor("#123456")).toEqual({ type: "RGB", red: 0x12 / 255, green: 0x34 / 255, blue: 0x56 / 255 });
    expect(parsePdfColor("#abc")).toEqual({ type: "RGB", red: 0xaa / 255, green: 0xbb / 255, blue: 0xcc / 255 });
    expect(() => parsePdfColor("not-a-color")).toThrow();
  });

  it("numbers selected pages without changing the page count", async () => {
    const source = await PDFDocument.create();
    source.addPage([600, 400]);
    source.addPage([400, 700]);
    source.addPage([800, 500]);
    const file = new File([new Uint8Array(await source.save())], "source.pdf", {
      type: "application/pdf",
    });

    const result = await addPageNumbersToPdf(file, {
      position: "top-right",
      startingNumber: 0,
      pageRanges: "1,3",
      format: "Page {n} of {total}",
      fontSize: 14,
      color: "#0f4c81",
      margin: 18,
    });
    const output = await PDFDocument.load(await result.blob.arrayBuffer());

    expect(output.getPageCount()).toBe(3);
    expect(result.fileName).toBe("numbered.pdf");
    expect(result.mimeType).toBe("application/pdf");
  });

  it("rejects invalid starting numbers and ranges", async () => {
    const source = await PDFDocument.create();
    source.addPage();
    const file = new File([new Uint8Array(await source.save())], "source.pdf", {
      type: "application/pdf",
    });

    await expect(addPageNumbersToPdf(file, { startingNumber: -1 })).rejects.toThrow(
      "starting page number"
    );
    await expect(addPageNumbersToPdf(file, { pageRanges: "2" })).rejects.toThrow(
      "out of range"
    );
  });
});
