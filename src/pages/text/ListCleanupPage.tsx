import { useEffect, useRef, useState } from "react";
import { ToolPageTemplate } from "../../components/ToolPageTemplate";
import { TextResultActions } from "../../components/text/TextResultActions";
import { TextWorkflowLinks } from "../../components/text/TextWorkflowLinks";
import { useLanguage } from "../../context/LanguageContext";
import { useTextWorkflow } from "../../context/TextWorkflowContext";
import { FILE_TOOLS } from "../../data/tools";
import { useSeo } from "../../hooks/useSeo";
import { DEFAULT_LIST_OPTIONS, readListTemplates, runListCleanup, writeListTemplates, type ListCleanupOptions, type ListCleanupResult, type ListTemplate } from "../../services/text/listCleanupService";
import { getRelatedTools } from "../../utils/toolHelpers";
import { listCleanupMessages } from "./listCleanupMessages";
import "./listCleanup.css";

export function ListCleanupPage(): JSX.Element {
  const { locale, t } = useLanguage();
  const messages = listCleanupMessages[locale];
  const workflow = useTextWorkflow();
  const [input, setInput] = useState("");
  const [options, setOptions] = useState<ListCleanupOptions>({ ...DEFAULT_LIST_OPTIONS });
  const [result, setResult] = useState<ListCleanupResult | null>(null);
  const [templates, setTemplates] = useState<ListTemplate[]>([]);
  const [selected, setSelected] = useState("");
  const [name, setName] = useState("");
  const [storageError, setStorageError] = useState(false);
  const [notice, setNotice] = useState<"saved" | "renamed" | "deleted" | "resetRules" | "resetDone" | "invalidName" | "limit" | null>(null);
  const outputRef = useRef<HTMLTextAreaElement>(null);
  const templateSelectRef = useRef<HTMLSelectElement>(null);
  const tool = FILE_TOOLS.find((item) => item.id === "list-cleanup")!;
  const meta = { title: `${messages.title} | ${t("header.title")}`, h1: messages.title, description: messages.description, canonical: "/text/list-cleanup" };
  useSeo(meta);

  useEffect(() => {
    const stored = readListTemplates();
    setTemplates(stored.templates);
    setStorageError(stored.error);
  }, []);

  const updateInput = (value: string) => { setInput(value); setResult(null); };
  const updateOptions = (next: ListCleanupOptions) => { setOptions(next); setResult(null); setNotice(null); };
  const persist = (next: ListTemplate[]) => {
    setTemplates(next);
    setStorageError(!writeListTemplates(next));
  };
  const selectTemplate = (value: string) => {
    const template = templates.find((item) => item.name === value);
    setSelected(template?.name ?? "");
    setName(template?.name ?? "");
    updateOptions(template ? { ...template.options } : { ...DEFAULT_LIST_OPTIONS });
  };
  const saveTemplate = (rename: boolean) => {
    const cleanName = name.trim();
    if (!cleanName || cleanName.length > 80 || templates.some((item) => item.name === cleanName && (!rename || item.name !== selected))) {
      setNotice("invalidName"); return;
    }
    if (!rename && templates.length >= 30) { setNotice("limit"); return; }
    const template: ListTemplate = { name: cleanName, steps: options.sort ? ["clean", "deduplicate", "sort"] : ["clean", "deduplicate"], options: { ...options } };
    // Renaming preserves the saved rules; a new template saves the current rules.
    persist(rename ? templates.map((item) => item.name === selected ? { ...item, name: cleanName } : item) : [...templates, template]);
    setSelected(cleanName); setName(cleanName); setNotice(rename ? "renamed" : "saved");
  };
  const importedInput = workflow.originalInput ?? workflow.drafts["text-cleaner"].input;

  return <ToolPageTemplate tool={tool} meta={meta} breadcrumb={["Home", messages.title]} workflow={{ state: result ? "success" : "idle" }} children={{
    workspace: <div className="tool-form list-cleanup">
      <p>{messages.privacy}</p>
      {importedInput && !input ? <button type="button" className="btn secondary" onClick={() => updateInput(importedInput)}>{messages.import}</button> : null}
      <label htmlFor="list-cleanup-input">{messages.input}
        <textarea id="list-cleanup-input" value={input} onChange={(event) => updateInput(event.target.value)} rows={12} spellCheck={false} />
      </label>
      <section className="list-cleanup__templates">
        <label htmlFor="list-cleanup-templates">{messages.templates}
          <select ref={templateSelectRef} id="list-cleanup-templates" value={selected} onChange={(event) => selectTemplate(event.target.value)}>
            <option value="">{messages.builtIn}</option>
            {templates.map((template) => <option key={template.name} value={template.name}>{template.name}</option>)}
          </select>
        </label>
        <label htmlFor="list-cleanup-name">{messages.templateName}
          <input id="list-cleanup-name" value={name} maxLength={80} onChange={(event) => { setName(event.target.value); setNotice(null); }} />
        </label>
        <div className="tool-actions">
          <button type="button" className="btn secondary" onClick={() => saveTemplate(false)}>{messages.save}</button>
          <button type="button" className="btn secondary" disabled={!selected} onClick={() => saveTemplate(true)}>{messages.rename}</button>
          <button type="button" className="btn secondary" disabled={!selected} onClick={() => { persist(templates.filter((item) => item.name !== selected)); setSelected(""); setName(""); setNotice("deleted"); templateSelectRef.current?.focus(); }}>{messages.remove}</button>
          <button type="button" className="btn secondary" disabled={templates.length === 0} onClick={() => { persist([]); setSelected(""); setName(""); setNotice("resetDone"); templateSelectRef.current?.focus(); }}>{messages.resetAll}</button>
        </div>
        {notice ? <p role="status">{messages[notice]}</p> : null}
        {storageError ? <p role="status">{messages.storageError}</p> : null}
      </section>
    </div>,
    options: <div className="tool-form list-cleanup">
      <p id="list-cleanup-order">{messages.order}</p>
      <fieldset className="list-cleanup__rules" aria-describedby="list-cleanup-order">
        <legend>{messages.rules}</legend>
        <section><h3>1. {messages.clean}</h3>
          {(["trimLines", "removeEmptyLines", "collapseSpaces"] as const).map((key) => <label className="checkbox-option" key={key}><input type="checkbox" checked={options[key]} onChange={(event) => updateOptions({ ...options, [key]: event.target.checked })} /> {messages[key]}</label>)}
          <p>{messages.normalization}</p>
        </section>
        <section><h3>2. {messages.deduplicate}</h3>
          <label className="checkbox-option"><input type="checkbox" checked={options.ignoreCase} onChange={(event) => updateOptions({ ...options, ignoreCase: event.target.checked })} /> {messages.ignoreCase}</label>
        </section>
        <section><h3>3. {messages.sort}</h3>
          <label className="checkbox-option"><input type="checkbox" checked={options.sort} onChange={(event) => updateOptions({ ...options, sort: event.target.checked })} /> {messages.sortEnabled}</label>
          <label htmlFor="list-cleanup-direction">{messages.direction}<select id="list-cleanup-direction" value={options.direction} disabled={!options.sort} onChange={(event) => updateOptions({ ...options, direction: event.target.value === "desc" ? "desc" : "asc" })}><option value="asc">{messages.asc}</option><option value="desc">{messages.desc}</option></select></label>
          {!options.sort ? <p>{messages.skipped}</p> : null}
        </section>
      </fieldset>
      <div className="tool-actions">
        <button type="button" className="btn primary" disabled={!input} onClick={() => setResult(runListCleanup(input, options))}>{messages.run}</button>
        <button type="button" className="btn secondary" onClick={() => { selectTemplate(""); setNotice("resetRules"); }}>{messages.reset}</button>
      </div>
    </div>,
    result: <div className="tool-form list-cleanup">
      {result?.steps.map((step, index) => <details key={step.step} className="list-cleanup__preview" open>
        <summary>{index + 1}. {messages[step.step]} · {messages.counts}: {step.beforeLines} → {step.afterLines}</summary>
        <label htmlFor={`list-preview-${step.step}`}>{index + 1}. {messages[step.step]} — {messages.preview}<textarea id={`list-preview-${step.step}`} value={step.text} readOnly rows={4} spellCheck={false} /></label>
      </details>)}
      <label htmlFor="list-cleanup-output">{messages.output}<textarea ref={outputRef} id="list-cleanup-output" value={result?.output ?? ""} readOnly rows={8} spellCheck={false} /></label>
      {result?.output === "" ? <p role="status">{messages.empty}</p> : null}
      <TextResultActions text={result?.output ?? ""} filename="cleaned-list.txt" resultRef={outputRef} onClear={() => updateInput("")} labels={{ clear: messages.clear }} tool="list-cleanup" />
    </div>,
    nextActions: <TextWorkflowLinks tools={[{ toolId: "text-cleaner" }, { toolId: "remove-duplicate-lines" }, { toolId: "sort-lines" }]} />,
    howItWorks: messages.how,
    faq: [{ q: messages.faqQ, a: messages.faqA }],
    relatedTools: getRelatedTools("list-cleanup"),
  }} />;
}
