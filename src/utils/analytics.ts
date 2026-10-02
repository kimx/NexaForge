export type ToolEventName =
  | "tool_open"
  | "tool_search"
  | "task_launch"
  | "process_start"
  | "process_success"
  | "process_failed"
  | "copy_success"
  | "copy_failed"
  | "download"
  | "download_triggered"
  | "workflow_ready"
  | "workflow_continue"
  | "result_action_used"
  | "feedback_submitted";

export type FeedbackChoice = "helpful" | "problem";
export type FeedbackProblem = "processing" | "copy" | "download" | "usability";

export interface TrackPayload {
  tool?: string;
  taskId?: string;
  action?: string;
  category?: string;
  queryLength?: number;
  resultCount?: number;
  operationId?: string;
  durationMs?: number;
  errorCategory?: string;
  language?: "en" | "zh-TW";
  sourceTool?: string;
  targetTool?: string;
  feedback?: FeedbackChoice;
  problem?: FeedbackProblem;
}

export interface AnalyticsEvent {
  id?: string;
  name: ToolEventName;
  payload: TrackPayload;
  at: number;
  language?: "en" | "zh-TW" | "unknown";
}

export interface AnalyticsConfig {
  endpoint: string | null;
  enabled: boolean;
  retentionDays: number;
}

export interface AnalyticsAggregate {
  tool: string;
  date: string;
  language: "en" | "zh-TW" | "unknown";
  starts: number;
  successes: number;
  failures: number;
  resultAcquisitions: number;
  copySuccesses: number;
  downloadTriggers: number;
  workflowContinues: number;
  successRate: number;
  resultAcquisitionRate: number;
  averageProcessingMs: number | null;
  errorCategories: Record<string, number>;
}

const ANALYTICS_EVENT = "browser-file-tools:event";
const ANALYTICS_PREFERENCE_EVENT = "browser-file-tools:analytics-preference";
const ANALYTICS_DISABLED_KEY = "nexaforge-analytics-disabled";
const ANALYTICS_RETENTION_DAYS = 90;
const SAFE_TOKEN = /^[a-z0-9][a-z0-9-]{0,63}$/;
const SAFE_CATEGORY = /^[A-Za-z0-9][A-Za-z0-9-]{0,31}$/;
const SAFE_OPERATION_ID = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,95}$/;
const SAFE_ERROR_CATEGORY = /^[a-z0-9][a-z0-9._-]{0,31}$/;

const COLLECTION_EVENT_NAMES: Partial<Record<ToolEventName, string>> = {
  download: "download_triggered",
  workflow_ready: "workflow_ready",
  result_action_used: "result_action_used",
};

const PAYLOAD_KEYS = new Set<keyof TrackPayload>([
  "tool",
  "taskId",
  "action",
  "category",
  "queryLength",
  "resultCount",
  "operationId",
  "durationMs",
  "errorCategory",
  "language",
  "sourceTool",
  "targetTool",
  "feedback",
  "problem",
]);

function runtimeEndpoint(): string | null {
  try {
    const endpoint = import.meta.env.VITE_ANALYTICS_ENDPOINT?.trim();
    return endpoint || null;
  } catch {
    return null;
  }
}

function currentLanguage(): "en" | "zh-TW" | "unknown" {
  if (typeof document === "undefined") {
    return "unknown";
  }
  return document.documentElement.lang.toLowerCase().startsWith("en") ? "en" : "zh-TW";
}

function isSafeToken(value: unknown, pattern = SAFE_TOKEN): value is string {
  return typeof value === "string" && pattern.test(value);
}

