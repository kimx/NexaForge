export type WifiSecurity = "WPA" | "WEP" | "nopass";

export interface WifiQrInput {
  ssid: string;
  password: string;
  security: WifiSecurity;
  hidden: boolean;
}

export interface VCardQrInput {
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  organization?: string;
  title?: string;
  url?: string;
  address?: string;
}

export type QrContentType = "url" | "text" | "wifi" | "vcard" | "email" | "phone" | "sms" | "line";

function escapeWifiValue(value: string): string {
  return value.replace(/[\\;,:"]/g, "\\$&");
}

function escapeVCardValue(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\r|\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}

export function buildWifiPayload(input: WifiQrInput): string {
  if (!input.ssid.trim()) {
    throw new Error("SSID is required");
  }

  const fields = [
    `T:${input.security}`,
    `S:${escapeWifiValue(input.ssid)}`,
  ];
  if (input.security !== "nopass") {
    fields.push(`P:${escapeWifiValue(input.password)}`);
  }
  fields.push(`H:${input.hidden ? "true" : "false"}`);
  return `WIFI:${fields.join(";")};;`;
}

function calculateEan13CheckDigit(twelveDigits: string): number {
  const sum = [...twelveDigits].reduce((total, digit, index) => {
    const weight = index % 2 === 0 ? 1 : 3;
    return total + Number(digit) * weight;
  }, 0);
  return (10 - (sum % 10)) % 10;
}

export function normalizeEan13(value: string): string {
  const compact = value.replace(/[\s-]/g, "");
  if (!/^\d+$/.test(compact)) {
    throw new Error("EAN-13 must contain digits only");
  }
  if (compact.length !== 12 && compact.length !== 13) {
    throw new Error("EAN-13 must contain 12 or 13 digits");
  }

  const body = compact.slice(0, 12);
  const checkDigit = calculateEan13CheckDigit(body);
  if (compact.length === 13 && Number(compact[12]) !== checkDigit) {
    throw new Error("EAN-13 check digit is invalid");
  }
  return `${body}${checkDigit}`;
}

export function buildVCardPayload(input: VCardQrInput): string {
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  if (!firstName && !lastName) {
    throw new Error("A first or last name is required");
  }

  const formattedName = [firstName, lastName].filter(Boolean).join(" ");
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `N:${escapeVCardValue(lastName)};${escapeVCardValue(firstName)};;;`,
    `FN:${escapeVCardValue(formattedName)}`,
  ];

  if (input.organization?.trim()) lines.push(`ORG:${escapeVCardValue(input.organization.trim())}`);
  if (input.title?.trim()) lines.push(`TITLE:${escapeVCardValue(input.title.trim())}`);
  if (input.phone?.trim()) lines.push(`TEL;TYPE=CELL:${escapeVCardValue(input.phone.trim())}`);
  if (input.email?.trim()) lines.push(`EMAIL;TYPE=INTERNET:${escapeVCardValue(input.email.trim())}`);
  if (input.url?.trim()) lines.push(`URL:${escapeVCardValue(input.url.trim())}`);
  if (input.address?.trim()) lines.push(`ADR;TYPE=HOME:;;${escapeVCardValue(input.address.trim())};;;;`);

  lines.push("END:VCARD");
  return lines.join("\r\n");
}

export function buildEmailPayload(email: string, subject: string, body: string): string {
  const address = email.trim();
  if (!address) {
    throw new Error("Email is required");
  }

  const parameters = new URLSearchParams();
  if (subject.trim()) parameters.set("subject", subject.trim());
  if (body.trim()) parameters.set("body", body.trim());
  const query = parameters.toString();
  return `mailto:${address}${query ? `?${query}` : ""}`;
}

export function buildPhonePayload(phone: string): string {
  const value = phone.trim();
  if (!value) {
    throw new Error("Phone number is required");
  }
  return `tel:${value}`;
}

export function buildSmsPayload(phone: string, message: string): string {
  const value = phone.trim();
  if (!value) {
    throw new Error("Phone number is required");
  }
  const body = message.trim();
  return `sms:${value}${body ? `?${new URLSearchParams({ body }).toString()}` : ""}`;
}

export function buildLinePayload(lineIdOrUrl: string): string {
  const value = lineIdOrUrl.trim();
  if (!value) {
    throw new Error("LINE ID is required");
  }
  return /^https?:\/\//i.test(value) ? value : `https://line.me/R/ti/p/${value}`;
}
