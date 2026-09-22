import { useEffect, useRef, type KeyboardEvent } from "react";
import type { EmojiRecord } from "../../data/emoji.generated";
import { formatEmojiDetails } from "../../services/text/emojiService";

interface EmojiDetailsDialogProps {
  record: EmojiRecord;
  locale: "zh-TW" | "en";
  returnFocus: HTMLButtonElement | null;
  t: (key: string, params?: Record<string, string | number>) => string;
  onClose: () => void;
  onCopyField: (value: string, label: string) => void;
}

export function EmojiDetailsDialog({ record, locale, returnFocus, t, onClose, onCopyField }: EmojiDetailsDialogProps): JSX.Element {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const name = locale === "en" ? record.nameEn : record.nameZhHant;
  const details = formatEmojiDetails(record.emoji);
  const fields = [
    [t("emoji.field.codePoints"), details.codePoints],
    [t("emoji.field.utf8"), details.utf8],
    [t("emoji.field.html"), details.html],
    [t("emoji.field.javascript"), details.javascript],
  ] as const;

  useEffect(() => {
    closeRef.current?.focus();
    return () => returnFocus?.focus();
  }, [returnFocus]);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key !== "Tab") return;
    const controls = [...(dialogRef.current?.querySelectorAll<HTMLElement>('button, [href], input, [tabindex]:not([tabindex="-1"])') ?? [])]
      .filter((element) => !element.hasAttribute("disabled"));
    if (controls.length === 0) return;
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div className="emoji-dialog__backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div
        ref={dialogRef}
        className="emoji-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="emoji-dialog-title"
        onKeyDown={handleKeyDown}
      >
        <div className="emoji-dialog__header">
          <h2 id="emoji-dialog-title"><span>{record.emoji}</span> {name}</h2>
          <button ref={closeRef} type="button" className="secondary emoji-dialog__close" aria-label={t("emoji.dialog.close")} onClick={onClose}>×</button>
        </div>
        <dl className="emoji-dialog__identity">
          <div><dt>{t("emoji.dialog.chineseName")}</dt><dd>{record.nameZhHant}</dd></div>
          <div><dt>{t("emoji.dialog.englishName")}</dt><dd>{record.nameEn}</dd></div>
          <div><dt>{t("emoji.dialog.category")}</dt><dd>{t(`emoji.category.${record.group}`)}</dd></div>
        </dl>
        <div className="emoji-dialog__fields">
          {fields.map(([label, value]) => (
            <div className="emoji-dialog__field" key={label}>
              <div><strong>{label}</strong><code>{value}</code></div>
              <button type="button" className="secondary" aria-label={t("emoji.dialog.copyField", { name: label })} onClick={() => onCopyField(value, label)}>{t("button.copy")}</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
