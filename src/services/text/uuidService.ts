import { v4 as uuidV4, v7 as uuidV7 } from "uuid";

export type UuidKind = "v4" | "v7" | "dotnet-guid";
export type UuidCase = "lower" | "upper";
export type UuidFormat = "standard" | "braced" | "compact";

export interface IdentifierOptions {
  kind: UuidKind;
  count: number;
  case: UuidCase;
  format: UuidFormat;
}

export interface IdentifierFormatOptions {
  case: UuidCase;
  format: UuidFormat;
}

export interface UuidDependencies {
  v4: () => string;
  v7: () => string;
}

const CANONICAL_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const defaultDependencies: UuidDependencies = {
  v4: uuidV4,
  v7: uuidV7,
};

export function formatIdentifier(
  value: string,
  options: IdentifierFormatOptions
): string {
  if (!CANONICAL_UUID.test(value)) {
    throw new Error("identifier must be a canonical UUID");
  }

  let formatted = options.format === "compact" ? value.replaceAll("-", "") : value;
  formatted = options.case === "upper" ? formatted.toUpperCase() : formatted.toLowerCase();
  return options.format === "braced" ? `{${formatted}}` : formatted;
}

export function generateIdentifiers(
  options: IdentifierOptions,
  dependencies: UuidDependencies = defaultDependencies
): string[] {
  if (!Number.isInteger(options.count) || options.count < 1 || options.count > 1000) {
    throw new Error("count must be an integer from 1 to 1000");
  }

  const generate = options.kind === "v7" ? dependencies.v7 : dependencies.v4;
  return Array.from({ length: options.count }, () =>
    formatIdentifier(generate(), { case: options.case, format: options.format })
  );
}
