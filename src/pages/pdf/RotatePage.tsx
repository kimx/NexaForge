import { useMemo, useState } from "react";
import { ProcessingState, ToolMeta, FileProcessResult } from "../../types/tool";
import { FILE_TOOLS } from "../../data/tools";
import { ToolPageTemplate } from "../../components/ToolPageTemplate";
import { FileDropzone } from "../../components/FileDropzone";
import { FileInfo } from "../../components/FileInfo";
import { DownloadButton } from "../../components/DownloadButton";
import { rotatePdf } from "../../services/pdf/pdfService";
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
  const [result, setResult] = useState<FileProcessResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rotateAll, setRotateAll] = useState(true);

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

  const handleProcess = async () => {
    if (!files[0]) {
      setError(t("error.selectOneFile", { type: t("label.fileType.pdf") }));
      return;
    }
    const source = files[0];
    const sizeError = validateFileSize(source);
    const mimeError = validateMime(source, "application/pdf");
    if (sizeError || mimeError) {
      setError(sizeError?.message ?? mimeError?.message ?? t("error.invalidFile"));
      setProcessing("error");
      trackEvent("process_failed", { tool: "pdf-rotate" });
      return;
    }

    setError(null);
    setProcessing("processing");
    trackEvent("process_start", { tool: "pdf-rotate" });
    try {
      const output = await rotatePdf(source, degrees, rotateAll ? undefined : pagesInput);
      setResult(output);
      setProcessing("success");
      trackEvent("process_success", { tool: "pdf-rotate" });
    } catch (err) {
      setError(t("error.processingFailed"));
      setProcessing("error");
      trackEvent("process_failed", { tool: "pdf-rotate" });
      console.error(err);
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
              multiple={false}
              onFiles={setFiles}
              compact={files.length > 0}
            />
            <FileInfo files={files} mode="single" compact={files.length > 0} />
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
            {result && (
              <p>
                {t("tool.pdf-rotate.label.outputSize", { size: (result.size / 1024).toFixed(2) })}
              </p>
            )}
            {result ? (
              <DownloadButton
                result={result}
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
