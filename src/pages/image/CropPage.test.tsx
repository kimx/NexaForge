import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
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
  restore: vi.fn(),
  save: vi.fn(),
  stroke: vi.fn(),
  bezierCurveTo: vi.fn(),
  fillStyle: "",
  strokeStyle: "",
  lineWidth: 1,
};

function renderWithRouter(ui: ReactElement): ReturnType<typeof render> {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <LanguageProvider>{ui}</LanguageProvider>
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

function renderCropPageWithSelectedFile(): ReturnType<typeof render> {
  const rendered = renderWithRouter(<ImageCropPage />);
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
  it("shows a live editor after selecting an image", () => {
    renderCropPageWithSelectedFile();

    expect(screen.getByRole("img", { name: "Crop preview" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Crop image" })).toBeEnabled();
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
