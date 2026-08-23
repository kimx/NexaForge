import { useMemo, useState } from "react";
import { ToolPageTemplate } from "../../components/ToolPageTemplate";
import { useLanguage } from "../../context/LanguageContext";
import { FILE_TOOLS } from "../../data/tools";
import { useSeo } from "../../hooks/useSeo";
import { generateSecret, type PasswordCharacterSets, type SecretRequest, type SecretResult } from "../../services/security/secretService";
import type { ToolDefinition, ToolMeta } from "../../types/tool";
import { trackEvent } from "../../utils/analytics";
import { getRelatedTools } from "../../utils/toolHelpers";

type SecretKind = SecretRequest["kind"];

const FALLBACK_TOOL: ToolDefinition = {
  id: "secret-generator",
  title: "Password & Key Generator",
  description: "Generate cryptographically secure secrets locally.",
  path: "/developer/secret-generator",
  category: "Developer",
};

const DEFAULT_SETS: PasswordCharacterSets = { lower: true, upper: true, digits: true, symbols: true };

export function SecretGeneratorPage(): JSX.Element {
  const { t } = useLanguage();
  const [kind, setKind] = useState<SecretKind>("password");
  const [length, setLength] = useState(24);
  const [bytes, setBytes] = useState(16);
  const [sets, setSets] = useState<PasswordCharacterSets>(DEFAULT_SETS);
  const [result, setResult] = useState<SecretResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const tool = FILE_TOOLS.find((item) => item.id === "secret-generator") ?? FALLBACK_TOOL;
  const title = t("tool.secret-generator.title");
  const description = t("tool.secret-generator.description");
  const meta: ToolMeta = { title: `${title} - ${t("header.title")}`, description, canonical: tool.path, h1: title };
  useSeo(meta);

  const clearResult = (): void => {
    setResult(null);
    setError(null);
    setCopyError(null);
    setCopied(false);
  };

  const handleGenerate = (): void => {
    clearResult();
    trackEvent("process_start", { tool: "secret-generator" });
    try {
      const request: SecretRequest = kind === "password"
        ? { kind, length, sets }
        : kind === "api-key"
          ? { kind, length }
          : { kind, bytes };
      setResult(generateSecret(request));
      trackEvent("process_success", { tool: "secret-generator" });
    } catch {
      setError(t("tool.secret-generator.failed"));
      trackEvent("process_failed", { tool: "secret-generator" });
    }
  };

  const howItWorks = useMemo(() => [0, 1, 2].map((index) => t(`tool.secret-generator.how.${index}`)), [t]);
  const faq = useMemo(() => [0, 1].map((index) => ({
    q: t(`tool.secret-generator.faq.${index}.question`),
    a: t(`tool.secret-generator.faq.${index}.answer`),
  })), [t]);

  return (
    <ToolPageTemplate tool={tool} meta={meta} breadcrumb={["Home", title]}>
      {{
        workspace: (
          <div className="tool-form issue26-control-grid">
            <label>
              {t("tool.secret-generator.kind")}
              <select value={kind} onChange={(event) => { setKind(event.target.value as SecretKind); clearResult(); }}>
                {(["password", "api-key", "hex", "base64"] as const).map((value) => (
                  <option key={value} value={value}>{t(`tool.secret-generator.kind.${value}`)}</option>
                ))}
              </select>
            </label>
            {kind === "password" || kind === "api-key" ? (
              <label>
                {t("tool.secret-generator.length")}
                <input type="number" min={kind === "password" ? 8 : 16} max={128} step={1} value={length} onChange={(event) => { setLength(Number(event.target.value)); clearResult(); }} />
              </label>
            ) : (
              <label>
                {t("tool.secret-generator.bytes")}
                <input type="number" min={8} max={64} step={1} value={bytes} onChange={(event) => { setBytes(Number(event.target.value)); clearResult(); }} />
              </label>
            )}
          </div>
        ),
        options: (
          <div className="tool-form">
            {kind === "password" ? (
              <fieldset className="issue26-character-sets">
                <legend>{t("tool.secret-generator.sets")}</legend>
                {(Object.keys(DEFAULT_SETS) as Array<keyof PasswordCharacterSets>).map((key) => (
                  <label key={key}>
                    <input type="checkbox" checked={sets[key]} onChange={(event) => {
                      setSets((current) => ({ ...current, [key]: event.target.checked }));
                      clearResult();
                    }} />
                    {t(`tool.secret-generator.set.${key}`)}
                  </label>
                ))}
              </fieldset>
            ) : null}
            <button type="button" className="btn primary" onClick={handleGenerate}>{t("tool.secret-generator.generate")}</button>
          </div>
        ),
        result: (
          <>
            {error ? <p className="error" role="alert">{error}</p> : null}
            {copyError ? <p className="error" role="alert">{copyError}</p> : null}
            <label>
              {t("tool.secret-generator.output")}
              <textarea className="issue26-secret-output" value={result?.value ?? ""} placeholder={t("tool.secret-generator.noOutput")} readOnly rows={4} spellCheck={false} />
            </label>
            {result ? (
              <p className="issue26-entropy" aria-live="polite">
                {t(`tool.secret-generator.entropy.${result.entropyKind}`, { bits: result.entropyBits.toFixed(1) })}
              </p>
            ) : null}
            <div className="tool-actions">
              <button type="button" className="btn secondary" disabled={!result} onClick={async () => {
                if (!result) return;
                try { await navigator.clipboard.writeText(result.value); setCopyError(null); setCopied(true); }
                catch { setCopyError(t("tool.secret-generator.copyFailed")); setCopied(false); }
              }}>{t("button.copy")}</button>
            </div>
            {copied ? <p role="status">{t("tool.secret-generator.copied")}</p> : null}
          </>
        ),
        howItWorks,
        faq,
        relatedTools: getRelatedTools("secret-generator"),
      }}
    </ToolPageTemplate>
  );
}
