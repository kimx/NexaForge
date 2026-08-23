import { describe, expect, it } from "vitest";
import { UrlParseError, parseUrl } from "./urlParserService";

describe("parseUrl", () => {
  it("returns URL components and preserves ordered duplicate query parameters", () => {
    const result = parseUrl(
      "https://abc.com:8443/api/items?id=123&type=A&id=456&empty=#top"
    );

    expect(result).toEqual({
      href: "https://abc.com:8443/api/items?id=123&type=A&id=456&empty=#top",
      origin: "https://abc.com:8443",
      protocol: "https:",
      host: "abc.com:8443",
      hostname: "abc.com",
      port: "8443",
      pathname: "/api/items",
      search: "?id=123&type=A&id=456&empty=",
      hash: "#top",
      queryParameters: [
        { key: "id", value: "123" },
        { key: "type", value: "A" },
        { key: "id", value: "456" },
        { key: "empty", value: "" },
      ],
    });
  });

  it("keeps the encoded search while exposing decoded parameter values", () => {
    const result = parseUrl("https://example.com/search?q=A%20B&tag=%E6%B8%AC%E8%A9%A6");

    expect(result.search).toBe("?q=A%20B&tag=%E6%B8%AC%E8%A9%A6");
    expect(result.queryParameters).toEqual([
      { key: "q", value: "A B" },
      { key: "tag", value: "測試" },
    ]);
  });

  it.each(["", "   ", "/relative/path", "not a url"])(
    "rejects invalid absolute input without echoing it in the error",
    (source) => {
      let caught: unknown;
      try {
        parseUrl(source);
      } catch (error) {
        caught = error;
      }

      expect(caught).toBeInstanceOf(UrlParseError);
      expect(caught).toMatchObject({ code: source.trim() ? "invalid-url" : "empty-input" });
      if (source.trim()) {
        expect((caught as Error).message).not.toContain(source.trim());
      }
    }
  );
});
