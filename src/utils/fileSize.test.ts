import { formatFileSize } from "./fileSize";

describe("formatFileSize", () => {
  it("formats file bytes", () => {
    expect(formatFileSize(512)).toBe("512 B");
    expect(formatFileSize(2048)).toBe("2.00 KB");
    expect(formatFileSize(3 * 1024 * 1024)).toBe("3.00 MB");
  });
});
