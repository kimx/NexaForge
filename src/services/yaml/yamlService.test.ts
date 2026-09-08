import { describe, expect, it } from "vitest";
import { jsonToYaml, YamlParseError, yamlToJson } from "./yamlService";

describe("yamlService", () => {
  it("round-trips nested JSON values through YAML", () => {
    const value = {
      name: "NexaForge",
      items: [{ id: 1, label: "one" }, { id: 2, label: "two" }],
      flags: [true, false],
    };

    expect(yamlToJson(jsonToYaml(value))).toEqual(value);
  });

  it("parses comments, quoted values, and nulls", () => {
    expect(yamlToJson(`
      name: "NexaForge" # local
      description: 'browser only'
      missing: null
    `)).toEqual({
      name: "NexaForge",
      description: "browser only",
      missing: null,
    });
  });

  it("parses top-level scalar and flow values", () => {
    expect(yamlToJson("true")).toBe(true);
    expect(yamlToJson("[1, 2, 3]")).toEqual([1, 2, 3]);
    expect(yamlToJson('{"name":"NexaForge"}')).toEqual({ name: "NexaForge" });
  });

  it("reports the source location for invalid YAML", () => {
    expect(() => yamlToJson("name: ok\n  broken")).toThrow(YamlParseError);
    try {
      yamlToJson("name: ok\n  broken");
    } catch (error) {
      expect(error).toMatchObject({ line: 2, column: 3 });
    }
  });
});
