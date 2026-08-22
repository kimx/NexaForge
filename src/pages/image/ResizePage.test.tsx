import { fireEvent, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { ImageResizePage } from "./ResizePage";
import * as imageService from "../../services/image/imageService";
import type { FileProcessResult } from "../../types/tool";
import { renderWithProviders } from "../../test/renderWithProviders";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ImageResizePage", () => {
  it("enables processing only after an image is selected", () => {
    const { container } = renderWithProviders(<ImageResizePage />);
    const action = screen.getByRole("button", { name: "Process" });
    expect(action).toBeDisabled();

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, {
      target: { files: [new File(["abc"], "sample.png", { type: "image/png" })] },
    });

    expect(action).toBeEnabled();
    expect(screen.queryByRole("button", { name: "Download" })).not.toBeInTheDocument();
  });

  it("disables process button while resize is in progress", async () => {
    const resizeSpy = vi
      .spyOn(imageService, "resizeImage")
      .mockImplementation(() => new Promise<FileProcessResult>(() => {}));

    const { container } = renderWithProviders(<ImageResizePage />);
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

    const { container } = renderWithProviders(<ImageResizePage />);
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

  it("processes multiple files in order and keeps partial failures", async () => {
    vi.spyOn(imageService, "resizeImage").mockImplementation(async (file) => {
      if (file.name === "bad.png") throw new Error("broken image");
      return { blob: new Blob(["ok"]), fileName: "good-small.png", mimeType: "image/png", size: 2 };
    });
    const { container } = renderWithProviders(<ImageResizePage />);
    fireEvent.change(container.querySelector('input[type="file"]') as HTMLInputElement, {
      target: { files: [new File(["a"], "good.png", { type: "image/png" }), new File(["b"], "bad.png", { type: "image/png" })] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Process" }));

    expect(await screen.findByText("2 of 2 completed")).toBeInTheDocument();
    expect(screen.getByText("broken image")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Download ZIP" })).toBeEnabled();
  });
});
