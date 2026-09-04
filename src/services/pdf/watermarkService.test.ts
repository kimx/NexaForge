import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import {
  addWatermarkToPdf,
  validatePdfWatermarkOptions,
} from "./watermarkService";

const ONE_PIXEL_PNG = Uint8Array.from(Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64"
));

async function createPdfFile(): Promise<File> {
  const document = await PDFDocument.create();
  document.addPage([600, 400]);
  document.addPage([400, 700]);
  document.addPage([800, 500]);
  return new File([new Uint8Array(await document.save())], "source.pdf", {
    type: "application/pdf",
  });
}

describe("PDF watermark service", () => {
  it("adds text only to the selected pages and keeps mixed page sizes", async () => {
    const result = await addWatermarkToPdf(await createPdfFile(), {
      mode: "text",
      text: "Confidential",
      fontSize: 28,
      color: "#0f4c81",
      opacity: 0.45,
      rotation: -18,
      position: "top-right",
      pageRanges: "1,3",
    });
    const output = await PDFDocument.load(await result.blob.arrayBuffer());

    expect(output.getPageCount()).toBe(3);
    expect(output.getPage(0).getWidth()).toBe(600);
    expect(output.getPage(1).getHeight()).toBe(700);
    expect(result.fileName).toBe("watermarked.pdf");
    expect(result.mimeType).toBe("application/pdf");
  });

  it("embeds a PNG watermark and supports the center position", async () => {
    const image = new File([ONE_PIXEL_PNG], "logo.png", { type: "image/png" });
    const result = await addWatermarkToPdf(await createPdfFile(), {
      mode: "image",
      image,
      scale: 0.2,
      opacity: 0.6,
      rotation: 90,
      position: "center",
      margin: 12,
    });
    const output = await PDFDocument.load(await result.blob.arrayBuffer());

    expect(output.getPageCount()).toBe(3);
    expect(result.size).toBeGreaterThan(0);
  });

  it("reports invalid text, image, range, and color settings", () => {
    expect(validatePdfWatermarkOptions({ mode: "text" })).toEqual([
      "Watermark text is required.",
    ]);
    expect(validatePdfWatermarkOptions({
      mode: "text",
      text: "Signed",
      color: "not-a-color",
    })[0]).toContain("valid hexadecimal");
    expect(validatePdfWatermarkOptions({
      mode: "image",
      scale: 0,
    })[0]).toContain("watermark image");
  });

  it("rejects page ranges outside the document", async () => {
    await expect(addWatermarkToPdf(await createPdfFile(), {
      text: "Draft",
      pageRanges: "4",
    })).rejects.toThrow("out of range");
  });
});
