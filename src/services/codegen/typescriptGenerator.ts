import { inferJsonSchema, type SchemaNode } from "./jsonSchema";

export interface TypeScriptGeneratorOptions {
  rootName?: string;
}

const RESERVED_WORDS = new Set([
  "break",
  "case",
  "class",
  "const",
  "default",
  "delete",
  "export",
  "extends",
  "function",
  "import",
  "interface",
  "new",
  "return",
  "super",
  "switch",
  "this",
  "throw",
  "typeof",
  "var",
  "void",
  "while",
]);

function propertyName(sourceName: string): string {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(sourceName) && !RESERVED_WORDS.has(sourceName)
    ? sourceName
    : JSON.stringify(sourceName);
}

function typescriptType(node: SchemaNode, nested = false): string {
  if (node.kind === "string" || node.kind === "number" || node.kind === "boolean") {
    return node.kind;
  }
  if (node.kind === "null" || node.kind === "unknown") {
    return node.kind;
  }
  if (node.kind === "object") {
    return node.name;
  }
  if (node.kind === "union") {
    const type = node.variants.map((variant) => typescriptType(variant, true)).join(" | ");
    return nested ? `(${type})` : type;
  }
  if (node.kind === "array") {
    const element = typescriptType(node.element, node.element.kind === "union");
    return `${element}[]`;
  }
  return "unknown";
}

export function generateTypeScript(
  value: unknown,
  options: TypeScriptGeneratorOptions = {}
): string {
  const schema = inferJsonSchema(value, options.rootName || "Root");
  const declarations = schema.objects.map((object) => {
    const lines = [`export interface ${object.name} {`];
    object.properties.forEach((property) => {
      lines.push(
        `  ${propertyName(property.sourceName)}${property.optional ? "?" : ""}: ${typescriptType(property.schema)};`
      );
    });
    lines.push("}");
    return lines.join("\n");
  });

  if (schema.objects.length === 0) {
    declarations.push(`export type ${schema.rootName} = ${typescriptType(schema.root)};`);
  }

  return `${declarations.join("\n\n")}\n`;
}
