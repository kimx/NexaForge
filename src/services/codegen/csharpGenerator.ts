import {
  inferJsonSchema,
  sanitizeTypeName,
  type SchemaNode,
} from "./jsonSchema";

export interface CSharpGeneratorOptions {
  rootName?: string;
  namespace?: string;
}

function includesNull(node: SchemaNode): boolean {
  return node.kind === "null" || (node.kind === "union" && node.variants.some(includesNull));
}

function withoutNull(node: SchemaNode): SchemaNode[] {
  if (node.kind !== "union") {
    return node.kind === "null" ? [] : [node];
  }
  return node.variants.filter((variant) => variant.kind !== "null");
}

function csharpType(node: SchemaNode, optional = false): string {
  let type: string;
  if (node.kind === "union") {
    const nonNull = withoutNull(node);
    type = nonNull.length === 1 ? csharpType(nonNull[0]) : "object";
  } else if (node.kind === "string") {
    type = "string";
  } else if (node.kind === "number") {
    type = "double";
  } else if (node.kind === "boolean") {
    type = "bool";
  } else if (node.kind === "object") {
    type = node.name;
  } else if (node.kind === "array") {
    type = `List<${csharpType(node.element)}>`;
  } else {
    type = "object";
  }

  if ((optional || includesNull(node)) && !type.endsWith("?")) {
    return `${type}?`;
  }
  return type;
}

function escapeCSharpString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function sanitizeNamespace(value: string): string {
  return value
    .split(".")
    .map((part) => sanitizeTypeName(part, "Namespace"))
    .join(".");
}

export function generateCSharp(
  value: unknown,
  options: CSharpGeneratorOptions = {}
): string {
  const schema = inferJsonSchema(value, options.rootName || "Root");
  const sections = [
    "using System.Collections.Generic;",
    "using System.Text.Json.Serialization;",
  ];

  if (options.namespace?.trim()) {
    sections.push("", `namespace ${sanitizeNamespace(options.namespace.trim())};`);
  }

  schema.objects.forEach((object) => {
    const lines = [`public class ${object.name}`, "{"];
    object.properties.forEach((property) => {
      const propertyName = sanitizeTypeName(property.name, "Value");
      if (property.sourceName !== property.name) {
        lines.push(`    [JsonPropertyName("${escapeCSharpString(property.sourceName)}")]`);
      }
      lines.push(
        `    public ${csharpType(property.schema, property.optional)} ${propertyName} { get; set; }`
      );
    });
    lines.push("}");
    sections.push("", lines.join("\n"));
  });

  if (schema.objects.length === 0) {
    sections.push("", `public record ${schema.rootName}(${csharpType(schema.root)} Value);`);
  }

  return `${sections.join("\n")}\n`;
}