function sanitizePayload(payload: TrackPayload): TrackPayload {
  const safe: TrackPayload = {};

  for (const [key, value] of Object.entries(payload) as Array<[keyof TrackPayload, unknown]>) {
    if (!PAYLOAD_KEYS.has(key)) {
      continue;
    }

    if (key === "queryLength" || key === "resultCount") {
      if (typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 1_000_000) {
        safe[key] = value;
      }
    } else if (key === "durationMs") {
      if (typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 86_400_000) {
        safe[key] = Math.round(value);
      }
    } else if (key === "language") {
      if (value === "en" || value === "zh-TW") {
        safe[key] = value;
      }
    } else if (key === "feedback") {
      if (value === "helpful" || value === "problem") {
        safe[key] = value;
      }
    } else if (key === "problem") {
      if (value === "processing" || value === "copy" || value === "download" || value === "usability") {
        safe[key] = value;
      }
    } else if (key === "taskId") {
      if (isSafeToken(value)) {
        safe[key] = value;
      }
    } else if (key === "operationId") {
      if (isSafeToken(value, SAFE_OPERATION_ID)) {
        safe[key] = value;
      }
    } else if (key === "errorCategory") {
      if (isSafeToken(value, SAFE_ERROR_CATEGORY)) {
        safe[key] = value;
      }
    } else if (key === "category") {
      if (isSafeToken(value, SAFE_CATEGORY)) {
        safe[key] = value;
      }
    } else if (isSafeToken(value)) {
      safe[key] = value;
    }
  }

  return safe;
}

function createEvent(name: ToolEventName, payload: TrackPayload): AnalyticsEvent {
  const safePayload = sanitizePayload(payload);
  return {
    id: createOperationId("event"),
    name,
    payload: safePayload,
    at: Date.now(),
    language: safePayload.language ?? currentLanguage(),
  };
}

function createEventId(prefix: string): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return `${prefix}-${crypto.randomUUID()}`;
    }
  } catch {
    // Fall back to a non-persistent identifier when Web Crypto is unavailable.
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createOperationId(prefix = "operation"): string {
  return createEventId(prefix);
}

export function getAnalyticsConfig(): AnalyticsConfig {
  return {
    endpoint: runtimeEndpoint(),
    enabled: isAnalyticsEnabled(),
    retentionDays: ANALYTICS_RETENTION_DAYS,
  };
}

export function isAnalyticsEnabled(): boolean {
  if (typeof window === "undefined") {
    return true;
  }

  try {
    return window.localStorage.getItem(ANALYTICS_DISABLED_KEY) !== "true";
  } catch {
    return true;
  }
}

export function setAnalyticsEnabled(enabled: boolean): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    if (enabled) {
      window.localStorage.removeItem(ANALYTICS_DISABLED_KEY);
    } else {
      window.localStorage.setItem(ANALYTICS_DISABLED_KEY, "true");
    }
  } catch {
    // Analytics remains best-effort when storage is unavailable.
  }

  window.dispatchEvent(new CustomEvent(ANALYTICS_PREFERENCE_EVENT, { detail: { enabled } }));
}

async function sendToCollector(event: AnalyticsEvent): Promise<boolean> {
  const endpoint = runtimeEndpoint();
  if (!endpoint || !isAnalyticsEnabled() || typeof fetch !== "function") {
    return false;
  }

  const body = JSON.stringify({
    event: COLLECTION_EVENT_NAMES[event.name] ?? event.name,
    eventId: event.id,
    occurredAt: new Date(event.at).toISOString(),
    language: event.language,
    ...event.payload,
  });

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      keepalive: true,
    });
    return response.ok;
  } catch {
    return false;
  }
}

export function trackEvent(name: ToolEventName, payload: TrackPayload = {}): Promise<boolean> {
  if (typeof window === "undefined" || !isAnalyticsEnabled()) {
    return Promise.resolve(false);
  }

  const event = createEvent(name, payload);
  window.dispatchEvent(
    new CustomEvent(ANALYTICS_EVENT, {
      detail: event,
    })
  );
  return sendToCollector(event);
}

export function submitFeedback(
  tool: string,
  feedback: FeedbackChoice,
  problem?: FeedbackProblem
): Promise<boolean> {
  return trackEvent("feedback_submitted", { tool, feedback, problem });
}

interface AggregateState {
  row: AnalyticsAggregate;
  startedAt: Map<string, number>;
  started: Set<string>;
  completed: Set<string>;
  acquired: Set<string>;
  copies: Set<string>;
  downloads: Set<string>;
  terminal: Set<string>;
  durations: number[];
}

