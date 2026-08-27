import { fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QrPage } from "./QrPage";
import * as qrService from "../../services/qr/qrService";
import { renderWithProviders } from "../../test/renderWithProviders";

const urlApi = globalThis.URL as unknown as {
  createObjectURL?: (blob: Blob) => string;
  revokeObjectURL?: (url: string) => void;
};

const originalCreateObjectURL = urlApi.createObjectURL;
const originalRevokeObjectURL = urlApi.revokeObjectURL;

const designResult = {
  png: {
    blob: new Blob(["dummy-png"], { type: "image/png" }),
    fileName: "qr-code.png",
    mimeType: "image/png",
    size: 9,
  },
  svg: {
    blob: new Blob(["<svg/>"], { type: "image/svg+xml" }),
    fileName: "qr-code.svg",
    mimeType: "image/svg+xml",
    size: 6,
  },
};

describe("QrPage", () => {
  beforeEach(() => {
    window.localStorage.clear();
    urlApi.createObjectURL = vi.fn(() => "blob:qr-preview") as typeof urlApi.createObjectURL;
    urlApi.revokeObjectURL = vi.fn() as typeof urlApi.revokeObjectURL;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (originalCreateObjectURL) {
      urlApi.createObjectURL = originalCreateObjectURL;
    }
    if (originalRevokeObjectURL) {
      urlApi.revokeObjectURL = originalRevokeObjectURL;
    }
  });

  it("renders a preview and both download formats automatically", async () => {
    const generateSpy = vi.spyOn(qrService, "generateQrDesign").mockResolvedValue(designResult);

    renderWithProviders(<QrPage />);

    await waitFor(() => {
      expect(generateSpy).toHaveBeenCalledWith(
        "https://example.com",
        expect.objectContaining({ size: 256, errorCorrectionLevel: "M" })
      );
    });
    expect(screen.getByAltText("QR Code preview")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Download PNG" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Download SVG" })).toBeEnabled();
    expect(screen.queryByRole("button", { name: "Generate" })).not.toBeInTheDocument();
  });

  it("applies the LINE preset with high error correction", async () => {
    const generateSpy = vi.spyOn(qrService, "generateQrDesign").mockResolvedValue(designResult);

    renderWithProviders(<QrPage />);
    fireEvent.click(screen.getByRole("button", { name: "LINE" }));

    await waitFor(() => {
      expect(screen.getByLabelText("Error correction level")).toHaveValue("H");
      expect(screen.getByLabelText("Error correction level")).toBeDisabled();
      expect(generateSpy).toHaveBeenLastCalledWith(
        "https://example.com",
        expect.objectContaining({
          logoSource: "line",
          logoSize: 20,
          logoBackground: "circle",
          moduleStyle: "rounded",
          errorCorrectionLevel: "H",
        })
      );
    });
  });

  it("persists settings without a logo source or image", async () => {
    vi.spyOn(qrService, "generateQrDesign").mockResolvedValue(designResult);

    renderWithProviders(<QrPage />);
    fireEvent.click(screen.getByRole("radio", { name: "LINE icon" }));

    await waitFor(() => {
      const persisted = JSON.parse(window.localStorage.getItem("nexaforge-qr-designer-settings") ?? "{}");
      expect(persisted.logoSource).toBeUndefined();
      expect(persisted.logoDataUrl).toBeUndefined();
      expect(persisted.logoSize).toBe(20);
    });
  });
});
