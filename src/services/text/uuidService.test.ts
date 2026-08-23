import { formatIdentifier, generateIdentifiers, SecureUuidUnavailableError } from "./uuidService";

const generatedV4 = "109156be-c4fb-41ea-b1b4-efe1671c5836";
const generatedV7 = [
  "01941f29-7c00-73e4-a310-744d2167fc5b",
  "01941f29-7c00-73e4-a310-744d2167fc5c",
];

describe("UUID service", () => {
  it("generates v7 identifiers then applies braced upper-case formatting", () => {
    let index = 0;
    const generated = generateIdentifiers(
      { kind: "v7", count: 2, case: "upper", format: "braced" },
      { v4: () => generatedV4, v7: () => generatedV7[index++] }
    );

    expect(generated).toEqual([
      "{01941F29-7C00-73E4-A310-744D2167FC5B}",
      "{01941F29-7C00-73E4-A310-744D2167FC5C}",
    ]);
  });

  it("uses v4 generation for the .NET Guid compatibility option", () => {
    const v4 = vi.fn(() => generatedV4);
    const v7 = vi.fn(() => generatedV7[0]);

    expect(generateIdentifiers(
      { kind: "dotnet-guid", count: 1, case: "upper", format: "standard" },
      { v4, v7 }
    )).toEqual([generatedV4.toUpperCase()]);
    expect(v4).toHaveBeenCalledOnce();
    expect(v7).not.toHaveBeenCalled();
  });

  it.each([
    ["standard", "109156be-c4fb-41ea-b1b4-efe1671c5836"],
    ["braced", "{109156be-c4fb-41ea-b1b4-efe1671c5836}"],
    ["compact", "109156bec4fb41eab1b4efe1671c5836"],
  ] as const)("formats identifiers as %s", (format, expected) => {
    expect(formatIdentifier(generatedV4.toUpperCase(), { case: "lower", format })).toBe(expected);
  });

  it.each([0, 1.5, 1001, Number.NaN])("rejects invalid count %s", (count) => {
    expect(() => generateIdentifiers(
      { kind: "v4", count, case: "lower", format: "standard" },
      { v4: () => generatedV4, v7: () => generatedV7[0] }
    )).toThrow("count");
  });

  it("rejects values that are not canonical UUIDs before formatting", () => {
    expect(() => formatIdentifier("not-a-uuid", { case: "lower", format: "compact" }))
      .toThrow("identifier");
  });

  it("reports a typed error when Web Crypto is unavailable", () => {
    vi.stubGlobal("crypto", undefined);
    try {
      expect(() => generateIdentifiers({ kind: "v4", count: 1, case: "lower", format: "standard" }))
        .toThrow(SecureUuidUnavailableError);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
