import type { RegexRunRequest, RegexRunResult } from "./regexEngine";

export type RegexWorkerErrorKind = "invalid-pattern" | "execution";

export type RegexWorkerResponse =
  | { ok: true; result: RegexRunResult }
  | {
      ok: false;
      error: {
        kind: RegexWorkerErrorKind;
        message: string;
      };
    };

export interface RegexWorkerLike {
  onmessage: ((event: MessageEvent<RegexWorkerResponse>) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
  postMessage(message: RegexRunRequest): void;
  terminate(): void;
}

export type RegexWorkerFactory = () => RegexWorkerLike;

export interface TestRegexOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
  workerFactory?: RegexWorkerFactory;
}

export class RegexValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RegexValidationError";
  }
}

export class RegexTimeoutError extends Error {
  constructor() {
    super("Regex execution timed out");
    this.name = "RegexTimeoutError";
  }
}

export class RegexExecutionError extends Error {
  constructor(message = "Regex execution failed") {
    super(message);
    this.name = "RegexExecutionError";
  }
}

function createRegexWorker(): RegexWorkerLike {
  return new Worker(new URL("./regexWorker.ts", import.meta.url), {
    type: "module",
  });
}

function abortError(): DOMException {
  return new DOMException("Regex test aborted", "AbortError");
}

export function testRegex(
  request: RegexRunRequest,
  {
    signal,
    timeoutMs = 750,
    workerFactory = createRegexWorker,
  }: TestRegexOptions = {}
): Promise<RegexRunResult> {
  if (signal?.aborted) {
    return Promise.reject(abortError());
  }

  return new Promise<RegexRunResult>((resolve, reject) => {
    const worker = workerFactory();
    let settled = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const cleanup = (): void => {
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
      signal?.removeEventListener("abort", handleAbort);
      worker.onmessage = null;
      worker.onerror = null;
      worker.terminate();
    };

    const settle = (callback: () => void): void => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      callback();
    };

    const handleAbort = (): void => {
      settle(() => reject(abortError()));
    };

    worker.onmessage = ({ data }) => {
      if (data.ok) {
        settle(() => resolve(data.result));
        return;
      }

      const error = data.error.kind === "invalid-pattern"
        ? new RegexValidationError(data.error.message)
        : new RegexExecutionError(data.error.message);
      settle(() => reject(error));
    };

    worker.onerror = () => {
      settle(() => reject(new RegexExecutionError()));
    };

    signal?.addEventListener("abort", handleAbort, { once: true });
    timeoutId = setTimeout(() => {
      settle(() => reject(new RegexTimeoutError()));
    }, timeoutMs);

    try {
      worker.postMessage(request);
    } catch (error) {
      settle(() =>
        reject(
          new RegexExecutionError(
            error instanceof Error ? error.message : "Regex execution failed"
          )
        )
      );
    }
  });
}
