import { useEffect, useRef, useState } from "react";
import { useBlobUrl } from "../../hooks/useBlobUrl";
import type { FileProcessResult } from "../../types/tool";
import { formatFileSize } from "../../utils/fileSize";
import { useLanguage } from "../../context/LanguageContext";
import { fileWorkflowMessages } from "../../i18n/fileWorkflowMessages";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

export function ImageStagePreview({ result }: { result: FileProcessResult }) {
  const url = useBlobUrl(result.blob);
  return <figure>{url ? <img src={url} alt={result.fileName} /> : null}<figcaption>{result.fileName} · {formatFileSize(result.size)}</figcaption></figure>;
}

/** Render only one bounded page, even for large merged documents. */
export function PdfStagePreview({ result }: { result: FileProcessResult }) {
  const { locale } = useLanguage(); const c = fileWorkflowMessages[locale];
  const canvas = useRef<HTMLCanvasElement>(null);
  const [pages, setPages] = useState(0);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  useEffect(() => {
    let disposed = false;
    let cleanup: (() => void) | undefined;
    setStatus("loading"); setPages(0);
    async function render() {
      try {
        const pdfjs = await import("pdfjs-dist");
        const data = new Uint8Array(await result.blob.arrayBuffer());
        if (disposed) return;
        pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
        const task = pdfjs.getDocument({ data });
        cleanup = () => { void task.destroy().catch(() => {}); };
        const document = await task.promise;
        if (disposed) return;
        setPages(document.numPages);
        const page = await document.getPage(1);
        if (disposed || !canvas.current) return;
        const natural = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: Math.min(1.5, 900 / natural.width, 1200 / natural.height) });
        canvas.current.width = Math.ceil(viewport.width); canvas.current.height = Math.ceil(viewport.height);
        const context = canvas.current.getContext("2d");
        if (!context) throw new Error("Canvas unavailable");
        await page.render({ canvas: canvas.current, canvasContext: context, viewport }).promise;
        if (!disposed) setStatus("ready");
      } catch { if (!disposed) setStatus("error"); }
      finally { cleanup?.(); }
    }
    void render();
    return () => { disposed = true; cleanup?.(); };
  }, [result]);
  return <figure><p>{result.fileName} · {formatFileSize(result.size)}{pages ? ` · ${c.pages}: ${pages}` : ""}</p>
    {status === "loading" ? <p role="status">{c.loadingPreview}</p> : null}
    {status === "error" ? <p role="status">{c.previewFailure}</p> : null}
    <canvas ref={canvas} role="img" aria-label={c.firstPage} hidden={status !== "ready"} />
  </figure>;
}
