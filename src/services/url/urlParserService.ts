export interface ParsedQueryParameter {
  key: string;
  value: string;
}

export interface ParsedUrl {
  href: string;
  origin: string;
  protocol: string;
  host: string;
  hostname: string;
  port: string;
  pathname: string;
  search: string;
  hash: string;
  queryParameters: ParsedQueryParameter[];
}

export type UrlParseErrorCode = "empty-input" | "invalid-url";

export class UrlParseError extends Error {
  readonly code: UrlParseErrorCode;

  constructor(code: UrlParseErrorCode, cause?: unknown) {
    super(code, cause === undefined ? undefined : { cause });
    this.name = "UrlParseError";
    this.code = code;
  }
}

export function parseUrl(source: string): ParsedUrl {
  const normalized = source.trim();
  if (!normalized) {
    throw new UrlParseError("empty-input");
  }

  try {
    const url = new URL(normalized);
    return {
      href: url.href,
      origin: url.origin,
      protocol: url.protocol,
      host: url.host,
      hostname: url.hostname,
      port: url.port,
      pathname: url.pathname,
      search: url.search,
      hash: url.hash,
      queryParameters: Array.from(url.searchParams.entries(), ([key, value]) => ({ key, value })),
    };
  } catch (error) {
    throw new UrlParseError("invalid-url", error);
  }
}
