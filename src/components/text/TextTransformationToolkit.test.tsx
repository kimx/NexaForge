import { fireEvent, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { renderWithProviders } from "../../test/renderWithProviders";
import { TextTransformationToolkit } from "./TextTransformationToolkit";

const modes = [
  { value: "encode", label: "Encode" },
  { value: "decode", label: "Decode" },
];

describe("TextTransformationToolkit", () => {
  it("provides labelled input, mode action, result, copy, clear, and reset controls", async () => {
    const onInputChange = vi.fn();
    const onModeChange = vi.fn();
    const onTransform = vi.fn();
    const onClear = vi.fn();
    const onReset = vi.fn();
    const onCopied = vi.fn();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    renderWithProviders(
      <TextTransformationToolkit
        input="Nexa Forge"
        output="Nexa%20Forge"
        mode="encode"
        modes={modes}
        inputLabel="Input"
        onInputChange={onInputChange}
        onModeChange={onModeChange}
        onTransform={onTransform}
        onClear={onClear}
        onReset={onReset}
        onCopied={onCopied}
      >
        {({ workspace, options, result }) => (
          <div>
            {workspace}
            {options}
            {result}
          </div>
        )}
      </TextTransformationToolkit>
    );

    fireEvent.change(screen.getByRole("textbox", { name: "Input" }), { target: { value: "changed" } });
    fireEvent.change(screen.getByRole("combobox", { name: "Mode" }), { target: { value: "decode" } });
    fireEvent.click(screen.getByRole("button", { name: "Process" }));
    fireEvent.click(screen.getByRole("button", { name: "Copy output" }));
    await waitFor(() => expect(onCopied).toHaveBeenCalledOnce());
    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    fireEvent.click(screen.getByRole("button", { name: "Reset" }));

    expect(onInputChange).toHaveBeenCalledWith("changed");
    expect(onModeChange).toHaveBeenCalledWith("decode");
    expect(onTransform).toHaveBeenCalledOnce();
    expect(writeText).toHaveBeenCalledWith("Nexa%20Forge");
    expect(onClear).toHaveBeenCalledOnce();
    expect(onReset).toHaveBeenCalledOnce();
  });

  it("exposes transformation errors to assistive technology", () => {
    renderWithProviders(
      <TextTransformationToolkit
        input="%"
        output=""
        mode="decode"
        modes={modes}
        inputLabel="Input"
        error="The input is invalid."
        onInputChange={() => {}}
        onModeChange={() => {}}
        onTransform={() => {}}
        onClear={() => {}}
        onReset={() => {}}
      >
        {({ workspace }) => workspace}
      </TextTransformationToolkit>
    );

    const input = screen.getByRole("textbox", { name: "Input" });
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAttribute("aria-describedby");
    expect(screen.getByRole("alert")).toHaveTextContent("The input is invalid.");
  });
});
