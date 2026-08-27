import { describe, expect, it } from "vitest";
import { createQrSvg, LINE_ICON_DATA_URL } from "./qrService";
import type { QrDesignerOptions } from "../../types/tool";

const DEFAULT_OPTIONS: QrDesignerOptions = {
  size: 256,
  errorCorrectionLevel: "M",
  margin: 16,
  moduleStyle: "square",
  cornerOuterStyle: "square",
  cornerInnerStyle: "square",
  foregroundColor: "#000000",
  backgroundColor: "#ffffff",
  transparentBackground: false,
  cornerOuterColor: "#000000",
  cornerInnerColor: "#000000",
  gradient: "none",
  gradientStartColor: "#2563eb",
  gradientEndColor: "#7c3aed",
  gradientAngle: 45,
  logoSource: "none",
  logoSize: 20,
  logoBackground: "circle",
  logoPadding: 6,
  logoCornerRadius: 10,
};

describe("createQrSvg", () => {
  it("creates a vector QR code with independent styling options", () => {
    const svg = createQrSvg("https://example.com", {
      ...DEFAULT_OPTIONS,
      moduleStyle: "dots",
      cornerOuterStyle: "rounded",
      cornerInnerStyle: "dot",
      cornerOuterColor: "#123456",
      cornerInnerColor: "#654321",
      gradient: "linear",
    });

    expect(svg).toContain("<svg");
    expect(svg).toContain("<linearGradient");
    expect(svg).toContain('fill="#123456"');
    expect(svg).toContain('fill="#654321"');
    expect(svg).toContain("<circle");
  });

  it("omits the background rectangle and adds the LINE logo for transparent output", () => {
    const svg = createQrSvg("https://line.me/R/ti/p/@example", {
      ...DEFAULT_OPTIONS,
      transparentBackground: true,
      logoSource: "line",
      logoSize: 25,
    });

    expect(svg).not.toContain('<rect width="256" height="256" fill="#ffffff"/>');
    expect(svg).toContain(LINE_ICON_DATA_URL);
    expect(svg).toContain('r="32"');
  });
});
