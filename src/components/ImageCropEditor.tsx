import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent } from "react";
import type {
  CropBounds,
  CropSettings,
  CropShapeKind,
  ImageCropEditorLabels,
} from "../types/imageCrop";
import {
  createDefaultCropSettings,
  getImageStageBounds,
  traceCropPath,
  validateCropShape,
} from "../utils/imageCropGeometry";

export interface ImageCropEditorProps {
  sourceUrl: string;
  fileName: string;
  value: CropSettings;
  onChange: (next: CropSettings) => void;
  onValidationChange: (validation: ReturnType<typeof validateCropShape>) => void;
  onSourceStatusChange: (status: "loading" | "ready" | "error") => void;
  labels: ImageCropEditorLabels;
}

type ResizeDirection = "north" | "northeast" | "east" | "southeast" | "south" | "southwest" | "west" | "northwest";

const PRESET_KINDS: CropShapeKind[] = ["rectangle", "circle", "heart", "star"];
const ALL_KINDS: CropShapeKind[] = [...PRESET_KINDS, "polygon", "freehand"];
const HANDLE_DIRECTIONS: ResizeDirection[] = [
  "north",
  "northeast",
  "east",
  "southeast",
  "south",
  "southwest",
  "west",
  "northwest",
];

function stable(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function moveBoundsEdge(bounds: CropBounds, direction: ResizeDirection, dx: number, dy: number): CropBounds {
  let { x, y, width, height } = bounds;
  if (direction.includes("east")) width += dx;
  if (direction.includes("south")) height += dy;
  if (direction.includes("west")) {
    x += dx;
    width -= dx;
  }
  if (direction.includes("north")) {
    y += dy;
    height -= dy;
  }

  if (width < 0.05) {
    if (direction.includes("west")) x -= 0.05 - width;
    width = 0.05;
  }
  if (height < 0.05) {
    if (direction.includes("north")) y -= 0.05 - height;
    height = 0.05;
  }
  return {
    x: stable(Math.min(2, Math.max(-1, x))),
    y: stable(Math.min(2, Math.max(-1, y))),
    width: stable(Math.min(3, width)),
    height: stable(Math.min(3, height)),
  };
}

function moveSquareEdge(bounds: CropBounds, direction: ResizeDirection, dx: number, dy: number): CropBounds {
  const useX = Math.abs(dx) >= Math.abs(dy);
  let amount = useX ? dx : dy;
  if (useX && direction.includes("west")) amount = -dx;
  if (!useX && direction.includes("north")) amount = -dy;
  const size = Math.max(0.05, Math.min(3, bounds.width + amount));
  const x = direction.includes("west") ? bounds.x + bounds.width - size : bounds.x;
  const y = direction.includes("north") ? bounds.y + bounds.height - size : bounds.y;
  return {
    x: stable(Math.min(2, Math.max(-1, x))),
    y: stable(Math.min(2, Math.max(-1, y))),
    width: stable(size),
    height: stable(size),
  };
}

export function ImageCropEditor({
  sourceUrl,
  fileName,
  value,
  onChange,
  onValidationChange,
  onSourceStatusChange,
  labels,
}: ImageCropEditorProps): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const dragRef = useRef<{ x: number; y: number; transform: CropSettings["imageTransform"] } | null>(null);
  const resizeRef = useRef<{ x: number; y: number; bounds: CropBounds; direction: ResizeDirection } | null>(null);
  const [sourceSize, setSourceSize] = useState<{ width: number; height: number } | null>(null);

  const shapeLabel = useMemo(() => labels[value.shape.kind], [labels, value.shape.kind]);
  const zoomPercent = Math.round(value.imageTransform.scale * 100);

  useEffect(() => {
    setSourceSize(null);
    onSourceStatusChange("loading");
  }, [onSourceStatusChange, sourceUrl]);

  useEffect(() => {
    if (!sourceSize) return;
    const imageBounds = getImageStageBounds(sourceSize.width, sourceSize.height, value.imageTransform);
    onValidationChange(validateCropShape(value.shape, imageBounds));
  }, [onValidationChange, sourceSize, value.imageTransform, value.shape]);

  useEffect(() => {
    if (!sourceSize || !canvasRef.current || !imageRef.current) return;
    const canvas = canvasRef.current;
    const cssSize = Math.max(1, Math.round(canvas.getBoundingClientRect().width || 600));
    const pixelRatio = Math.max(1, window.devicePixelRatio || 1);
    const canvasSize = Math.round(cssSize * pixelRatio);
    if (canvas.width !== canvasSize || canvas.height !== canvasSize) {
      canvas.width = canvasSize;
      canvas.height = canvasSize;
    }
    const context = canvas.getContext("2d");
    if (!context) return;

    context.clearRect(0, 0, canvasSize, canvasSize);
    if (value.shape.kind === "rectangle" && value.format === "jpeg") {
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvasSize, canvasSize);
    }
    const imageBounds = getImageStageBounds(sourceSize.width, sourceSize.height, value.imageTransform);
    context.drawImage(
      imageRef.current,
      imageBounds.x * canvasSize,
      imageBounds.y * canvasSize,
      imageBounds.width * canvasSize,
      imageBounds.height * canvasSize
    );

    context.save();
    context.fillStyle = "rgba(15, 23, 42, 0.58)";
    context.beginPath();
    context.rect(0, 0, canvasSize, canvasSize);
    traceCropPath(context, value.shape, (point) => ({ x: point.x * canvasSize, y: point.y * canvasSize }));
    context.fill("evenodd");
    context.restore();

    context.save();
    context.strokeStyle = "#ffffff";
    context.lineWidth = Math.max(2, pixelRatio * 2);
    context.beginPath();
    traceCropPath(context, value.shape, (point) => ({ x: point.x * canvasSize, y: point.y * canvasSize }));
    context.stroke();
    context.restore();
  }, [sourceSize, value]);

  const emitTransform = (offsetX: number, offsetY: number): void => {
    onChange({
      ...value,
      imageTransform: { ...value.imageTransform, offsetX: stable(offsetX), offsetY: stable(offsetY) },
    });
  };

  const selectShape = (kind: CropShapeKind): void => {
    const nextShape = PRESET_KINDS.includes(kind)
      ? { kind, bounds: value.shape.bounds ? { ...value.shape.bounds } : { x: 0.1, y: 0.1, width: 0.8, height: 0.8 } }
      : { kind, points: [], closed: false };
    onChange({ ...value, shape: nextShape, format: kind === "rectangle" ? value.format : "png" });
  };

  const handleCanvasKeyDown = (event: KeyboardEvent<HTMLCanvasElement>): void => {
    const amount = event.shiftKey ? 0.025 : 0.005;
    const movement = {
      ArrowLeft: [-amount, 0],
      ArrowRight: [amount, 0],
      ArrowUp: [0, -amount],
      ArrowDown: [0, amount],
    }[event.key];
    if (!movement) return;
    event.preventDefault();
    emitTransform(value.imageTransform.offsetX + movement[0], value.imageTransform.offsetY + movement[1]);
  };

  const handleCanvasPointerDown = (event: PointerEvent<HTMLCanvasElement>): void => {
    if (!PRESET_KINDS.includes(value.shape.kind)) return;
    dragRef.current = { x: event.clientX, y: event.clientY, transform: { ...value.imageTransform } };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handleCanvasPointerMove = (event: PointerEvent<HTMLCanvasElement>): void => {
    const drag = dragRef.current;
    if (!drag) return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    emitTransform(
      drag.transform.offsetX + (event.clientX - drag.x) / rect.width,
      drag.transform.offsetY + (event.clientY - drag.y) / rect.height
    );
  };

  const stopCanvasPointer = (event: PointerEvent<HTMLCanvasElement>): void => {
    if (dragRef.current) event.currentTarget.releasePointerCapture?.(event.pointerId);
    dragRef.current = null;
  };

  const resizeShape = (direction: ResizeDirection, dx: number, dy: number, sourceBounds?: CropBounds): void => {
    const bounds = sourceBounds ?? value.shape.bounds;
    if (!bounds || !PRESET_KINDS.includes(value.shape.kind)) return;
    const nextBounds = value.shape.kind === "rectangle"
      ? moveBoundsEdge(bounds, direction, dx, dy)
      : moveSquareEdge(bounds, direction, dx, dy);
    onChange({ ...value, shape: { ...value.shape, bounds: nextBounds } });
  };

  const handleResizeKey = (event: KeyboardEvent<HTMLButtonElement>, direction: ResizeDirection): void => {
    const amount = event.shiftKey ? 0.025 : 0.005;
    const delta = {
      ArrowLeft: [-amount, 0],
      ArrowRight: [amount, 0],
      ArrowUp: [0, -amount],
      ArrowDown: [0, amount],
    }[event.key];
    if (!delta) return;
    event.preventDefault();
    resizeShape(direction, delta[0], delta[1]);
  };

  const handleResizePointerDown = (event: PointerEvent<HTMLButtonElement>, direction: ResizeDirection): void => {
    if (!value.shape.bounds) return;
    event.stopPropagation();
    resizeRef.current = { x: event.clientX, y: event.clientY, bounds: { ...value.shape.bounds }, direction };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handleResizePointerMove = (event: PointerEvent<HTMLButtonElement>): void => {
    const resize = resizeRef.current;
    const stage = canvasRef.current?.getBoundingClientRect();
    if (!resize || !stage || stage.width <= 0 || stage.height <= 0) return;
    event.stopPropagation();
    resizeShape(
      resize.direction,
      (event.clientX - resize.x) / stage.width,
      (event.clientY - resize.y) / stage.height,
      resize.bounds
    );
  };

  const stopResizePointer = (event: PointerEvent<HTMLButtonElement>): void => {
    if (resizeRef.current) event.currentTarget.releasePointerCapture?.(event.pointerId);
    resizeRef.current = null;
  };

  return (
    <div className="image-crop-editor">
      <img
        ref={imageRef}
        data-testid="crop-source-image"
        className="image-crop-editor__source"
        src={sourceUrl}
        alt=""
        aria-hidden="true"
        onLoad={(event) => {
          const width = event.currentTarget.naturalWidth;
          const height = event.currentTarget.naturalHeight;
          if (width <= 0 || height <= 0) {
            setSourceSize(null);
            onSourceStatusChange("error");
            return;
          }
          setSourceSize({ width, height });
          onSourceStatusChange("ready");
        }}
        onError={() => {
          setSourceSize(null);
          onSourceStatusChange("error");
        }}
      />

      <div className="image-crop-editor__stage">
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={labels.canvas}
          aria-describedby="image-crop-editor-status"
          tabIndex={0}
          onKeyDown={handleCanvasKeyDown}
          onPointerDown={handleCanvasPointerDown}
          onPointerMove={handleCanvasPointerMove}
          onPointerUp={stopCanvasPointer}
          onPointerCancel={stopCanvasPointer}
        />
        {PRESET_KINDS.includes(value.shape.kind) && value.shape.bounds
          ? HANDLE_DIRECTIONS.map((direction) => (
              <button
                key={direction}
                type="button"
                className={`image-crop-editor__handle image-crop-editor__handle--${direction}`}
                aria-label={`${labels.resizeShape} ${direction}`}
                onKeyDown={(event) => handleResizeKey(event, direction)}
                onPointerDown={(event) => handleResizePointerDown(event, direction)}
                onPointerMove={handleResizePointerMove}
                onPointerUp={stopResizePointer}
                onPointerCancel={stopResizePointer}
              />
            ))
          : null}
      </div>

      <p id="image-crop-editor-status" className="image-crop-editor__status" role="status">
        {shapeLabel} · {zoomPercent}%
      </p>

      <fieldset className="image-crop-editor__shape-fieldset">
        <legend>{labels.presets}</legend>
        <div className="image-crop-editor__shape-grid">
          {ALL_KINDS.map((kind) => (
            <button
              key={kind}
              type="button"
              className="btn secondary"
              aria-pressed={value.shape.kind === kind}
              onClick={() => selectShape(kind)}
            >
              {labels[kind]}
            </button>
          ))}
        </div>
      </fieldset>

      <label className="image-crop-editor__zoom">
        <span>{labels.zoom}</span>
        <input
          type="range"
          min={100}
          max={400}
          value={zoomPercent}
          aria-label={labels.zoom}
          onChange={(event) => {
            onChange({
              ...value,
              imageTransform: { ...value.imageTransform, scale: Number(event.target.value) / 100 },
            });
          }}
        />
        <output>{zoomPercent}%</output>
      </label>

      <div className="image-crop-editor__actions">
        <button type="button" className="btn secondary" disabled>
          {labels.undo}
        </button>
        <button type="button" className="btn secondary" onClick={() => onChange(createDefaultCropSettings())}>
          {labels.reset}
        </button>
      </div>
      <span className="sr-only">{fileName}</span>
    </div>
  );
}
