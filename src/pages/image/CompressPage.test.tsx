import { fireEvent, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { ImageCompressPage } from "./CompressPage";
import * as imageService from "../../services/image/imageService";
import type { FileProcessResult } from "../../types/tool";
import { renderWithProviders } from "../../test/renderWithProviders";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ImageCompressPage", () => {
  it("starts a PNG compression search page with PNG-specific controls", () => {
    const { container } = renderWithProviders(<ImageCompressPage />, {
      route: "/en/image/png-compress",
    });

    expect(screen.getByRole("heading", { level: 1, name: "Free Online PNG Image Compressor" })).toBeVisible();
    expect(screen.getByRole("combobox", { name: /Output format/i })).toHaveValue("png");
    expect(container.querySelector('input[type="file"]')).toHaveAttribute(
      "accept",
      "image/png,.png"
    );
  });

  it("enables processing only after an image is selected", () => {
    const { container } = renderWithProviders(<ImageCompressPage />);
    const action = screen.getByRole("button", { name: "Process" });
    expect(action).toBeDisabled();

    fireEvent.change(container.querySelector('input[type="file"]') as HTMLInputElement, {
      target: { files: [new File(["abc"], "sample.png", { type: "image/png" })] },
    });

    expect(action).toBeEnabled();
    expect(screen.queryByRole("button", { name: "Download" })).not.toBeInTheDocument();
  });

  it("disables process button while compression is in progress", async () => {
    const compressSpy = vi
      .spyOn(imageService, "compressImage")
      .mockImplementation(() => new Promise<FileProcessResult>(() => {}));

    const { container } = renderWithProviders(<ImageCompressPage />);
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

    const { container } = renderWithProviders(<ImageCompressPage />);
    const input = container.querySelector("input[type=\"file\"]") as HTMLInputElement;
    const file = new File(["abc"], "sample.png", { type: "image/png" });
    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.click(screen.getByRole("button", { name: "Process" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Unable to process this file.");
    });

    consoleError.mockRestore();
  });

  it("accepts multiple files and reports aggregate completion", async () => {
    vi.spyOn(imageService, "compressImage").mockImplementation(async (file) => ({ blob: new Blob(["ok"]), fileName: file.name, mimeType: "image/png", size: 2 }));
    const { container } = renderWithProviders(<ImageCompressPage />);
    fireEvent.change(container.querySelector('input[type="file"]') as HTMLInputElement, {
      target: { files: [new File(["a"], "a.png", { type: "image/png" }), new File(["b"], "b.png", { type: "image/png" })] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Process" }));
    expect(await screen.findByText("2 of 2 completed")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Download ZIP" })).toBeEnabled();
  });

  it("compacts the upload entry while retaining batch context", () => {
    const { container } = renderWithProviders(<ImageCompressPage />);
    fireEvent.change(container.querySelector('input[type="file"]') as HTMLInputElement, {
      target: {
        files: [
          new File(["a"], "a.png", { type: "image/png" }),
          new File(["b"], "b.png", { type: "image/png" }),
        ],
      },
    });

    expect(screen.getByLabelText("Add more files or click to select")).toBeInTheDocument();
    expect(screen.getByText(/2 files selected · Total size:/)).toBeInTheDocument();
    expect(screen.getByText("a.png")).toBeInTheDocument();
    expect(screen.getByText("b.png")).toBeInTheDocument();
  });

  it("keeps the download actions ahead of a collapsed single-image preview", async () => {
    vi.spyOn(imageService, "compressImage").mockResolvedValue({
      blob: new Blob(["compressed"], { type: "image/jpeg" }),
      fileName: "sample.jpg",
      mimeType: "image/jpeg",
      size: 10,
    });

    const { container } = renderWithProviders(<ImageCompressPage />);
    fireEvent.change(container.querySelector('input[type="file"]') as HTMLInputElement, {
      target: { files: [new File(["original"], "sample.png", { type: "image/png" })] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Process" }));

    const downloadZip = await screen.findByRole("button", { name: "Download ZIP" });
    const previewSummary = screen.getByText("Preview");
    const previewDisclosure = previewSummary.closest("details");

    expect(previewDisclosure).not.toHaveAttribute("open");
    expect(downloadZip.compareDocumentPosition(previewDisclosure as Node) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("validates custom target sizes and keeps the process action disabled", () => {
    const { container } = renderWithProviders(<ImageCompressPage />);
    fireEvent.click(screen.getByLabelText("Target-size mode"));
    fireEvent.change(screen.getByRole("combobox", { name: /Target size/i }), { target: { value: "custom" } });

    const customInput = screen.getByRole("spinbutton", { name: /Custom limit/i });
    expect(screen.getByRole("alert")).toHaveTextContent("Enter a number greater than 0.");
    expect(screen.getByRole("button", { name: "Process" })).toBeDisabled();

    fireEvent.change(customInput, { target: { value: "not-a-number" } });
    expect(screen.getByRole("alert")).toHaveTextContent("Enter a number greater than 0.");
    fireEvent.change(customInput, { target: { value: "-1" } });
    expect(screen.getByRole("alert")).toHaveTextContent("Enter a number greater than 0.");
    fireEvent.change(customInput, { target: { value: "25" } });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(container.querySelector('input[type="number"]')).toHaveValue(25);
  });

  it("shows target status and asks before resizing dimensions", async () => {
    vi.spyOn(imageService, "compressImageToTarget").mockResolvedValue({
      blob: new Blob(["over-limit"], { type: "image/jpeg" }),
      fileName: "sample.jpg",
      mimeType: "image/jpeg",
      size: 9,
      width: 100,
      height: 50,
      originalWidth: 100,
      originalHeight: 50,
      targetBytes: 8,
      targetStatus: "resize-available",
    });
    const { container } = renderWithProviders(<ImageCompressPage />);
    fireEvent.click(screen.getByLabelText("Target-size mode"));
    fireEvent.change(container.querySelector('input[type="file"]') as HTMLInputElement, {
      target: { files: [new File(["source"], "sample.png", { type: "image/png" })] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Process" }));

    expect(await screen.findByText("Can reduce dimensions")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reduce dimensions" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Keep current dimensions" }));
    expect(await screen.findByText("Target not met")).toBeInTheDocument();
    expect(screen.queryByText("Can reduce dimensions")).not.toBeInTheDocument();
  });

  it("keeps successful downloads available when one batch file fails", async () => {
    vi.spyOn(imageService, "compressImage").mockImplementation(async (file) => {
      if (file.name === "broken.png") {
        throw new Error("broken image");
      }
      return { blob: new Blob(["ok"]), fileName: "ok.jpg", mimeType: "image/jpeg", size: 2, width: 1, height: 1 };
    });
    const { container } = renderWithProviders(<ImageCompressPage />);
    fireEvent.change(container.querySelector('input[type="file"]') as HTMLInputElement, {
      target: { files: [new File(["a"], "ok.png", { type: "image/png" }), new File(["b"], "broken.png", { type: "image/png" })] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Process" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("1 file(s) failed");
    expect(screen.getByRole("button", { name: "Download ok.jpg" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Download ZIP" })).toBeEnabled();
  });

  it("cancels processing and ignores the late result", async () => {
    let signal: AbortSignal | undefined;
    let resolveProcessing: (result: FileProcessResult) => void = () => {};
    vi.spyOn(imageService, "compressImage").mockImplementation((_file, options) => new Promise((resolve) => {
      signal = options.signal;
      resolveProcessing = resolve;
    }));
    const { container } = renderWithProviders(<ImageCompressPage />);
    fireEvent.change(container.querySelector('input[type="file"]') as HTMLInputElement, {
      target: { files: [new File(["a"], "sample.png", { type: "image/png" })] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Process" }));
    fireEvent.click(await screen.findByRole("button", { name: "Cancel" }));

    expect(signal?.aborted).toBe(true);
    resolveProcessing({ blob: new Blob(["late"]), fileName: "late.jpg", mimeType: "image/jpeg", size: 4 });
    await waitFor(() => expect(screen.getByRole("button", { name: "Process" })).toBeEnabled());
    expect(screen.queryByRole("button", { name: "Download late.jpg" })).not.toBeInTheDocument();
  });
});
