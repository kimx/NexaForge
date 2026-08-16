export interface JwtDecodedToken {
  header: unknown;
  payload: unknown;
  signature: string;
}

function normalizeBase64(base64Url: string): string {
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  const padding = (4 - (base64.length % 4)) % 4;
  return base64 + "=".repeat(padding);
}

function decodeBase64UrlSegment(segment: string): string {
  const decoded = atob(normalizeBase64(segment));
  const bytes = Uint8Array.from(decoded, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function parseJwtSection<T>(segment: string, section: "header" | "payload"): T {
  const text = decodeBase64UrlSegment(segment);
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Unable to parse JWT ${section} JSON.`);
  }
}

function base64UrlEncode(bytes: Uint8Array): string {
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function generateJwtSecretKey(byteLength = 32): string {
  const normalizedLength = Math.max(16, Math.floor(byteLength));
  const bytes = new Uint8Array(normalizedLength);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

export function decodeJwtToken(token: string): JwtDecodedToken {
  const normalizedToken = token.trim();
  const segments = normalizedToken.split(".");

  if (segments.length !== 3) {
    throw new Error("Invalid JWT format. A token must contain exactly 3 dot-separated segments.");
  }

  const [headerSegment, payloadSegment, signatureSegment] = segments;
  if (!headerSegment || !payloadSegment || !signatureSegment) {
    throw new Error("Invalid JWT format. Header, payload, and signature are required.");
  }

  const header = parseJwtSection<unknown>(headerSegment, "header");
  const payload = parseJwtSection<unknown>(payloadSegment, "payload");

  return {
    header,
    payload,
    signature: signatureSegment,
  };
}
