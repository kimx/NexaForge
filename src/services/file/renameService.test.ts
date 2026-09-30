import { unzipSync } from "fflate";
import { buildRenamePreview, createRenamedArchive, type RenameOptions } from "./renameService";

const options: RenameOptions = { baseName: "", find: "", replace: "", prefix: "", suffix: "", sequence: false, start: 1, padding: 3 };
const files = [new File(["first"], "photo.JPG", { type: "image/jpeg" }), new File(["second"], "notes.txt", { type: "text/plain" })];

describe("batch rename", () => {
  it("preserves extensions while generating sequential names", () => {
    expect(buildRenamePreview(files, { ...options, baseName: "trip", sequence: true, start: 9 }).map(row => row.newName)).toEqual(["trip-009.JPG", "trip-010.txt"]);
  });
  it("replaces literal text and retains compound names and dotfiles", () => {
    const input = [new File(["a"], "report.final.pdf"), new File(["b"], ".env")];
    expect(buildRenamePreview(input, { ...options, find: "report", replace: "invoice", prefix: "old-", suffix: "-done" }).map(row => row.newName)).toEqual(["old-invoice.final-done.pdf", "old-.env-done"]);
  });
  it("marks case-insensitive name collisions instead of silently changing the preview", () => {
    const rows = buildRenamePreview([new File(["a"], "A.txt"), new File(["b"], "a.TXT")], options);
    expect(rows.map(row => row.error)).toEqual(["collision", "collision"]);
  });
  it("rejects path traversal, reserved Windows names, and invalid counters", () => {
    expect(buildRenamePreview(files, { ...options, prefix: "../" })[0].error).toBe("invalid-name");
    expect(buildRenamePreview(files, { ...options, baseName: "CON" })[0].error).toBe("invalid-name");
    expect(() => buildRenamePreview(files, { ...options, start: -1, sequence: true })).toThrow();
  });
  it("archives unchanged bytes under exactly the previewed names", async () => {
    const input = [new File(["alpha"], "a.txt"), new File(["beta"], "b.txt")];
    const result = await createRenamedArchive(input, { ...options, baseName: "file", sequence: true });
    const entries = unzipSync(new Uint8Array(await result.blob.arrayBuffer()));
    expect(Object.keys(entries)).toEqual(["file-001.txt", "file-002.txt"]);
    expect(new TextDecoder().decode(entries["file-001.txt"])).toBe("alpha");
    expect(new TextDecoder().decode(entries["file-002.txt"])).toBe("beta");
    expect(input[0].name).toBe("a.txt");
  });
  it("refuses archives with unresolved collisions", async () => {
    await expect(createRenamedArchive(files, { ...options, baseName: "../unsafe" })).rejects.toThrow();
  });
  it("rejects the archive backend's special prototype name before export", async () => {
    const input = [new File(["unchanged"], "__proto__")];
    expect(buildRenamePreview(input, options)[0].error).toBe("invalid-name");
    await expect(createRenamedArchive(input, options)).rejects.toThrow("invalid-preview");
  });
});
