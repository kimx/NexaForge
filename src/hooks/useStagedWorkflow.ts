import { useEffect, useRef, useState } from "react";
import { createOperationId, trackEvent } from "../utils/analytics";

/** Page-local snapshots. Invalidation clears only the changed stage and its dependents. */
export function useStagedWorkflow<T extends unknown[]>(id: string) {
  const [results, setResults] = useState<Partial<T>>([] as unknown as Partial<T>);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<Error | null>(null);
  const [cancelled, setCancelled] = useState(false);
  const version = useRef(0);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => { version.current++; controller.current?.abort(); }, []);

  function invalidate(from: number) {
    version.current++;
    controller.current?.abort(); controller.current = null;
    setResults(current => current.slice(0, from) as Partial<T>);
    setStep(from); setBusy(false); setError(null); setCancelled(false); setProgress(0);
  }
  function cancel() {
    version.current++; controller.current?.abort(); controller.current = null;
    setBusy(false); setError(null); setCancelled(true); setProgress(0);
  }
  async function run<K extends keyof T & number>(stage: K, process: (signal: AbortSignal, report: (value: number) => void) => Promise<T[K]>) {
    if (controller.current) return;
    invalidate(stage);
    const token = version.current;
    const abort = new AbortController(); controller.current = abort;
    const operationId = createOperationId(id);
    const startedAt = performance.now();
    setBusy(true);
    trackEvent("process_start", { tool: id, operationId, action: `stage-${stage}` });
    try {
      const output = await process(abort.signal, value => {
        if (version.current === token) setProgress(Math.max(0, Math.min(100, value)));
      });
      if (token !== version.current || abort.signal.aborted) return;
      setResults(current => { const next = [...current]; next[stage] = output; return next as Partial<T>; });
      setProgress(100);
      trackEvent("process_success", { tool: id, operationId, action: `stage-${stage}`, durationMs: performance.now() - startedAt });
    } catch (cause) {
      if (token !== version.current || abort.signal.aborted) return;
      setError(cause instanceof Error ? cause : new Error(String(cause)));
      trackEvent("process_failed", { tool: id, operationId, action: `stage-${stage}`, errorCategory: "processing", durationMs: performance.now() - startedAt });
    } finally {
      if (token === version.current) { controller.current = null; setBusy(false); }
    }
  }
  const completed = results.findIndex(value => value === undefined);
  const available = completed < 0 ? results.length : completed;
  function go(next: number) {
    if (controller.current || next < 0 || next > available) return;
    setStep(next); setError(null); setCancelled(false);
  }
  return { results, step, busy, progress, error, cancelled, available, invalidate, cancel, run, go };
}
