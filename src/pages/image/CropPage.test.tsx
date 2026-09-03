import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactElement } from "react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../../context/LanguageContext";
import type { ImageCropResult } from "../../types/imageCrop";
import * as cropService from "../../services/image/cropService";
import { ImageCropPage } from "./CropPage";

type MutableUrlApi = typeof URL & {
  createObjectURL?: (blob: Blob) => string;
  revokeObjectURL?: (url: string) => void;
};

const urlApi = URL as MutableUrlApi;
const originalCreateObjectURL = urlApi.createObjectURL;
const originalRevokeObjectURL = urlApi.revokeObjectURL;
const canvasContext = {
  beginPath: vi.fn(),
  clearRect: vi.fn(),
  closePath: vi.fn(),
  drawImage: vi.fn(),
  ellipse: vi.fn(),
  fill: vi.fn(),
  fillRect: vi.fn(),
  lineTo: vi.fn(),
  moveTo: vi.fn(),
  rect: vi.fn(),
  rotate: vi.fn(),
  restore: vi.fn(),
  save: vi.fn(),
  scale: vi.fn(),
  stroke: vi.fn(),
  translate: vi.fn(),
  bezierCurveTo: vi.fn(),
  fillStyle: "",
  strokeStyle: "",
  lineWidth: 1,
};

function renderWithRouter(
  ui: ReactElement,
  locale: "en" | "zh-TW" = "en"
): ReturnType<typeof render> {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <LanguageProvider initialLocale={locale}>{ui}</LanguageProvider>
    </MemoryRouter>
  );
}

function selectFile(rendered: ReturnType<typeof render>, name = "sample.png"): void {
  const input = rendered.container.querySelector('input[type="file"]') as HTMLInputElement;
  fireEvent.change(input, {
    target: { files: [new File(["image"], name, { type: "image/png" })] },
  });
}

function loadCropSource(width = 1200, height = 800): void {
  const image = screen.getByTestId("crop-source-image");
  Object.defineProperties(image, {
    naturalWidth: { configurable: true, value: width },
    naturalHeight: { configurable: true, value: height },
  });
  fireEvent.load(image);
}

function renderCropPageWithSelectedFile(
  locale: "en" | "zh-TW" = "en"
): ReturnType<typeof render> {
  const rendered = renderWithRouter(<ImageCropPage />, locale);
  selectFile(rendered);
  loadCropSource();
  return rendered;
}

beforeEach(() => {
  window.localStorage.setItem("nexaforge-locale", "en");
  let sequence = 0;
  urlApi.createObjectURL = vi.fn(() => `blob:crop-${++sequence}`);
  urlApi.revokeObjectURL = vi.fn();
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
    canvasContext as unknown as CanvasRenderingContext2D
  );
});

afterEach(() => {
  cleanup();
  window.localStorage.removeItem("nexaforge-locale");
  urlApi.createObjectURL = originalCreateObjectURL;
  urlApi.revokeObjectURL = originalRevokeObjectURL;
  vi.restoreAllMocks();
});

