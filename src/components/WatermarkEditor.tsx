import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import type { WatermarkOptions, WatermarkPosition, WatermarkPreset } from "../services/image/watermarkService";
import { drawWatermark, getPresetPosition } from "../services/image/watermarkService";

const PRESETS: WatermarkPreset[] = [
  "top-left",
  "top-center",
  "top-right",
  "middle-left",
  "center",
  "middle-right",
  "bottom-left",
  "bottom-center",
  "bottom-right",
];

export interface WatermarkEditorLabels {
  preview: string;
  loading: string;
  error: string;
  position: string;
  horizontal: string;
  vertical: string;
  positions: Record<WatermarkPreset, string>;
}

export interface WatermarkEditorProps {
  source: File;
  options: WatermarkOptions;
  labels: WatermarkEditorLabels;
  onPositionChange: (position: WatermarkPosition) => void;
  showPositionControls?: boolean;
}

function positionsMatch(left: WatermarkPosition, right: WatermarkPosition): boolean {
  return Math.abs(left.x - right.x) < 0.001 && Math.abs(left.y - right.y) < 0.001;
}

interface WatermarkPositionControlsProps {
  position: WatermarkPosition;
  labels: WatermarkEditorLabels;
  onPositionChange: (position: WatermarkPosition) => void;
}

export function WatermarkPositionControls({
  position: currentPosition,
  labels,
  onPositionChange,
}: WatermarkPositionControlsProps): JSX.Element {
  return (
    <fieldset className="watermark-position-controls-group">
      <legend className="sr-only">{labels.position}</legend>
      <div className="watermark-position-grid">
        {PRESETS.map((preset) => {
          const position = getPresetPosition(preset);
          return (
            <button
              key={preset}
              type="button"
              aria-label={labels.positions[preset]}
              aria-pressed={positionsMatch(currentPosition, position)}
              onClick={() => onPositionChange(position)}
            >
              <span aria-hidden="true">●</span>
            </button>
          );
        })}
      </div>
      <div className="watermark-position-controls">
        <label>
          <span className="watermark-control-label">
            <span>{labels.horizontal}</span>
            <output>{Math.round(currentPosition.x * 100)}%</output>
          </span>
          <input
            aria-label={labels.horizontal}
            type="range"
            min="0"
            max="100"
            value={Math.round(currentPosition.x * 100)}
            onChange={(event) => onPositionChange({
              x: Number(event.currentTarget.value) / 100,
              y: currentPosition.y,
            })}
          />
        </label>
        <label>
          <span className="watermark-control-label">
            <span>{labels.vertical}</span>
            <output>{Math.round(currentPosition.y * 100)}%</output>
          </span>
          <input
            aria-label={labels.vertical}
            type="range"
            min="0"
            max="100"
            value={Math.round(currentPosition.y * 100)}
            onChange={(event) => onPositionChange({
              x: currentPosition.x,
              y: Number(event.currentTarget.value) / 100,
            })}
          />
        </label>
      </div>
    </fieldset>
  );
}

export function WatermarkEditor({
  source,
  options,
  labels,
  onPositionChange,
  showPositionControls = true,
}: WatermarkEditorProps): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const draggingRef = useRef(false);
  const [sourceBitmap, setSourceBitmap] = useState<ImageBitmap | null>(null);
  const [logoBitmap, setLogoBitmap] = useState<ImageBitmap | null>(null);
  const [previewState, setPreviewState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let active = true;
    let decoded: ImageBitmap | null = null;
    setPreviewState("loading");
    setSourceBitmap(null);
    void createImageBitmap(source).then((bitmap) => {
      decoded = bitmap;
      if (!active) {
        bitmap.close();
        return;
      }
      setSourceBitmap(bitmap);
      setPreviewState("ready");
    }).catch(() => {
      if (active) setPreviewState("error");
    });
    return () => {
      active = false;
      decoded?.close();
    };
  }, [source]);

  useEffect(() => {
    if (options.mode !== "image") {
      setLogoBitmap(null);
      return;
    }
    let active = true;
    let decoded: ImageBitmap | null = null;
    setLogoBitmap(null);
    void createImageBitmap(options.logo).then((bitmap) => {
      decoded = bitmap;
      if (!active) {
        bitmap.close();
        return;
      }
      setLogoBitmap(bitmap);
    }).catch(() => {
      if (active) setPreviewState("error");
    });
    return () => {
      active = false;
      decoded?.close();
    };
  }, [options.mode, options.mode === "image" ? options.logo : null]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !sourceBitmap || (options.mode === "image" && !logoBitmap)) return;
    const scale = Math.min(1, 960 / Math.max(sourceBitmap.width, sourceBitmap.height));
    canvas.width = Math.max(1, Math.round(sourceBitmap.width * scale));
    canvas.height = Math.max(1, Math.round(sourceBitmap.height * scale));
    drawWatermark(canvas, sourceBitmap, options, logoBitmap ?? undefined);
  }, [logoBitmap, options, sourceBitmap]);

  const updateFromPointer = (event: ReactPointerEvent<HTMLCanvasElement>): void => {
    const rect = event.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    onPositionChange({
      x: Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height)),
    });
  };

  return (
    <section className="watermark-editor">
      <div className="watermark-editor__stage">
        <canvas
          ref={canvasRef}
          className="watermark-editor__canvas"
          role="img"
          aria-label={labels.preview}
          tabIndex={0}
          onPointerDown={(event) => {
            draggingRef.current = true;
            event.currentTarget.setPointerCapture?.(event.pointerId);
            updateFromPointer(event);
          }}
          onPointerMove={(event) => {
            if (draggingRef.current) updateFromPointer(event);
          }}
          onPointerUp={(event) => {
            draggingRef.current = false;
            event.currentTarget.releasePointerCapture?.(event.pointerId);
          }}
          onPointerCancel={() => { draggingRef.current = false; }}
        />
        {previewState === "loading" ? <p role="status">{labels.loading}</p> : null}
        {previewState === "error" ? <p role="alert">{labels.error}</p> : null}
      </div>
      {showPositionControls ? (
        <WatermarkPositionControls
          position={options.position}
          labels={labels}
          onPositionChange={onPositionChange}
        />
      ) : null}
    </section>
  );
}