function aggregateKey(event: AnalyticsEvent, index: number): string {
  return event.payload.operationId ?? event.id ?? `event-${index}`;
}

function ensureAggregate(
  groups: Map<string, AggregateState>,
  event: AnalyticsEvent,
): AggregateState {
  const date = new Date(event.at).toISOString().slice(0, 10);
  const language = event.payload.language ?? event.language ?? "unknown";
  const baseKey = `${event.payload.tool ?? "unknown"}|${date}|${language}`;
  let state = groups.get(baseKey);
  if (!state) {
    state = {
      row: {
        tool: event.payload.tool ?? "unknown",
        date,
        language,
        starts: 0,
        successes: 0,
        failures: 0,
        resultAcquisitions: 0,
        copySuccesses: 0,
        downloadTriggers: 0,
        workflowContinues: 0,
        successRate: 0,
        resultAcquisitionRate: 0,
        averageProcessingMs: null,
        errorCategories: {},
      },
      startedAt: new Map(),
      started: new Set(),
      completed: new Set(),
      acquired: new Set(),
      copies: new Set(),
      downloads: new Set(),
      terminal: new Set(),
      durations: [],
    };
    groups.set(baseKey, state);
  }
  return state;
}

export function aggregateAnalyticsEvents(events: readonly AnalyticsEvent[]): AnalyticsAggregate[] {
  const groups = new Map<string, AggregateState>();

  events.forEach((event, index) => {
    if (!event?.payload?.tool) {
      return;
    }
    const state = ensureAggregate(groups, event);
    const operation = aggregateKey(event, index);
    const { row } = state;

    if (event.name === "process_start") {
      if (!state.started.has(operation)) {
        state.started.add(operation);
        state.startedAt.set(operation, event.at);
        row.starts += 1;
      }
      return;
    }

    if (event.name === "process_success" || event.name === "process_failed") {
      if (!state.terminal.has(operation)) {
        state.terminal.add(operation);
        if (event.name === "process_success") {
          state.completed.add(operation);
          row.successes += 1;
        } else {
          row.failures += 1;
          const category = event.payload.errorCategory ?? "unknown";
          row.errorCategories[category] = (row.errorCategories[category] ?? 0) + 1;
        }

        const duration = event.payload.durationMs;
        const measuredDuration = duration ?? (
          state.startedAt.has(operation) ? event.at - (state.startedAt.get(operation) ?? event.at) : undefined
        );
        if (measuredDuration !== undefined && measuredDuration >= 0) {
          state.durations.push(measuredDuration);
        }
      }
      return;
    }

    if (event.name === "copy_success") {
      if (!state.copies.has(operation)) {
        state.copies.add(operation);
        row.copySuccesses += 1;
        state.acquired.add(operation);
      }
      return;
    }

    if (event.name === "copy_failed") {
      const category = event.payload.errorCategory ?? "copy";
      row.errorCategories[category] = (row.errorCategories[category] ?? 0) + 1;
      return;
    }

    if (event.name === "download" || event.name === "download_triggered") {
      if (!state.downloads.has(operation)) {
        state.downloads.add(operation);
        row.downloadTriggers += 1;
        state.acquired.add(operation);
      }
      return;
    }

    if (event.name === "workflow_continue") {
      row.workflowContinues += 1;
    }
  });

  return [...groups.values()]
    .map(({ row, completed, acquired, durations }) => ({
      ...row,
      resultAcquisitions: [...acquired].filter((operation) => completed.has(operation)).length,
      successRate: row.starts ? row.successes / row.starts : 0,
      resultAcquisitionRate: row.successes
        ? [...acquired].filter((operation) => completed.has(operation)).length / row.successes
        : 0,
      averageProcessingMs: durations.length
        ? Math.round(durations.reduce((total, duration) => total + duration, 0) / durations.length)
        : null,
    }))
    .sort((left, right) => `${left.date}|${left.tool}|${left.language}`.localeCompare(`${right.date}|${right.tool}|${right.language}`));
}

export const aggregateAnalytics = aggregateAnalyticsEvents;
