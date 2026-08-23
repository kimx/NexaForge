import { useMemo, useState } from "react";
import { HashOptions, ProcessingState, ToolMeta } from "../../types/tool";
import { FILE_TOOLS } from "../../data/tools";
import { ToolPageTemplate } from "../../components/ToolPageTemplate";
import { FileInfo } from "../../components/FileInfo";
import { FileDropzone } from "../../components/FileDropzone";
import { DownloadButton } from "../../components/DownloadButton";
import { hashText } from "../../services/text/textService";
import { getRelatedTools } from "../../utils/toolHelpers";
import { trackEvent } from "../../utils/analytics";
import { useSeo } from "../../hooks/useSeo";
import { readFileAsText } from "../../services/file/fileService";
import { validateFileSize, validateMime } from "../../utils/validation";
import { useLanguage } from "../../context/LanguageContext";

export function HashPage(): JSX.Element {
  const { t } = useLanguage();
  const [files, setFiles] = useState<File[]>([]);
  const [algorithm, setAlgorithm] = useState<HashOptions["algorithm"]>("SHA-256");
  const [processing, setProcessing] = useState<ProcessingState>("idle");
  const [resultText, setResultText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const tool = FILE_TOOLS.find((item) => item.id === "hash");
  const title = t("tool.hash.title");
  const description = t("tool.hash.description");
  const toolMeta: ToolMeta = {
    title: `${title} - ${t("header.title")}`,
    description,
    canonical: "/text/hash",
    h1: title,
  };
  useSeo(toolMeta);

  const relatedTools = getRelatedTools("hash");
  const howItWorks = useMemo(
    () => [
      t("tool.hash.how.0"),
      t("tool.hash.how.1"),
      t("tool.hash.how.2"),
    ],
    [t]
  );
  const faq = useMemo(
    () => [
      {
        q: t("tool.hash.faq.0.question"),
        a: t("tool.hash.faq.0.answer"),
      },
      {
        q: t("tool.hash.faq.1.question"),
        a: t("tool.hash.faq.1.answer"),
      },
    ],
    [t]
  );

  const handleProcess = async () => {
    const source = files[0];
    if (!source) {
      setError(t("error.selectOneFile", { type: t("label.fileType.file") }));
      return;
    }
    const mimeError = validateMime(source, "*/*");
    const sizeError = validateFileSize(source);
    if (mimeError || sizeError) {
      setError(mimeError?.message ?? sizeError?.message ?? t("error.invalidFile"));
      setProcessing("error");
      trackEvent("process_failed", { tool: "hash" });
      return;
    }

    setError(null);
    setProcessing("processing");
    trackEvent("process_start", { tool: "hash" });
    try {
      const text = await readFileAsText(source);
      const digest = await hashText(text, { algorithm });
      setResultText(digest);
      setProcessing("success");
      trackEvent("process_success", { tool: "hash" });
    } catch (err) {
      setError(t("error.processingFailed"));
      setProcessing("error");
      trackEvent("process_failed", { tool: "hash" });
      console.error(err);
    }
  };

  return (
      <ToolPageTemplate
        tool={tool ?? FILE_TOOLS[0]}
        meta={toolMeta}
        breadcrumb={["Home", t("tool.hash.title")]}
        children={{
        workspace: (
          <>
            <FileDropzone
              label={t("label.dropFile")}
              accept="*/*"
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
              {t("label.algorithm")}
              <select value={algorithm} onChange={(event) => setAlgorithm(event.target.value as HashOptions["algorithm"])}>
                <option value="SHA-1">SHA-1</option>
                <option value="SHA-256">SHA-256</option>
                <option value="SHA-384">SHA-384</option>
                <option value="SHA-512">SHA-512</option>
              </select>
            </label>
            <div className="tool-actions">
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
          </div>
        ),
        result: (
          <>
            {error && <p role="alert" className="error">{error}</p>}
            {resultText ? <pre>{resultText}</pre> : <p>{t("tool.hash.label.noOutput")}</p>}
            <div className="tool-actions">
              <button
                type="button"
                className="btn secondary"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(resultText);
                  } catch {
                    setError(t("error.copyFailed"));
                  }
                }}
                disabled={!resultText || processing === "processing"}
              >
                {t("button.copy")}
              </button>
              {resultText ? (
                <DownloadButton
                  result={{
                    blob: new Blob([resultText], { type: "text/plain" }),
                    fileName: `${files[0]?.name ?? "hash"}.txt`,
                    mimeType: "text/plain",
                    size: resultText.length,
                  }}
                  disabled={processing === "processing"}
                  onDownloaded={() => trackEvent("download", { tool: "hash" })}
                />
              ) : null}
            </div>
          </>
        ),
        howItWorks,
        faq,
        relatedTools,
      }}
    />
  );
}
