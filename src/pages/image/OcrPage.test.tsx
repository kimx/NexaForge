import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OcrPage } from "./OcrPage";
import * as ocrService from "../../services/ocr/ocrService";
import { renderWithProviders } from "../../test/renderWithProviders";

afterEach(() => vi.restoreAllMocks());
const select = (container: HTMLElement, name = "receipt.png") => fireEvent.change(container.querySelector('input[type="file"]')!, {
  target: { files: [new File(["image"], name, { type: "image/png" })] },
});

describe("OcrPage", () => {
  it("discloses the first-run model download and requires an image", () => {
    renderWithProviders(<OcrPage />);
    expect(screen.getByRole("button", { name: "Recognize text" })).toBeDisabled();
    expect(screen.getByText(/First use downloads/)).toHaveTextContent(/image stays/);
    expect(screen.getByLabelText("Recognition language")).toHaveValue("chi_tra");
  });

  it("clears old text and download when the image is replaced", async () => {
    vi.spyOn(ocrService, "startOcr").mockReturnValue({ result: Promise.resolve({ text: "Hello OCR", confidence: 95 }), cancel: vi.fn() });
    const { container } = renderWithProviders(<OcrPage />);
    select(container);
    fireEvent.click(screen.getByRole("button", { name: "Recognize text" }));
    expect(await screen.findByDisplayValue("Hello OCR")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Download text" })).toBeEnabled();
    select(container, "other.png");
    expect(screen.queryByDisplayValue("Hello OCR")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Download text" })).not.toBeInTheDocument();
  });

  it("cancels recognition and ignores a late result", async () => {
    let resolve!: (value: ocrService.OcrResult) => void;
    const cancel = vi.fn();
    vi.spyOn(ocrService, "startOcr").mockReturnValue({ result: new Promise((done) => { resolve = done; }), cancel });
    const { container } = renderWithProviders(<OcrPage />);
    select(container);
    fireEvent.click(screen.getByRole("button", { name: "Recognize text" }));
    expect(screen.getByLabelText("Recognition language")).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await act(async () => resolve({ text: "stale", confidence: 90 }));
    expect(cancel).toHaveBeenCalledOnce();
    expect(screen.queryByDisplayValue("stale")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Recognize text" })).toBeEnabled();
  });

  it("terminates work when the page unmounts", () => {
    const cancel = vi.fn();
    vi.spyOn(ocrService, "startOcr").mockReturnValue({ result: new Promise(() => {}), cancel });
    const { container, unmount } = renderWithProviders(<OcrPage />);
    select(container);
    fireEvent.click(screen.getByRole("button", { name: "Recognize text" }));
    unmount();
    expect(cancel).toHaveBeenCalledOnce();
  });

  it("provides an actionable network error", async () => {
    vi.spyOn(ocrService, "startOcr").mockReturnValue({ result: Promise.reject(Object.assign(new Error("offline"), { code: "model" })), cancel: vi.fn() });
    const { container } = renderWithProviders(<OcrPage />);
    select(container);
    fireEvent.click(screen.getByRole("button", { name: "Recognize text" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/connection/));
  });
});
