import { FILE_TOOLS, TOOLS_BY_CATEGORY } from "./tools";
import { CATEGORY_VISUALS, TOOL_CATEGORY_ORDER, TOOL_VISUALS, getToolVisual } from "./toolVisuals";

describe("tool visual registry", () => {
  it("requires explicit metadata for every registered tool", () => {
    expect(Object.keys(TOOL_VISUALS).sort()).toEqual(FILE_TOOLS.map(tool => tool.id).sort());
    for (const tool of FILE_TOOLS) {
      const visual = getToolVisual(tool);
      expect(visual.label.trim()).not.toBe("");
      expect(visual.label).not.toBe("FILE");
      expect(["blue", "sky", "mint", "red", "violet", "amber"]).toContain(visual.tone);
      expect(visual.sidebarIcon).toBe(CATEGORY_VISUALS[tool.category].sidebarIcon);
    }
  });
  it("orders every category exactly once", () => {
    expect(TOOL_CATEGORY_ORDER).toEqual(["Image", "PDF", "Data", "Developer", "Text", "QR & Barcode"]);
    expect([...new Set(FILE_TOOLS.map(tool => tool.category))].sort()).toEqual([...TOOL_CATEGORY_ORDER].sort());
    expect(Object.keys(TOOLS_BY_CATEGORY)).toEqual([...TOOL_CATEGORY_ORDER]);
  });
  it("assigns each category its matching icon", () => {
    const icons = { Image: "image", PDF: "pdf", Data: "data", Developer: "developer", Text: "text", "QR & Barcode": "qr" };
    for (const category of TOOL_CATEGORY_ORDER) {
      expect(CATEGORY_VISUALS[category].sidebarIcon).toBe(icons[category]);
    }
  });
  it.each(["Developer", "Data", "Text", "Image", "PDF", "QR & Barcode"] as const)("recovers missing %s metadata with category semantics and a warning", category => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      expect(getToolVisual({ id: "__unregistered__", title: "New tool", description: "", path: "/", category })).toEqual(CATEGORY_VISUALS[category]);
      expect(warn).toHaveBeenCalledWith(expect.stringContaining("__unregistered__"));
    } finally {
      warn.mockRestore();
    }
  });
});
