import {
  localeFromPath,
  localizePath,
  stripLocalePrefix,
} from "./localePaths";

describe("locale path helpers", () => {
  it("derives locale only from the explicit URL prefix", () => {
    expect(localeFromPath("/en/developer/json-diff")).toBe("en");
    expect(localeFromPath("/en")).toBe("en");
    expect(localeFromPath("/developer/json-diff")).toBe("zh-TW");
    expect(localeFromPath("/english/data/json-formatter")).toBe("zh-TW");
  });

  it("strips an English locale prefix while preserving the base path", () => {
    expect(stripLocalePrefix("/en/data/json-formatter")).toBe(
      "/data/json-formatter"
    );
    expect(stripLocalePrefix("/en")).toBe("/");
    expect(stripLocalePrefix("/data/json-formatter")).toBe(
      "/data/json-formatter"
    );
    expect(stripLocalePrefix("/en/data/json-formatter/")).toBe(
      "/data/json-formatter"
    );
    expect(stripLocalePrefix("/data/json-formatter/")).toBe(
      "/data/json-formatter"
    );
  });

  it("creates stable localized paths without duplicating prefixes", () => {
    expect(localizePath("/data/json-formatter", "en")).toBe(
      "/en/data/json-formatter"
    );
    expect(localizePath("/en/data/json-formatter", "en")).toBe(
      "/en/data/json-formatter"
    );
    expect(localizePath("/en/data/json-formatter", "zh-TW")).toBe(
      "/data/json-formatter"
    );
    expect(localizePath("/", "en")).toBe("/en");
    expect(localizePath("/", "zh-TW")).toBe("/");
  });
});
