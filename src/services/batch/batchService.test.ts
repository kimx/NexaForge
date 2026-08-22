import { MAX_BATCH_FILES, runBatch, validateImageBatch } from "./batchService";
import type { FileProcessResult } from "../../types/tool";

function file(name: string, size = 3): File {
  return new File([new Uint8Array(size)], name, { type: "image/png" });
}

function output(input: File): FileProcessResult {
  const blob = new Blob([input.name]);
  return { blob, fileName: input.name, mimeType: "image/png", size: blob.size };
}

describe("batch service", () => {
  it("preserves input order and continues after individual failures", async () => {
    const files = [file("a.png"), file("b.png"), file("c.png")];
    let active = 0;
    let peak = 0;
    const result = await runBatch(files, async (input) => {
      active += 1;
      peak = Math.max(peak, active);
      await Promise.resolve();
      active -= 1;
      if (input.name === "b.png") throw new Error("bad");
      return output(input);
    }, { concurrency: 2 });

    expect(result.items.map((item) => item.status)).toEqual(["success", "error", "success"]);
    expect(result.completed).toBe(3);
    expect(peak).toBeLessThanOrEqual(2);
  });

  it("validates count, per-file size, aggregate size, and image MIME", () => {
    expect(validateImageBatch(Array.from({ length: MAX_BATCH_FILES + 1 }, (_, index) => file(`${index}.png`)))).not.toHaveLength(0);
    expect(validateImageBatch([file("huge.png", 50 * 1024 * 1024 + 1)]).map((item) => item.code)).toContain("file-size");
    expect(validateImageBatch([new File(["x"], "note.txt", { type: "text/plain" })]).map((item) => item.code)).toContain("file-type");
  });

  it("reports progress after each settlement", async () => {
    const progress: number[] = [];
    await runBatch([file("a.png"), file("b.png")], async (input) => output(input), {
      concurrency: 2,
      onProgress: (completed) => progress.push(completed),
    });
    expect(progress).toEqual([1, 2]);
  });
});
