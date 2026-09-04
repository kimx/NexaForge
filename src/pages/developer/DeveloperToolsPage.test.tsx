import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { ReactElement } from "react";
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

  it("uses the shared text workflow for URL transformations and reset actions", () => {
    renderWithRouter(<DeveloperToolsPage kind="url-encoder" />);
    const input = screen.getByRole("textbox", { name: "Input" });

    fireEvent.change(input, { target: { value: "Nexa Forge" } });
    expect(screen.getByRole("button", { name: "Clear" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Reset" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Process" }));

    expect(screen.getByText("Nexa%20Forge")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(input).toHaveValue("");
    expect(screen.getByText("No output generated yet.")).toBeInTheDocument();

    fireEvent.change(screen.getByRole("combobox", { name: "Mode" }), { target: { value: "decode" } });
    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(screen.getByRole("combobox", { name: "Mode" })).toHaveValue("encode");
    expect(input).toHaveValue("");
  });

  it("shows a shared accessible error for invalid URL encoding", () => {
    renderWithRouter(<DeveloperToolsPage kind="url-encoder" />);
    const input = screen.getByRole("textbox", { name: "Input" });

    fireEvent.change(input, { target: { value: "%" } });
    fireEvent.change(screen.getByRole("combobox", { name: "Mode" }), { target: { value: "decode" } });
    fireEvent.click(screen.getByRole("button", { name: "Process" }));

    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("alert")).toHaveTextContent("The input is invalid");
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

  it("resets JSON/YAML input to a sample matching the selected mode", () => {
    renderWithRouter(<DeveloperToolsPage kind="json-yaml" />);

    fireEvent.change(screen.getByRole("combobox", { name: "Mode" }), {
      target: { value: "yaml-to-json" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "YAML input" }), {
      target: { value: "" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Reset" }));

    expect((screen.getByRole("textbox", { name: "YAML input" }) as HTMLTextAreaElement).value).toContain("name:");
  });
});
