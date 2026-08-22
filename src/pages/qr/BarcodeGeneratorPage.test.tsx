import { fireEvent, screen } from "@testing-library/react";
import { afterAll, beforeAll, afterEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../test/renderWithProviders";
import * as barcodeService from "../../services/qr/barcodeService";
import { BarcodeGeneratorPage } from "./BarcodeGeneratorPage";

const urlApi = globalThis.URL as typeof URL & {
  createObjectURL?: (blob: Blob) => string;
  revokeObjectURL?: (url: string) => void;
};
const originalCreateObjectURL = urlApi.createObjectURL;
const originalRevokeObjectURL = urlApi.revokeObjectURL;

beforeAll(() => {
  urlApi.createObjectURL = () => "blob:barcode";
  urlApi.revokeObjectURL = () => undefined;
});

afterAll(() => {
  if (originalCreateObjectURL) urlApi.createObjectURL = originalCreateObjectURL;
  else Reflect.deleteProperty(urlApi, "createObjectURL");
  if (originalRevokeObjectURL) urlApi.revokeObjectURL = originalRevokeObjectURL;
  else Reflect.deleteProperty(urlApi, "revokeObjectURL");
});

afterEach(() => vi.restoreAllMocks());

describe("BarcodeGeneratorPage", () => {
  it("generates EAN-13 output with PNG and SVG downloads", async () => {
    vi.spyOn(barcodeService, "generateBarcode").mockResolvedValue({
      value: "4006381333931",
      png: { blob: new Blob(["png"]), fileName: "ean.png", mimeType: "image/png", size: 3 },
      svg: { blob: new Blob(["svg"]), fileName: "ean.svg", mimeType: "image/svg+xml", size: 3 },
    });
    renderWithProviders(<BarcodeGeneratorPage />);

    fireEvent.change(screen.getByLabelText("Barcode format"), { target: { value: "ean13" } });
    fireEvent.change(screen.getByLabelText("Barcode value"), { target: { value: "400638133393" } });
    fireEvent.click(screen.getByRole("button", { name: "Generate barcode" }));

    expect(await screen.findByText("4006381333931")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Download PNG" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Download SVG" })).toBeEnabled();
  });
});
