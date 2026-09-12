import { clearPersonalization, clearPinnedTools, clearRecentTools, clearToolPreferences, readPersonalization, rememberTool, savePinnedTools, saveToolPreferences } from "./personalization";

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

it("keeps the last four distinct registered tools in visit order", () => {
  for (const id of ["uuid", "hash", "text-cleaner", "image-compress", "uuid", "unknown", "pdf-merge"]) rememberTool(id);
  expect(readPersonalization().recent).toEqual(["pdf-merge", "uuid", "image-compress", "text-cleaner"]);
});

it.each(["{broken", "null", "[]", '{"version":9,"compress":{"format":"webp","quality":20}}'])
  ("recovers from invalid or unsupported saved preferences: %s", (stored) => {
    localStorage.setItem("nexaforge-tool-preferences-v1", stored);
    const preferences = readPersonalization().preferences;
    expect(preferences.compress).toEqual({ format: "jpeg", quality: 80 });
    expect(preferences.cleaner.normalizeLineEndings).toBe(true);
  });

it("validates each preference and persists only explicitly supported settings", () => {
  localStorage.setItem("nexaforge-tool-preferences-v1", JSON.stringify({
    version: 1, compress: { format: "tiff", quality: 101 }, cleaner: { trimLines: true, removeEmptyLines: "yes" },
  }));
  const preferences = readPersonalization().preferences;
  expect(preferences.compress).toEqual({ format: "jpeg", quality: 80 });
  expect(preferences.cleaner.trimLines).toBe(true);
  expect(preferences.cleaner.removeEmptyLines).toBe(false);
  saveToolPreferences({
    ...preferences,
    ...{ input: "private input" },
    compress: { ...preferences.compress, ...{ filename: "private.png", customTarget: 555, mode: "target" } },
    cleaner: { ...preferences.cleaner, ...{ input: "private text", tabSize: 8 } },
  });
  const saved = localStorage.getItem("nexaforge-tool-preferences-v1") ?? "";
  expect(saved).not.toMatch(/input|private|filename|customTarget|mode|tabSize/);
});

it("ignores removed, non-string and duplicate pins", () => {
  localStorage.setItem("nexaforge-pinned-tools", '[null,"removed","hash","hash","uuid"]');
  expect(readPersonalization().pinned).toEqual(["hash", "uuid"]);
  savePinnedTools(["unknown", "uuid", "uuid"]);
  expect(JSON.parse(localStorage.getItem("nexaforge-pinned-tools") ?? "[]")).toEqual(["uuid"]);
});

it("clears each scope independently and preserves unrelated settings", () => {
  rememberTool("hash"); savePinnedTools(["uuid"]);
  saveToolPreferences({ ...readPersonalization().preferences, compress: { format: "webp", quality: 65 } });
  localStorage.setItem("nexaforge-qr-designer-settings", '{"size":256}');
  localStorage.setItem("nexaforge-list-cleanup-templates", "[]");
  clearRecentTools();
  expect(readPersonalization().recent).toEqual([]);
  expect(readPersonalization().pinned).toEqual(["uuid"]);
  clearPinnedTools();
  expect(readPersonalization().preferences.compress.quality).toBe(65);
  clearToolPreferences();
  expect(readPersonalization().preferences.compress.quality).toBe(80);
  clearPersonalization();
  expect(localStorage.getItem("nexaforge-qr-designer-settings")).toBe('{"size":256}');
  expect(localStorage.getItem("nexaforge-list-cleanup-templates")).toBe("[]");
});

it("tolerates reads, writes and removals denied by the browser", () => {
  for (const method of ["getItem", "setItem", "removeItem"] as const) vi.spyOn(Storage.prototype, method).mockImplementation(() => { throw new Error("disabled"); });
  expect(() => { rememberTool("hash"); savePinnedTools(["uuid"]); clearPersonalization(); }).not.toThrow();
  expect(readPersonalization().recent).toEqual([]);
});
