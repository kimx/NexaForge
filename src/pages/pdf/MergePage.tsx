import { useMemo, useState } from "react";
import type { DragEvent } from "react";
import { Link } from "react-router-dom";
import { ProcessingState, ToolMeta, FileProcessResult, FileRejection } from "../../types/tool";
import { FILE_TOOLS } from "../../data/tools";
import { ToolPageTemplate } from "../../components/ToolPageTemplate";
import { FileDropzone } from "../../components/FileDropzone";
import { DownloadButton } from "../../components/DownloadButton";
import { mergePdf } from "../../services/pdf/pdfService";
import { getRelatedTools } from "../../utils/toolHelpers";
import { trackEvent } from "../../utils/analytics";
import { useSeo } from "../../hooks/useSeo";
import { validateFileSize, validateMime } from "../../utils/validation";
import { useLanguage } from "../../context/LanguageContext";
import { formatFileSize } from "../../utils/fileSize";

export function PdfMergePage(): JSX.Element {
  const { t } = useLanguage();
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState<ProcessingState>("idle");
  const [result, setResult] = useState<FileProcessResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const tool = FILE_TOOLS.find((item) => item.id === "pdf-merge");
  const title = t("tool.pdf-merge.title");
  const description = t("tool.pdf-merge.description");
  const toolMeta: ToolMeta = {
    title: `${title} - ${t("header.title")}`,
    description,
    canonical: "/pdf/merge",
    h1: title,
  };
  useSeo(toolMeta);

  const relatedTools = getRelatedTools("pdf-merge");
  const howItWorks = useMemo(
    () => [
      t("tool.pdf-merge.how.0"),
      t("tool.pdf-merge.how.1"),
      t("tool.pdf-merge.how.2"),
      t("tool.pdf-merge.how.3"),
    ],
    [t]
  );
  const faq = useMemo(
    () => [
      {
        q: t("tool.pdf-merge.faq.0.question"),
        a: t("tool.pdf-merge.faq.0.answer"),
      },
      {
        q: t("tool.pdf-merge.faq.1.question"),
        a: t("tool.pdf-merge.faq.1.answer"),
      },
    ],
    [t]
  );

  const moveFile = (index: number, direction: -1 | 1): void => {
    setFiles((current) => {
      const next = [...current];
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= next.length) {
        return current;
      }
      const temp = next[targetIndex];
      next[targetIndex] = next[index];
      next[index] = temp;
      setProcessing("ready");
      return next;
    });
  };

  const handleFiles = (incoming: File[]): void => {
    setFiles((current) => [...current, ...incoming]);
    setResult(null);
    setError(null);
    setProcessing("ready");
    trackEvent("workflow_ready", { tool: "pdf-merge" });
  };

  const handleRejectedFiles = (rejections: FileRejection[]): void => {
    setError(rejections.map((rejection) => `${rejection.fileName}: ${rejection.reason}`).join("\n"));
    setProcessing("error");
  };

  const removeFile = (index: number): void => {
    setFiles((current) => current.filter((_, fileIndex) => fileIndex !== index));
    setResult(null);
    setProcessing(files.length > 1 ? "ready" : "idle");
  };

  const clearFiles = (): void => {
    setFiles([]);
    setResult(null);
    setError(null);
    setProcessing("idle");
  };

  const handleDropReorder = (event: DragEvent<HTMLLIElement>, targetIndex: number): void => {
    event.preventDefault();
    const sourceIndex = draggedIndex ?? Number(event.dataTransfer.getData("text/plain"));
    if (!Number.isInteger(sourceIndex) || sourceIndex === targetIndex) {
      setDraggedIndex(null);
      return;
    }
    setFiles((current) => {
      if (sourceIndex < 0 || sourceIndex >= current.length || targetIndex < 0 || targetIndex >= current.length) {
        return current;
      }
      const next = [...current];
      const [moved] = next.splice(sourceIndex, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
    setDraggedIndex(null);
    setProcessing("ready");
  };

  const handleProcess = async () => {
    if (!files.length) {
      setError(t("error.selectOneFile", { type: t("label.fileType.file") }));
      return;
    }
    const invalid = files.find((file) => {
      const size = validateFileSize(file);
      const mime = validateMime(file, "application/pdf");
      return Boolean(size || mime);
    });
    if (invalid) {
      setError(t("error.invalidFile"));
      setProcessing("error");
      trackEvent("process_failed", { tool: "pdf-merge" });
      return;
    }

    setError(null);
    setProcessing("processing");
    trackEvent("process_start", { tool: "pdf-merge" });
    try {
      const output = await mergePdf(files);
      setResult(output);
      setProcessing("success");
      trackEvent("process_success", { tool: "pdf-merge" });
    } catch (err) {
      setError(t("error.processingFailed"));
      setProcessing("error");
      trackEvent("process_failed", { tool: "pdf-merge" });
      console.error(err);
    }
  };

  return (
      <ToolPageTemplate
        tool={tool ?? FILE_TOOLS[0]}
        meta={toolMeta}
        breadcrumb={["Home", t("tool.pdf-merge.title")]}
        children={{
        workspace: (
          <>
        <FileDropzone
              label={t("label.dropPdf")}
              accept="application/pdf"
              multiple
              onFiles={handleFiles}
              onRejectedFiles={handleRejectedFiles}
            />
            {files.length > 0 ? (
              <div className="pdf-merge-list-summary">
                <span>{t("fileInfo.selectedPlural", { count: files.length })} · {t("fileInfo.totalSize")}: {formatFileSize(files.reduce((total, file) => total + file.size, 0))}</span>
                <button type="button" className="btn secondary file-btn" onClick={clearFiles}>{t("fileInfo.clearAll")}</button>
              </div>
            ) : null}
            <ol className="reorder-list" aria-label={t("pdfMerge.fileOrderLabel")}>
              {files.map((file, index) => (
                <li
                  key={`${file.name}-${file.size}-${index}`}
                  className={`reorder-list__item${draggedIndex === index ? " reorder-list__item--dragging" : ""}`}
                  draggable
                  aria-posinset={index + 1}
                  aria-setsize={files.length}
                  onDragStart={(event) => {
                    setDraggedIndex(index);
                    event.dataTransfer.effectAllowed = "move";
                    event.dataTransfer.setData("text/plain", String(index));
                  }}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => handleDropReorder(event, index)}
                  onDragEnd={() => setDraggedIndex(null)}
                >
                  <span className="reorder-list__handle" title={t("pdfMerge.dragHandle")} aria-hidden="true">⠿</span>
                  <span className="reorder-list__name">
                    <strong>{index + 1}. {file.name}</strong>
                    <small>{formatFileSize(file.size)} · {file.type || t("fileInfo.unknownType")}</small>
                  </span>
                  <div className="button-row reorder-list__actions">
                    <button type="button" className="file-btn" onClick={() => moveFile(index, -1)} disabled={index === 0} aria-label={t("pdfMerge.moveUp")}>
                      ↑
                    </button>
                    <button
                      type="button"
                      className="file-btn"
                      onClick={() => moveFile(index, 1)}
                      disabled={index === files.length - 1}
                      aria-label={t("pdfMerge.moveDown")}
                    >
                      ↓
                    </button>
                    <button type="button" className="file-btn" onClick={() => removeFile(index)} aria-label={`${t("fileInfo.remove")} ${file.name}`}>
                      ×
                    </button>
                  </div>
                </li>
              ))}
            </ol>
          </>
        ),
        options: (
          <div className="tool-form">
            <button
              type="button"
              className="btn primary"
              onClick={handleProcess}
              disabled={processing === "processing"}
              aria-busy={processing === "processing"}
            >
              {processing === "processing" ? t("button.processing") : t("button.process")}
            </button>
          </div>
        ),
        result: (
          <>
            <p>{t("tool.pdf-merge.label.outputSize", { size: ((result?.size ?? 0) / 1024).toFixed(2) })}</p>
          </>
        ),
        nextActions: (
          <>
            <DownloadButton
              result={result}
              disabled={processing === "processing"}
              onDownloaded={() => {
                trackEvent("download", { tool: "pdf-merge" });
                trackEvent("result_action_used", { tool: "pdf-merge", action: "download" });
              }}
            />
            <Link className="btn secondary" to="/pdf/rotate" onClick={() => trackEvent("result_action_used", { tool: "pdf-merge", action: "rotate" })}>
              {t("toolPage.nextRotate")}
            </Link>
            <Link className="btn secondary" to="/pdf/split" onClick={() => trackEvent("result_action_used", { tool: "pdf-merge", action: "split" })}>
              {t("toolPage.nextSplit")}
            </Link>
          </>
        ),
        howItWorks,
        faq,
        relatedTools,
      }}
      workflow={{
        state: processing,
        error,
        onRetry: handleProcess,
        onReprocess: handleProcess,
      }}
    />
  );
}
