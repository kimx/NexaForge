import { createZip } from "./zipService";
import type { FileProcessResult } from "../../types/tool";

function output(name: string): FileProcessResult {
  const blob = new Blob([name]);
  return { blob, fileName: name, mimeType: "image/png", size: blob.size };
}

describe("ZIP service", () => {
  it("creates an archive and de-duplicates sanitized paths", async () => {
    let paths: string[] = [];
    const result = await createZip([output("../image.png"), output("image.png")], "images.zip", {
      zip: (data, _options, callback) => {
        paths = Object.keys(data);
        callback(null, new Uint8Array([80, 75]));
      },
    });

    expect(result.fileName).toBe("images.zip");
    expect(result.mimeType).toBe("application/zip");
    expect(paths).toEqual(["image.png", "image-2.png"]);
  });
});
