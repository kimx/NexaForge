export type PdfPasswordSubmitResult = "accepted" | "incorrect" | "failed";

export interface PdfPasswordPrompt {
  id: number;
  fileName: string;
  submit: (password: string) => Promise<PdfPasswordSubmitResult>;
  cancel: () => void;
}

export class PdfPasswordCancelledError extends Error {
  readonly code = "password-cancelled";

  constructor() {
    super("PDF password entry was cancelled.");
    this.name = "PdfPasswordCancelledError";
  }
}

export class PdfPasswordPromptUnavailableError extends Error {
  readonly code = "password-modal-unavailable";

  constructor() {
    super("The PDF password prompt is unavailable.");
    this.name = "PdfPasswordPromptUnavailableError";
  }
}

type PdfPasswordPresenter = (prompt: PdfPasswordPrompt | null) => void;
type PasswordVerifier = (password: string, signal: AbortSignal) => Promise<Uint8Array>;

let presenter: PdfPasswordPresenter | null = null;
let activePrompt: PdfPasswordPrompt | null = null;
let nextPromptId = 1;
const queuedPrompts: PdfPasswordPrompt[] = [];

function presentNextPrompt(): void {
  if (presenter && !activePrompt) {
    activePrompt = queuedPrompts.shift() ?? null;
    presenter(activePrompt);
  }
}

function dismissPrompt(prompt: PdfPasswordPrompt): void {
  if (activePrompt === prompt) {
    activePrompt = null;
    presenter?.(null);
    presentNextPrompt();
    return;
  }

  const index = queuedPrompts.indexOf(prompt);
  if (index >= 0) queuedPrompts.splice(index, 1);
}

export function registerPdfPasswordPresenter(nextPresenter: PdfPasswordPresenter): () => void {
  presenter = nextPresenter;
  presentNextPrompt();

  return () => {
    if (presenter === nextPresenter) {
      presenter = null;
      const prompts = [...(activePrompt ? [activePrompt] : []), ...queuedPrompts];
      activePrompt = null;
      queuedPrompts.length = 0;
      prompts.forEach((prompt) => prompt.cancel());
      nextPresenter(null);
    }
  };
}

export function requestPdfPassword(
  fileName: string,
  verify: PasswordVerifier
): Promise<Uint8Array> {
  if (!presenter) {
    return Promise.reject(new PdfPasswordPromptUnavailableError());
  }

  return new Promise((resolve, reject) => {
    let settled = false;
    let attempt: AbortController | null = null;
    const prompt: PdfPasswordPrompt = {
      id: nextPromptId++,
      fileName,
      async submit(password) {
        if (settled) return "failed";
        attempt = new AbortController();
        try {
          const bytes = await verify(password, attempt.signal);
          if (settled) return "failed";
          settled = true;
          resolve(bytes);
          dismissPrompt(prompt);
          return "accepted";
        } catch (error) {
          if (settled) return "failed";
          if (
            error &&
            typeof error === "object" &&
            "code" in error &&
            error.code === "WRONG_PASSWORD"
          ) {
            return "incorrect";
          }
          settled = true;
          reject(error);
          dismissPrompt(prompt);
          return "failed";
        } finally {
          attempt = null;
        }
      },
      cancel() {
        if (settled) return;
        settled = true;
        attempt?.abort();
        reject(new PdfPasswordCancelledError());
        dismissPrompt(prompt);
      },
    };

    queuedPrompts.push(prompt);
    presentNextPrompt();
  });
}
