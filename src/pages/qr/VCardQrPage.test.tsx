import { fireEvent, screen } from "@testing-library/react";
import { afterAll, beforeAll, afterEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../test/renderWithProviders";
import * as qrService from "../../services/qr/qrService";
import { VCardQrPage } from "./VCardQrPage";

const urlApi = globalThis.URL as typeof URL & {
  createObjectURL?: (blob: Blob) => string;
  revokeObjectURL?: (url: string) => void;
};
const originalCreateObjectURL = urlApi.createObjectURL;
const originalRevokeObjectURL = urlApi.revokeObjectURL;

beforeAll(() => {
  urlApi.createObjectURL = () => "blob:vcard";
  urlApi.revokeObjectURL = () => undefined;
});

afterAll(() => {
  if (originalCreateObjectURL) urlApi.createObjectURL = originalCreateObjectURL;
  else Reflect.deleteProperty(urlApi, "createObjectURL");
  if (originalRevokeObjectURL) urlApi.revokeObjectURL = originalRevokeObjectURL;
  else Reflect.deleteProperty(urlApi, "revokeObjectURL");
});

afterEach(() => vi.restoreAllMocks());

describe("VCardQrPage", () => {
  it("builds a vCard payload and renders a downloadable QR code", async () => {
    vi.spyOn(qrService, "generateQrImage").mockResolvedValue({
      blob: new Blob(["png"], { type: "image/png" }),
      fileName: "vcard-qr.png",
      mimeType: "image/png",
      size: 3,
    });
    renderWithProviders(<VCardQrPage />);

    fireEvent.change(screen.getByLabelText("First name"), { target: { value: "Ada" } });
    fireEvent.change(screen.getByLabelText("Last name"), { target: { value: "Lovelace" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "ada@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Generate vCard QR code" }));

    expect(await screen.findByText(/BEGIN:VCARD/)).toBeInTheDocument();
    expect(screen.getByText(/EMAIL;TYPE=INTERNET:ada@example.com/)).toBeInTheDocument();
    expect(screen.getByAltText("vCard QR code preview")).toBeInTheDocument();
  });
});
