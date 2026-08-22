import { fireEvent, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { QrPage } from "./QrPage";
import * as qrService from "../../services/qr/qrService";
import { renderWithProviders } from "../../test/renderWithProviders";

const urlApi = globalThis.URL as unknown as {
  createObjectURL?: (blob: Blob) => string;
  revokeObjectURL?: (url: string) => void;
};

const originalCreateObjectURL = urlApi.createObjectURL;
const originalRevokeObjectURL = urlApi.revokeObjectURL;

afterEach(() => {
  vi.restoreAllMocks();
  if (originalCreateObjectURL) {
    urlApi.createObjectURL = originalCreateObjectURL;
  }
  if (originalRevokeObjectURL) {
    urlApi.revokeObjectURL = originalRevokeObjectURL;
  }
});

beforeEach(() => {
  urlApi.createObjectURL = vi.fn(() => "blob:qr-preview") as typeof urlApi.createObjectURL;
  urlApi.revokeObjectURL = vi.fn() as typeof urlApi.revokeObjectURL;
});

describe("QrPage", () => {
  it("disables generate button while generating", async () => {
    const generateSpy = vi
      .spyOn(qrService, "generateQrImage")
      .mockImplementation(() => new Promise(() => {}));

    renderWithProviders(<QrPage />);
    fireEvent.click(screen.getByRole("button", { name: "Generate" }));

    await waitFor(() => {
      const generatingButton = screen.getByRole("button", { name: "Generating..." });
      expect(generatingButton).toBeDisabled();
      expect(generatingButton).toHaveAttribute("aria-busy", "true");
    });

    generateSpy.mockRestore();
  });

  it("shows error when generation fails", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(qrService, "generateQrImage").mockRejectedValue(new Error("failure"));

    renderWithProviders(<QrPage />);
    fireEvent.click(screen.getByRole("button", { name: "Generate" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Unable to process this file.");
    });

    consoleError.mockRestore();
  });

  it("renders preview after successful generation", async () => {
    vi.spyOn(qrService, "generateQrImage").mockResolvedValue({
      blob: new Blob(["dummy-png"], { type: "image/png" }),
      fileName: "qr-code.png",
      mimeType: "image/png",
      size: 9,
    });

    renderWithProviders(<QrPage />);
    fireEvent.click(screen.getByRole("button", { name: "Generate" }));

    await waitFor(() => {
      expect(screen.getByAltText("QR Code preview")).toBeInTheDocument();
    });
  });
});
