import { useEffect, useRef, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../../context/LanguageContext";
import { FILE_WORKFLOWS, type FileWorkflowId } from "../../data/workflows";
import { fileWorkflowMessages } from "../../i18n/fileWorkflowMessages";
import { localizePath } from "../../routing/localePaths";
import { PrivacyNotice } from "../PrivacyNotice";
import { useSeo } from "../../hooks/useSeo";
import "../../styles/file-workflows.css";

interface WorkflowShellProps {
  id: FileWorkflowId;
  flow: { step: number; available: number; busy: boolean; progress: number; error: Error | null; cancelled: boolean; go: (step: number) => void; cancel: () => void };
  reset: () => void;
  children: ReactNode;
  preview: ReactNode;
}
export function WorkflowShell({ id, flow, reset, children, preview }: WorkflowShellProps) {
  const { locale } = useLanguage();
  const definition = FILE_WORKFLOWS.find(item => item.id === id)!;
  const copy = definition[locale];
  const c = fileWorkflowMessages[locale];
  const heading = useRef<HTMLHeadingElement>(null);
  const previous = useRef(flow.step);
  useSeo({ title: `${copy.title} | NexaForge`, description: copy.description, h1: copy.title, canonical: definition.path });
  useEffect(() => {
    if (previous.current !== flow.step) heading.current?.focus();
    previous.current = flow.step;
  }, [flow.step]);
  const failedFile = (flow.error as (Error & { fileName?: string }) | null)?.fileName;
  return <article className="file-workflow">
    <Link to={localizePath("/", locale)}>{c.backHome}</Link>
    <header className="file-workflow__header"><h1>{copy.title}</h1><p>{copy.description}</p><p className="file-workflow__privacy">{c.privacy}</p></header>
    <nav aria-label={c.stepNav}><ol className="file-workflow__steps">
      {copy.steps.map((label, index) => <li key={label}><button type="button" aria-label={`${index + 1}. ${label}`} aria-current={flow.step === index ? "step" : undefined} disabled={flow.busy || index > flow.available} onClick={() => flow.go(index)}><span aria-hidden="true">{index < flow.available ? "✓" : index + 1}</span>{label}</button></li>)}
    </ol></nav>
    <div className="file-workflow__columns">
      <section className="file-workflow__panel" aria-labelledby={`${id}-step`}>
        <h2 id={`${id}-step`} tabIndex={-1} ref={heading}>{flow.step + 1}. {copy.steps[flow.step]}</h2>
        {children}
        {flow.busy ? <div role="status"><p>{c.processing}</p><progress aria-label={c.processing} value={flow.progress} max={100} /><button type="button" className="btn secondary" onClick={flow.cancel}>{c.cancel}</button></div> : null}
        {flow.error ? <p role="alert" className="error">{c.failure}{failedFile ? ` (${failedFile})` : ""}</p> : null}
        {flow.cancelled ? <p role="status">{c.cancelled}</p> : null}
        <div className="file-workflow__actions">
          {flow.step > 0 ? <button type="button" className="btn secondary" disabled={flow.busy} onClick={() => flow.go(flow.step - 1)}>{c.back}</button> : null}
          {flow.step < 3 ? <button type="button" className="btn primary" disabled={flow.busy || flow.available <= flow.step} onClick={() => flow.go(flow.step + 1)}>{c.continue}</button> : null}
          <button type="button" className="btn secondary" disabled={flow.busy} onClick={reset}>{c.reset}</button>
        </div>
      </section>
      <section className="file-workflow__panel file-workflow__preview" aria-label={c.preview}><h2>{c.preview}</h2>{preview ?? <p>{c.empty}</p>}</section>
    </div>
    <PrivacyNotice inline />
  </article>;
}
