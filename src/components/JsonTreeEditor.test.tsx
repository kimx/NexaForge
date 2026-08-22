import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { LanguageProvider } from "../context/LanguageContext";
import { JsonTreeEditor, type JsonValue } from "./JsonTreeEditor";

function EditorHarness({ initialValue }: { initialValue: JsonValue }): JSX.Element {
  const [value, setValue] = useState(initialValue);

  return (
    <LanguageProvider initialLocale="en">
      <JsonTreeEditor value={value} onChange={setValue} />
      <div data-testid="json-value">{JSON.stringify(value)}</div>
    </LanguageProvider>
  );
}

describe("JsonTreeEditor", () => {
  it("names every branch, value, add, and remove control for its node", () => {
    render(
      <EditorHarness
        initialValue={{ profile: { email: "kim@example.com" }, active: true }}
      />
    );

    const profileToggle = screen.getByRole("button", { name: "Collapse profile" });
    expect(profileToggle).toHaveAttribute("aria-expanded", "true");
    expect(profileToggle.closest("summary")).toBeNull();
    expect(screen.getByRole("button", { name: "Add field to profile" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Value for email" })).toHaveValue(
      "kim@example.com"
    );
    expect(screen.getByRole("button", { name: "Remove email" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Value for active" })).toBeChecked();
  });

  it("collapses and restores a branch without changing the document", () => {
    render(
      <EditorHarness
        initialValue={{ profile: { email: "kim@example.com", role: "admin" } }}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Collapse profile" }));

    expect(screen.queryByRole("textbox", { name: "Value for email" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Expand profile" })).toHaveAttribute(
      "aria-expanded",
      "false"
    );
    expect(screen.getByTestId("json-value")).toHaveTextContent(
      '{"profile":{"email":"kim@example.com","role":"admin"}}'
    );

    fireEvent.click(screen.getByRole("button", { name: "Expand profile" }));
    expect(screen.getByRole("textbox", { name: "Value for email" })).toBeInTheDocument();
  });

  it("adds a typed field through the inline composer", () => {
    render(<EditorHarness initialValue={{ name: "NexaForge" }} />);

    fireEvent.click(screen.getByRole("button", { name: "Add field to JSON" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Field name" }), {
      target: { value: "version" },
    });
    fireEvent.change(screen.getByRole("combobox", { name: "Type for new field" }), {
      target: { value: "number" },
    });
    fireEvent.change(screen.getByRole("spinbutton", { name: "Value for new field" }), {
      target: { value: "2" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save field" }));

    expect(screen.getByTestId("json-value")).toHaveTextContent(
      '{"name":"NexaForge","version":2}'
    );
    expect(screen.getByRole("spinbutton", { name: "Value for version" })).toHaveValue(2);
  });

  it("moves focus into the composer when adding an array item", () => {
    render(<EditorHarness initialValue={{ tags: ["json", "sample"] }} />);

    fireEvent.click(screen.getByRole("button", { name: "Add item to tags" }));

    expect(screen.getByRole("combobox", { name: "Type for new item" })).toHaveFocus();
  });

  it("offers a one-step undo after removing a node", () => {
    render(<EditorHarness initialValue={{ name: "NexaForge", active: true }} />);

    fireEvent.click(screen.getByRole("button", { name: "Remove name" }));

    expect(screen.queryByRole("textbox", { name: "Value for name" })).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Removed name");

    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(screen.getByRole("textbox", { name: "Value for name" })).toHaveValue("NexaForge");
  });
});
