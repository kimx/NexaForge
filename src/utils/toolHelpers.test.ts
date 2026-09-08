import { FILE_TOOLS, TOOL_RELATIONSHIPS } from "../data/tools";
import { getRelatedTools } from "./toolHelpers";

describe("tool relationships", () => {
  it("follows workflow-specific recommendations instead of array/category order", () => {
    expect(getRelatedTools("image-resize").map(({ id }) => id)).toEqual(
      TOOL_RELATIONSHIPS["image-resize"]
    );
    expect(getRelatedTools("pdf-merge").map(({ id }) => id)).toEqual([
      "pdf-reorder-pages",
      "pdf-delete-pages",
      "pdf-split",
      "pdf-to-image",
    ]);
  });

  it("only returns registered tools and respects the requested limit", () => {
    const tools = getRelatedTools("json-formatter", 2);

    expect(tools).toHaveLength(2);
    expect(tools.every((tool) => FILE_TOOLS.includes(tool))).toBe(true);
    expect(tools.some((tool) => tool.id === "json-diff")).toBe(true);
  });
});
