import { afterEach, describe, expect, it, vi } from "vitest";
import type { RegexRunRequest } from "./regexEngine";
import {
  RegexExecutionError,
  RegexTimeoutError,
  RegexValidationError,
  testRegex,
  type RegexWorkerLike,
  type RegexWorkerResponse,
} from "./regexService";

const request: RegexRunRequest = {
  pattern: "a+",
  flags: "g",
  text: "caaab",
  maxMatches: 500,
};

class FakeWorker implements RegexWorkerLike {
  onmessage: ((event: MessageEvent<RegexWorkerResponse>) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  postMessage = vi.fn();
  terminate = vi.fn();

  emitMessage(data: RegexWorkerResponse): void {
    this.onmessage?.({ data } as MessageEvent<RegexWorkerResponse>);
  }

  emitError(): void {
    this.onerror?.(new ErrorEvent("error", { message: "worker failed" }));
  }
}

afterEach(() => {
  vi.useRealTimers();
});

describe("testRegex", () => {
  it("posts the request, resolves a successful response, and terminates the worker", async () => {
    const worker = new FakeWorker();
    const result = {
      matches: [{ value: "aaa", index: 1, groups: [], namedGroups: {} }],
      truncated: false,
    };

    const pending = testRegex(request, { workerFactory: () => worker, timeoutMs: 750 });
    worker.emitMessage({ ok: true, result });

    await expect(pending).resolves.toEqual(result);
    expect(worker.postMessage).toHaveBeenCalledWith(request);
    expect(worker.terminate).toHaveBeenCalledOnce();
  });

  it("maps invalid-pattern responses to RegexValidationError", async () => {
    const worker = new FakeWorker();
    const pending = testRegex(request, { workerFactory: () => worker });

    worker.emitMessage({
      ok: false,
      error: { kind: "invalid-pattern", message: "Unterminated group" },
    });

    await expect(pending).rejects.toEqual(
      expect.objectContaining({
        name: "RegexValidationError",
        message: "Unterminated group",
      })
    );
    await pending.catch((error) => expect(error).toBeInstanceOf(RegexValidationError));
    expect(worker.terminate).toHaveBeenCalledOnce();
  });

  it("maps execution responses and worker failures to RegexExecutionError", async () => {
    const responseWorker = new FakeWorker();
    const responsePending = testRegex(request, { workerFactory: () => responseWorker });
    responseWorker.emitMessage({
      ok: false,
      error: { kind: "execution", message: "execution failed" },
    });
    await expect(responsePending).rejects.toBeInstanceOf(RegexExecutionError);

    const failedWorker = new FakeWorker();
    const failurePending = testRegex(request, { workerFactory: () => failedWorker });
    failedWorker.emitError();
    await expect(failurePending).rejects.toBeInstanceOf(RegexExecutionError);
    expect(failedWorker.terminate).toHaveBeenCalledOnce();
  });

  it("times out and terminates an unresponsive worker", async () => {
    vi.useFakeTimers();
    const worker = new FakeWorker();
    const pending = testRegex(request, { workerFactory: () => worker, timeoutMs: 750 });
    const rejection = expect(pending).rejects.toBeInstanceOf(RegexTimeoutError);

    await vi.advanceTimersByTimeAsync(750);

    await rejection;
    expect(worker.terminate).toHaveBeenCalledOnce();
  });

  it("aborts an active run and terminates its worker", async () => {
    const controller = new AbortController();
    const worker = new FakeWorker();
    const pending = testRegex(request, {
      workerFactory: () => worker,
      signal: controller.signal,
    });

    controller.abort();

    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
    expect(worker.terminate).toHaveBeenCalledOnce();
  });

  it("does not create a worker for an already-aborted run", async () => {
    const controller = new AbortController();
    controller.abort();
    const workerFactory = vi.fn(() => new FakeWorker());

    await expect(testRegex(request, { workerFactory, signal: controller.signal })).rejects
      .toMatchObject({ name: "AbortError" });
    expect(workerFactory).not.toHaveBeenCalled();
  });
});
