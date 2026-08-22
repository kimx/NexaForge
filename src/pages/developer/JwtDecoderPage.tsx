import { useMemo, useState } from "react";
import { ProcessingState, ToolMeta, FileProcessResult } from "../../types/tool";
import { FILE_TOOLS } from "../../data/tools";
import { ToolPageTemplate } from "../../components/ToolPageTemplate";
import { DownloadButton } from "../../components/DownloadButton";
import { decodeJwtToken } from "../../services/jwt/jwtService";
import { getRelatedTools } from "../../utils/toolHelpers";
import { trackEvent } from "../../utils/analytics";
import { useSeo } from "../../hooks/useSeo";
import { useLanguage } from "../../context/LanguageContext";

export function JwtDecoderPage(): JSX.Element {
  const { t } = useLanguage();
  const [token, setToken] = useState("");
  const [processing, setProcessing] = useState<ProcessingState>("idle");
  const [decodedText, setDecodedText] = useState("");
  const [expirationText, setExpirationText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);

  const tool = FILE_TOOLS.find((item) => item.id === "jwt-decoder");
  const title = t("tool.jwt-decoder.title");
  const description = t("tool.jwt-decoder.description");
  const toolMeta: ToolMeta = {
    title: `${title} - ${t("header.title")}`,
    description,
    canonical: "/developer/jwt-decoder",
    h1: title,
  };
  useSeo(toolMeta);

  const relatedTools = getRelatedTools("jwt-decoder");
  const howItWorks = useMemo(
    () => [
      t("tool.jwt-decoder.how.0"),
      t("tool.jwt-decoder.how.1"),
      t("tool.jwt-decoder.how.2"),
    ],
    [t]
  );
  const faq = useMemo(
    () => [
      {
        q: t("tool.jwt-decoder.faq.0.question"),
        a: t("tool.jwt-decoder.faq.0.answer"),
      },
      {
        q: t("tool.jwt-decoder.faq.1.question"),
        a: t("tool.jwt-decoder.faq.1.answer"),
      },
    ],
    [t]
  );

  const extractExpirationText = (payload: unknown): string | null => {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return null;
    }

    const candidate = (payload as { exp?: unknown }).exp;
    if (candidate === undefined || candidate === null) {
      return null;
    }

    const epochSeconds =
      typeof candidate === "number"
        ? candidate
        : typeof candidate === "string"
          ? Number(candidate)
          : NaN;

    if (!Number.isFinite(epochSeconds) || epochSeconds <= 0) {
      return null;
    }

    const expiresAt = new Date(epochSeconds * 1000);
    if (Number.isNaN(expiresAt.getTime())) {
      return null;
    }

    const expired = Math.floor(Date.now() / 1000) > epochSeconds;
    const readable = expiresAt.toLocaleString();

    return `${t("tool.jwt-decoder.label.expiresAt", {
      time: readable,
      unix: String(epochSeconds),
    })}${expired ? ` ${t("tool.jwt-decoder.label.expired")}` : ""}`;
  };

  const decodedFile = useMemo<FileProcessResult | null>(() => {
    if (!decodedText) {
      return null;
    }

    const blob = new Blob([decodedText], { type: "application/json" });
    return {
      blob,
      fileName: "jwt-decoded.json",
      mimeType: "application/json",
      size: blob.size,
    };
  }, [decodedText]);

  const handleDecode = () => {
    setCopyError(null);
    setError(null);
    setExpirationText(null);

    if (!token.trim()) {
      setError(t("tool.jwt-decoder.error.noToken"));
      setProcessing("error");
      return;
    }

    setProcessing("processing");
    trackEvent("process_start", { tool: "jwt-decoder" });
    try {
      const result = decodeJwtToken(token);
      setDecodedText(JSON.stringify(result, null, 2));
      setExpirationText(extractExpirationText(result.payload));
      setProcessing("success");
      trackEvent("process_success", { tool: "jwt-decoder" });
    } catch (err) {
      setProcessing("error");
      setDecodedText("");
      setError(t("tool.jwt-decoder.error.decodeFailed"));
      trackEvent("process_failed", { tool: "jwt-decoder" });
      console.error(err);
    }
  };

  const handleCopyDecoded = async () => {
    try {
      await navigator.clipboard.writeText(decodedText);
      setCopyError(null);
    } catch {
      setCopyError(t("error.copyFailed"));
    }
  };

  return (
    <ToolPageTemplate
      tool={tool ?? FILE_TOOLS[0]}
      meta={toolMeta}
      breadcrumb={["Home", t("tool.jwt-decoder.title")]}
      children={{
        workspace: (
          <div className="tool-form">
            <label htmlFor="jwt-token-input">
              {t("tool.jwt-decoder.label.token")}
              <textarea
                id="jwt-token-input"
                rows={8}
                value={token}
                onChange={(event) => setToken(event.target.value)}
                placeholder={t("tool.jwt-decoder.label.tokenPlaceholder")}
              />
            </label>
          </div>
        ),
        options: (
          <div className="tool-form">
            <div className="tool-actions">
              <button
                type="button"
                className="btn primary"
                onClick={handleDecode}
                disabled={processing === "processing"}
                aria-busy={processing === "processing"}
              >
                {processing === "processing" ? t("button.processing") : t("tool.jwt-decoder.label.decodeButton")}
              </button>
            </div>
          </div>
        ),
        result: (
          <>
            {processing === "error" && error && <p role="alert" className="error">{error}</p>}
            {copyError && <p role="alert" className="error">{copyError}</p>}
            {expirationText && <p>{expirationText}</p>}
            <pre>{decodedText || t("tool.jwt-decoder.label.noOutput")}</pre>
            <div className="tool-actions">
              <button
                type="button"
                className="btn secondary"
                onClick={handleCopyDecoded}
                disabled={!decodedText || processing === "processing"}
              >
                {t("button.copy")}
              </button>
              <DownloadButton
                result={decodedFile}
                disabled={processing === "processing" || !decodedText}
                onDownloaded={() => trackEvent("download", { tool: "jwt-decoder" })}
              />
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
