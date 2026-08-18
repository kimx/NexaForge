import { jsonDiff } from "./DeveloperToolsPage";

describe("jsonDiff", () => {
  it("marks only changed lines while keeping shared structure as context", () => {
    expect(jsonDiff({ a: "kim" }, { a: "kim2" })).toBe([
      "--- left",
      "+++ right",
      "  {",
      '-   "a": "kim"',
      '+   "a": "kim2"',
      "  }",
    ].join("\n"));
  });

  it("reports equivalent JSON values without a diff", () => {
    expect(jsonDiff({ a: 1 }, { a: 1 })).toBe("No differences.");
  });
});
