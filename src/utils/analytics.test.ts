import {
  aggregateAnalyticsEvents,
  setAnalyticsEnabled,
  trackEvent,
} from "./analytics";
import { afterEach, beforeEach, vi } from "vitest";

beforeEach(() => {
  window.localStorage.clear();
  vi.unstubAllEnvs();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("trackEvent", () => {
  it("emits browser event with required payload and no extra file fields", () => {
    const events: CustomEvent[] = [];
    const listener = (event: Event) => {
      if (event instanceof CustomEvent) {
        events.push(event);
      }
    };

    window.addEventListener("browser-file-tools:event", listener);
    trackEvent("process_start", { tool: "json-formatter" });
    window.removeEventListener("browser-file-tools:event", listener);

    expect(events).toHaveLength(1);
    expect(events[0].detail).toMatchObject({
      name: "process_start",
      payload: { tool: "json-formatter" },
      at: expect.any(Number),
    });
    expect(Object.keys(events[0].detail.payload)).toEqual(["tool"]);
    expect(events[0].detail.payload).not.toHaveProperty("fileName");
    expect(events[0].detail.payload).not.toHaveProperty("fileContent");
  });

  it("filters non-whitelisted fields before dispatching or collecting", async () => {
    const listener = vi.fn();
    window.addEventListener("browser-file-tools:event", listener);

    trackEvent("process_success", {
      tool: "text-cleaner",
      operationId: "operation-1",
      durationMs: 12,
      language: "secret",
      fileName: "secret.txt",
      fileContent: "private content",
    } as never);

    window.removeEventListener("browser-file-tools:event", listener);
    const event = listener.mock.calls[0]?.[0] as CustomEvent;
    expect(event.detail.payload).toEqual({
      tool: "text-cleaner",
      operationId: "operation-1",
      durationMs: 12,
    });
    expect(JSON.stringify(event.detail)).not.toContain("secret.txt");
    expect(JSON.stringify(event.detail)).not.toContain("private content");
    expect(JSON.stringify(event.detail)).not.toContain('"language":"secret"');
  });

  it("keeps task launch identifiers and actions in the analytics allowlist", () => {
    const listener = vi.fn();
    window.addEventListener("browser-file-tools:event", listener);

    trackEvent("task_launch", {
      taskId: "list-cleanup",
      tool: "text-cleaner",
      action: "open",
      fileContent: "private content",
    } as never);

    window.removeEventListener("browser-file-tools:event", listener);
    const event = listener.mock.calls[0]?.[0] as CustomEvent;
    expect(event.detail.payload).toEqual({
      taskId: "list-cleanup",
      tool: "text-cleaner",
      action: "open",
    });
    expect(JSON.stringify(event.detail)).not.toContain("private content");
  });

  it("does not let an unavailable collector affect event tracking", async () => {
    vi.stubEnv("VITE_ANALYTICS_ENDPOINT", "https://collector.invalid/events");
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline"));

    await expect(trackEvent("process_start", { tool: "image-compress" })).resolves.toBe(false);
  });

  it("aggregates one operation once and counts result acquisition separately", () => {
    const events = [
      { name: "process_start" as const, payload: { tool: "text-cleaner", operationId: "op-1", language: "en" as const }, at: 1_000 },
      { name: "process_success" as const, payload: { tool: "text-cleaner", operationId: "op-1", durationMs: 40, language: "en" as const }, at: 1_040 },
      { name: "process_success" as const, payload: { tool: "text-cleaner", operationId: "op-1", durationMs: 40, language: "en" as const }, at: 1_041 },
      { name: "copy_success" as const, payload: { tool: "text-cleaner", operationId: "op-1", language: "en" as const }, at: 1_050 },
      { name: "copy_success" as const, payload: { tool: "text-cleaner", operationId: "op-1", language: "en" as const }, at: 1_051 },
      { name: "download_triggered" as const, payload: { tool: "text-cleaner", operationId: "op-1", language: "en" as const }, at: 1_060 },
    ];

    expect(aggregateAnalyticsEvents(events)).toEqual([expect.objectContaining({
      starts: 1,
      successes: 1,
      failures: 0,
      resultAcquisitions: 1,
      copySuccesses: 1,
      downloadTriggers: 1,
      successRate: 1,
      resultAcquisitionRate: 1,
      averageProcessingMs: 40,
    })]);
  });

  it("stops dispatching after analytics is disabled", () => {
    const listener = vi.fn();
    window.addEventListener("browser-file-tools:event", listener);
    setAnalyticsEnabled(false);
    trackEvent("tool_open", { tool: "text-cleaner" });
    window.removeEventListener("browser-file-tools:event", listener);

    expect(listener).not.toHaveBeenCalled();
  });
});
