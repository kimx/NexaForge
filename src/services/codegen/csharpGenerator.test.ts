import { generateCSharp } from "./csharpGenerator";

describe("C# generator", () => {
  it("emits namespace, JSON name attributes, nested classes, and nullable values", () => {
    const output = generateCSharp(
      { "display-name": "Ada", age: null, profile: { active: true } },
      { rootName: "Person", namespace: "Demo.Models" }
    );

    expect(output).toContain("namespace Demo.Models;");
    expect(output).toContain('[JsonPropertyName("display-name")]');
    expect(output).toContain("public string DisplayName");
    expect(output).toContain("public object? Age");
    expect(output).toContain("public Profile Profile");
    expect(output).toContain("public class Profile");
  });

  it("uses lists and nullable types for merged arrays", () => {
    const output = generateCSharp(
      { items: [{ id: 1 }, { id: 2, label: "Two" }] },
      { rootName: "Catalog" }
    );

    expect(output).toContain("public List<Item> Items");
    expect(output).toContain("public string? Label");
  });
});
