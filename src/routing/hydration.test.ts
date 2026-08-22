import { canHydratePrerenderedRoot } from "./hydration";

describe("canHydratePrerenderedRoot", () => {
  it("hydrates only when the prerendered page belongs to the current route", () => {
    expect(
      canHydratePrerenderedRoot({
        hasContent: true,
        prerenderPath: "/en/data/json-formatter",
        currentPath: "/en/data/json-formatter/",
      })
    ).toBe(true);
  });

  it("rejects missing or mismatched prerender markers", () => {
    expect(
      canHydratePrerenderedRoot({
        hasContent: true,
        currentPath: "/en/data/json-formatter",
      })
    ).toBe(false);
    expect(
      canHydratePrerenderedRoot({
        hasContent: true,
        prerenderPath: "/",
        currentPath: "/en/data/json-formatter",
      })
    ).toBe(false);
  });

  it("does not hydrate an empty root", () => {
    expect(
      canHydratePrerenderedRoot({
        hasContent: false,
        prerenderPath: "/en",
        currentPath: "/en",
      })
    ).toBe(false);
  });
});
