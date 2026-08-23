import { fireEvent, screen, within } from "@testing-library/react";
import { renderWithProviders } from "../../test/renderWithProviders";
import { JsonToCSharpPage } from "./JsonToCSharpPage";

describe("JsonToCSharpPage", () => {
  it("keeps generation controls with the JSON source and explains the idle result", () => {
    renderWithProviders(<JsonToCSharpPage />);

    const workspace = screen.getByRole("heading", { name: "Tool Workspace" }).closest("section");
    expect(workspace).not.toBeNull();
    expect(within(workspace as HTMLElement).getByRole("textbox", { name: "Root class name" })).toBeInTheDocument();
    expect(within(workspace as HTMLElement).getByRole("button", { name: "Generate C#" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Options" })).not.toBeInTheDocument();
    expect(screen.getByText("No code generated yet.")).toBeInTheDocument();
  });

  it("generates C# with editable root and namespace options", async () => {
    renderWithProviders(<JsonToCSharpPage />);
    fireEvent.change(screen.getByLabelText("Root class name"), { target: { value: "Person" } });
    fireEvent.change(screen.getByLabelText("Namespace (optional)"), { target: { value: "Demo.Models" } });
    fireEvent.change(screen.getByLabelText("JSON input"), { target: { value: '{"name":"Ada"}' } });
    fireEvent.click(screen.getByRole("button", { name: "Generate C#" }));

    const output = await screen.findByDisplayValue(/namespace Demo\.Models;/);
    expect((output as HTMLTextAreaElement).value).toContain("public class Person");
  });
});
