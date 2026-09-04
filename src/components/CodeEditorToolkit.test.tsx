import { fireEvent, screen } from "@testing-library/react";
import { vi } from "vitest";
import { renderWithProviders } from "../test/renderWithProviders";
import { CodeEditorToolkit } from "./CodeEditorToolkit";

describe("CodeEditorToolkit", () => {
  it("renders labelled line numbers and shared input actions", () => {
    const onChange = vi.fn();
    const onClear = vi.fn();
    const onReset = vi.fn();
    renderWithProviders(
      <CodeEditorToolkit
        label="JSON input"
        value={"{\n  \"ok\": true\n}"}
        onChange={onChange}
        language="json"
        onClear={onClear}
        onReset={onReset}
        clearLabel="Clear"
        resetLabel="Reset"
      />
    );

    expect(screen.getByLabelText("JSON input")).toHaveAttribute("data-language", "json");
    expect(document.querySelector(".code-editor-toolkit__gutter")?.textContent).toBe("1\n2\n3");
    fireEvent.change(screen.getByLabelText("JSON input"), { target: { value: "{}" } });
    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(onChange).toHaveBeenCalledWith("{}");
    expect(onClear).toHaveBeenCalledOnce();
    expect(onReset).toHaveBeenCalledOnce();
  });

  it("copies and downloads output while exposing errors with their location", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    renderWithProviders(
      <CodeEditorToolkit
        label="YAML output"
        value="name: NexaForge"
        readOnly
        fileName="output.yaml"
        copyLabel="Copy"
        downloadLabel="Download"
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Copy" }));
    expect(writeText).toHaveBeenCalledWith("name: NexaForge");
    expect(await screen.findByRole("status")).toHaveTextContent("Copied");
    expect(screen.getByRole("button", { name: "Download" })).toBeEnabled();
  });

  it("associates a concrete syntax error with the editor", () => {
    renderWithProviders(
      <CodeEditorToolkit
        label="JSON input"
        value='{"broken":}'
        error={{ message: "Unexpected token", line: 1, column: 11 }}
      />
    );

    const editor = screen.getByLabelText("JSON input");
    expect(editor).toHaveAttribute("aria-invalid", "true");
    expect(document.getElementById(editor.getAttribute("aria-describedby") ?? "")).toHaveTextContent(
      "Unexpected token (line 1, column 11)"
    );
  });
});
