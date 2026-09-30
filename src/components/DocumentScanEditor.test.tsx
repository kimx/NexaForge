import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { LanguageProvider } from "../context/LanguageContext";
import { DocumentScanEditor } from "./DocumentScanEditor";
import { DEFAULT_DOCUMENT_CORNERS, type DocumentCorners } from "../services/image/documentScanService";

afterEach(cleanup);

function Editor(): JSX.Element {
  const [corners, setCorners] = useState<DocumentCorners>(DEFAULT_DOCUMENT_CORNERS);
  return <LanguageProvider initialLocale="en"><DocumentScanEditor sourceUrl="blob:document" value={corners} onChange={setCorners} onReady={() => undefined} onError={() => undefined} /></LanguageProvider>;
}

describe("DocumentScanEditor", () => {
  it("moves ordered corners with keyboard and exposes the same geometry through numeric fields", () => {
    render(<Editor />);
    fireEvent.keyDown(screen.getByRole("button", { name: "Top left corner" }), { key: "ArrowRight" });
    expect(screen.getByRole("spinbutton", { name: "Top left X (%)" })).toHaveValue(0.5);
    fireEvent.change(screen.getByRole("spinbutton", { name: "Bottom right Y (%)" }), { target: { value: "75" } });
    expect(screen.getByRole("spinbutton", { name: "Bottom right Y (%)" })).toHaveValue(75);
    expect(screen.getByRole("spinbutton", { name: "Bottom left Y (%)" })).toHaveValue(100);
  });
  it("rejects an excessive decoded image with an actionable error callback", () => {
    const ready = vi.fn(), error = vi.fn();
    render(<LanguageProvider initialLocale="en"><DocumentScanEditor sourceUrl="blob:document" value={DEFAULT_DOCUMENT_CORNERS} onChange={() => undefined} onReady={ready} onError={error} /></LanguageProvider>);
    const image = screen.getByRole("img", { name: "Document photo" });
    Object.defineProperties(image, { naturalWidth: { value: 6000 }, naturalHeight: { value: 4000 } });
    fireEvent.load(image);
    expect(error).toHaveBeenCalledWith("limit");
    expect(ready).not.toHaveBeenCalled();
  });
  it("converts a pointer drag into image-relative corner coordinates", () => {
    const view = render(<Editor />);
    const surface = view.container.querySelector(".document-scan-editor__surface")!;
    vi.spyOn(surface, "getBoundingClientRect").mockReturnValue({ x: 10, y: 20, left: 10, top: 20, width: 200, height: 100, bottom: 120, right: 210, toJSON: () => ({}) });
    const corner = screen.getByRole("button", { name: "Top left corner" });
    corner.setPointerCapture = vi.fn();
    fireEvent.pointerDown(corner, { pointerId: 1 });
    fireEvent.pointerMove(corner, { pointerId: 1, clientX: 60, clientY: 50 });
    expect(screen.getByRole("spinbutton", { name: "Top left X (%)" })).toHaveValue(25);
    expect(screen.getByRole("spinbutton", { name: "Top left Y (%)" })).toHaveValue(30);
  });
});
