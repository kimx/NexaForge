import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import type {
  PdfPasswordPrompt,
  PdfPasswordSubmitResult,
} from "../services/pdf/pdfPasswordPrompt";

interface PdfPasswordModalProps {
  prompt: PdfPasswordPrompt;
  t: (key: string, params?: Record<string, string | number>) => string;
}

export function PdfPasswordModal({ prompt, t }: PdfPasswordModalProps): JSX.Element {
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [incorrect, setIncorrect] = useState(false);

  useEffect(() => {
    returnFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    inputRef.current?.focus();
    return () => returnFocusRef.current?.focus();
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (submitting) return;
    const submittedPassword = password;
    setPassword("");
    setIncorrect(false);
    setSubmitting(true);
    let result: PdfPasswordSubmitResult;
    try {
      result = await prompt.submit(submittedPassword);
    } catch {
      return;
    }
    if (result === "incorrect") setSubmitting(false);
    if (result === "incorrect") {
      setIncorrect(true);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === "Escape") {
      event.preventDefault();
      prompt.cancel();
      return;
    }
    if (event.key !== "Tab") return;
    const controls = [
      ...(dialogRef.current?.querySelectorAll<HTMLElement>(
        "input:not([disabled]), button:not([disabled])"
      ) ?? []),
    ];
    if (!controls.length) return;
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
    <div className="pdf-password-backdrop">
      <div
        ref={dialogRef}
        className="pdf-password-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pdf-password-title"
        aria-describedby="pdf-password-description"
        aria-busy={submitting}
        onKeyDown={handleKeyDown}
      >
        <h2 id="pdf-password-title">{t("pdfPassword.title")}</h2>
        <p id="pdf-password-description">{t("pdfPassword.description")}</p>
        <p className="pdf-password-dialog__file" title={prompt.fileName}>{prompt.fileName}</p>
        <form onSubmit={(event) => void handleSubmit(event)}>
          <label htmlFor="pdf-password-input">{t("pdfPassword.label.password")}</label>
          <div className="pdf-password-dialog__input-row">
            <input
              ref={inputRef}
              id="pdf-password-input"
              type={showPassword ? "text" : "password"}
              value={password}
              autoComplete="off"
              aria-invalid={incorrect}
              aria-describedby={incorrect ? "pdf-password-error" : undefined}
              onChange={(event) => {
                setPassword(event.target.value);
                setIncorrect(false);
              }}
              disabled={submitting}
            />
            <button
              type="button"
              className="btn secondary"
              aria-pressed={showPassword}
              aria-label={t(showPassword ? "pdfPassword.hide" : "pdfPassword.show")}
              onClick={() => setShowPassword((current) => !current)}
              disabled={submitting}
            >
              {t(showPassword ? "pdfPassword.hide" : "pdfPassword.show")}
            </button>
          </div>
          {incorrect ? (
            <p id="pdf-password-error" className="error" role="alert">
              {t("pdfPassword.error.incorrect")}
            </p>
          ) : null}
          <div className="pdf-password-dialog__actions">
            <button type="button" className="btn secondary" onClick={prompt.cancel}>
              {t("pdfPassword.cancel")}
            </button>
            <button type="submit" className="btn primary" disabled={submitting}>
              {t(submitting ? "pdfPassword.unlocking" : "pdfPassword.unlock")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
