import { extractJsonParseError, formatJson, minifyJson, parseJson, transformJson } from "./jsonService";

describe("json service", () => {
  it("parses and formats json", () => {
    const text = `{"name":"Tom","age":20}`;
    expect(parseJson(text)).toEqual({ name: "Tom", age: 20 });
    expect(formatJson(text)).toBe('{\n  "name": "Tom",\n  "age": 20\n}');
  });

  it("minifies json", () => {
    expect(minifyJson(`{\n  "name": "Tom",\n  "age": 20\n}`)).toBe('{"name":"Tom","age":20}');
  });

  it("extracts parse errors with location", () => {
    const errorMessage = "Expected property name or '}' in JSON at position 3";
    expect(extractJsonParseError(errorMessage)).toEqual({
      line: 1,
      column: 4,
      message: errorMessage,
    });
  });

  it("builds json file result", async () => {
    const result = await transformJson("sample", `{"name":"Tom"}`, "format");
    expect(result.fileName).toBe("sample.json");
    expect(await result.blob.text()).toBe('{\n  "name": "Tom"\n}');
  });
});
