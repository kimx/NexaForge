import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { ReactElement } from "react";
import { vi } from "vitest";
import { ImageCompressPage } from "./CompressPage";
import * as imageService from "../../services/image/imageService";
import type { FileProcessResult } from "../../types/tool";

afterEach(() => {
  vi.restoreAllMocks();
});

function renderWithRouter(ui: ReactElement): ReturnType<typeof render> {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      {ui}
    </MemoryRouter>
  );
}

describe("ImageCompressPage", () => {
  it("disables process button while compression is in progress", async () => {
    const compressSpy = vi
      .spyOn(imageService, "compressImage")
      .mockImplementation(() => new Promise<FileProcessResult>(() => {}));

    const { container } = renderWithRouter(<ImageCompressPage />);
    const input = container.querySelector("input[type=\"file\"]") as HTMLInputElement;
    const file = new File(["abc"], "sample.png", { type: "image/png" });
    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.click(screen.getByRole("button", { name: "Process" }));

    await waitFor(() => {
      const processingButton = screen.getByRole("button", { name: "Processing..." });
      expect(processingButton).toBeDisabled();
      expect(processingButton).toHaveAttribute("aria-busy", "true");
    });

    compressSpy.mockRestore();
  });

  it("shows error when compression fails", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(imageService, "compressImage").mockRejectedValue(new Error("failure"));

    const { container } = renderWithRouter(<ImageCompressPage />);
    const input = container.querySelector("input[type=\"file\"]") as HTMLInputElement;
    const file = new File(["abc"], "sample.png", { type: "image/png" });
    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.click(screen.getByRole("button", { name: "Process" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Unable to process this file.");
    });

    consoleError.mockRestore();
  });
});

