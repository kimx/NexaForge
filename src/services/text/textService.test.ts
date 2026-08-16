import { generateUuids, hashText, textToBase64, base64ToText } from "./textService";

describe("text service", () => {
  it("encodes and decodes base64", () => {
    const input = "hello-browser";
    expect(base64ToText(textToBase64(input))).toBe(input);
  });

  it("generates limited UUID batch", () => {
    expect(generateUuids(3).length).toBe(3);
    expect(generateUuids(1200).length).toBe(1000);
  });

  it("generates stable sha-256 hash", async () => {
    const hash = await hashText("browser-file-tools", { algorithm: "SHA-256" });
    expect(hash).toBe(
      "975c2c37e754843d012c0d46bcbb50f6d75bfef59c3dfac462c84d6e38a0cf1d"
    );
  });
});
