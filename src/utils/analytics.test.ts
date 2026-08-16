import { trackEvent } from "./analytics";

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
});
