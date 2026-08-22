export type ScalarSchemaKind =
  | "string"
  | "number"
  | "boolean"
  | "null"
  | "unknown";

export type SchemaNode =
  | { kind: ScalarSchemaKind }
  | { kind: "object"; name: string }
  | { kind: "array"; element: SchemaNode }
  | { kind: "union"; variants: SchemaNode[] };

export interface InferredProperty {
  sourceName: string;
  name: string;
  schema: SchemaNode;
  optional: boolean;
}

export interface InferredObject {
  name: string;
  properties: InferredProperty[];
}

export interface InferredSchema {
  rootName: string;
  root: SchemaNode;
  objects: InferredObject[];
}

function identifierWords(value: string): string[] {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean);
}

export function sanitizeTypeName(value: string, fallback = "Root"): string {
  const words = identifierWords(value);
  const joined = words
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("");
  const candidate = joined || fallback;
  return /^\d/.test(candidate) ? `Type${candidate}` : candidate;
}

export function sanitizePropertyName(value: string, fallback = "value"): string {
  const words = identifierWords(value);
  if (words.length === 0) {
    return fallback;
  }

  const [first, ...rest] = words;
  const candidate =
    first.charAt(0).toLowerCase() +
    first.slice(1) +
    rest.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join("");
  return /^\d/.test(candidate) ? `_${candidate}` : candidate;
}

function singularize(value: string): string {
  if (/ies$/i.test(value)) {
    return `${value.slice(0, -3)}y`;
  }
  if (/s$/i.test(value) && !/ss$/i.test(value)) {
    return value.slice(0, -1);
  }
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function nodeKey(node: SchemaNode): string {
  if (node.kind === "object") {
    return `object:${node.name}`;
  }
  if (node.kind === "array") {
    return `array:${nodeKey(node.element)}`;
  }
  return node.kind;
}

function combineNodes(nodes: SchemaNode[]): SchemaNode {
  const flattened = nodes.flatMap((node) =>
    node.kind === "union" ? node.variants : [node]
  );
  const unique = flattened.filter(
    (node, index, all) => all.findIndex((item) => nodeKey(item) === nodeKey(node)) === index
  );
  return unique.length === 1 ? unique[0] : { kind: "union", variants: unique };
}

export function inferJsonSchema(value: unknown, rootName = "Root"): InferredSchema {
  const objects: InferredObject[] = [];
  const usedTypeNames = new Set<string>();

  const allocateTypeName = (suggestion: string): string => {
    const base = sanitizeTypeName(suggestion);
    let candidate = base;
    let suffix = 2;
    while (usedTypeNames.has(candidate)) {
      candidate = `${base}${suffix}`;
      suffix += 1;
    }
    usedTypeNames.add(candidate);
    return candidate;
  };

  const inferValues = (values: unknown[], suggestion: string): SchemaNode => {
    if (values.length === 0) {
      return { kind: "unknown" };
    }

    const records = values.filter(isRecord);
    const otherValues = values.filter((item) => !isRecord(item));
    const nodes: SchemaNode[] = [];
    if (records.length > 0) {
      nodes.push(inferObjectCollection(records, suggestion));
    }
    nodes.push(...otherValues.map((item) => inferNode(item, suggestion)));
    return combineNodes(nodes);
  };

  const inferObjectCollection = (
    records: Record<string, unknown>[],
    suggestion: string
  ): SchemaNode => {
    const name = allocateTypeName(suggestion);
    const object: InferredObject = { name, properties: [] };
    objects.push(object);

    const sourceNames: string[] = [];
    records.forEach((record) => {
      Object.keys(record).forEach((key) => {
        if (!sourceNames.includes(key)) {
          sourceNames.push(key);
        }
      });
    });

    object.properties = sourceNames.map((sourceName) => {
      const presentValues = records
        .filter((record) => Object.prototype.hasOwnProperty.call(record, sourceName))
        .map((record) => record[sourceName]);
      const childSuggestion = singularize(sourceName);
      return {
        sourceName,
        name: sanitizePropertyName(sourceName),
        schema: inferValues(presentValues, childSuggestion),
        optional: presentValues.length < records.length,
      };
    });

    return { kind: "object", name };
  };

  const inferNode = (item: unknown, suggestion: string): SchemaNode => {
    if (item === null) {
      return { kind: "null" };
    }
    if (Array.isArray(item)) {
      return {
        kind: "array",
        element: item.length === 0 ? { kind: "unknown" } : inferValues(item, singularize(suggestion)),
      };
    }
    if (isRecord(item)) {
      return inferObjectCollection([item], suggestion);
    }
    const itemType = typeof item;
    if (itemType === "string" || itemType === "number" || itemType === "boolean") {
      return { kind: itemType };
    }
    return { kind: "unknown" };
  };

  const sanitizedRootName = sanitizeTypeName(rootName);
  const root = isRecord(value)
    ? inferObjectCollection([value], sanitizedRootName)
    : inferNode(value, sanitizedRootName);

  return { rootName: sanitizedRootName, root, objects };
}
