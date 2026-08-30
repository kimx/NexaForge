import { useEffect, useMemo, useRef, useState } from "react";
import { ToolPageTemplate } from "../../components/ToolPageTemplate";
import { DownloadButton } from "../../components/DownloadButton";
import { FILE_TOOLS } from "../../data/tools";
import { useLanguage } from "../../context/LanguageContext";
import { useSeo } from "../../hooks/useSeo";
import { useBlobUrl } from "../../hooks/useBlobUrl";
import { getRelatedTools } from "../../utils/toolHelpers";
import { trackEvent } from "../../utils/analytics";
import { generateQrDesign } from "../../services/qr/qrService";
import { readQrFromImage } from "../../services/qr/qrReaderService";
import {
  buildEmailPayload,
  buildLinePayload,
  buildPhonePayload,
  buildSmsPayload,
  buildVCardPayload,
  buildWifiPayload,
  type QrContentType,
  type VCardQrInput,
  type WifiQrInput,
  type WifiSecurity,
} from "../../services/qr/qrPayloads";
import type {
  FileProcessResult,
  ProcessingState,
  QrCodeOptions,
  QrCornerStyle,
  QrDesignerOptions,
  QrGradientType,
  QrLogoBackground,
  QrLogoSource,
  QrModuleStyle,
  ToolMeta,
} from "../../types/tool";

const QR_DESIGNER_STORAGE_KEY = "nexaforge-qr-designer-settings";
const LOGO_MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED_LOGO_TYPES = new Set(["image/png", "image/jpeg", "image/svg+xml", "image/webp"]);

const DEFAULT_SETTINGS: QrDesignerOptions = {
  size: 256,
  errorCorrectionLevel: "M",
  margin: 16,
  moduleStyle: "square",
  cornerOuterStyle: "square",
  cornerInnerStyle: "square",
  foregroundColor: "#000000",
  backgroundColor: "#ffffff",
  transparentBackground: false,
  cornerOuterColor: "#000000",
  cornerInnerColor: "#000000",
  gradient: "none",
  gradientStartColor: "#2563eb",
  gradientEndColor: "#7c3aed",
  gradientAngle: 45,
  logoSource: "none",
  logoSize: 20,
  logoBackground: "circle",
  logoPadding: 6,
  logoCornerRadius: 10,
};

type QrPreset = "classic" | "rounded" | "dots" | "line" | "dark" | "colorful";
type QrToolId = "qr-code" | "wifi-qr" | "vcard-qr";

interface QrPageProps {
  initialContentType?: QrContentType;
  toolId?: QrToolId;
}

