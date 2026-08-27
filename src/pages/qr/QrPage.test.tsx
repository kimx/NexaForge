import { fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QrPage } from "./QrPage";
import * as qrService from "../../services/qr/qrService";
import * as qrReaderService from "../../services/qr/qrReaderService";
import { renderWithProviders } from "../../test/renderWithProviders";

const urlApi = globalThis.URL as unknown as {
  createObjectURL?: (blob: Blob) => string;
  revokeObjectURL?: (url: string) => void;
};

const originalCreateObjectURL = urlApi.createObjectURL;
const originalRevokeObjectURL = urlApi.revokeObjectURL;
const originalClipboard = Object.getOwnPropertyDescriptor(navigator, "clipboard");

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
    window.history.replaceState({}, "", "/");
    urlApi.createObjectURL = vi.fn(() => "blob:qr-preview") as typeof urlApi.createObjectURL;
    urlApi.revokeObjectURL = vi.fn() as typeof urlApi.revokeObjectURL;
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn() },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (originalCreateObjectURL) {
      urlApi.createObjectURL = originalCreateObjectURL;
    }
    if (originalRevokeObjectURL) {
      urlApi.revokeObjectURL = originalRevokeObjectURL;
    }
    if (originalClipboard) {
      Object.defineProperty(navigator, "clipboard", originalClipboard);
    } else {
      Reflect.deleteProperty(navigator, "clipboard");
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
    expect(screen.getByText("The content you enter is processed only in your browser and is never sent to a server.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "QR Code Reader" })).toHaveAttribute("href", "/en/qr-code/reader");
    expect(screen.getByRole("link", { name: "Wi-Fi QR Generator" })).toHaveAttribute("href", "/en/qr-code/wifi");
    expect(screen.getByRole("link", { name: "vCard QR Generator" })).toHaveAttribute("href", "/en/qr-code/vcard");
    expect(screen.getByRole("link", { name: "Code128 / EAN-13 Barcode Generator" })).toHaveAttribute("href", "/en/barcode/generator");
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

  it("builds a Wi-Fi payload live and checks it with the shared reader", async () => {
      const generateSpy = vi.spyOn(qrService, "generateQrDesign").mockResolvedValue(designResult);
      const readSpy = vi.spyOn(qrReaderService, "readQrFromImage").mockResolvedValue({
        text: "WIFI:T:WPA;S:Cafe;P:private;H:false;;",
        format: "QR_CODE",
      });

      renderWithProviders(<QrPage />);
      fireEvent.change(screen.getByLabelText("Content type"), { target: { value: "wifi" } });
      fireEvent.change(screen.getByLabelText("SSID"), { target: { value: "Cafe" } });
      fireEvent.change(screen.getByLabelText("Password"), { target: { value: "private" } });

      await waitFor(() => {
        expect(generateSpy).toHaveBeenLastCalledWith(
          "WIFI:T:WPA;S:Cafe;P:private;H:false;;",
          expect.anything()
        );
      });
      fireEvent.click(screen.getByRole("button", { name: "Scan test" }));
      await waitFor(() => expect(readSpy).toHaveBeenCalledWith(designResult.png.blob));
      expect(screen.getByText("✓ QR code can be decoded")).toBeInTheDocument();
  });

  it("auto-selects LINE icon when content type is Line", async () => {
    vi.spyOn(qrService, "generateQrDesign").mockResolvedValue(designResult);

    renderWithProviders(<QrPage />);
    fireEvent.change(screen.getByLabelText("Content type"), { target: { value: "line" } });

    await waitFor(() => {
      expect(screen.getByRole("radio", { name: "LINE icon" })).toBeChecked();
      expect(screen.getByLabelText("Error correction level")).toHaveValue("H");
      expect(screen.getByLabelText("Error correction level")).toBeDisabled();
    });
  });

  it("restores the previous logo and error correction settings after leaving Line content type", async () => {
    vi.spyOn(qrService, "generateQrDesign").mockResolvedValue(designResult);

    renderWithProviders(<QrPage />);
    fireEvent.change(screen.getByLabelText("Error correction level"), { target: { value: "Q" } });
    fireEvent.click(screen.getByRole("radio", { name: "Upload custom image" }));

    fireEvent.change(screen.getByLabelText("Content type"), { target: { value: "line" } });
    await waitFor(() => {
      expect(screen.getByRole("radio", { name: "LINE icon" })).toBeChecked();
      expect(screen.getByLabelText("Error correction level")).toHaveValue("H");
      expect(screen.getByLabelText("Error correction level")).toBeDisabled();
    });

    fireEvent.change(screen.getByLabelText("Content type"), { target: { value: "url" } });
    await waitFor(() => {
      expect(screen.getByRole("radio", { name: "Upload custom image" })).toBeChecked();
      expect(screen.getByLabelText("Error correction level")).toHaveValue("Q");
      expect(screen.getByLabelText("Error correction level")).toBeEnabled();
    });
  });

  it("copies a share link containing settings but not QR content", async () => {
      vi.spyOn(qrService, "generateQrDesign").mockResolvedValue(designResult);
      const writeText = vi.mocked(navigator.clipboard.writeText);

      renderWithProviders(<QrPage />);
      await screen.findByAltText("QR Code preview");
      fireEvent.click(screen.getByRole("button", { name: "Copy settings link" }));

      await waitFor(() => expect(writeText).toHaveBeenCalledOnce());
      expect(writeText.mock.calls[0][0]).toContain("style=square");
      expect(writeText.mock.calls[0][0]).not.toContain("https%3A%2F%2Fexample.com");
  });

  it("loads non-sensitive designer settings from the URL", async () => {
      window.history.replaceState({}, "", "/qr-code?style=rounded&color=2563eb&size=512&margin=24");
      const generateSpy = vi.spyOn(qrService, "generateQrDesign").mockResolvedValue(designResult);

      renderWithProviders(<QrPage />);

      await waitFor(() => expect(generateSpy).toHaveBeenCalledWith(
        "https://example.com",
        expect.objectContaining({
          moduleStyle: "rounded",
          foregroundColor: "#2563eb",
          size: 512,
          margin: 24,
        })
      ));
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
