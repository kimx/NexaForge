export class XmlValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "XmlValidationError";
  }
}

export interface XmlJsonOptions {
  indent?: number;
}

export interface XmlFormatOptions extends XmlJsonOptions {
  mode?: "pretty" | "compact" | "minify";
}

const FORBIDDEN_DECLARATION = /<!\s*(?:DOCTYPE|ENTITY)\b/i;

function normalizedIndent(indent = 2): number {
  return Math.max(0, Math.min(8, Math.trunc(indent)));
}

function parseXml(xmlText: string): XMLDocument {
  if (!xmlText.trim()) {
    throw new XmlValidationError("Enter XML to continue.");
  }
  if (FORBIDDEN_DECLARATION.test(xmlText)) {
    throw new XmlValidationError("DOCTYPE and ENTITY declarations are not allowed.");
  }

  const documentNode = new DOMParser().parseFromString(xmlText, "application/xml");
  const parserError = documentNode.getElementsByTagName("parsererror")[0];
  if (parserError) {
    throw new XmlValidationError(parserError.textContent?.trim() || "Invalid XML document.");
  }
  return documentNode;
}

function elementToValue(element: Element): unknown {
  const result: Record<string, unknown> = {};
  for (const attribute of Array.from(element.attributes)) {
    result[`@${attribute.name}`] = attribute.value;
  }

  const children = Array.from(element.children);
  children.forEach((child) => {
    const value = elementToValue(child);
    const current = result[child.tagName];
    if (current === undefined) {
      result[child.tagName] = value;
    } else if (Array.isArray(current)) {
      current.push(value);
    } else {
      result[child.tagName] = [current, value];
    }
  });

  const directText = Array.from(element.childNodes)
    .filter((node) => node.nodeType === Node.TEXT_NODE || node.nodeType === Node.CDATA_SECTION_NODE)
    .map((node) => node.nodeValue || "")
    .join("")
    .trim();

  if (Object.keys(result).length === 0) {
    return directText;
  }
  if (directText) {
    result["#text"] = directText;
  }
  return result;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function setElementContent(documentNode: XMLDocument, element: Element, value: unknown): void {
  if (value === null || value === undefined) {
    return;
  }
  if (!isRecord(value)) {
    element.appendChild(documentNode.createTextNode(String(value)));
    return;
  }

  Object.entries(value).forEach(([key, childValue]) => {
    if (key.startsWith("@")) {
      const attributeName = key.slice(1);
      if (!attributeName) {
        throw new XmlValidationError("XML attribute names cannot be empty.");
      }
      try {
        element.setAttribute(attributeName, childValue === null ? "" : String(childValue));
      } catch {
        throw new XmlValidationError(`Invalid XML attribute name: ${attributeName}`);
      }
      return;
    }
    if (key === "#text") {
      element.appendChild(documentNode.createTextNode(childValue === null ? "" : String(childValue)));
      return;
    }

    const values = Array.isArray(childValue) ? childValue : [childValue];
    values.forEach((item) => {
      let child: Element;
      try {
        child = documentNode.createElement(key);
      } catch {
        throw new XmlValidationError(`Invalid XML element name: ${key}`);
      }
      setElementContent(documentNode, child, item);
      element.appendChild(child);
    });
  });
}

function removeFormattingWhitespace(node: Node): void {
  Array.from(node.childNodes).forEach((child) => {
    if (child.nodeType === Node.TEXT_NODE && !(child.nodeValue || "").trim()) {
      node.removeChild(child);
      return;
    }
    removeFormattingWhitespace(child);
  });
}

function prettyPrint(serialized: string, indent: number): string {
  if (indent === 0) {
    return serialized.replace(/>\s+</g, "><");
  }
  const unit = " ".repeat(indent);
  const tokens = serialized.replace(/>\s*</g, ">\n<").split("\n");
  let depth = 0;
  return tokens
    .map((token) => {
      const trimmed = token.trim();
      if (/^<\//.test(trimmed)) {
        depth = Math.max(0, depth - 1);
      }
      const line = `${unit.repeat(depth)}${trimmed}`;
      const opensElement = /^<[^!?/][^>]*[^/]?>/.test(trimmed);
      const closesOnLine = /<\/[^>]+>\s*$/.test(trimmed);
      if (opensElement && !closesOnLine && !/\/>\s*$/.test(trimmed)) {
        depth += 1;
      }
      return line;
    })
    .join("\n");
}

function serializeDocument(documentNode: XMLDocument, options: XmlFormatOptions): string {
  removeFormattingWhitespace(documentNode.documentElement);
  const serialized = new XMLSerializer().serializeToString(documentNode.documentElement);
  return options.mode === "pretty"
    ? prettyPrint(serialized, normalizedIndent(options.indent))
    : serialized.replace(/>\s+</g, "><");
}

export function xmlToJson(xmlText: string, options: XmlJsonOptions = {}): string {
  const documentNode = parseXml(xmlText);
  return JSON.stringify(
    { [documentNode.documentElement.tagName]: elementToValue(documentNode.documentElement) },
    null,
    normalizedIndent(options.indent)
  );
}

export function jsonToXml(jsonText: string, options: XmlJsonOptions = {}): string {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch (error) {
    throw new XmlValidationError(error instanceof Error ? error.message : "Invalid JSON document.");
  }
  if (!isRecord(parsed) || Object.keys(parsed).length !== 1) {
    throw new XmlValidationError("JSON must contain exactly one root property.");
  }

  const [rootName] = Object.keys(parsed);
  const documentNode = new DOMParser().parseFromString("<root/>", "application/xml");
  let root: Element;
  try {
    root = documentNode.createElement(rootName);
  } catch {
    throw new XmlValidationError(`Invalid XML root element name: ${rootName}`);
  }
  documentNode.replaceChild(root, documentNode.documentElement);
  setElementContent(documentNode, root, parsed[rootName]);
  return serializeDocument(documentNode, { mode: "pretty", indent: options.indent });
}

export function formatXml(xmlText: string, options: XmlFormatOptions = {}): string {
  const documentNode = parseXml(xmlText);
  return serializeDocument(documentNode, {
    mode: options.mode || "pretty",
    indent: options.indent,
  });
}