function readSettings(): QrDesignerOptions {
  if (typeof window === "undefined") {
    return DEFAULT_SETTINGS;
  }

  try {
    const stored = JSON.parse(window.localStorage.getItem(QR_DESIGNER_STORAGE_KEY) ?? "{}") as Partial<QrDesignerOptions>;
    const parameters = new URLSearchParams(window.location.search);
    const style = parameters.get("style");
    const color = parameters.get("color");
    const size = Number(parameters.get("size"));
    const margin = Number(parameters.get("margin"));
    const urlSettings: Partial<QrDesignerOptions> = {
      ...(style === "square" || style === "rounded" || style === "dots" || style === "extra-rounded"
        ? { moduleStyle: style }
        : {}),
      ...(color && /^[\da-f]{6}$/i.test(color) ? { foregroundColor: `#${color}` } : {}),
      ...(Number.isInteger(size) && size >= 128 && size <= 1024 ? { size } : {}),
      ...(Number.isInteger(margin) && margin >= 0 && margin <= 64 ? { margin } : {}),
    };
    return {
      ...DEFAULT_SETTINGS,
      ...stored,
      ...urlSettings,
      logoSource: "none",
      logoDataUrl: undefined,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function getPresetSettings(preset: QrPreset): QrDesignerOptions {
  switch (preset) {
    case "rounded":
      return { ...DEFAULT_SETTINGS, moduleStyle: "rounded", cornerOuterStyle: "rounded", cornerInnerStyle: "rounded" };
    case "dots":
      return { ...DEFAULT_SETTINGS, moduleStyle: "dots", cornerOuterStyle: "rounded", cornerInnerStyle: "dot" };
    case "line":
      return {
        ...DEFAULT_SETTINGS,
        logoSource: "line",
        errorCorrectionLevel: "H",
        logoSize: 20,
        logoBackground: "circle",
        moduleStyle: "rounded",
        cornerOuterStyle: "rounded",
        cornerInnerStyle: "rounded",
      };
    case "dark":
      return {
        ...DEFAULT_SETTINGS,
        foregroundColor: "#ffffff",
        backgroundColor: "#111827",
        cornerOuterColor: "#ffffff",
        cornerInnerColor: "#ffffff",
        gradient: "none",
      };
    case "colorful":
      return {
        ...DEFAULT_SETTINGS,
        foregroundColor: "#2563eb",
        cornerOuterColor: "#2563eb",
        cornerInnerColor: "#7c3aed",
        gradient: "linear",
        gradientStartColor: "#2563eb",
        gradientEndColor: "#7c3aed",
        gradientAngle: 45,
        moduleStyle: "rounded",
      };
    default:
      return {
        ...DEFAULT_SETTINGS,
        logoSource: "none",
        logoDataUrl: undefined,
      };
  }
}

function hasLowContrast(foreground: string, background: string): boolean {
  const getLuminance = (color: string): number | null => {
    const match = /^#([\da-f]{6})$/i.exec(color);
    if (!match) {
      return null;
    }
    const channels = [0, 2, 4].map((index) => Number.parseInt(match[1].slice(index, index + 2), 16) / 255);
    const linearChannels = channels.map((channel) =>
      channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
    );
    return linearChannels[0] * 0.2126 + linearChannels[1] * 0.7152 + linearChannels[2] * 0.0722;
  };

  const foregroundLuminance = getLuminance(foreground);
  const backgroundLuminance = getLuminance(background);
  if (foregroundLuminance === null || backgroundLuminance === null) {
    return false;
  }
  return (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) /
    (Math.min(foregroundLuminance, backgroundLuminance) + 0.05) < 4.5;
}

export function createSettingsShareUrl(settings: QrDesignerOptions): string {
  const parameters = new URLSearchParams({
    style: settings.moduleStyle,
    color: settings.foregroundColor.slice(1),
    size: String(settings.size),
    margin: String(settings.margin),
  });
  return `${window.location.origin}${window.location.pathname}?${parameters.toString()}`;
}

export function QrPage({ initialContentType = "url", toolId = "qr-code" }: QrPageProps): JSX.Element {
  const { t } = useLanguage();
  const [contentType, setContentType] = useState<QrContentType>(initialContentType);
  const [text, setText] = useState("https://example.com");
  const [wifi, setWifi] = useState<WifiQrInput>({ ssid: "", password: "", security: "WPA", hidden: false });
  const [card, setCard] = useState<VCardQrInput>({ firstName: "", lastName: "", phone: "", email: "", organization: "", title: "", url: "", address: "" });
  const [email, setEmail] = useState({ address: "", subject: "", body: "" });
  const [phone, setPhone] = useState("");
  const [sms, setSms] = useState({ phone: "", message: "" });
  const [line, setLine] = useState("");
  const [settings, setSettings] = useState<QrDesignerOptions>(readSettings);
  const [processing, setProcessing] = useState<ProcessingState>("idle");
  const [pngResult, setPngResult] = useState<FileProcessResult | null>(null);
  const [svgResult, setSvgResult] = useState<FileProcessResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [scanState, setScanState] = useState<"idle" | "testing" | "success" | "warning">("idle");
  const [actionStatus, setActionStatus] = useState("");
  const previewUrl = useBlobUrl(pngResult?.blob);
  const renderVersion = useRef(0);
  const tool = FILE_TOOLS.find((item) => item.id === toolId) ?? FILE_TOOLS[0];
  const title = t(`tool.${toolId}.title`);
  const toolMeta: ToolMeta = {
    title: `${title} - ${t("header.title")}`,
    description: t(`tool.${toolId}.description`),
    canonical: tool.path,
    h1: title,
  };
  useSeo(toolMeta);
  const lineModeLogoState = useRef<{
    logoSource: QrLogoSource;
    logoDataUrl: string | undefined;
    errorCorrectionLevel: QrCodeOptions["errorCorrectionLevel"];
  } | null>(null);

  const payload = useMemo(() => {
    try {
      switch (contentType) {
        case "wifi":
          return buildWifiPayload(wifi);
        case "vcard":
          return buildVCardPayload(card);
        case "email":
          return buildEmailPayload(email.address, email.subject, email.body);
        case "phone":
          return buildPhonePayload(phone);
        case "sms":
          return buildSmsPayload(sms.phone, sms.message);
        case "line":
          return buildLinePayload(line);
        default:
          return text.trim();
      }
    } catch {
      return "";
    }
  }, [card, contentType, email, line, phone, sms, text, wifi]);

  const logoEnabled = settings.logoSource === "line" || (settings.logoSource === "custom" && Boolean(settings.logoDataUrl));
  const maxMargin = Math.min(64, Math.floor(settings.size / 4));
  const warnings = [
    logoEnabled ? t("tool.qr-code.warning.logo") : null,
    !settings.transparentBackground && hasLowContrast(settings.foregroundColor, settings.backgroundColor)
      ? t("tool.qr-code.warning.contrast")
      : null,
    settings.margin < 8 ? t("tool.qr-code.warning.margin") : null,
    settings.transparentBackground ? t("tool.qr-code.warning.transparent") : null,
  ].filter((warning): warning is string => Boolean(warning));
  const howItWorks = useMemo(
    () => [t("tool.qr-code.how.0"), t("tool.qr-code.how.1"), t("tool.qr-code.how.2")],
    [t]
  );
  const faq = useMemo(
    () => [
      { q: t("tool.qr-code.faq.0.question"), a: t("tool.qr-code.faq.0.answer") },
      { q: t("tool.qr-code.faq.1.question"), a: t("tool.qr-code.faq.1.answer") },
    ],
    [t]
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const { logoDataUrl: _logoDataUrl, logoSource: _logoSource, ...persistedSettings } = settings;
    try {
      window.localStorage.setItem(QR_DESIGNER_STORAGE_KEY, JSON.stringify(persistedSettings));
    } catch {
      // Settings persistence is optional when browser storage is unavailable.
    }
  }, [settings]);

  useEffect(() => {
    const version = ++renderVersion.current;
    setScanState("idle");
    if (!payload) {
      setPngResult(null);
      setSvgResult(null);
      setProcessing("idle");
      setError(null);
      return;
    }

    const timer = window.setTimeout(() => {
      setProcessing("processing");
      setError(null);
      trackEvent("process_start", { tool: toolId });
      void generateQrDesign(payload, settings)
        .then((result) => {
          if (renderVersion.current !== version) {
            return;
          }
          setPngResult(result.png);
          setSvgResult(result.svg);
          setProcessing("success");
          trackEvent("process_success", { tool: toolId });
        })
        .catch((cause: unknown) => {
          if (renderVersion.current !== version) {
            return;
          }
          console.error(cause);
          setProcessing("error");
          setError(t("error.processingFailed"));
          trackEvent("process_failed", { tool: toolId });
        });
    }, 150);

    return () => {
      window.clearTimeout(timer);
    };
  }, [payload, settings, t, toolId]);

  const updateSetting = <Key extends keyof QrDesignerOptions>(key: Key, value: QrDesignerOptions[Key]): void => {
    setSettings((current) => ({ ...current, [key]: value }));
  };

  const changeLogoSource = (logoSource: QrLogoSource): void => {
    setSettings((current) => ({
      ...current,
      logoSource,
      logoDataUrl: logoSource === "none" ? undefined : current.logoDataUrl,
      errorCorrectionLevel: logoSource === "line" || (logoSource === "custom" && Boolean(current.logoDataUrl))
        ? "H"
        : current.errorCorrectionLevel,
    }));
  };

  const applyPreset = (preset: QrPreset): void => {
    setSettings(() => ({
      ...getPresetSettings(preset),
      logoDataUrl: undefined,
    }));
  };

  const restoreLogoState = (): void => {
    if (!lineModeLogoState.current) {
      return;
    }
    setSettings((current) => ({
      ...current,
      logoSource: lineModeLogoState.current?.logoSource ?? "none",
      logoDataUrl: lineModeLogoState.current?.logoDataUrl,
      errorCorrectionLevel: lineModeLogoState.current?.errorCorrectionLevel ?? current.errorCorrectionLevel,
    }));
    lineModeLogoState.current = null;
  };

  const applyLineLogo = (): void => {
    if (settings.logoSource !== "line" && lineModeLogoState.current === null) {
      lineModeLogoState.current = {
        logoSource: settings.logoSource,
        logoDataUrl: settings.logoSource === "custom" ? settings.logoDataUrl : undefined,
        errorCorrectionLevel: settings.errorCorrectionLevel,
      };
    }
    setSettings((current) => ({
      ...current,
      logoSource: "line",
      logoDataUrl: undefined,
      errorCorrectionLevel: "H",
    }));
  };

  const handleLogoUpload = (file: File | undefined): void => {
    if (!file) {
      return;
    }
    if (!ACCEPTED_LOGO_TYPES.has(file.type) || file.size > LOGO_MAX_BYTES) {
      setLogoError(t("tool.qr-code.error.logoFile"));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const logoDataUrl = reader.result;
      if (typeof logoDataUrl !== "string") {
        setLogoError(t("tool.qr-code.error.logoFile"));
        return;
      }
      setSettings((current) => ({
        ...current,
        logoSource: "custom",
        logoDataUrl,
        errorCorrectionLevel: "H",
      }));
      setLogoError(null);
    };
    reader.onerror = () => setLogoError(t("tool.qr-code.error.logoFile"));
    reader.readAsDataURL(file);
  };

  const changeSize = (size: number): void => {
    setSettings((current) => ({
      ...current,
      size,
      margin: Math.min(current.margin, Math.min(64, Math.floor(size / 4))),
    }));
  };

  const applyExample = (type: QrContentType): void => {
    handleContentTypeChange(type);
    if (type === "url") setText("https://nexaforge.kimx.info");
    if (type === "line") {
      setLine("@nexaforge");
    }
    if (type === "email") setEmail({ address: "hello@example.com", subject: "Hello", body: "" });
    if (type === "phone") setPhone("+886 912 345 678");
    if (type === "text") setText("Hello from NexaForge");
  };

  const handleContentTypeChange = (type: QrContentType): void => {
    if (type === contentType) {
      return;
    }
    if (type === "line") {
      applyLineLogo();
    } else if (contentType === "line") {
      restoreLogoState();
    }
    setContentType(type);
  };

  const handleCopyImage = async (): Promise<void> => {
    if (!pngResult || !navigator.clipboard?.write || typeof ClipboardItem === "undefined") {
      setActionStatus(t("tool.qr-code.copyImageUnavailable"));
      return;
    }
    try {
      await navigator.clipboard.write([new ClipboardItem({ "image/png": pngResult.blob })]);
      setActionStatus(t("tool.qr-code.copyImageSuccess"));
      trackEvent("result_action_used", { tool: toolId, action: "copy_qr_image" });
    } catch {
      setActionStatus(t("tool.qr-code.copyImageUnavailable"));
    }
  };

  const handleCopySettingsLink = async (): Promise<void> => {
    if (!navigator.clipboard?.writeText) {
      setActionStatus(t("tool.qr-code.copySettingsUnavailable"));
      return;
    }
    try {
      await navigator.clipboard.writeText(createSettingsShareUrl(settings));
      setActionStatus(t("tool.qr-code.copySettingsSuccess"));
      trackEvent("result_action_used", { tool: toolId, action: "copy_qr_settings_link" });
    } catch {
      setActionStatus(t("tool.qr-code.copySettingsUnavailable"));
    }
  };

  const handleScanTest = async (): Promise<void> => {
    if (!pngResult || !payload) {
      return;
    }
    setScanState("testing");
    try {
      const decoded = await readQrFromImage(pngResult.blob);
      setScanState(decoded.text === payload ? "success" : "warning");
      trackEvent("result_action_used", { tool: toolId, action: "scan_test" });
    } catch {
      setScanState("warning");
      trackEvent("result_action_used", { tool: toolId, action: "scan_test" });
    }
  };

  const colorInput = (
    key:
      | "foregroundColor"
      | "backgroundColor"
      | "cornerOuterColor"
      | "cornerInnerColor"
      | "gradientStartColor"
      | "gradientEndColor",
    label: string,
    disabled = false
  ): JSX.Element => (
    <label className="qr-designer__color-control">
      <span>{label}</span>
      <input
        type="color"
        value={settings[key]}
        disabled={disabled}
        onChange={(event) => updateSetting(key, event.target.value)}
      />
    </label>
  );

  const contentFields = (() => {
    switch (contentType) {
      case "wifi":
        return (
          <>
            <label>{t("tool.qr-code.content.ssid")}<input value={wifi.ssid} onChange={(event) => setWifi((current) => ({ ...current, ssid: event.target.value }))} /></label>
            <label>{t("tool.qr-code.content.password")}<input type="password" value={wifi.password} disabled={wifi.security === "nopass"} onChange={(event) => setWifi((current) => ({ ...current, password: event.target.value }))} /></label>
            <label>{t("tool.qr-code.content.security")}<select value={wifi.security} onChange={(event) => setWifi((current) => ({ ...current, security: event.target.value as WifiSecurity }))}>
              <option value="WPA">WPA / WPA2</option><option value="WEP">WEP</option><option value="nopass">{t("tool.qr-code.content.openNetwork")}</option>
            </select></label>
            <label className="qr-designer__checkbox"><input type="checkbox" checked={wifi.hidden} onChange={(event) => setWifi((current) => ({ ...current, hidden: event.target.checked }))} />{t("tool.qr-code.content.hidden")}</label>
          </>
        );
      case "vcard": {
        const fields: Array<[keyof VCardQrInput, string, string]> = [
          ["firstName", t("tool.qr-code.content.firstName"), "text"], ["lastName", t("tool.qr-code.content.lastName"), "text"],
          ["phone", t("tool.qr-code.content.phone"), "tel"], ["email", t("tool.qr-code.content.email"), "email"],
          ["organization", t("tool.qr-code.content.organization"), "text"], ["title", t("tool.qr-code.content.jobTitle"), "text"],
          ["url", t("tool.qr-code.content.url"), "url"], ["address", t("tool.qr-code.content.address"), "text"],
        ];
        return <div className="qr-designer__field-grid">{fields.map(([key, label, type]) => <label key={key}>{label}<input type={type} value={card[key] ?? ""} onChange={(event) => setCard((current) => ({ ...current, [key]: event.target.value }))} /></label>)}</div>;
      }
      case "email":
        return <><label>{t("tool.qr-code.content.email")}<input type="email" value={email.address} onChange={(event) => setEmail((current) => ({ ...current, address: event.target.value }))} /></label><label>{t("tool.qr-code.content.subject")}<input value={email.subject} onChange={(event) => setEmail((current) => ({ ...current, subject: event.target.value }))} /></label><label>{t("tool.qr-code.content.message")}<textarea rows={3} value={email.body} onChange={(event) => setEmail((current) => ({ ...current, body: event.target.value }))} /></label></>;
      case "phone":
        return <label>{t("tool.qr-code.content.phone")}<input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} /></label>;
      case "sms":
        return <><label>{t("tool.qr-code.content.phone")}<input type="tel" value={sms.phone} onChange={(event) => setSms((current) => ({ ...current, phone: event.target.value }))} /></label><label>{t("tool.qr-code.content.message")}<textarea rows={3} value={sms.message} onChange={(event) => setSms((current) => ({ ...current, message: event.target.value }))} /></label></>;
      case "line":
        return <label>{t("tool.qr-code.content.line")}<input value={line} onChange={(event) => setLine(event.target.value)} /></label>;
      case "text":
        return <label>{t("tool.qr-code.content.text")}<textarea rows={4} value={text} onChange={(event) => setText(event.target.value)} /></label>;
      default:
        return <label>{t("tool.qr-code.content.url")}<input type="url" value={text} onChange={(event) => setText(event.target.value)} /></label>;
    }
  })();

  return (
    <ToolPageTemplate
      tool={tool}
      meta={toolMeta}
      breadcrumb={["Home", title]}
      layout="split"
      showIdleResult
      workflow={{ state: processing, error }}
      children={{
        workspace: (
          <div className="tool-form qr-designer">
            <label>{t("tool.qr-code.contentType")}
              <select value={contentType} onChange={(event) => handleContentTypeChange(event.target.value as QrContentType)}>
                {(["url", "text", "wifi", "vcard", "email", "phone", "sms", "line"] as QrContentType[]).map((type) => <option key={type} value={type}>{t(`tool.qr-code.contentType.${type}`)}</option>)}
              </select>
            </label>
            {contentFields}
            <fieldset className="qr-designer__section">
              <legend>{t("tool.qr-code.quickExamples")}</legend>
              <div className="qr-designer__presets">
                {(["url", "line", "email", "phone", "text"] as QrContentType[]).map((type) => <button key={type} type="button" className="btn secondary" aria-label={`${t(`tool.qr-code.example.${type}`)} ${t("tool.qr-code.quickExamples")}`} onClick={() => applyExample(type)}>{t(`tool.qr-code.example.${type}`)}</button>)}
              </div>
            </fieldset>
          </div>
        ),
        options: (
          <div className="tool-form qr-designer">
            <fieldset className="qr-designer__section">
              <legend>{t("tool.qr-code.basic")}</legend>
              <label>
                {t("label.size")}
                <input
                  type="range"
                  min={128}
                  max={1024}
                  step={16}
                  value={settings.size}
                  onChange={(event) => changeSize(Number(event.target.value))}
                />
                <output>{t("tool.qr-code.label.sizePixel", { size: settings.size })}</output>
              </label>
              <label>
                {t("tool.qr-code.label.errorCorrection")}
                <select
                  value={settings.errorCorrectionLevel}
                  disabled={logoEnabled}
                  onChange={(event) => updateSetting("errorCorrectionLevel", event.target.value as QrCodeOptions["errorCorrectionLevel"])}
                >
                  <option value="L">L</option>
                  <option value="M">M</option>
                  <option value="Q">Q</option>
                  <option value="H">H</option>
                </select>
              </label>
              <label>
                {t("tool.qr-code.margin")}
                <input
                  type="range"
                  min={0}
                  max={maxMargin}
                  value={settings.margin}
                  onChange={(event) => updateSetting("margin", Number(event.target.value))}
                />
                <output>{t("tool.qr-code.marginPixel", { margin: settings.margin })}</output>
              </label>
            </fieldset>

            <fieldset className="qr-designer__section">
              <legend>{t("tool.qr-code.style")}</legend>
              <div className="qr-designer__field-grid">
                <label>
                  {t("tool.qr-code.moduleStyle")}
                  <select value={settings.moduleStyle} onChange={(event) => updateSetting("moduleStyle", event.target.value as QrModuleStyle)}>
                    <option value="square">{t("tool.qr-code.style.square")}</option>
                    <option value="rounded">{t("tool.qr-code.style.rounded")}</option>
                    <option value="dots">{t("tool.qr-code.style.dots")}</option>
                    <option value="extra-rounded">{t("tool.qr-code.style.extraRounded")}</option>
                  </select>
                </label>
                <label>
                  {t("tool.qr-code.cornerOuter")}
                  <select value={settings.cornerOuterStyle} onChange={(event) => updateSetting("cornerOuterStyle", event.target.value as QrCornerStyle)}>
                    <option value="square">{t("tool.qr-code.style.square")}</option>
                    <option value="rounded">{t("tool.qr-code.style.rounded")}</option>
                    <option value="dot">{t("tool.qr-code.style.dot")}</option>
                  </select>
                </label>
                <label>
                  {t("tool.qr-code.cornerInner")}
                  <select value={settings.cornerInnerStyle} onChange={(event) => updateSetting("cornerInnerStyle", event.target.value as QrCornerStyle)}>
                    <option value="square">{t("tool.qr-code.style.square")}</option>
                    <option value="rounded">{t("tool.qr-code.style.rounded")}</option>
                    <option value="dot">{t("tool.qr-code.style.dot")}</option>
                  </select>
                </label>
              </div>
              <div className="qr-designer__color-grid">
                {colorInput("foregroundColor", t("tool.qr-code.foreground"))}
                {colorInput("backgroundColor", t("tool.qr-code.background"), settings.transparentBackground)}
                {colorInput("cornerOuterColor", t("tool.qr-code.cornerOuterColor"))}
                {colorInput("cornerInnerColor", t("tool.qr-code.cornerInnerColor"))}
              </div>
              <label className="qr-designer__checkbox">
                <input
                  type="checkbox"
                  checked={settings.transparentBackground}
                  onChange={(event) => updateSetting("transparentBackground", event.target.checked)}
                />
                {t("tool.qr-code.transparent")}
              </label>
              <label>
                {t("tool.qr-code.gradient")}
                <select value={settings.gradient} onChange={(event) => updateSetting("gradient", event.target.value as QrGradientType)}>
                  <option value="none">{t("tool.qr-code.gradient.none")}</option>
                  <option value="linear">{t("tool.qr-code.gradient.linear")}</option>
                  <option value="radial">{t("tool.qr-code.gradient.radial")}</option>
                </select>
              </label>
              {settings.gradient !== "none" ? (
                <div className="qr-designer__color-grid">
                  {colorInput("gradientStartColor", t("tool.qr-code.gradientStart"))}
                  {colorInput("gradientEndColor", t("tool.qr-code.gradientEnd"))}
                  {settings.gradient === "linear" ? (
                    <label>
                      {t("tool.qr-code.gradientAngle")}
                      <input
                        type="range"
                        min={0}
                        max={360}
                        value={settings.gradientAngle}
                        onChange={(event) => updateSetting("gradientAngle", Number(event.target.value))}
                      />
                      <output>{settings.gradientAngle}°</output>
                    </label>
                  ) : null}
                </div>
              ) : null}
            </fieldset>

            <fieldset className="qr-designer__section">
              <legend>{t("tool.qr-code.logo")}</legend>
              <div className="qr-designer__logo-sources" role="radiogroup" aria-label={t("tool.qr-code.logo")}>
                {(["none", "line", "custom"] as QrLogoSource[]).map((source) => (
                  <label key={source}>
                    <input
                      type="radio"
                      name="qr-logo-source"
                      value={source}
                      checked={settings.logoSource === source}
                      onChange={() => changeLogoSource(source)}
                    />
                    {t(`tool.qr-code.logo.${source === "custom" ? "upload" : source}`)}
                  </label>
                ))}
              </div>
              {settings.logoSource === "custom" ? (
                <label>
                  {t("tool.qr-code.logo.upload")}
                  <input
                    type="file"
                    accept=".png,.jpg,.jpeg,.svg,.webp,image/png,image/jpeg,image/svg+xml,image/webp"
                    onChange={(event) => handleLogoUpload(event.target.files?.[0])}
                  />
                </label>
              ) : null}
              {logoEnabled ? (
                <>
                  <label>
                    {t("tool.qr-code.logo.size")}
                    <input
                      type="range"
                      min={10}
                      max={25}
                      value={settings.logoSize}
                      onChange={(event) => updateSetting("logoSize", Number(event.target.value))}
                    />
                    <output>{settings.logoSize}%</output>
                  </label>
                  <label>
                    {t("tool.qr-code.logo.background")}
                    <select
                      value={settings.logoBackground}
                      onChange={(event) => updateSetting("logoBackground", event.target.value as QrLogoBackground)}
                    >
                      <option value="circle">{t("tool.qr-code.logo.background.circle")}</option>
                      <option value="rounded">{t("tool.qr-code.logo.background.rounded")}</option>
                      <option value="transparent">{t("tool.qr-code.logo.background.transparent")}</option>
                    </select>
                  </label>
                  <div className="qr-designer__field-grid">
                    <label>
                      {t("tool.qr-code.logo.padding")}
                      <input
                        type="range"
                        min={0}
                        max={16}
                        value={settings.logoPadding}
                        onChange={(event) => updateSetting("logoPadding", Number(event.target.value))}
                      />
                      <output>{settings.logoPadding}px</output>
                    </label>
                    <label>
                      {t("tool.qr-code.logo.radius")}
                      <input
                        type="range"
                        min={0}
                        max={32}
                        value={settings.logoCornerRadius}
                        disabled={settings.logoBackground !== "rounded"}
                        onChange={(event) => updateSetting("logoCornerRadius", Number(event.target.value))}
                      />
                      <output>{settings.logoCornerRadius}px</output>
                    </label>
                  </div>
                </>
              ) : null}
              {logoError ? <p className="error" role="alert">{logoError}</p> : null}
            </fieldset>

            <fieldset className="qr-designer__section">
              <legend>{t("tool.qr-code.presets")}</legend>
              <div className="qr-designer__presets">
                {(["classic", "rounded", "dots", "line", "dark", "colorful"] as QrPreset[]).map((preset) => (
                  <button key={preset} type="button" className="btn secondary" onClick={() => applyPreset(preset)}>
                    {t(`tool.qr-code.preset.${preset}`)}
                  </button>
                ))}
              </div>
            </fieldset>

            {warnings.length ? (
              <ul className="qr-designer__warnings" aria-live="polite">
                {warnings.map((warning) => <li key={warning}>{warning}</li>)}
              </ul>
            ) : null}
          </div>
        ),
        result: (
          <div className="qr-designer__preview" aria-live="polite">
            {pngResult ? (
              <>
                <code className="issue23-code-output">{payload}</code>
                <img className="preview-image" src={previewUrl} alt={t("tool.qr-code.label.preview")} />
                <div className="qr-designer__downloads">
                  <DownloadButton result={pngResult} label={t("tool.qr-code.downloadPng")} onDownloaded={() => trackEvent("download", { tool: toolId })} />
                  <DownloadButton result={svgResult} label={t("tool.qr-code.downloadSvg")} onDownloaded={() => trackEvent("download", { tool: toolId })} />
                  <button type="button" className="btn secondary" onClick={handleCopyImage}>{t("tool.qr-code.copyImage")}</button>
                  <button type="button" className="btn secondary" onClick={handleScanTest} disabled={scanState === "testing"}>{scanState === "testing" ? t("tool.qr-code.scanTesting") : t("tool.qr-code.scanTest")}</button>
                  <button type="button" className="btn secondary" onClick={handleCopySettingsLink}>{t("tool.qr-code.copySettings")}</button>
                </div>
                {scanState === "success" ? <p role="status">{t("tool.qr-code.scanSuccess")}</p> : null}
                {scanState === "warning" ? <p className="error" role="alert">{t("tool.qr-code.scanWarning")}</p> : null}
                <span role="status" aria-live="polite">{actionStatus}</span>
              </>
            ) : (
              <p>{t("tool.qr-code.label.noPreview")}</p>
            )}
          </div>
        ),
        howItWorks,
        faq,
        relatedTools: getRelatedTools(toolId),
      }}
    />
  );
}
