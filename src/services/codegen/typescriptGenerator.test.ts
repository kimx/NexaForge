import { generateTypeScript } from "./typescriptGenerator";

describe("TypeScript generator", () => {
  it("emits exported interfaces, quoted unsafe names, and stable unions", () => {
    const output = generateTypeScript(
      { "display-name": "Ada", values: [1, "two"] },
      { rootName: "Person" }
    );

    expect(output).toContain("export interface Person");
    expect(output).toContain('"display-name": string;');
    expect(output).toContain("values: (number | string)[];");
  });

  it("marks fields missing from array members as optional", () => {
    const output = generateTypeScript(
      [{ id: 1 }, { id: 2, label: null }],
      { rootName: "Item" }
    );

    expect(output).toContain("label?: null;");
  });

  it("uses unknown for empty arrays", () => {
    expect(generateTypeScript({ values: [] }, { rootName: "Payload" })).toContain(
      "values: unknown[];"
    );
  });
});
