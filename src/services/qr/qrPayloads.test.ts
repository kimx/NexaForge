import { describe, expect, it } from "vitest";
import {
  buildVCardPayload,
  buildWifiPayload,
  normalizeEan13,
} from "./qrPayloads";

describe("buildWifiPayload", () => {
  it("escapes reserved Wi-Fi payload characters", () => {
    expect(
      buildWifiPayload({
        ssid: "Cafe;5G",
        password: "p:a\\ss",
        security: "WPA",
        hidden: true,
      })
    ).toBe("WIFI:T:WPA;S:Cafe\\;5G;P:p\\:a\\\\ss;H:true;;");
  });

  it("omits password data for an open network", () => {
    expect(
      buildWifiPayload({
        ssid: "Guest",
        password: "ignored",
        security: "nopass",
        hidden: false,
      })
    ).toBe("WIFI:T:nopass;S:Guest;H:false;;");
  });

  it("rejects a blank SSID", () => {
    expect(() =>
      buildWifiPayload({ ssid: "  ", password: "", security: "WPA", hidden: false })
    ).toThrow("SSID is required");
  });
});

describe("normalizeEan13", () => {
  it("computes a missing EAN-13 check digit", () => {
    expect(normalizeEan13("400638133393")).toBe("4006381333931");
  });

  it("accepts separators but rejects a wrong check digit", () => {
    expect(normalizeEan13("400-638-133-393-1")).toBe("4006381333931");
    expect(() => normalizeEan13("4006381333932")).toThrow("check digit");
  });

  it("rejects non-digits and unsupported lengths", () => {
    expect(() => normalizeEan13("40063813339A")).toThrow("digits");
    expect(() => normalizeEan13("123")).toThrow("12 or 13 digits");
  });
});

describe("buildVCardPayload", () => {
  it("writes a CRLF-delimited vCard 3.0 with escaped values", () => {
    const output = buildVCardPayload({
      firstName: "Ada",
      lastName: "Lovelace",
      phone: "+44 123",
      email: "ada@example.com",
      organization: "Analytical; Engines",
      title: "Programmer",
      url: "https://example.com/ada",
      address: "London, UK",
    });

    expect(output).toBe(
      "BEGIN:VCARD\r\n" +
        "VERSION:3.0\r\n" +
        "N:Lovelace;Ada;;;\r\n" +
        "FN:Ada Lovelace\r\n" +
        "ORG:Analytical\\; Engines\r\n" +
        "TITLE:Programmer\r\n" +
        "TEL;TYPE=CELL:+44 123\r\n" +
        "EMAIL;TYPE=INTERNET:ada@example.com\r\n" +
        "URL:https://example.com/ada\r\n" +
        "ADR;TYPE=HOME:;;London\\, UK;;;;\r\n" +
        "END:VCARD"
    );
  });

  it("requires at least one name and omits empty optional fields", () => {
    expect(() => buildVCardPayload({ firstName: "", lastName: "" })).toThrow(
      "A first or last name is required"
    );

    expect(buildVCardPayload({ firstName: "Grace", lastName: "" })).toBe(
      "BEGIN:VCARD\r\nVERSION:3.0\r\nN:;Grace;;;\r\nFN:Grace\r\nEND:VCARD"
    );
  });
});
