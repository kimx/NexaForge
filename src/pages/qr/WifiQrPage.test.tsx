import { fireEvent, screen } from "@testing-library/react";
import { afterAll, beforeAll, afterEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../test/renderWithProviders";
import * as qrService from "../../services/qr/qrService";
import { WifiQrPage } from "./WifiQrPage";

const urlApi = globalThis.URL as typeof URL & {
  createObjectURL?: (blob: Blob) => string;
  revokeObjectURL?: (url: string) => void;
};
const originalCreateObjectURL = urlApi.createObjectURL;
const originalRevokeObjectURL = urlApi.revokeObjectURL;

beforeAll(() => {
  urlApi.createObjectURL = () => "blob:wifi";
  urlApi.revokeObjectURL = () => undefined;
});

afterAll(() => {
  if (originalCreateObjectURL) urlApi.createObjectURL = originalCreateObjectURL;
  else Reflect.deleteProperty(urlApi, "createObjectURL");
  if (originalRevokeObjectURL) urlApi.revokeObjectURL = originalRevokeObjectURL;
  else Reflect.deleteProperty(urlApi, "revokeObjectURL");
});

afterEach(() => vi.restoreAllMocks());

describe("WifiQrPage", () => {
  it("uses the shared designer for an escaped live Wi-Fi QR preview", async () => {
    vi.spyOn(qrService, "generateQrDesign").mockResolvedValue({
      png: {
        blob: new Blob(["png"], { type: "image/png" }),
        fileName: "wifi-qr.png",
        mimeType: "image/png",
        size: 3,
      },
      svg: {
        blob: new Blob(["<svg/>"], { type: "image/svg+xml" }),
        fileName: "wifi-qr.svg",
        mimeType: "image/svg+xml",
        size: 6,
      },
    });
    renderWithProviders(<WifiQrPage />);

    fireEvent.change(screen.getByLabelText("SSID"), { target: { value: "Cafe;5G" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "private" } });

    expect(await screen.findByText("WIFI:T:WPA;S:Cafe\\;5G;P:private;H:false;;")).toBeInTheDocument();
    expect(screen.getByAltText("QR Code preview")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Download SVG" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Copy image" })).toBeEnabled();
  });
});
