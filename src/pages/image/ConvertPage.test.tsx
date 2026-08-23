import { fireEvent, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { ImageConvertPage } from "./ConvertPage";
import * as imageService from "../../services/image/imageService";
import type { FileProcessResult } from "../../types/tool";
import { renderWithProviders } from "../../test/renderWithProviders";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ImageConvertPage", () => {
  it("offers AVIF as an input and output format", () => {
    const { container } = renderWithProviders(<ImageConvertPage />);
    expect(screen.getByRole("option", { name: "AVIF" })).toBeInTheDocument();
    expect(container.querySelector('input[type="file"]')).toHaveAttribute("accept", expect.stringContaining("image/avif"));
  });
  it("enables processing only after an image is selected", () => {
    const { container } = renderWithProviders(<ImageConvertPage />);
    const action = screen.getByRole("button", { name: "Process" });
    expect(action).toBeDisabled();

    fireEvent.change(container.querySelector('input[type="file"]') as HTMLInputElement, {
      target: { files: [new File(["abc"], "sample.png", { type: "image/png" })] },
    });

    expect(action).toBeEnabled();
    expect(screen.queryByRole("button", { name: "Download" })).not.toBeInTheDocument();
  });

  it("compacts the upload controls after selecting one image", () => {
    const { container } = renderWithProviders(<ImageConvertPage />);

    fireEvent.change(container.querySelector('input[type="file"]') as HTMLInputElement, {
      target: { files: [new File(["abc"], "sample.png", { type: "image/png" })] },
    });

    expect(screen.getByLabelText("Replace file or click to select")).toBeInTheDocument();
    expect(screen.queryByText("1 file selected")).not.toBeInTheDocument();
    expect(screen.getByText("sample.png")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Clear all" })).toBeInTheDocument();
  });

  it("disables process button while conversion is in progress", async () => {
    const convertSpy = vi
      .spyOn(imageService, "convertImage")
      .mockImplementation(() => new Promise<FileProcessResult>(() => {}));

    const { container } = renderWithProviders(<ImageConvertPage />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["abc"], "sample.png", { type: "image/png" });
    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.change(screen.getByLabelText("Target format"), { target: { value: "png" } });
    fireEvent.click(screen.getByRole("button", { name: "Process" }));

    await waitFor(() => {
      const processingButton = screen.getByRole("button", { name: "Processing..." });
      expect(processingButton).toBeDisabled();
      expect(processingButton).toHaveAttribute("aria-busy", "true");
    });

    convertSpy.mockRestore();
  });

  it("shows error when conversion fails", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(imageService, "convertImage").mockRejectedValue(new Error("failure"));

    const { container } = renderWithProviders(<ImageConvertPage />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["abc"], "sample.png", { type: "image/png" });
    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.click(screen.getByRole("button", { name: "Process" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Unable to process this file.");
    });

    consoleError.mockRestore();
  });
});
