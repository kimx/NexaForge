import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StrictMode } from "react";
import { MemoryRouter } from "react-router-dom";
import { renderWithProviders } from "../../test/renderWithProviders";
import { LanguageProvider } from "../../context/LanguageContext";
import * as readerService from "../../services/qr/qrReaderService";
import { QrReaderPage } from "./QrReaderPage";

afterEach(() => vi.restoreAllMocks());

describe("QrReaderPage", () => {
  it("reads an uploaded QR image and exposes its decoded text", async () => {
    vi.spyOn(readerService, "readQrFromImage").mockResolvedValue({
      text: "https://example.com/docs",
      format: "QR_CODE",
    });
    renderWithProviders(<QrReaderPage />);

    fireEvent.change(screen.getByLabelText(/Drop a QR code image here/), {
      target: { files: [new File(["qr"], "qr.png", { type: "image/png" })] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Read QR code" }));

    expect(await screen.findByText("https://example.com/docs")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy decoded text" })).toBeEnabled();
  });

  it("stops an active camera session when the page unmounts", async () => {
    let stopped = false;
    vi.spyOn(readerService, "startQrCamera").mockResolvedValue({
      stop: () => { stopped = true; },
    });
    const view = renderWithProviders(<QrReaderPage />);

    fireEvent.click(screen.getByRole("button", { name: "Start camera" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Stop camera" })).toBeEnabled());
    view.unmount();

    expect(stopped).toBe(true);
  });

  it("accepts camera results after the React Strict Mode effect replay", async () => {
    let onDecoded: ((result: { text: string; format: string }) => void) | undefined;
    vi.spyOn(readerService, "startQrCamera").mockImplementation(async (_video, callback) => {
      onDecoded = callback;
      return { stop: () => undefined };
    });
    render(
      <StrictMode>
        <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <LanguageProvider initialLocale="en"><QrReaderPage /></LanguageProvider>
        </MemoryRouter>
      </StrictMode>
    );

    fireEvent.click(screen.getByRole("button", { name: "Start camera" }));
    await waitFor(() => expect(onDecoded).toBeTypeOf("function"));
    await act(async () => {
      onDecoded?.({ text: "strict-mode-result", format: "QR_CODE" });
    });

    expect(await screen.findByText("strict-mode-result")).toBeInTheDocument();
  });
});
