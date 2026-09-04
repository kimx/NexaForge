import { describe, expect, it } from "vitest";
import {
  JsonPathParseError,
  queryJsonPath,
  serializeJsonPathMatches,
} from "./jsonPathService";

const document = {
  store: {
    book: [
      { category: "reference", author: "Nigel Rees", price: 8.95 },
      { category: "fiction", author: "Evelyn Waugh", price: 12.99 },
      { category: "fiction", author: "Herman Melville", price: 8.99 },
    ],
  },
  authors: { primary: "Nigel Rees" },
};

describe("jsonPathService", () => {
  it("selects nested values with wildcard and index selectors", () => {
    expect(queryJsonPath(document, "$.store.book[*].author").map((match) => match.value)).toEqual([
      "Nigel Rees",
      "Evelyn Waugh",
      "Herman Melville",
    ]);
    expect(queryJsonPath(document, "$.store.book[1]").map((match) => match.path)).toEqual([
      "$.store.book[1]",
    ]);
  });

  it("supports slices, unions, and recursive selectors", () => {
    expect(queryJsonPath(document, "$.store.book[0:2]").map((match) => match.value)).toHaveLength(2);
    expect(queryJsonPath(document, "$.store.book[0,2]").map((match) => match.value)).toEqual([
      document.store.book[0],
      document.store.book[2],
    ]);
    expect(queryJsonPath(document, "$..author").map((match) => match.value)).toEqual([
      "Nigel Rees",
      "Evelyn Waugh",
      "Herman Melville",
    ]);
    expect(serializeJsonPathMatches(queryJsonPath(document, "$.authors"))).toContain("\"primary\"");
  });

  it("reports invalid expressions with a useful column", () => {
    expect(() => queryJsonPath(document, "store.book")).toThrow(JsonPathParseError);
    try {
      queryJsonPath(document, "$.store[");
    } catch (error) {
      expect(error).toMatchObject({ column: 8 });
    }
  });
});
