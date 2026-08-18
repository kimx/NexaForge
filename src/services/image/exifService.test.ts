import { readExifEntries, removeExifData } from "./exifService";

function createExifJpeg(): File {
  const exifPayload = new Uint8Array([
    0x45, 0x78, 0x69, 0x66, 0x00, 0x00,
    0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00,
    0x02, 0x00,
    0x0f, 0x01, 0x02, 0x00, 0x06, 0x00, 0x00, 0x00, 0x26, 0x00, 0x00, 0x00,
    0x10, 0x01, 0x02, 0x00, 0x07, 0x00, 0x00, 0x00, 0x2c, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00,
    0x4b, 0x69, 0x6d, 0x58, 0x00, 0x00,
    0x43, 0x61, 0x6d, 0x65, 0x72, 0x61, 0x00,
  ]);
  const app1Length = exifPayload.length + 2;
  const bytes = new Uint8Array([
    0xff, 0xd8,
    0xff, 0xe1, (app1Length >> 8) & 0xff, app1Length & 0xff,
    ...exifPayload,
    0xff, 0xdb, 0x00, 0x04, 0x00, 0x00,
    0xff, 0xd9,
  ]);
  return new File([bytes], "sample.jpg", { type: "image/jpeg" });
}

describe("exifService", () => {
  it("reads EXIF entries from a JPEG file", async () => {
    const entries = await readExifEntries(createExifJpeg());

    expect(entries).toEqual([
      { label: "Make", value: "KimX" },
      { label: "Model", value: "Camera" },
    ]);
  });

  it("removes EXIF metadata from a JPEG file", async () => {
    const file = createExifJpeg();
    const { result, removedBytes } = await removeExifData(file);

    expect(removedBytes).toBeGreaterThan(0);
    expect(result.fileName).toBe("sample-no-exif.jpg");
    const entries = await readExifEntries(new File([await result.blob.arrayBuffer()], result.fileName, { type: result.mimeType }));
    expect(entries).toEqual([]);
  });
});
