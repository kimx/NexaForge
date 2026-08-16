import { useMemo, useState } from "react";
import { ProcessingState, ToolMeta, FileProcessResult } from "../../types/tool";
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

export function PdfMergePage(): JSX.Element {
  const { t } = useLanguage();
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState<ProcessingState>("idle");
  const [result, setResult] = useState<FileProcessResult | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      return next;
    });
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
              onFiles={setFiles}
            />
            <ol className="reorder-list">
              {files.map((file, index) => (
                <li key={`${file.name}-${file.size}-${index}`}>
                  <span>
                    {index + 1}. {file.name}
                  </span>
                  <div className="button-row">
                    <button type="button" onClick={() => moveFile(index, -1)} disabled={index === 0}>
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => moveFile(index, 1)}
                      disabled={index === files.length - 1}
                    >
                      ↓
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
            {processing === "error" && error && (
              <p role="alert" className="error">
                {error}
              </p>
            )}
            {result ? (
              <p>{t("tool.pdf-merge.label.outputSize", { size: (result.size / 1024).toFixed(2) })}</p>
            ) : (
              <p>{t("label.noResult")}</p>
            )}
            <DownloadButton
              result={result}
              disabled={processing === "processing"}
              onDownloaded={() => trackEvent("download", { tool: "pdf-merge" })}
            />
          </>
        ),
        howItWorks,
        faq,
        relatedTools,
      }}
    />
  );
}
