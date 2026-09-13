import { useLocalizedToolMeta } from "../context/LanguageContext";
import { usePersonalization } from "../hooks/usePersonalization";
import { usePersonalizationCopy } from "../i18n/personalization";
import { savePinnedTools } from "../services/personalization";
import "../styles/personalization.css";

export function PinToolButton({ toolId }: { toolId: string }): JSX.Element {
  const { pinned } = usePersonalization();
  const copy = usePersonalizationCopy();
  const title = useLocalizedToolMeta()(toolId, "title");
  const isPinned = pinned.includes(toolId);
  const action = isPinned ? copy.unpin : copy.pin;
  return <button type="button" className="btn secondary pin-tool-button" aria-pressed={isPinned} aria-label={`${action} ${title}`} onClick={() => savePinnedTools(isPinned ? pinned.filter((id) => id !== toolId) : [...pinned, toolId])}>
    <span aria-hidden="true">{isPinned ? "★" : "☆"}</span> {action}
  </button>;
}
