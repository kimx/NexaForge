import { csvToJson, jsonToCsv, previewCsv } from "./csvService";

describe("csv service", () => {
  it("parses csv preview with header and rows", async () => {
    const file = new File(["name,age\nTom,20\nAlice,30"], "sample.csv", {
      type: "text/csv",
    });

    const result = await previewCsv(file, 1000);
    expect(result.headers).toEqual(["name", "age"]);
    expect(result.rows).toEqual([
      ["Tom", "20"],
      ["Alice", "30"],
    ]);
    expect(result.totalRows).toBe(2);
  });

  it("converts csv to json output text", async () => {
    const file = new File(["name,age\nTom,20\nAlice,30"], "sample.csv", {
      type: "text/csv",
    });

    const result = await csvToJson(file);
    expect(result.fileName).toBe("sample.json");
    const parsed = JSON.parse(result.output) as Array<Record<string, string>>;
    expect(parsed).toEqual([
      { name: "Tom", age: "20" },
      { name: "Alice", age: "30" },
    ]);
  });

  it("converts json to csv with optional header control", async () => {
    const input = `[{"name":"Tom","age":20},{"name":"Alice","age":30}]`;
    const file = new File([input], "data.json", {
      type: "application/json",
    });

    const withHeader = await jsonToCsv(file, true);
    const withHeaderOutput = (await withHeader.blob.text()).replace(/\r\n/g, "\n");
    expect(withHeaderOutput).toBe("name,age\nTom,20\nAlice,30");

    const withoutHeader = await jsonToCsv(file, false);
    const withoutHeaderOutput = (await withoutHeader.blob.text()).replace(/\r\n/g, "\n");
    expect(withoutHeaderOutput).toBe("Tom,20\nAlice,30");
  });
});
