import { runRegex, type RegexRunRequest } from "./regexEngine";
import type { RegexWorkerResponse } from "./regexService";

interface RegexWorkerScope {
  onmessage: ((event: MessageEvent<RegexRunRequest>) => void) | null;
  postMessage(message: RegexWorkerResponse): void;
}

const workerScope = self as unknown as RegexWorkerScope;

workerScope.onmessage = ({ data }) => {
  try {
    workerScope.postMessage({ ok: true, result: runRegex(data) });
  } catch (error) {
    workerScope.postMessage({
      ok: false,
      error: {
        kind: error instanceof SyntaxError ? "invalid-pattern" : "execution",
        message: error instanceof Error ? error.message : "Regex execution failed",
      },
    });
  }
};