describe("ImageCropPage", () => {
  it("keeps crop disabled until an image is decoded", () => {
    const rendered = renderWithRouter(<ImageCropPage />);
    const action = screen.getByRole("button", { name: "Crop image" });
    expect(action).toBeDisabled();

    selectFile(rendered);
    expect(action).toBeDisabled();
    loadCropSource();

    expect(action).toBeEnabled();
    expect(screen.queryByRole("button", { name: "Download" })).not.toBeInTheDocument();
  });

  it("shows a live editor after selecting an image", () => {
    renderCropPageWithSelectedFile();

    expect(screen.getByRole("img", { name: "Crop preview" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Crop image" })).toBeEnabled();
  });

  it("turns the selected-file dropzone into a concise replacement entry", () => {
    renderCropPageWithSelectedFile();

    expect(screen.getByLabelText("Replace image or click to select")).toBeInTheDocument();
    expect(screen.queryByText("Drag and drop or click to choose files.")).not.toBeInTheDocument();
  });

  it("keeps one compact file row without repeating the selection summary", () => {
    renderCropPageWithSelectedFile();

    expect(screen.queryByText(/1 file selected/)).not.toBeInTheDocument();
    const selectedFiles = screen.getByRole("list", { name: "Selected files" });
    expect(within(selectedFiles).getByText("sample.png")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Clear all" })).toBeEnabled();
  });

  it("keeps crop controls below the preview without a separate options panel", () => {
    renderCropPageWithSelectedFile();

    const workspace = screen.getByRole("heading", { name: "Tool Workspace", level: 2 }).closest("section");
    expect(workspace).not.toBeNull();
    expect(within(workspace as HTMLElement).getByRole("combobox", { name: "Format" })).toBeInTheDocument();
    expect(within(workspace as HTMLElement).getByRole("button", { name: "Crop image" })).toBeEnabled();
    expect(screen.queryByRole("heading", { name: "Options", level: 2 })).not.toBeInTheDocument();
  });

  it("groups output settings with the crop action", () => {
    renderCropPageWithSelectedFile();

    const outputControls = screen.getByRole("group", { name: "Output controls" });
    expect(within(outputControls).getByRole("combobox", { name: "Format" })).toBeInTheDocument();
    expect(within(outputControls).getByRole("button", { name: "Crop image" })).toBeEnabled();
  });

  it("shows rotate and flip controls for source transforms", () => {
    renderCropPageWithSelectedFile();

    expect(screen.getByRole("button", { name: "Rotate left 90°" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Rotate right 90°" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Flip horizontal" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Flip vertical" })).toBeInTheDocument();
  });

  it("keeps an instructional result visible before cropping", () => {
    renderCropPageWithSelectedFile();

    const result = screen.getByRole("heading", { name: "Result", level: 2 }).closest("section");
    expect(result).not.toBeNull();
    expect(within(result as HTMLElement).getByText(
      "Adjust the crop, then choose Crop image to preview the result."
    )).toBeInTheDocument();
  });

  it("offers crop shape choices before the interactive preview", () => {
    renderCropPageWithSelectedFile();

    const rectangle = screen.getByRole("button", { name: "Rectangle" });
    const preview = screen.getByRole("img", { name: "Crop preview" });
    expect(rectangle.compareDocumentPosition(preview) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("provides the crop workflow in Traditional Chinese", () => {
    renderCropPageWithSelectedFile("zh-TW");

    expect(screen.getByRole("heading", { name: "影像裁切", level: 1 })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "圓形" }));
    expect(screen.getByText("透明 PNG")).toBeInTheDocument();
  });

  it("disables processing and explains an invalid polygon", () => {
    renderCropPageWithSelectedFile();

    fireEvent.click(screen.getByRole("button", { name: "Polygon" }));

    expect(screen.getByRole("button", { name: "Crop image" })).toBeDisabled();
    expect(screen.getByText("Add at least 3 points")).toBeInTheDocument();
  });

  it("keeps the editor and disables duplicate submission while processing", async () => {
    vi.spyOn(cropService, "cropImage").mockImplementation(() => new Promise<ImageCropResult>(() => {}));
    renderCropPageWithSelectedFile();

    fireEvent.click(screen.getByRole("button", { name: "Crop image" }));

    expect(await screen.findByRole("button", { name: "Cropping..." })).toBeDisabled();
    expect(screen.getByRole("img", { name: "Crop preview" })).toBeInTheDocument();
  });

  it("preserves crop controls and offers retry after processing fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(cropService, "cropImage").mockRejectedValue(new Error("failure"));
    renderCropPageWithSelectedFile();

    fireEvent.click(screen.getByRole("button", { name: "Crop image" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Unable to crop this image");
    expect(screen.getByRole("img", { name: "Crop preview" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeEnabled();
  });

  it("keeps processing disabled and shows a recoverable decode error", () => {
    const rendered = renderWithRouter(<ImageCropPage />);
    selectFile(rendered, "bad.png");

    fireEvent.error(screen.getByTestId("crop-source-image"));

    expect(screen.getByRole("alert")).toHaveTextContent("Unable to decode this image");
    expect(screen.getByRole("button", { name: "Crop image" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Clear all" })).toBeEnabled();
  });

  it("shows the encoded result dimensions and enables download", async () => {
    const blob = new Blob(["cropped"], { type: "image/png" });
    vi.spyOn(cropService, "cropImage").mockResolvedValue({
      blob,
      fileName: "sample-cropped.png",
      mimeType: "image/png",
      size: blob.size,
      width: 400,
      height: 400,
    });
    renderCropPageWithSelectedFile();

    fireEvent.click(screen.getByRole("button", { name: "Crop image" }));

    expect(await screen.findByRole("img", { name: "Cropped image preview" })).toHaveAttribute(
      "src",
      "blob:crop-2"
    );
    expect(screen.getByText("400 × 400 px")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Download" })).toBeEnabled();
  });

  it("releases source and result URLs when the selection is cleared", async () => {
    const blob = new Blob(["cropped"], { type: "image/png" });
    vi.spyOn(cropService, "cropImage").mockResolvedValue({
      blob,
      fileName: "sample-cropped.png",
      mimeType: "image/png",
      size: blob.size,
      width: 400,
      height: 400,
    });
    renderCropPageWithSelectedFile();
    fireEvent.click(screen.getByRole("button", { name: "Crop image" }));
    await screen.findByRole("img", { name: "Cropped image preview" });

    fireEvent.click(screen.getByRole("button", { name: "Clear all" }));

    await waitFor(() => {
      expect(urlApi.revokeObjectURL).toHaveBeenCalledWith("blob:crop-1");
      expect(urlApi.revokeObjectURL).toHaveBeenCalledWith("blob:crop-2");
    });
  });
});
