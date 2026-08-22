import { useEffect, useRef, useState } from "react";
import { ToolPageTemplate } from "../../components/ToolPageTemplate";
import { FileDropzone } from "../../components/FileDropzone";
import { FileInfo } from "../../components/FileInfo";
import { FILE_TOOLS } from "../../data/tools";
import { useLanguage } from "../../context/LanguageContext";
import { useSeo } from "../../hooks/useSeo";
import { getRelatedTools } from "../../utils/toolHelpers";
import { trackEvent } from "../../utils/analytics";
import {
  readQrFromImage,
  startQrCamera,
  type QrCameraSession,
  type QrReadResult,
} from "../../services/qr/qrReaderService";
import type { ProcessingState, ToolDefinition, ToolMeta } from "../../types/tool";

const FALLBACK_TOOL: ToolDefinition = {
  id: "qr-reader",
  title: "QR Code Reader",
  description: "Read QR codes locally.",
  path: "/qr-code/reader",
  category: "Image",
};

export function QrReaderPage(): JSX.Element {
  const { t } = useLanguage();
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState<ProcessingState>("idle");
  const [result, setResult] = useState<QrReadResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [copyStatus, setCopyStatus] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const cameraSessionRef = useRef<QrCameraSession | null>(null);
  const mountedRef = useRef(true);
  const tool = FILE_TOOLS.find((item) => item.id === "qr-reader") ?? FALLBACK_TOOL;
  const title = t("tool.qr-reader.title");
  const meta: ToolMeta = {
    title: `${title} - ${t("header.title")}`,
    description: t("tool.qr-reader.description"),
    canonical: "/qr-code/reader",
    h1: title,
  };
  useSeo(meta);

  const stopCamera = (): void => {
    cameraSessionRef.current?.stop();
    cameraSessionRef.current = null;
    setCameraActive(false);
    setProcessing((state) => state === "processing" ? "idle" : state);
  };

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      cameraSessionRef.current?.stop();
    };
  }, []);

  const handleReadImage = async (): Promise<void> => {
    if (!files[0]) {
      setError(t("tool.qr-reader.error.file"));
      setProcessing("error");
      return;
    }
    stopCamera();
    setError(null);
    setResult(null);
    setProcessing("processing");
    trackEvent("process_start", { tool: "qr-reader" });
    try {
      const decoded = await readQrFromImage(files[0]);
      setResult(decoded);
      setProcessing("success");
      trackEvent("process_success", { tool: "qr-reader" });
    } catch (cause) {
      console.error(cause);
      setError(t("tool.qr-reader.error.noCode"));
      setProcessing("error");
      trackEvent("process_failed", { tool: "qr-reader" });
    }
  };

  const handleStartCamera = async (): Promise<void> => {
    if (!videoRef.current) return;
    stopCamera();
    setError(null);
    setResult(null);
    setCameraActive(true);
    setProcessing("processing");
    trackEvent("process_start", { tool: "qr-reader" });
    try {
      const session = await startQrCamera(
        videoRef.current,
        (decoded) => {
          if (!mountedRef.current) return;
          setResult(decoded);
          setCameraActive(false);
          setProcessing("success");
          trackEvent("process_success", { tool: "qr-reader" });
        },
        (cause) => console.error(cause)
      );
      if (!mountedRef.current) session.stop();
      else cameraSessionRef.current = session;
    } catch {
      setCameraActive(false);
      setError(t("tool.qr-reader.error.camera"));
      setProcessing("error");
      trackEvent("process_failed", { tool: "qr-reader" });
    }
  };

  const handleCopy = async (): Promise<void> => {
    if (!result) return;
    await navigator.clipboard?.writeText(result.text);
    setCopyStatus(t("tool.qr-reader.copied"));
  };

  return (
    <ToolPageTemplate
      tool={tool}
      meta={meta}
      breadcrumb={["Home", title]}
      workflow={{ state: processing, error, onRetry: files[0] ? handleReadImage : handleStartCamera }}
      children={{
        workspace: (
          <div className="issue23-form">
            <FileDropzone
              label={t("tool.qr-reader.dropzone")}
              accept="image/png,image/jpeg,image/webp"
              multiple={false}
              onFiles={(next) => {
                setFiles(next);
                setResult(null);
                setError(null);
                setProcessing("idle");
              }}
            />
            <FileInfo files={files} mode="single" onClear={() => setFiles([])} />
            <video
              ref={videoRef}
              className="qr-reader__video"
              aria-label={t("tool.qr-reader.videoLabel")}
              playsInline
              muted
              hidden={!cameraActive}
            />
          </div>
        ),
        options: (
          <div className="issue23-form">
            <p>{t("tool.qr-reader.cameraHint")}</p>
            <div className="issue23-actions">
              <button type="button" className="btn primary" onClick={handleReadImage} disabled={!files[0] || processing === "processing"}>
                {processing === "processing" && !cameraActive ? t("tool.qr-reader.reading") : t("tool.qr-reader.read")}
              </button>
              {cameraActive ? (
                <button type="button" className="btn secondary" onClick={stopCamera}>{t("tool.qr-reader.stopCamera")}</button>
              ) : (
                <button type="button" className="btn secondary" onClick={handleStartCamera}>{t("tool.qr-reader.startCamera")}</button>
              )}
            </div>
          </div>
        ),
        result: result ? (
          <div className="issue23-form">
            <h3>{t("tool.qr-reader.resultLabel")}</h3>
            <code className="issue23-code-output">{result.text}</code>
            <button type="button" className="btn primary" onClick={handleCopy}>{t("tool.qr-reader.copy")}</button>
            <span role="status" aria-live="polite">{copyStatus}</span>
          </div>
        ) : <p>{t("label.noResult")}</p>,
        howItWorks: [0, 1, 2].map((index) => t(`tool.qr-reader.how.${index}`)),
        faq: [0, 1].map((index) => ({ q: t(`tool.qr-reader.faq.${index}.question`), a: t(`tool.qr-reader.faq.${index}.answer`) })),
        relatedTools: getRelatedTools("qr-reader"),
      }}
    />
  );
}
