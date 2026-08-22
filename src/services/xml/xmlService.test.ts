import {
  formatXml,
  jsonToXml,
  xmlToJson,
  XmlValidationError,
} from "./xmlService";

describe("XML service", () => {
  it("maps attributes and repeated child elements to documented JSON keys", () => {
    expect(
      xmlToJson(
        '<catalog lang="en"><item>One</item><item>Two</item></catalog>',
        { indent: 2 }
      )
    ).toBe(`{
  "catalog": {
    "@lang": "en",
    "item": [
      "One",
      "Two"
    ]
  }
}`);
  });

  it("creates XML through the @attribute and #text mapping", () => {
    const output = jsonToXml(
      '{"catalog":{"@lang":"en","item":["One",{"@id":"2","#text":"Two"}]}}',
      { indent: 2 }
    );

    expect(output).toContain('<catalog lang="en">');
    expect(output).toContain("<item>One</item>");
    expect(output).toContain('<item id="2">Two</item>');
  });

  it("formats or minifies valid XML deterministically", () => {
    const source = '<root><item id="1">One</item><item id="2">Two</item></root>';
    expect(formatXml(source, { mode: "pretty", indent: 2 })).toContain(
      '\n  <item id="1">One</item>\n'
    );
    expect(formatXml(source, { mode: "minify", indent: 2 })).toBe(source);
  });

  it("rejects dangerous declarations and malformed documents", () => {
    expect(() =>
      formatXml("<!DOCTYPE x><x/>", { mode: "pretty", indent: 2 })
    ).toThrow(XmlValidationError);
    expect(() => xmlToJson("<!ENTITY x 'value'><x/>", { indent: 2 })).toThrow(
      XmlValidationError
    );
    expect(() => formatXml("<root>", { mode: "pretty", indent: 2 })).toThrow(
      XmlValidationError
    );
  });

  it("requires one valid root property when converting JSON", () => {
    expect(() => jsonToXml('{"a":1,"b":2}', { indent: 2 })).toThrow(
      XmlValidationError
    );
    expect(() => jsonToXml('{"bad name":1}', { indent: 2 })).toThrow(
      XmlValidationError
    );
  });
});
