import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { ReactElement } from "react";
import { vi } from "vitest";
import { ImageResizePage } from "./ResizePage";
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

describe("ImageResizePage", () => {
  it("disables process button while resize is in progress", async () => {
    const resizeSpy = vi
      .spyOn(imageService, "resizeImage")
      .mockImplementation(() => new Promise<FileProcessResult>(() => {}));

    const { container } = renderWithRouter(<ImageResizePage />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["abc"], "sample.png", { type: "image/png" });
    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.change(screen.getByLabelText("Width"), { target: { value: "100" } });
    fireEvent.change(screen.getByLabelText("Height"), { target: { value: "100" } });
    fireEvent.click(screen.getByRole("button", { name: "Process" }));

    await waitFor(() => {
      const processingButton = screen.getByRole("button", { name: "Processing..." });
      expect(processingButton).toBeDisabled();
      expect(processingButton).toHaveAttribute("aria-busy", "true");
    });

    resizeSpy.mockRestore();
  });

  it("shows error when resize fails", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(imageService, "resizeImage").mockRejectedValue(new Error("failure"));

    const { container } = renderWithRouter(<ImageResizePage />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["abc"], "sample.png", { type: "image/png" });
    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.change(screen.getByLabelText("Width"), { target: { value: "100" } });
    fireEvent.change(screen.getByLabelText("Height"), { target: { value: "100" } });
    fireEvent.click(screen.getByRole("button", { name: "Process" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Unable to process this file.");
    });

    consoleError.mockRestore();
  });
});

