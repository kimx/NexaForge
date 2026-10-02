import { act, renderHook } from "@testing-library/react";
import { useStagedWorkflow } from "./useStagedWorkflow";

describe("staged file workflow recovery", () => {
  it("retains earlier outputs and locks dependent stages when settings change", async () => {
    const { result } = renderHook(() => useStagedWorkflow<[string, string, string]>("test-flow"));
    act(() => result.current.go(2));
    expect(result.current.step).toBe(0);
    await act(async () => { await result.current.run(0, async () => "source"); });
    await act(async () => { await result.current.run(1, async () => "numbered"); });
    await act(async () => { await result.current.run(2, async () => "archive"); });
    act(() => result.current.go(3));
    expect(result.current.step).toBe(3);
    act(() => result.current.invalidate(1));
    expect(result.current.results).toEqual(["source"]);
    expect(result.current.available).toBe(1);
    act(() => result.current.go(3));
    expect(result.current.step).toBe(1);
  });
  it("ignores late results and progress after cancellation, allowing a fresh retry", async () => {
    const { result } = renderHook(() => useStagedWorkflow<[string, string]>("test-flow"));
    await act(async () => { await result.current.run(0, async () => "source"); });
    let resolve!: (value: string) => void;
    let report!: (value: number) => void;
    let signal!: AbortSignal;
    let pending!: Promise<void>;
    act(() => { pending = result.current.run(1, async (nextSignal, nextReport) => {
      signal = nextSignal; report = nextReport;
      return new Promise<string>(done => { resolve = done; });
    }); });
    act(() => result.current.cancel());
    expect(signal.aborted).toBe(true);
    expect(result.current.results).toEqual(["source"]);
    await act(async () => { await result.current.run(1, async () => "fresh"); });
    await act(async () => { report(12); resolve("stale"); await pending; });
    expect(result.current.results).toEqual(["source", "fresh"]);
    expect(result.current.progress).toBe(100);
  });
  it("prevents duplicate submits, retains source on failure and cancels on unmount", async () => {
    const { result, unmount } = renderHook(() => useStagedWorkflow<[string, string]>("test-flow"));
    await act(async () => { await result.current.run(0, async () => "source"); });
    await act(async () => { await result.current.run(1, async () => { throw new Error("broken"); }); });
    expect(result.current.error?.message).toBe("broken");
    expect(result.current.results).toEqual(["source"]);
    let signal!: AbortSignal;
    act(() => { void result.current.run(1, async next => { signal = next; return new Promise<string>(() => {}); }); });
    const duplicate = vi.fn();
    await act(async () => { await result.current.run(1, duplicate); });
    expect(duplicate).not.toHaveBeenCalled();
    unmount(); expect(signal.aborted).toBe(true);
  });
});
