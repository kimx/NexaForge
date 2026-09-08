import {
  convertYamlJson,
  formatYamlJsonError,
  jsonToYaml,
  parseYaml,
  YamlJsonParseError,
  yamlToJson,
} from "./yamlJsonService";

describe("yamlJsonService", () => {
  it("converts JSON with nested arrays and multiline values to YAML", () => {
    const source = JSON.stringify({
      items: ["one", "two"],
      details: { enabled: true, count: 4, missing: null },
      notes: "first line\nsecond line",
      unicode: "繁體中文",
    });

    const yaml = jsonToYaml(source);

    expect(parseYaml(yaml)).toEqual(JSON.parse(source));
    expect(yaml).toContain("notes: |");
  });

  it("converts YAML scalars, comments, and nested structures to JSON", () => {
    const source = `# configuration
items:
  - one
  - two
details:
  enabled: true
  count: 4
  missing: null
notes: |-
  first line
  second line
unicode: 繁體中文`;

    expect(JSON.parse(yamlToJson(source))).toEqual({
      items: ["one", "two"],
      details: { enabled: true, count: 4, missing: null },
      notes: "first line\nsecond line",
      unicode: "繁體中文",
    });
  });

  it("resolves YAML anchors and aliases into regular JSON values", () => {
    const source = `defaults: &defaults
  retries: 3
  enabled: true
service: *defaults`;

    expect(JSON.parse(convertYamlJson(source, "yaml-to-json"))).toEqual({
      defaults: { retries: 3, enabled: true },
      service: { retries: 3, enabled: true },
    });
  });

  it("rejects unsafe YAML tags with the safe JSON schema", () => {
    expect(() => parseYaml("value: !!js/function 'function () {}'")).toThrow(YamlJsonParseError);
  });

  it("reports JSON syntax locations", () => {
    expect(() => convertYamlJson('{\n  "name":\n}', "json-to-yaml")).toThrow(
      expect.objectContaining({ format: "JSON", line: 3, column: 1 })
    );
  });

  it("reports YAML syntax locations in formatted errors", () => {
    let cause: unknown;
    try {
      parseYaml("name: [broken");
    } catch (error) {
      cause = error;
    }

    expect(cause).toBeInstanceOf(YamlJsonParseError);
    expect(formatYamlJsonError(cause)).toMatch(/YAML syntax error: [\s\S]*Line \d+, column \d+\./);
  });
});
