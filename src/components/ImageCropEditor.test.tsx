import { fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CropSettings, ImageCropEditorLabels } from "../types/imageCrop";
import { createDefaultCropSettings } from "../utils/imageCropGeometry";
import { ImageCropEditor } from "./ImageCropEditor";

const labels: ImageCropEditorLabels & {
  notEnoughPoints: string;
  closeShapeHint: string;
  selfIntersection: string;
  shapeTooSmall: string;
  outsideImage: string;
} = {
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
  notEnoughPoints: "Add at least 3 points",
  closeShapeHint: "Close the shape",
  selfIntersection: "Shape lines cannot cross",
  shapeTooSmall: "Shape is too small",
  outsideImage: "Shape must overlap the image",
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

function setStageRect(): HTMLCanvasElement {
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
  return canvas;
}

function addCanvasPoint(x: number, y: number): void {
  const canvas = setStageRect();
  fireEvent.pointerDown(canvas, { pointerId: 1, clientX: x * 200, clientY: y * 200 });
  fireEvent.pointerUp(canvas, { pointerId: 1, clientX: x * 200, clientY: y * 200 });
}

function drawFreehand(points: Array<[number, number]>): void {
  const canvas = setStageRect();
  const [first, ...rest] = points;
  fireEvent.pointerDown(canvas, { pointerId: 1, clientX: first[0], clientY: first[1] });
  rest.forEach(([clientX, clientY]) => {
    fireEvent.pointerMove(canvas, { pointerId: 1, clientX, clientY });
  });
  const last = points[points.length - 1];
  fireEvent.pointerUp(canvas, { pointerId: 1, clientX: last[0], clientY: last[1] });
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

  it("groups zoom and edit history as one compact adjustment control", () => {
    render(<EditorHarness />);
    loadSource();

    const adjustments = screen.getByRole("group", { name: "Zoom" });
    expect(within(adjustments).getByRole("slider", { name: "Zoom" })).toBeInTheDocument();
    expect(within(adjustments).getByRole("button", { name: "Undo" })).toBeInTheDocument();
    expect(within(adjustments).getByRole("button", { name: "Reset" })).toBeInTheDocument();
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

  it("keeps crop invalid until a three-point polygon is closed", () => {
    render(<EditorHarness />);
    loadSource();
    fireEvent.click(screen.getByRole("button", { name: "Polygon" }));

    addCanvasPoint(0.2, 0.2);
    addCanvasPoint(0.8, 0.2);
    expect(screen.getByText("Add at least 3 points")).toBeInTheDocument();

    addCanvasPoint(0.5, 0.8);
    expect(screen.getByText("Close the shape")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Close shape" }));

    expect(onValidationChange).toHaveBeenLastCalledWith({ valid: true });
  });

  it("turns a completed freehand gesture into editable coordinate rows", () => {
    render(<EditorHarness />);
    loadSource();
    fireEvent.click(screen.getByRole("button", { name: "Freehand" }));

    drawFreehand([
      [20, 20],
      [100, 20],
      [100, 100],
      [20, 100],
    ]);

    expect(screen.getAllByRole("group", { name: /Point \d+/ }).length).toBeGreaterThanOrEqual(3);
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ shape: expect.objectContaining({ kind: "freehand", closed: true }) })
    );
  });

  it("moves a focused node and deletes it with the keyboard", () => {
    render(
      <EditorHarness
        initial={{
          ...createDefaultCropSettings(),
          shape: {
            kind: "polygon",
            closed: true,
            points: [
              { x: 0.2, y: 0.2 },
              { x: 0.8, y: 0.2 },
              { x: 0.5, y: 0.8 },
            ],
          },
        }}
      />
    );
    loadSource();
    const firstNode = screen.getByRole("button", { name: "Point 1" });

    fireEvent.keyDown(firstNode, { key: "ArrowRight" });
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        shape: expect.objectContaining({ points: expect.arrayContaining([{ x: 0.205, y: 0.2 }]) }),
      })
    );

    fireEvent.keyDown(screen.getByRole("button", { name: "Point 1" }), { key: "Delete" });
    expect(screen.queryByRole("button", { name: "Point 3" })).not.toBeInTheDocument();
  });

  it("undoes the last edit and reset restores the centered rectangle", () => {
    render(<EditorHarness />);
    loadSource();
    fireEvent.click(screen.getByRole("button", { name: "Circle" }));
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));

    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ shape: expect.objectContaining({ kind: "rectangle" }) })
    );

    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(onChange).toHaveBeenLastCalledWith(createDefaultCropSettings());
  });
});
