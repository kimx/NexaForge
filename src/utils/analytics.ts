type ToolEventName =
  | "tool_open"
  | "process_start"
  | "process_success"
  | "process_failed"
  | "download"
  | "workflow_ready"
  | "result_action_used";

interface TrackPayload {
  tool: string;
  action?: string;
}

export function trackEvent(name: ToolEventName, payload: TrackPayload): void {
  if (typeof window === "undefined") {
    return;
  }

  // Keep analytics minimal and local. No file content or file names.
  window.dispatchEvent(
    new CustomEvent("browser-file-tools:event", {
      detail: {
        name,
        payload,
        at: Date.now(),
      },
    })
  );
}
