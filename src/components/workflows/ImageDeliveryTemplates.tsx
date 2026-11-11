import { useEffect, useRef, useState } from "react";
import { useLanguage } from "../../context/LanguageContext";
import { imageDeliveryTemplateMessages } from "../../i18n/imageDeliveryTemplates";
import { IMAGE_DELIVERY_TEMPLATE_LIMIT, readImageDeliveryTemplates, sanitizeImageDeliveryTemplate, writeImageDeliveryTemplates, type ImageDeliverySettings, type ImageDeliveryTemplate } from "../../services/workflow/imageDeliveryTemplates";

interface Props { settings: ImageDeliverySettings; busy: boolean; onApply: (settings: ImageDeliverySettings) => void }
export function ImageDeliveryTemplates({ settings, busy, onApply }: Props) {
  const { locale } = useLanguage(); const c = imageDeliveryTemplateMessages[locale];
  const [templates, setTemplates] = useState<ImageDeliveryTemplate[]>([]);
  const [selected, setSelected] = useState(""); const [name, setName] = useState("");
  const [notice, setNotice] = useState<"applied" | "savedNotice" | "renamed" | "deleted" | null>(null);
  const [error, setError] = useState<"loadError" | "saveError" | "nameError" | "limit" | null>(null);
  const selectRef = useRef<HTMLSelectElement>(null);
  useEffect(() => {
    const stored = readImageDeliveryTemplates(); setTemplates(stored.templates);
    if (stored.error) setError("loadError");
  }, []);
  const template = templates.find(item => item.name === selected);
  const validSettings = Boolean(sanitizeImageDeliveryTemplate({ name: "current", ...settings }));
  function persist(next: ImageDeliveryTemplate[], message: "savedNotice" | "renamed" | "deleted", nextSelected: string) {
    if (!writeImageDeliveryTemplates(next)) { setError("saveError"); setNotice(null); return; }
    setTemplates(next); setSelected(nextSelected); setName(nextSelected); setError(null); setNotice(message);
    if (message === "deleted") selectRef.current?.focus();
  }
  function save(rename: boolean) {
    if (busy) return;
    const cleanName = name.trim();
    setNotice(null);
    if (!cleanName || cleanName.length > 80 || templates.some(item => item.name === cleanName && (!rename || item.name !== selected))) { setError("nameError"); return; }
    if (rename) {
      if (template) persist(templates.map(item => item.name === selected ? { ...item, name: cleanName } : item), "renamed", cleanName);
      return;
    }
    if (templates.length >= IMAGE_DELIVERY_TEMPLATE_LIMIT) { setError("limit"); return; }
    const next = sanitizeImageDeliveryTemplate({ name: cleanName, ...settings });
    if (next) persist([...templates, next], "savedNotice", cleanName);
  }
  return <fieldset disabled={busy} className="image-delivery-templates">
    <legend>{c.title}</legend>
    <p>{c.hint}</p>
    <label>{c.saved}<select ref={selectRef} value={selected} onChange={event => {
      setSelected(event.target.value); setName(event.target.value); setNotice(null);
      setError(current => current === "loadError" ? current : null);
    }}><option value="">{c.choose}</option>{templates.map(item => <option key={item.name} value={item.name}>{item.name}</option>)}</select></label>
    <div className="image-delivery-templates__actions"><button type="button" className="btn secondary" disabled={!template} onClick={() => {
      if (!template || busy) return;
      onApply(template); setNotice("applied"); setError(current => current === "loadError" ? current : null);
    }}>{c.apply}</button></div>
    <label>{c.name}<input value={name} maxLength={80} onChange={event => { setName(event.target.value); setNotice(null); }} /></label>
    <div className="image-delivery-templates__actions">
      <button type="button" className="btn secondary" disabled={!validSettings} onClick={() => save(false)}>{c.save}</button>
      <button type="button" className="btn secondary" disabled={!template} onClick={() => save(true)}>{c.rename}</button>
      <button type="button" className="btn secondary" disabled={!template} onClick={() => { if (!busy && template) persist(templates.filter(item => item.name !== selected), "deleted", ""); }}>{c.remove}</button>
    </div>
    <p className="image-delivery-templates__privacy">{c.privacy}</p>
    {error ? <p role="alert" className="error">{c[error]}</p> : null}
    {notice ? <p role="status">{c[notice]}</p> : null}
  </fieldset>;
}
