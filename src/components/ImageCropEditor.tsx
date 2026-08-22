import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent, PointerEvent } from "react";
import type {
  CropBounds,
  CropPoint,
  CropSettings,
  CropShapeKind,
  CropValidationReason,
  ImageCropEditorLabels,
} from "../types/imageCrop";
import {
  createDefaultCropSettings,
  getImageStageBounds,
  simplifyFreehandPoints,
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

function getHandlePosition(bounds: CropBounds, direction: ResizeDirection): CSSProperties {
  const left = direction.includes("west")
    ? bounds.x
    : direction.includes("east")
      ? bounds.x + bounds.width
      : bounds.x + bounds.width / 2;
  const top = direction.includes("north")
    ? bounds.y
    : direction.includes("south")
      ? bounds.y + bounds.height
      : bounds.y + bounds.height / 2;

  return { left: `${left * 100}%`, top: `${top * 100}%` };
}

function stable(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function pointDistance(a: CropPoint, b: CropPoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
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
  const drawingRef = useRef<{ points: CropPoint[]; lastClientX: number; lastClientY: number } | null>(null);
  const nodeDragRef = useRef<{ index: number } | null>(null);
  const [sourceSize, setSourceSize] = useState<{ width: number; height: number } | null>(null);
  const [draftPoints, setDraftPoints] = useState<CropPoint[] | null>(null);
  const [history, setHistory] = useState<CropSettings[]>([]);

  const shapeLabel = useMemo(() => labels[value.shape.kind], [labels, value.shape.kind]);
  const zoomPercent = Math.round(value.imageTransform.scale * 100);
  const imageBounds = sourceSize
    ? getImageStageBounds(sourceSize.width, sourceSize.height, value.imageTransform)
    : undefined;
  const validation = validateCropShape(value.shape, imageBounds);
  const reasonLabels: Record<CropValidationReason, string> = {
    "not-enough-points": labels.notEnoughPoints,
    "shape-not-closed": labels.closeShapeHint,
    "self-intersection": labels.selfIntersection,
    "shape-too-small": labels.shapeTooSmall,
    "outside-image": labels.outsideImage,
  };
  const validationMessage = validation.reason ? reasonLabels[validation.reason] : "";

  const commitChange = (next: CropSettings): void => {
    setHistory((current) => [...current, value].slice(-50));
    onChange(next);
  };

  useEffect(() => {
    setSourceSize(null);
    setDraftPoints(null);
    setHistory([]);
    onSourceStatusChange("loading");
  }, [onSourceStatusChange, sourceUrl]);

  useEffect(() => {
    if (!sourceSize) return;
    const nextImageBounds = getImageStageBounds(sourceSize.width, sourceSize.height, value.imageTransform);
    onValidationChange(validateCropShape(value.shape, nextImageBounds));
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
    const displayShape = draftPoints
      ? { kind: "freehand" as const, points: draftPoints, closed: false }
      : value.shape;

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
    traceCropPath(context, displayShape, (point) => ({ x: point.x * canvasSize, y: point.y * canvasSize }));
    context.fill("evenodd");
    context.restore();

    context.save();
    context.strokeStyle = "#ffffff";
    context.lineWidth = Math.max(2, pixelRatio * 2);
    context.beginPath();
    traceCropPath(context, displayShape, (point) => ({ x: point.x * canvasSize, y: point.y * canvasSize }));
    context.stroke();
    context.restore();
  }, [draftPoints, sourceSize, value]);

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
    setDraftPoints(null);
    commitChange({ ...value, shape: nextShape, format: kind === "rectangle" ? value.format : "png" });
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

  const pointFromPointer = (event: PointerEvent<HTMLElement>): CropPoint | null => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0 || rect.height <= 0) return null;
    return {
      x: stable((event.clientX - rect.left) / rect.width),
      y: stable((event.clientY - rect.top) / rect.height),
    };
  };

  const handleCanvasPointerDown = (event: PointerEvent<HTMLCanvasElement>): void => {
    if (value.shape.kind === "polygon") {
      const point = pointFromPointer(event);
      if (!point) return;
      const points = value.shape.points ?? [];
      const rect = event.currentTarget.getBoundingClientRect();
      const closingDistance = points.length > 0
        ? pointDistance(point, points[0]) * rect.width
        : Number.POSITIVE_INFINITY;
      if (points.length >= 3 && closingDistance <= 12) {
        commitChange({ ...value, shape: { ...value.shape, closed: true } });
      } else {
        commitChange({ ...value, shape: { ...value.shape, points: [...points, point], closed: false } });
      }
      return;
    }
    if (value.shape.kind === "freehand") {
      const point = pointFromPointer(event);
      if (!point) return;
      drawingRef.current = { points: [point], lastClientX: event.clientX, lastClientY: event.clientY };
      setDraftPoints([point]);
      event.currentTarget.setPointerCapture?.(event.pointerId);
      return;
    }
    dragRef.current = { x: event.clientX, y: event.clientY, transform: { ...value.imageTransform } };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handleCanvasPointerMove = (event: PointerEvent<HTMLCanvasElement>): void => {
    const drawing = drawingRef.current;
    if (drawing) {
      const clientDistance = Math.hypot(event.clientX - drawing.lastClientX, event.clientY - drawing.lastClientY);
      if (clientDistance < 2) return;
      const point = pointFromPointer(event);
      if (!point) return;
      drawing.points.push(point);
      drawing.lastClientX = event.clientX;
      drawing.lastClientY = event.clientY;
      setDraftPoints([...drawing.points]);
      return;
    }
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
    if (drawingRef.current) {
      const simplified = simplifyFreehandPoints(drawingRef.current.points, 0.003, 500);
      drawingRef.current = null;
      setDraftPoints(null);
      event.currentTarget.releasePointerCapture?.(event.pointerId);
      commitChange({
        ...value,
        shape: { kind: "freehand", points: simplified, closed: simplified.length >= 3 },
        format: "png",
      });
      return;
    }
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

  const updatePoint = (index: number, point: CropPoint, record = true): void => {
    const points = [...(value.shape.points ?? [])];
    if (!points[index]) return;
    points[index] = {
      x: stable(Math.min(2, Math.max(-1, point.x))),
      y: stable(Math.min(2, Math.max(-1, point.y))),
    };
    const next = { ...value, shape: { ...value.shape, points } };
    if (record) commitChange(next);
    else onChange(next);
  };

  const deletePoint = (index: number): void => {
    const points = (value.shape.points ?? []).filter((_, pointIndex) => pointIndex !== index);
    commitChange({
      ...value,
      shape: { ...value.shape, points, closed: Boolean(value.shape.closed && points.length >= 3) },
    });
  };

  const handleNodeKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number): void => {
    if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      deletePoint(index);
      return;
    }
    const amount = event.shiftKey ? 0.025 : 0.005;
    const movement = {
      ArrowLeft: [-amount, 0],
      ArrowRight: [amount, 0],
      ArrowUp: [0, -amount],
      ArrowDown: [0, amount],
    }[event.key];
    const point = value.shape.points?.[index];
    if (!movement || !point) return;
    event.preventDefault();
    updatePoint(index, { x: point.x + movement[0], y: point.y + movement[1] });
  };

  const handleNodePointerDown = (event: PointerEvent<HTMLButtonElement>, index: number): void => {
    event.stopPropagation();
    nodeDragRef.current = { index };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handleNodePointerMove = (event: PointerEvent<HTMLButtonElement>): void => {
    const drag = nodeDragRef.current;
    if (!drag) return;
    event.stopPropagation();
    const point = pointFromPointer(event);
    if (point) updatePoint(drag.index, point, false);
  };

  const stopNodePointer = (event: PointerEvent<HTMLButtonElement>): void => {
    if (nodeDragRef.current) event.currentTarget.releasePointerCapture?.(event.pointerId);
    nodeDragRef.current = null;
  };

  const undo = (): void => {
    const previous = history[history.length - 1];
    if (!previous) return;
    setHistory(history.slice(0, -1));
    onChange(previous);
  };

  const reset = (): void => {
    setHistory([]);
    setDraftPoints(null);
    onChange(createDefaultCropSettings());
  };
  const presetBounds = value.shape.bounds;

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
        {PRESET_KINDS.includes(value.shape.kind) && presetBounds
          ? HANDLE_DIRECTIONS.map((direction) => (
              <button
                key={direction}
                type="button"
                className={`image-crop-editor__handle image-crop-editor__handle--${direction}`}
                style={getHandlePosition(presetBounds, direction)}
                aria-label={`${labels.resizeShape} ${direction}`}
                onKeyDown={(event) => handleResizeKey(event, direction)}
                onPointerDown={(event) => handleResizePointerDown(event, direction)}
                onPointerMove={handleResizePointerMove}
                onPointerUp={stopResizePointer}
                onPointerCancel={stopResizePointer}
              />
            ))
          : null}
        {(value.shape.kind === "polygon" || value.shape.kind === "freehand")
          ? (value.shape.points ?? []).map((point, index) => (
              <button
                key={`${index}-${point.x}-${point.y}`}
                type="button"
                className="image-crop-editor__node"
                style={{ left: `${point.x * 100}%`, top: `${point.y * 100}%` }}
                aria-label={`${labels.point} ${index + 1}`}
                onKeyDown={(event) => handleNodeKeyDown(event, index)}
                onPointerDown={(event) => handleNodePointerDown(event, index)}
                onPointerMove={handleNodePointerMove}
                onPointerUp={stopNodePointer}
                onPointerCancel={stopNodePointer}
              />
            ))
          : null}
      </div>

      <p id="image-crop-editor-status" className="image-crop-editor__status" role="status">
        <span>{shapeLabel} · {zoomPercent}%</span>
        {validationMessage ? <span>{validationMessage}</span> : null}
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

      {(value.shape.kind === "polygon" || value.shape.kind === "freehand") ? (
        <div className="image-crop-editor__custom-controls">
          {!value.shape.closed && (value.shape.points?.length ?? 0) >= 3 ? (
            <button
              type="button"
              className="btn secondary"
              onClick={() => commitChange({ ...value, shape: { ...value.shape, closed: true } })}
            >
              {labels.closeShape}
            </button>
          ) : null}
          <div className="image-crop-editor__point-list">
            {(value.shape.points ?? []).map((point, index) => (
              <fieldset key={`coordinates-${index}`} aria-label={`${labels.point} ${index + 1}`}>
                <legend>{labels.point} {index + 1}</legend>
                <label>
                  <span>{labels.xCoordinate}</span>
                  <input
                    type="number"
                    min={-100}
                    max={200}
                    step={0.1}
                    value={stable(point.x * 100)}
                    onChange={(event) => updatePoint(index, { x: Number(event.target.value) / 100, y: point.y })}
                  />
                </label>
                <label>
                  <span>{labels.yCoordinate}</span>
                  <input
                    type="number"
                    min={-100}
                    max={200}
                    step={0.1}
                    value={stable(point.y * 100)}
                    onChange={(event) => updatePoint(index, { x: point.x, y: Number(event.target.value) / 100 })}
                  />
                </label>
              </fieldset>
            ))}
          </div>
          <button
            type="button"
            className="btn secondary"
            onClick={() => {
              const points = [...(value.shape.points ?? []), { x: 0.5, y: 0.5 }];
              commitChange({ ...value, shape: { ...value.shape, points, closed: false } });
            }}
          >
            {labels.addPoint}
          </button>
        </div>
      ) : null}

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
        <button type="button" className="btn secondary" disabled={history.length === 0} onClick={undo}>
          {labels.undo}
        </button>
        <button type="button" className="btn secondary" onClick={reset}>
          {labels.reset}
        </button>
      </div>
      <span className="sr-only">{fileName}</span>
    </div>
  );
}
