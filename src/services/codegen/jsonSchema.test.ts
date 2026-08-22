import {
  inferJsonSchema,
  sanitizePropertyName,
  sanitizeTypeName,
} from "./jsonSchema";

describe("JSON schema inference", () => {
  it("infers nested objects and optional array properties deterministically", () => {
    const schema = inferJsonSchema(
      {
        user: { "display-name": "Ada" },
        items: [{ id: 1 }, { id: 2, active: true }],
      },
      "Api Response"
    );

    expect(schema.rootName).toBe("ApiResponse");
    expect(schema.objects.map((item) => item.name)).toEqual([
      "ApiResponse",
      "User",
      "Item",
    ]);
    expect(
      schema.objects
        .find((item) => item.name === "Item")
        ?.properties.find((item) => item.sourceName === "active")?.optional
    ).toBe(true);
  });

  it("merges incompatible scalar types into a stable union", () => {
    const schema = inferJsonSchema([{ value: 1 }, { value: "one" }, { value: null }], "Record");
    const value = schema.objects[0]?.properties[0]?.schema;

    expect(value).toEqual({
      kind: "union",
      variants: [{ kind: "number" }, { kind: "string" }, { kind: "null" }],
    });
  });

  it("represents empty arrays as arrays of unknown values", () => {
    const schema = inferJsonSchema({ values: [] }, "Payload");
    expect(schema.objects[0]?.properties[0]?.schema).toEqual({
      kind: "array",
      element: { kind: "unknown" },
    });
  });

  it("sanitizes identifiers and suffixes duplicate type names", () => {
    expect(sanitizeTypeName("api response")).toBe("ApiResponse");
    expect(sanitizeTypeName("123 result")).toBe("Type123Result");
    expect(sanitizePropertyName("display-name")).toBe("displayName");

    const schema = inferJsonSchema(
      { "user-profile": { id: 1 }, user_profile: { id: 2 } },
      "Root"
    );
    expect(schema.objects.map((item) => item.name)).toEqual([
      "Root",
      "UserProfile",
      "UserProfile2",
    ]);
  });
});
