import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { ReactElement } from "react";
import { vi } from "vitest";
import { DeveloperToolsPage, jsonDiff } from "./DeveloperToolsPage";
import { LanguageProvider } from "../../context/LanguageContext";

function renderWithRouter(ui: ReactElement, route = "/"): ReturnType<typeof render> {
  return render(
    <MemoryRouter initialEntries={[route]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <LanguageProvider initialLocale="en">{ui}</LanguageProvider>
    </MemoryRouter>
  );
}

describe("jsonDiff", () => {
  it("marks only changed lines while keeping shared structure as context", () => {
    expect(jsonDiff({ a: "kim" }, { a: "kim2" })).toBe([
      "--- left",
      "+++ right",
      "  {",
      '-   "a": "kim"',
      '+   "a": "kim2"',
      "  }",
    ].join("\n"));
  });

  it("reports equivalent JSON values without a diff", () => {
    expect(jsonDiff({ a: 1 }, { a: 1 })).toBe("No differences.");
  });
});

describe("DeveloperToolsPage JSON samples", () => {
  beforeEach(() => {
    window.localStorage.setItem("nexaforge-locale", "en");
  });

  it("starts the URL decode search route in decode mode", () => {
    renderWithRouter(
      <DeveloperToolsPage kind="url-encoder" />,
      "/en/developer/url-decode"
    );

    expect(screen.getByRole("heading", { level: 1, name: "Free Online URL Decoder" })).toBeVisible();
    expect(screen.getByRole("combobox", { name: "Mode" })).toHaveValue("decode");
  });

  it("starts JSON to YAML with a processable JSON sample", () => {
    const { container } = renderWithRouter(<DeveloperToolsPage kind="json-yaml" />);
    const input = screen.getByRole("textbox", { name: "JSON input" }) as HTMLTextAreaElement;

    expect(() => JSON.parse(input.value)).not.toThrow();

    fireEvent.click(screen.getByRole("button", { name: "Process" }));

    expect(container.querySelector(".developer-output")).not.toBeEmptyDOMElement();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("starts JSON Diff with two processable samples that produce a difference", () => {
    const { container } = renderWithRouter(<DeveloperToolsPage kind="json-diff" />);
    const left = screen.getByRole("textbox", { name: "Left JSON" }) as HTMLTextAreaElement;
    const right = screen.getByRole("textbox", { name: "Right JSON" }) as HTMLTextAreaElement;

    expect(() => JSON.parse(left.value)).not.toThrow();
    expect(() => JSON.parse(right.value)).not.toThrow();

    fireEvent.click(screen.getByRole("button", { name: "Process" }));

    expect(container.querySelector(".developer-output")).toHaveTextContent("--- left");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("associates invalid JSON-to-YAML input with its editor and clears it on correction", () => {
    renderWithRouter(<DeveloperToolsPage kind="json-yaml" />);
    const input = screen.getByRole("textbox", { name: "JSON input" });

    fireEvent.change(input, { target: { value: '{"broken":}' } });
    fireEvent.click(screen.getByRole("button", { name: "Process" }));

    expect(input).toHaveAttribute("aria-invalid", "true");
    const errorId = input.getAttribute("aria-describedby");
    expect(errorId).toBeTruthy();
    expect(document.getElementById(errorId ?? "")).toHaveTextContent(
      "The input is invalid"
    );
    expect(input).toHaveValue('{"broken":}');

    fireEvent.change(input, { target: { value: '{"fixed":true}' } });

    expect(input).toHaveAttribute("aria-invalid", "false");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("identifies the invalid side of a JSON diff", () => {
    renderWithRouter(<DeveloperToolsPage kind="json-diff" />);
    const left = screen.getByRole("textbox", { name: "Left JSON" });
    const right = screen.getByRole("textbox", { name: "Right JSON" });

    fireEvent.change(right, { target: { value: '{"broken":}' } });
    fireEvent.click(screen.getByRole("button", { name: "Process" }));

    expect(left).toHaveAttribute("aria-invalid", "false");
    expect(right).toHaveAttribute("aria-invalid", "true");
    expect(right).toHaveAttribute("aria-describedby");
  });

  it("disables the primary action when a required JSON input is empty", () => {
    renderWithRouter(<DeveloperToolsPage kind="json-yaml" />);

    fireEvent.change(screen.getByRole("textbox", { name: "JSON input" }), {
      target: { value: "" },
    });

    expect(screen.getByRole("button", { name: "Process" })).toBeDisabled();
  });
});

describe("DeveloperToolsPage URL encoder", () => {
  it("encodes Unicode with component mode", () => {
    renderWithRouter(<DeveloperToolsPage kind="url-encoder" />, "/en/developer/url-encode-decode");
    const input = screen.getByRole("textbox", { name: "Input" });
    const value = "你好 😀 & query";

    fireEvent.change(input, { target: { value } });
    fireEvent.click(screen.getByRole("button", { name: "Encode" }));

    expect(screen.getByText(encodeURIComponent(value))).toBeVisible();
  });

  it("uses encodeURI for full URL mode", () => {
    renderWithRouter(<DeveloperToolsPage kind="url-encoder" />, "/en/developer/url-encode-decode");
    const input = screen.getByRole("textbox", { name: "Input" });
    const value = "https://example.com/search?q=你好 world&emoji=😀";

    fireEvent.change(input, { target: { value } });
    fireEvent.change(screen.getByRole("combobox", { name: "Encoding mode" }), {
      target: { value: "full-url" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Encode" }));

    expect(screen.getByText(encodeURI(value))).toBeVisible();
  });

  it("decodes valid component input and reports malformed percent sequences", () => {
    renderWithRouter(<DeveloperToolsPage kind="url-encoder" />, "/en/developer/url-encode-decode");
    const input = screen.getByRole("textbox", { name: "Input" });

    fireEvent.change(input, { target: { value: "%E4%BD%A0%E5%A5%BD%20%F0%9F%98%80" } });
    fireEvent.click(screen.getByRole("button", { name: "Decode" }));
    expect(screen.getByText("你好 😀")).toBeVisible();

    fireEvent.change(input, { target: { value: "%E0%A4%A" } });
    fireEvent.click(screen.getByRole("button", { name: "Decode" }));

    expect(screen.getByText("Invalid percent-encoded sequence.")).toBeVisible();
    expect(input).toHaveAttribute("aria-invalid", "true");
  });

  it("copies output and clears the URL workspace", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    renderWithRouter(<DeveloperToolsPage kind="url-encoder" />, "/en/developer/url-encode-decode");
    const input = screen.getByRole("textbox", { name: "Input" });

    fireEvent.change(input, { target: { value: "hello world" } });
    fireEvent.click(screen.getByRole("button", { name: "Encode" }));
    fireEvent.click(screen.getByRole("button", { name: "Copy output" }));

    expect(writeText).toHaveBeenCalledWith("hello%20world");
    expect(await screen.findByText("Output copied.")).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(input).toHaveValue("");
    expect(screen.queryByText("hello%20world")).not.toBeInTheDocument();
  });
});
