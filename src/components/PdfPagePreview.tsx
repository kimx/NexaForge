import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";

export function PdfPagePreview({ document, page, label, loadingText, errorText, loadError }: {
  document: Pick<PDFDocumentProxy, "getPage"> | null;
  page: number;
  label: string;
  loadingText: string;
  errorText: string;
  loadError: boolean;
}): JSX.Element {
  const hostRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [rendered, setRendered] = useState<{
    document: typeof document;
    page: number;
    width: number;
    state: "ready" | "error";
  } | null>(null);
  const state = rendered?.document === document && rendered.page === page && rendered.width === width
    ? rendered.state : "loading";

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const measure = (): void => setWidth(Math.round(host.clientWidth));
    measure();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measure);
      return () => window.removeEventListener("resize", measure);
    }
    const observer = new ResizeObserver(measure);
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    host.replaceChildren();
    host.parentElement?.scrollTo?.(0, 0);
    setRendered(null);
    if (!document || !width) return;
    let active = true;
    let task: RenderTask | undefined;
    // Render to a fresh canvas so rapid navigation never reuses a running canvas.
    const canvas = globalThis.document.createElement("canvas");
    void (async () => {
      try {
        const pdfPage = await document.getPage(page);
        if (!active) return;
        const original = pdfPage.getViewport({ scale: 1 });
        const fit = width / original.width;
        // Keep text sharp on HiDPI displays, while bounding memory for very long pages.
        const scale = Math.min(fit * Math.max(2, window.devicePixelRatio || 1),
          Math.sqrt(12_000_000 / (original.width * original.height)),
          16000 / Math.max(original.width, original.height));
        const viewport = pdfPage.getViewport({ scale });
        canvas.width = Math.max(1, Math.ceil(viewport.width));
        canvas.height = Math.max(1, Math.ceil(viewport.height));
        canvas.style.width = "100%";
        canvas.style.height = "auto";
        canvas.setAttribute("aria-hidden", "true");
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Canvas unavailable");
        task = pdfPage.render({ canvas, canvasContext: context, viewport });
        await task.promise;
        if (!active) return;
        host.replaceChildren(canvas);
        setRendered({ document, page, width, state: "ready" });
      } catch {
        if (active) setRendered({ document, page, width, state: "error" });
      }
    })();
    return () => {
      active = false;
      task?.cancel();
      host.replaceChildren();
    };
  }, [document, page, width]);

  const failed = loadError || state === "error";
  return (
    <section className="pdf-page-preview" aria-label={label}>
      <p className="pdf-page-preview__heading" aria-live="polite">{label}</p>
      {failed ? <p role="alert">{errorText}</p> : state === "loading" ? <p role="status">{loadingText}</p> : null}
      <div className="pdf-page-preview__scroll" tabIndex={0} aria-label={label}>
        <div className="pdf-page-preview__canvas" ref={hostRef} style={{ visibility: state === "ready" ? "visible" : "hidden" }} role={state === "ready" ? "img" : undefined} aria-label={label} aria-busy={!failed && state === "loading"} />
      </div>
    </section>
  );
}
