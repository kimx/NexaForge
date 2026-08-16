import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { ReactElement } from "react";
import { vi } from "vitest";
import { QrPage } from "./QrPage";
import * as qrService from "../../services/qr/qrService";

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

function renderWithRouter(ui: ReactElement): ReturnType<typeof render> {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      {ui}
    </MemoryRouter>
  );
}

describe("QrPage", () => {
  it("disables generate button while generating", async () => {
    const generateSpy = vi
      .spyOn(qrService, "generateQrImage")
      .mockImplementation(() => new Promise(() => {}));

    renderWithRouter(<QrPage />);
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

    renderWithRouter(<QrPage />);
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

    renderWithRouter(<QrPage />);
    fireEvent.click(screen.getByRole("button", { name: "Generate" }));

    await waitFor(() => {
      expect(screen.getByAltText("QR Code preview")).toBeInTheDocument();
    });
  });
});
