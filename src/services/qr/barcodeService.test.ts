import { describe, expect, it } from "vitest";
import { generateBarcode } from "./barcodeService";

const renderer = {
  renderPng: async () => new Blob(["png-output"], { type: "image/png" }),
  renderSvg: async () => '<svg xmlns="http://www.w3.org/2000/svg"><path /></svg>',
};

describe("generateBarcode", () => {
  it("normalizes EAN-13 and returns deterministic PNG and SVG files", async () => {
    const result = await generateBarcode(
      "400-638-133-393",
      { format: "ean13", scale: 3 },
      renderer
    );

    expect(result.value).toBe("4006381333931");
    expect(result.png).toMatchObject({
      fileName: "ean13-4006381333931.png",
      mimeType: "image/png",
      size: 10,
    });
    expect(result.svg).toMatchObject({
      fileName: "ean13-4006381333931.svg",
      mimeType: "image/svg+xml",
    });
    expect(await result.svg.blob.text()).toContain("<svg");
  });

  it("preserves Code 128 text and sanitizes its output filename", async () => {
    const result = await generateBarcode(
      "ORDER / 42",
      { format: "code128", scale: 2 },
      renderer
    );

    expect(result.value).toBe("ORDER / 42");
    expect(result.png.fileName).toBe("code128-ORDER-42.png");
  });

  it("rejects blank Code 128 values and invalid scale", async () => {
    await expect(
      generateBarcode("   ", { format: "code128", scale: 2 }, renderer)
    ).rejects.toThrow("value is required");
    await expect(
      generateBarcode("123", { format: "code128", scale: 6 }, renderer)
    ).rejects.toThrow("between 1 and 5");
  });
});
