import { useRef, useState } from "react";
import { useLanguage } from "../context/LanguageContext";
import { submitFeedback, type FeedbackChoice, type FeedbackProblem } from "../utils/analytics";

const PROBLEM_OPTIONS: FeedbackProblem[] = ["processing", "copy", "download", "usability"];

export function FeedbackPrompt({ tool }: { tool: string }): JSX.Element {
  const { t } = useLanguage();
  const [choice, setChoice] = useState<FeedbackChoice | null>(null);
  const [problem, setProblem] = useState<FeedbackProblem>("processing");
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const submitted = useRef(false);

  const submit = async (nextChoice: FeedbackChoice, nextProblem?: FeedbackProblem): Promise<void> => {
    if (submitted.current || status === "sending") {
      return;
    }
    setChoice(nextChoice);
    setStatus("sending");
    const accepted = await submitFeedback(tool, nextChoice, nextProblem);
    if (accepted) {
      submitted.current = true;
      setStatus("success");
    } else {
      setStatus("error");
    }
  };

  return (
    <section className="tool-card feedback-prompt" aria-labelledby="feedback-prompt-title">
      <h2 id="feedback-prompt-title">{t("feedback.title")}</h2>
      <p>{t("feedback.description")}</p>
      <div className="tool-actions">
        <button
          type="button"
          className="btn secondary"
          disabled={status === "sending" || submitted.current}
          onClick={() => void submit("helpful")}
        >
          {t("feedback.helpful")}
        </button>
        <button
          type="button"
          className="btn secondary"
          disabled={status === "sending" || submitted.current}
          onClick={() => {
            setChoice("problem");
            setStatus("idle");
          }}
        >
          {t("feedback.problem")}
        </button>
      </div>
      {choice === "problem" && !submitted.current ? (
        <fieldset className="feedback-prompt__options">
          <legend>{t("feedback.problemReason")}</legend>
          {PROBLEM_OPTIONS.map((option) => (
            <label key={option}>
              <input
                type="radio"
                name={`feedback-problem-${tool}`}
                checked={problem === option}
                onChange={() => setProblem(option)}
              />
              {t(`feedback.reason.${option}`)}
            </label>
          ))}
          <button type="button" className="btn primary" disabled={status === "sending"} onClick={() => void submit("problem", problem)}>
            {t("feedback.submit")}
          </button>
        </fieldset>
      ) : null}
      {status === "sending" ? <p role="status">{t("feedback.sending")}</p> : null}
      {status === "success" ? <p role="status">{t("feedback.success")}</p> : null}
      {status === "error" ? <p role="alert">{t("feedback.error")}</p> : null}
    </section>
  );
}
