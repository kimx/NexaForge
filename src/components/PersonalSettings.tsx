import { useState } from "react";
import { usePersonalizationCopy } from "../i18n/personalization";
import { clearPersonalization, clearPinnedTools, clearRecentTools, clearToolPreferences } from "../services/personalization";
import "../styles/personalization.css";

export function PersonalSettings(): JSX.Element {
  const copy = usePersonalizationCopy();
  const [cleared, setCleared] = useState(false);
  return <details className="personal-settings">
    <summary>{copy.personal}</summary>
    <p>{copy.hint}</p>
    <div className="personal-settings__actions">
      <button type="button" className="btn secondary" onClick={clearRecentTools}>{copy.clearRecent}</button>
      <button type="button" className="btn secondary" onClick={clearPinnedTools}>{copy.clearPins}</button>
      <button type="button" className="btn secondary" onClick={clearToolPreferences}>{copy.clearPreferences}</button>
      <button type="button" className="btn secondary" onClick={() => { clearPersonalization(); setCleared(true); }}>{copy.clearAll}</button>
    </div>
    {cleared ? <p role="status">{copy.cleared}</p> : null}
  </details>;
}
