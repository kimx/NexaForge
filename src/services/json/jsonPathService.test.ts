import {
  evaluateJsonPath,
  formatJsonPathInput,
  JsonPathEvaluationError,
} from "./jsonPathService";

describe("json path service", () => {
  const json = JSON.stringify({
    users: [
      { name: "Ada", profile: { role: "admin" } },
      { name: "Lin", profile: { role: "user" } },
    ],
    meta: { owner: "NexaForge" },
  });

  it("supports property, wildcard, and recursive paths", () => {
    expect(evaluateJsonPath(json, "$.users[*].name").values).toEqual(["Ada", "Lin"]);
    expect(evaluateJsonPath(json, "$..role").values).toEqual(["admin", "user"]);
  });

  it("returns an empty result for a valid path with no matches", () => {
    expect(evaluateJsonPath(json, "$.users[*].missing").values).toEqual([]);
  });

  it("separates invalid JSON and invalid JSONPath errors", () => {
    expect(() => evaluateJsonPath('{"broken":}', "$")).toThrowError(
      expect.objectContaining({ kind: "invalid-json" })
    );
    expect(() => evaluateJsonPath(json, "$.users[")).toThrowError(
      expect.objectContaining({ kind: "invalid-jsonpath" })
    );
  });

  it("formats JSON input locally", () => {
    expect(formatJsonPathInput('{"name":"NexaForge"}')).toBe('{\n  "name": "NexaForge"\n}');
    expect(() => formatJsonPathInput('{"broken":}')).toThrow(JsonPathEvaluationError);
  });
});
