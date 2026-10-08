import { useMemo, useState } from "react";
import { FileDropzone } from "../../components/FileDropzone";
import { FileInfo } from "../../components/FileInfo";
import { ToolPageTemplate } from "../../components/ToolPageTemplate";
import { useLanguage } from "../../context/LanguageContext";
import { FILE_TOOLS } from "../../data/tools";
import { useSeo } from "../../hooks/useSeo";
import {
  createUnlockedPdfResult,
  inspectPdfForPasswordRemoval,
  type PdfPasswordRemovalInfo,
} from "../../services/pdf/passwordService";
import { getPdfToolkitErrorMessage } from "../../services/pdf/pdfToolkit";
import type { ProcessingState, ToolMeta } from "../../types/tool";
import { downloadBlob } from "../../utils/download";
import { getRelatedTools } from "../../utils/toolHelpers";

export function RemovePasswordPage(): JSX.Element {
  const { t } = useLanguage();
  const [file, setFile] = useState<File | null>(null);
  const [info, setInfo] = useState<PdfPasswordRemovalInfo | null>(null);
  const [processing, setProcessing] = useState<ProcessingState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [downloaded, setDownloaded] = useState(false);

  const tool = FILE_TOOLS.find((item) => item.id === "pdf-remove-password") ?? FILE_TOOLS[0];
  const title = t("tool.pdf-remove-password.title");
  const description = t("tool.pdf-remove-password.description");
  const meta: ToolMeta = {
    title: `${title} - ${t("header.title")}`,
    description,
    canonical: "/pdf/remove-password",
    h1: title,
  };
  useSeo(meta);

  const howItWorks = useMemo(
    () => [0, 1, 2].map((index) => t(`tool.pdf-remove-password.how.${index}`)),
    [t]
  );
  const faq = useMemo(
    () =>
      [0, 1, 2].map((index) => ({
        q: t(`tool.pdf-remove-password.faq.${index}.question`),
        a: t(`tool.pdf-remove-password.faq.${index}.answer`),
      })),
    [t]
  );

  const inspectFile = async (selected: File): Promise<void> => {
    setFile(selected);
    setInfo(null);
    setError(null);
    setDownloaded(false);
    setProcessing("processing");
    try {
      const result = await inspectPdfForPasswordRemoval(selected);
      setInfo(result);
      setProcessing(result.encrypted ? "ready" : "success");
    } catch (cause) {
      setError(
        getPdfToolkitErrorMessage(
          cause,
          t,
          t("tool.pdf-remove-password.error.read")
        )
      );
      setProcessing("error");
    }
  };

  const handleDownload = (): void => {
    if (!file || !info?.encrypted || !info.unlockedBytes) return;
    setError(null);
    setProcessing("processing");
    try {
      const result = createUnlockedPdfResult(file, info.unlockedBytes);
      downloadBlob(result.blob, result.fileName);
      setInfo((current) =>
        current ? { ...current, unlockedBytes: undefined } : current
      );
      setDownloaded(true);
      setProcessing("success");
    } catch {
      setError(t("tool.pdf-remove-password.error.read"));
      setProcessing("error");
    }
  };

  return (
    <ToolPageTemplate
      tool={tool}
      meta={meta}
      breadcrumb={["Home", title]}
      workflow={{
        state: processing,
        error,
        onRetry: () => file && void inspectFile(file),
        onReprocess: handleDownload,
      }}
      children={{
        workspace: (
          <>
            <FileDropzone
              label={t("tool.pdf-remove-password.drop")}
              accept="application/pdf,.pdf"
              multiple={false}
              compact={Boolean(file)}
              disabled={processing === "processing"}
              onFiles={([selected]) => selected && void inspectFile(selected)}
            />
            <FileInfo files={file ? [file] : []} mode="single" compact={Boolean(file)} />
            {processing === "processing" ? (
              <p role="status">{t("tool.pdf-remove-password.checking")}</p>
            ) : null}
            {info ? (
              <section className="pdf-password-info" aria-live="polite">
                <p role="status">
                  {info.encrypted
                    ? downloaded
                      ? t("tool.pdf-remove-password.downloaded")
                      : t("tool.pdf-remove-password.unlocked")
                    : t("tool.pdf-remove-password.unencrypted")}
                </p>
                <dl>
                  <div>
                    <dt>{t("tool.pdf-remove-password.label.pageCount")}</dt>
                    <dd>{info.pageCount}</dd>
                  </div>
                  <div>
                    <dt>{t("tool.pdf-remove-password.label.pageSize")}</dt>
                    <dd>
                      {info.firstPageWidth.toFixed(2)} × {info.firstPageHeight.toFixed(2)} pt
                    </dd>
                  </div>
                  <div>
                    <dt>{t("tool.pdf-remove-password.label.orientation")}</dt>
                    <dd>
                      {t(
                        info.firstPageIsLandscape
                          ? "tool.pdf-remove-password.landscape"
                          : "tool.pdf-remove-password.portrait"
                      )}
                    </dd>
                  </div>
                </dl>
              </section>
            ) : null}
          </>
        ),
        options: (
          <div className="tool-form">
            <p>{t("tool.pdf-remove-password.warning")}</p>
            {info?.encrypted && info.unlockedBytes ? (
              <button
                type="button"
                className="btn primary"
                disabled={processing === "processing"}
                onClick={handleDownload}
              >
                {t("tool.pdf-remove-password.download")}
              </button>
            ) : null}
          </div>
        ),
        result: error ? <p role="alert" className="error">{error}</p> : <></>,
        howItWorks,
        faq,
        relatedTools: getRelatedTools("pdf-remove-password"),
      }}
    />
  );
}
