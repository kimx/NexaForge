import { compareJson, hasJsonDifferences, summarizeJsonDiff, type JsonValue } from "./jsonDiffService";

function diff(left: JsonValue, right: JsonValue) {
  return compareJson(left, right);
}

describe("json diff service", () => {
  it("treats equal objects and reordered object keys as unchanged", () => {
    const result = diff({ name: "NexaForge", version: 1 }, { version: 1, name: "NexaForge" });

    expect(hasJsonDifferences(result)).toBe(false);
    expect(summarizeJsonDiff(result)).toEqual({ added: 0, removed: 0, changed: 0, unchanged: 2 });
  });

  it("reports added, removed, and changed properties with JSON paths", () => {
    const result = diff(
      { version: 1, legacy: true },
      { version: 2, status: "active" }
    );

    expect(result.children).toEqual([
      expect.objectContaining({ path: "$.legacy", type: "removed", oldValue: true }),
      expect.objectContaining({ path: "$.status", type: "added", newValue: "active" }),
      expect.objectContaining({ path: "$.version", type: "changed", oldValue: 1, newValue: 2 }),
    ]);
    expect(summarizeJsonDiff(result)).toEqual({ added: 1, removed: 1, changed: 1, unchanged: 0 });
  });

  it("preserves type semantics for changed values", () => {
    const result = diff({ number: 1, boolean: true }, { number: "1", boolean: "true" });

    expect(result.children?.every((node) => node.type === "changed")).toBe(true);
  });

  it("compares nested objects and arrays by path and index", () => {
    const result = diff(
      { user: { profile: { name: "Kim" } }, users: [{ email: "a@example.com" }] },
      { user: { profile: { name: "Alex" } }, users: [{ email: "b@example.com" }] }
    );

    expect(result.children?.[0].children?.[0].children?.[0]).toMatchObject({
      path: "$.user.profile.name",
      type: "changed",
    });
    expect(result.children?.[1].children?.[0].children?.[0]).toMatchObject({
      path: "$.users[0].email",
      type: "changed",
    });
  });

  it("treats array order as significant", () => {
    const result = diff(["a", "b"], ["b", "a"]);

    expect(result.children).toEqual([
      expect.objectContaining({ path: "$[0]", type: "changed" }),
      expect.objectContaining({ path: "$[1]", type: "changed" }),
    ]);
  });

  const rootValueCases: Array<[JsonValue, JsonValue, boolean]> = [
    [{}, {}, false],
    [[], [], false],
    [null, null, false],
    [123, 123, false],
    [123, "123", true],
  ];

  it.each(rootValueCases)("handles empty values and root primitives", (left, right, expectedDifference) => {
    expect(hasJsonDifferences(diff(left, right))).toBe(expectedDifference);
  });
});
