import { useMemo, useState } from "react";
import { DownloadButton } from "../../components/DownloadButton";
import { FileDropzone } from "../../components/FileDropzone";
import { FileInfo } from "../../components/FileInfo";
import { ToolPageTemplate } from "../../components/ToolPageTemplate";
import { useLanguage } from "../../context/LanguageContext";
import { FILE_TOOLS } from "../../data/tools";
import { useSeo } from "../../hooks/useSeo";
import {
  readPdfMetadata,
  removePdfMetadata,
  type PdfMetadata,
} from "../../services/pdf/metadataService";
import type { FileProcessResult, ProcessingState, ToolMeta } from "../../types/tool";
import { trackEvent } from "../../utils/analytics";
import { getRelatedTools } from "../../utils/toolHelpers";
import { validateFileSize, validateMime } from "../../utils/validation";

const METADATA_FIELDS: Array<{ key: keyof PdfMetadata; labelKey: string }> = [
  { key: "title", labelKey: "tool.pdf-metadata.field.title" },
  { key: "author", labelKey: "tool.pdf-metadata.field.author" },
  { key: "subject", labelKey: "tool.pdf-metadata.field.subject" },
  { key: "keywords", labelKey: "tool.pdf-metadata.field.keywords" },
  { key: "creator", labelKey: "tool.pdf-metadata.field.creator" },
  { key: "producer", labelKey: "tool.pdf-metadata.field.producer" },
  { key: "creationDate", labelKey: "tool.pdf-metadata.field.creationDate" },
  { key: "modificationDate", labelKey: "tool.pdf-metadata.field.modificationDate" },
];

function hasMetadata(metadata: PdfMetadata): boolean {
  return METADATA_FIELDS.some(({ key }) => metadata[key] !== undefined);
}

function formatMetadataValue(value: PdfMetadata[keyof PdfMetadata]): string {
  if (value instanceof Date) {
    return value.toLocaleString();
  }
  return value ?? "";
}

export function MetadataPage(): JSX.Element {
  const { t } = useLanguage();
  const [file, setFile] = useState<File | null>(null);
  const [metadata, setMetadata] = useState<PdfMetadata | null>(null);
  const [result, setResult] = useState<FileProcessResult | null>(null);
  const [processing, setProcessing] = useState<ProcessingState>("idle");
  const [error, setError] = useState<string | null>(null);

  const tool = FILE_TOOLS.find((item) => item.id === "pdf-metadata") ?? FILE_TOOLS[0];
  const title = t("tool.pdf-metadata.title");
  const description = t("tool.pdf-metadata.description");
  const meta: ToolMeta = {
    title: `${title} - ${t("header.title")}`,
    description,
    canonical: "/pdf/metadata",
    h1: title,
  };
  useSeo(meta);

  const howItWorks = useMemo(
    () => [0, 1, 2, 3].map((index) => t(`tool.pdf-metadata.how.${index}`)),
    [t]
  );
  const faq = useMemo(
    () => [0, 1, 2].map((index) => ({
      q: t(`tool.pdf-metadata.faq.${index}.question`),
      a: t(`tool.pdf-metadata.faq.${index}.answer`),
    })),
    [t]
  );

  const setProcessingError = (message: string): void => {
    setError(message);
    setProcessing("error");
  };

  const inspectFile = async (selected: File): Promise<void> => {
    setError(null);
    setMetadata(null);
    setResult(null);
    setProcessing("processing");
    trackEvent("workflow_ready", { tool: "pdf-metadata" });

    try {
      setMetadata(await readPdfMetadata(selected));
      setProcessing("idle");
    } catch (cause) {
      console.error(cause);
      setProcessingError(t("tool.pdf-metadata.error.read"));
      trackEvent("process_failed", { tool: "pdf-metadata" });
    }
  };

  const handleFiles = async (incoming: File[]): Promise<void> => {
    const selected = incoming[0];
    if (!selected) return;

    const validation = validateFileSize(selected) ?? validateMime(selected, "application/pdf");
    if (validation) {
      setProcessingError(validation.message);
      return;
    }

    setFile(selected);
    await inspectFile(selected);
  };

  const handleRemove = async (): Promise<void> => {
    if (!file) {
      setProcessingError(t("error.selectOneFile", { type: t("label.fileType.pdf") }));
      return;
    }

    setError(null);
    setResult(null);
    setProcessing("processing");
    trackEvent("process_start", { tool: "pdf-metadata" });

    try {
      setResult(await removePdfMetadata(file));
      setProcessing("success");
      trackEvent("process_success", { tool: "pdf-metadata" });
    } catch (cause) {
      console.error(cause);
      setProcessingError(t("tool.pdf-metadata.error.remove"));
      trackEvent("process_failed", { tool: "pdf-metadata" });
    }
  };

  const handleProcess = async (): Promise<void> => {
    if (!file) {
      setProcessingError(t("error.selectOneFile", { type: t("label.fileType.pdf") }));
      return;
    }
    if (!metadata) {
      await inspectFile(file);
      return;
    }
    await handleRemove();
  };

  const clearSelection = (): void => {
    setFile(null);
    setMetadata(null);
    setResult(null);
    setError(null);
    setProcessing("idle");
  };

  return (
    <ToolPageTemplate
      tool={tool}
      meta={meta}
      breadcrumb={["Home", title]}
      layout="split"
      showIdleResult
      workflow={{
        state: processing,
        error,
        onRetry: () => void handleProcess(),
        onReprocess: () => void handleProcess(),
      }}
      children={{
        workspace: (
          <>
            <FileDropzone
              label={t("label.dropPdf")}
              accept="application/pdf,.pdf"
              multiple={false}
              compact={Boolean(file)}
              disabled={processing === "processing"}
              onFiles={(incoming) => void handleFiles(incoming)}
            />
            <FileInfo
              files={file ? [file] : []}
              mode="single"
              compact={Boolean(file)}
              onClear={clearSelection}
            />
          </>
        ),
        options: (
          <div className="tool-form">
            <p>{t("tool.pdf-metadata.scope")}</p>
            <button
              type="button"
              className="btn primary"
              disabled={!file || metadata === null || processing === "processing"}
              aria-busy={processing === "processing"}
              onClick={() => void handleRemove()}
            >
              {processing === "processing"
                ? t("button.processing")
                : t("tool.pdf-metadata.remove")}
            </button>
          </div>
        ),
        result: (
          <>
            {metadata === null ? (
              <p>{file ? t("tool.pdf-metadata.reading") : t("tool.pdf-metadata.uploadHint")}</p>
            ) : hasMetadata(metadata) ? (
              <dl className="tool-form">
                {METADATA_FIELDS.map(({ key, labelKey }) => {
                  const value = metadata[key];
                  return value === undefined ? null : (
                    <div key={key}>
                      <dt><strong>{t(labelKey)}</strong></dt>
                      <dd>{formatMetadataValue(value)}</dd>
                    </div>
                  );
                })}
              </dl>
            ) : (
              <p>{t("tool.pdf-metadata.empty")}</p>
            )}
            {result ? (
              <>
                <p>{t("tool.pdf-metadata.resultReady", { size: (result.size / 1024).toFixed(2) })}</p>
                <DownloadButton
                  result={result}
                  disabled={processing === "processing"}
                  label={t("tool.pdf-metadata.download")}
                  onDownloaded={() => trackEvent("download", { tool: "pdf-metadata" })}
                />
              </>
            ) : null}
          </>
        ),
        howItWorks,
        faq,
        relatedTools: getRelatedTools("pdf-metadata"),
      }}
    />
  );
}
