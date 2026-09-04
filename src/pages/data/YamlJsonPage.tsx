import { useId, useMemo, useState } from "react";
import { DownloadButton } from "../../components/DownloadButton";
import { LineNumberedCodeEditor } from "../../components/LineNumberedCodeEditor";
import { ToolPageTemplate } from "../../components/ToolPageTemplate";
import { useLanguage } from "../../context/LanguageContext";
import { FILE_TOOLS } from "../../data/tools";
import { useSeo } from "../../hooks/useSeo";
import {
  convertYamlJson,
  formatYamlJsonError,
  type YamlJsonDirection,
} from "../../services/yaml/yamlJsonService";
import type { FileProcessResult, ProcessingState, ToolDefinition, ToolMeta } from "../../types/tool";
import { getRelatedTools } from "../../utils/toolHelpers";

const JSON_SAMPLE = `{
  "name": "NexaForge",
  "features": ["YAML", "JSON"],
  "private": true
}`;

const YAML_SAMPLE = `name: NexaForge
features:
  - YAML
  - JSON
private: true`;

function oppositeDirection(direction: YamlJsonDirection): YamlJsonDirection {
  return direction === "json-to-yaml" ? "yaml-to-json" : "json-to-yaml";
}

export function YamlJsonPage(): JSX.Element {
  const { t } = useLanguage();
  const fallback: ToolDefinition = {
    id: "json-yaml",
    title: "YAML ↔ JSON Converter",
    description: "Convert YAML and JSON locally in your browser.",
    path: "/data/yaml-json",
    category: "Data",
  };
  const tool = FILE_TOOLS.find((item) => item.id === "json-yaml") ?? fallback;
  const title = t("tool.json-yaml.title");
  const meta: ToolMeta = {
    title,
    description: t("tool.json-yaml.description"),
    canonical: "/data/yaml-json",
    h1: title,
  };
  useSeo(meta);

  const [direction, setDirection] = useState<YamlJsonDirection>("json-to-yaml");
  const [source, setSource] = useState(JSON_SAMPLE);
  const [output, setOutput] = useState("");
  const [state, setState] = useState<ProcessingState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">("idle");
  const errorId = useId();
  const inputIsJson = direction === "json-to-yaml";
  const outputIsJson = !inputIsJson;
  const outputResult = useMemo<FileProcessResult | null>(() => {
    if (!output) {
      return null;
    }

    const mimeType = outputIsJson ? "application/json" : "text/yaml";
    const blob = new Blob([output], { type: `${mimeType};charset=utf-8` });
    return {
      blob,
      fileName: outputIsJson ? "converted.json" : "converted.yaml",
      mimeType,
      size: blob.size,
    };
  }, [output, outputIsJson]);

  const clear = (): void => {
    setSource("");
    setOutput("");
    setError(null);
    setState("idle");
    setCopyStatus("idle");
  };

  const convert = (): void => {
    try {
      setOutput(convertYamlJson(source, direction));
      setError(null);
      setState("success");
      setCopyStatus("idle");
    } catch (cause) {
      setOutput("");
      setError(formatYamlJsonError(cause));
      setState("error");
      setCopyStatus("idle");
    }
  };

  const swap = (): void => {
    const previousSource = source;
    setDirection(oppositeDirection(direction));
    setSource(output || source);
    setOutput(output ? previousSource : "");
    setError(null);
    setState(output ? "success" : "idle");
    setCopyStatus("idle");
  };

  const selectDirection = (nextDirection: YamlJsonDirection): void => {
    setDirection(nextDirection);
    setSource(nextDirection === "json-to-yaml" ? JSON_SAMPLE : YAML_SAMPLE);
    setOutput("");
    setError(null);
    setState("idle");
    setCopyStatus("idle");
  };

  const inputLabel = inputIsJson ? t("tool.json-yaml.label.jsonInput") : t("tool.json-yaml.label.yamlInput");
  const outputLabel = outputIsJson ? t("tool.json-yaml.label.jsonOutput") : t("tool.json-yaml.label.yamlOutput");

  return (
    <ToolPageTemplate
      tool={tool}
      meta={meta}
      breadcrumb={["Home", title]}
      layout="split"
      showIdleResult
      workflow={{ state, error, onRetry: convert, onReprocess: convert }}
      children={{
        workspace: (
          <div className="issue23-form code-workspace yaml-json-workspace">
            <fieldset className="code-workspace__direction">
              <legend>{t("tool.json-yaml.direction")}</legend>
              <div className="code-workspace__direction-options">
                <label className="checkbox">
                  <input
                    type="radio"
                    name="yaml-json-direction"
                    checked={inputIsJson}
                    onChange={() => selectDirection("json-to-yaml")}
                  />
                  {t("tool.json-yaml.jsonToYaml")}
                </label>
                <label className="checkbox">
                  <input
                    type="radio"
                    name="yaml-json-direction"
                    checked={!inputIsJson}
                    onChange={() => selectDirection("yaml-to-json")}
                  />
                  {t("tool.json-yaml.yamlToJson")}
                </label>
              </div>
            </fieldset>
            <label>
              {inputLabel}
              <LineNumberedCodeEditor
                value={source}
                onChange={(value) => {
                  setSource(value);
                  setOutput("");
                  setError(null);
                  setState("idle");
                  setCopyStatus("idle");
                }}
                ariaLabel={inputLabel}
                describedBy={error ? errorId : undefined}
                invalid={Boolean(error)}
              />
            </label>
            {error ? <span id={errorId} className="sr-only">{error}</span> : null}
            <div className="issue23-actions yaml-json-workspace__actions">
              <button type="button" className="btn primary" onClick={convert}>
                {t("tool.json-yaml.convert")}
              </button>
              <button type="button" className="btn secondary" onClick={swap}>
                {t("tool.json-yaml.swap")}
              </button>
              <button type="button" className="btn secondary" onClick={clear}>
                {t("tool.json-yaml.clear")}
              </button>
            </div>
          </div>
        ),
        options: null,
        result: (
          <div className="yaml-json-output">
            {output ? (
              <>
                <label>
                  {outputLabel}
                  <LineNumberedCodeEditor value={output} readOnly ariaLabel={outputLabel} />
                </label>
                <div className="issue23-actions">
                  <button
                    type="button"
                    className="btn secondary"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(output);
                        setCopyStatus("copied");
                      } catch {
                        setCopyStatus("error");
                      }
                    }}
                  >
                    {t("button.copy")}
                  </button>
                  <DownloadButton result={outputResult} />
                </div>
                {copyStatus === "copied" ? (
                  <p className="code-output-panel__status" role="status">{t("status.copied")}</p>
                ) : null}
                {copyStatus === "error" ? (
                  <p className="error" role="alert">{t("error.copyFailed")}</p>
                ) : null}
              </>
            ) : (
              <p>{t("tool.json-yaml.empty")}</p>
            )}
          </div>
        ),
        howItWorks: [0, 1, 2].map((index) => t(`tool.json-yaml.how.${index}`)),
        faq: [0, 1].map((index) => ({
          q: t(`tool.json-yaml.faq.${index}.question`),
          a: t(`tool.json-yaml.faq.${index}.answer`),
        })),
        relatedTools: getRelatedTools("json-yaml"),
      }}
    />
  );
}
