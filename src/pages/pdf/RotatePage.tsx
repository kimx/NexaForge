import { useMemo, useRef, useState } from "react";
import { ProcessingState, ToolMeta } from "../../types/tool";
import { FILE_TOOLS } from "../../data/tools";
import { ToolPageTemplate } from "../../components/ToolPageTemplate";
import { FileDropzone } from "../../components/FileDropzone";
import { FileInfo } from "../../components/FileInfo";
import { DownloadButton } from "../../components/DownloadButton";
import { BatchFileResults } from "../../components/BatchFileResults";
import { DownloadCollectionButton } from "../../components/DownloadCollectionButton";
import { rotatePdf } from "../../services/pdf/pdfService";
import { runBatch, type BatchItem } from "../../services/batch/batchService";
import { getRelatedTools } from "../../utils/toolHelpers";
import { trackEvent } from "../../utils/analytics";
import { useSeo } from "../../hooks/useSeo";
import { validateFileSize, validateMime } from "../../utils/validation";
import { useLanguage } from "../../context/LanguageContext";

export function PdfRotatePage(): JSX.Element {
  const { t } = useLanguage();
  const [files, setFiles] = useState<File[]>([]);
  const [degrees, setDegrees] = useState<90 | 180 | 270>(90);
  const [pagesInput, setPagesInput] = useState("");
  const [processing, setProcessing] = useState<ProcessingState>("idle");
  const [items, setItems] = useState<BatchItem[]>([]);
  const [completed, setCompleted] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [rotateAll, setRotateAll] = useState(true);
  const operationRef = useRef(0);

  const tool = FILE_TOOLS.find((item) => item.id === "pdf-rotate");
  const title = t("tool.pdf-rotate.title");
  const description = t("tool.pdf-rotate.description");
  const toolMeta: ToolMeta = {
    title: `${title} - ${t("header.title")}`,
    description,
    canonical: "/pdf/rotate",
    h1: title,
  };
  useSeo(toolMeta);

  const relatedTools = getRelatedTools("pdf-rotate");
  const howItWorks = useMemo(
    () => [
      t("tool.pdf-rotate.how.0"),
      t("tool.pdf-rotate.how.1"),
      t("tool.pdf-rotate.how.2"),
      t("tool.pdf-rotate.how.3"),
    ],
    [t]
  );
  const faq = useMemo(
    () => [
      {
        q: t("tool.pdf-rotate.faq.0.question"),
        a: t("tool.pdf-rotate.faq.0.answer"),
      },
      {
        q: t("tool.pdf-rotate.faq.1.question"),
        a: t("tool.pdf-rotate.faq.1.answer"),
      },
    ],
    [t]
  );

  const clearOutputs = (): void => {
    operationRef.current += 1;
    setItems([]);
    setCompleted(0);
    setError(null);
    setProcessing("idle");
  };
  const selectFiles = (next: File[]): void => {
    clearOutputs();
    setFiles(next);
  };
  const clearSelection = (): void => {
    clearOutputs();
    setFiles([]);
  };
  const successes = items.flatMap((item) => item.status === "success" ? [item.result] : []);
  const singleResult = files.length === 1 ? successes[0] : undefined;

  const handleProcess = async () => {
    if (!files.length) {
      setError(t("error.selectOneFile", { type: t("label.fileType.pdf") }));
      return;
    }
    const invalid = files.find((file) => validateFileSize(file) || validateMime(file, "application/pdf"));
    if (invalid) {
      setError(t("error.invalidFile"));
      setProcessing("error");
      trackEvent("process_failed", { tool: "pdf-rotate" });
      return;
    }

    const operation = operationRef.current + 1;
    operationRef.current = operation;
    setItems([]);
    setCompleted(0);
    setError(null);
    setProcessing("processing");
    trackEvent("process_start", { tool: "pdf-rotate" });
    const batch = await runBatch(files, (file) => rotatePdf(file, degrees, rotateAll ? undefined : pagesInput), {
      concurrency: 2,
      onProgress: (done) => {
        if (operationRef.current === operation) setCompleted(done);
      },
    });
    if (operationRef.current !== operation) return;
    setItems(batch.items);
    if (batch.successful > 0) {
      setProcessing("success");
      trackEvent("process_success", { tool: "pdf-rotate" });
    } else {
      setError(t("error.processingFailed"));
      setProcessing("error");
      trackEvent("process_failed", { tool: "pdf-rotate" });
    }
  };

  return (
      <ToolPageTemplate
        tool={tool ?? FILE_TOOLS[0]}
        meta={toolMeta}
        breadcrumb={["Home", t("tool.pdf-rotate.title")]}
        children={{
        workspace: (
          <>
            <FileDropzone
              label={t("label.dropPdf")}
              accept="application/pdf"
              multiple
              onFiles={selectFiles}
              compact={files.length > 0}
            />
            <FileInfo files={files} mode="multi" onClear={clearSelection} compact={files.length > 0} />
          </>
        ),
        options: (
          <div className="tool-form">
            <label>
              {t("label.rotateAngle")}
              <select
                value={degrees}
                onChange={(event) => setDegrees(Number(event.target.value) as 90 | 180 | 270)}
              >
                <option value={90}>90°</option>
                <option value={180}>180°</option>
                <option value={270}>270°</option>
              </select>
            </label>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={rotateAll}
                onChange={(event) => setRotateAll(event.target.checked)}
              />
              {t("label.rotateAllPages")}
            </label>
            {!rotateAll && (
              <label>
                {t("label.targetPages")}
                <input
                  value={pagesInput}
                  onChange={(event) => setPagesInput(event.target.value)}
                />
              </label>
            )}
            <button
              type="button"
              className="btn primary"
              onClick={handleProcess}
              disabled={!files.length || processing === "processing"}
              aria-busy={processing === "processing"}
            >
              {processing === "processing" ? t("button.processing") : t("button.process")}
            </button>
          </div>
        ),
        result: (
          <>
            {processing === "error" && error && (
              <p role="alert" className="error">
                {error}
              </p>
            )}
            {singleResult && (
              <p>
                {t("tool.pdf-rotate.label.outputSize", { size: (singleResult.size / 1024).toFixed(2) })}
              </p>
            )}
            {items.length > 0 && files.length > 1 ? (
              <>
                <p>{t("batch.progress", { completed, total: files.length })}</p>
                <BatchFileResults items={items} />
                <DownloadCollectionButton results={successes} fileName="rotated-pdfs.zip" disabled={processing === "processing"} />
              </>
            ) : null}
            {singleResult ? (
              <DownloadButton
                result={singleResult}
                disabled={processing === "processing"}
                onDownloaded={() => trackEvent("download", { tool: "pdf-rotate" })}
              />
            ) : null}
          </>
        ),
        howItWorks,
        faq,
        relatedTools,
      }}
    />
  );
}
