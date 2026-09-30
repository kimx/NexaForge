import { useRef, type KeyboardEvent, type PointerEvent } from "react";
import { useLanguage } from "../context/LanguageContext";
import { DOCUMENT_MAX_SOURCE_PIXELS, type DocumentCorners, type DocumentPoint } from "../services/image/documentScanService";
import { documentScanMessages } from "./documentScanMessages";
import "./DocumentScanEditor.css";

export interface DocumentScanEditorProps {
  sourceUrl: string;
  value: DocumentCorners;
  disabled?: boolean;
  onChange: (corners: DocumentCorners) => void;
  onReady: () => void;
  onError: (code: "decode" | "limit") => void;
}

export function DocumentScanEditor({ sourceUrl, value, disabled = false, onChange, onReady, onError }: DocumentScanEditorProps): JSX.Element {
  const { locale } = useLanguage();
  const copy = documentScanMessages[locale];
  const surface = useRef<HTMLDivElement>(null);
  const dragging = useRef<{ corner: number; pointer: number } | null>(null);
  const clamp = (number: number) => Math.max(0, Math.min(1, number));
  const update = (index: number, point: DocumentPoint) => {
    if (disabled) return;
    onChange(value.map((current, i) => i === index ? { x: clamp(point.x), y: clamp(point.y) } : current));
  };
  const movePointer = (event: PointerEvent<HTMLButtonElement>) => {
    if (disabled || dragging.current?.pointer !== event.pointerId || !surface.current) return;
    const bounds = surface.current.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    update(dragging.current.corner, { x: (event.clientX - bounds.left) / bounds.width, y: (event.clientY - bounds.top) / bounds.height });
  };
  const moveKeyboard = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const step = event.shiftKey ? 0.02 : 0.005;
    const directions: Record<string, DocumentPoint> = { ArrowLeft: { x: -step, y: 0 }, ArrowRight: { x: step, y: 0 }, ArrowUp: { x: 0, y: -step }, ArrowDown: { x: 0, y: step } };
    const delta = directions[event.key];
    if (!delta || disabled) return;
    event.preventDefault();
    update(index, { x: value[index].x + delta.x, y: value[index].y + delta.y });
  };
  return <div className="document-scan-editor">
    <p>{copy.manual}</p>
    <div className="document-scan-editor__surface" ref={surface}>
      <img src={sourceUrl} alt={copy.photo} draggable={false} onLoad={(event) => {
        const { naturalWidth: width, naturalHeight: height } = event.currentTarget;
        if (!width || !height) { onError("decode"); return; }
        if (width > 8192 || height > 8192 || width * height > DOCUMENT_MAX_SOURCE_PIXELS) { onError("limit"); return; }
        onReady();
      }} onError={() => onError("decode")} />
      <svg className="document-scan-editor__outline" viewBox="0 0 1 1" preserveAspectRatio="none" aria-hidden="true">
        <polygon points={value.map(({ x, y }) => `${x},${y}`).join(" ")} />
      </svg>
      {value.map((point, index) => <button key={index} type="button" className="document-scan-editor__corner" disabled={disabled} style={{ left: `${point.x * 100}%`, top: `${point.y * 100}%` }} aria-label={`${copy.corners[index]} ${copy.corner}`} onKeyDown={(event) => moveKeyboard(event, index)} onPointerDown={(event) => {
        if (disabled) return;
        event.preventDefault();
        event.currentTarget.focus();
        event.currentTarget.setPointerCapture(event.pointerId);
        dragging.current = { corner: index, pointer: event.pointerId };
      }} onPointerMove={movePointer} onPointerUp={(event) => {
        if (dragging.current?.pointer === event.pointerId) dragging.current = null;
      }} onPointerCancel={() => { dragging.current = null; }} onLostPointerCapture={() => { dragging.current = null; }}><span>{index + 1}</span></button>)}
    </div>
    <fieldset disabled={disabled} className="document-scan-editor__coordinates">
      <legend>{copy.coordinates}</legend>
      {value.map((point, index) => <div key={index} className="document-scan-editor__coordinate">
        <strong>{index + 1}. {copy.corners[index]}</strong>
        {(["x", "y"] as const).map((axis) => <label key={axis}>{axis.toUpperCase()} (%)<input type="number" min="0" max="100" step="0.1" value={Math.round(point[axis] * 1000) / 10} aria-label={`${copy.corners[index]} ${axis.toUpperCase()} (%)`} onChange={(event) => {
          if (event.target.value === "") return;
          const number = Number(event.target.value);
          if (Number.isFinite(number)) update(index, { ...point, [axis]: number / 100 });
        }} /></label>)}
      </div>)}
    </fieldset>
  </div>;
}
