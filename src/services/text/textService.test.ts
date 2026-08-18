import {
  base64ToText,
  convertTextCase,
  countTextStats,
  generateUuids,
  hashText,
  removeDuplicateLines,
  sortTextLines,
  textToBase64,
} from "./textService";

describe("text service", () => {
  it("encodes and decodes base64", () => {
    const input = "hello-browser";
    expect(base64ToText(textToBase64(input))).toBe(input);
  });

  it("counts text statistics", () => {
    expect(countTextStats("Hello world\n\nAgain")).toEqual({
      characters: 18,
      charactersNoSpaces: 15,
      words: 3,
      lines: 3,
      nonEmptyLines: 2,
    });
  });

  it("converts text case across supported modes", () => {
    expect(convertTextCase("hello world", "upper")).toBe("HELLO WORLD");
    expect(convertTextCase("HELLO WORLD", "lower")).toBe("hello world");
    expect(convertTextCase("hello world", "title")).toBe("Hello World");
    expect(convertTextCase("hello world. welcome back!", "sentence")).toBe("Hello world. Welcome back!");
  });

  it("removes duplicate lines while preserving order", () => {
    expect(removeDuplicateLines("One\none\nTwo\nOne", { ignoreCase: true })).toBe("One\nTwo");
  });

  it("sorts lines in descending order", () => {
    expect(sortTextLines("beta\nAlpha\n10\n2", { direction: "desc" })).toBe("beta\nAlpha\n10\n2");
    expect(sortTextLines("beta\nAlpha\n10\n2", { direction: "asc" })).toBe("2\n10\nAlpha\nbeta");
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
