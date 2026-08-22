import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CropSettings, ImageCropEditorLabels } from "../types/imageCrop";
import { createDefaultCropSettings } from "../utils/imageCropGeometry";
import { ImageCropEditor } from "./ImageCropEditor";

const labels: ImageCropEditorLabels = {
  canvas: "Crop preview",
  presets: "Preset shapes",
  rectangle: "Rectangle",
  circle: "Circle",
  heart: "Heart",
  star: "Star",
  polygon: "Polygon",
  freehand: "Freehand",
  zoom: "Zoom",
  undo: "Undo",
  reset: "Reset",
  closeShape: "Close shape",
  addPoint: "Add point",
  point: "Point",
  xCoordinate: "X coordinate",
  yCoordinate: "Y coordinate",
  resizeShape: "Resize shape",
};

let onChange: ReturnType<typeof vi.fn>;
let onValidationChange: ReturnType<typeof vi.fn>;
let onSourceStatusChange: ReturnType<typeof vi.fn>;

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
  globalCompositeOperation: "source-over",
};

function EditorHarness({ initial = createDefaultCropSettings() }: { initial?: CropSettings }): JSX.Element {
  const [value, setValue] = useState(initial);
  return (
    <ImageCropEditor
      sourceUrl="blob:sample"
      fileName="sample.png"
      value={value}
      onChange={(next) => {
        setValue(next);
        onChange(next);
      }}
      onValidationChange={onValidationChange}
      onSourceStatusChange={onSourceStatusChange}
      labels={labels}
    />
  );
}

function loadSource(width = 1200, height = 800): void {
  const image = screen.getByTestId("crop-source-image");
  Object.defineProperties(image, {
    naturalWidth: { configurable: true, value: width },
    naturalHeight: { configurable: true, value: height },
  });
  fireEvent.load(image);
}

beforeEach(() => {
  onChange = vi.fn();
  onValidationChange = vi.fn();
  onSourceStatusChange = vi.fn();
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
    canvasContext as unknown as CanvasRenderingContext2D
  );
});

describe("ImageCropEditor", () => {
  it("shows a named preview and changes to a transparent PNG circle", () => {
    render(<EditorHarness />);
    loadSource();

    fireEvent.click(screen.getByRole("button", { name: "Circle" }));

    expect(screen.getByRole("img", { name: "Crop preview" })).toBeInTheDocument();
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        shape: expect.objectContaining({ kind: "circle" }),
        format: "png",
      })
    );
  });

  it("moves the image with keyboard arrows and a larger shift step", () => {
    render(<EditorHarness />);
    loadSource();
    const canvas = screen.getByRole("img", { name: "Crop preview" });

    fireEvent.keyDown(canvas, { key: "ArrowRight" });
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ imageTransform: expect.objectContaining({ offsetX: 0.005 }) })
    );

    fireEvent.keyDown(canvas, { key: "ArrowDown", shiftKey: true });
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ imageTransform: expect.objectContaining({ offsetY: 0.025 }) })
    );
  });

  it("moves the image by normalized pointer distance", () => {
    render(<EditorHarness />);
    loadSource();
    const canvas = screen.getByRole("img", { name: "Crop preview" }) as HTMLCanvasElement;
    vi.spyOn(canvas, "getBoundingClientRect").mockReturnValue({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: 200,
      bottom: 200,
      width: 200,
      height: 200,
      toJSON: () => ({}),
    });

    fireEvent.pointerDown(canvas, { pointerId: 1, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(canvas, { pointerId: 1, clientX: 120, clientY: 110 });
    fireEvent.pointerUp(canvas, { pointerId: 1, clientX: 120, clientY: 110 });

    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ imageTransform: expect.objectContaining({ offsetX: 0.1, offsetY: 0.05 }) })
    );
  });

  it("shows the zoom value and emits a scale change", () => {
    render(<EditorHarness />);
    loadSource();

    fireEvent.change(screen.getByRole("slider", { name: "Zoom" }), { target: { value: "150" } });

    expect(screen.getByText("150%")).toBeInTheDocument();
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ imageTransform: expect.objectContaining({ scale: 1.5 }) })
    );
  });

  it("resizes a circle proportionally from a keyboard-operable handle", () => {
    render(<EditorHarness />);
    loadSource();
    fireEvent.click(screen.getByRole("button", { name: "Circle" }));

    fireEvent.keyDown(screen.getByRole("button", { name: "Resize shape southeast" }), {
      key: "ArrowRight",
    });

    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        shape: expect.objectContaining({
          kind: "circle",
          bounds: { x: 0.1, y: 0.1, width: 0.805, height: 0.805 },
        }),
      })
    );
  });

  it("announces source readiness and decode failure", () => {
    render(<EditorHarness />);
    loadSource();
    expect(onSourceStatusChange).toHaveBeenLastCalledWith("ready");

    fireEvent.error(screen.getByTestId("crop-source-image"));
    expect(onSourceStatusChange).toHaveBeenLastCalledWith("error");
  });
});
