import { fireEvent, screen, within } from "@testing-library/react";
import { renderWithProviders } from "../../test/renderWithProviders";
import { JsonToTypeScriptPage } from "./JsonToTypeScriptPage";

describe("JsonToTypeScriptPage", () => {
  it("keeps generation controls with the JSON source and explains the idle result", () => {
    renderWithProviders(<JsonToTypeScriptPage />);

    const workspace = screen.getByRole("heading", { name: "Tool Workspace" }).closest("section");
    expect(workspace).not.toBeNull();
    expect(within(workspace as HTMLElement).getByRole("textbox", { name: "Root class name" })).toBeInTheDocument();
    expect(within(workspace as HTMLElement).getByRole("button", { name: "Generate TypeScript" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Options" })).not.toBeInTheDocument();
    expect(screen.getByText("No code generated yet.")).toBeInTheDocument();
  });

  it("preserves invalid input and presents a field-associated error", async () => {
    renderWithProviders(<JsonToTypeScriptPage />);
    const input = screen.getByLabelText("JSON input");
    fireEvent.change(input, { target: { value: "{" } });
    fireEvent.click(screen.getByRole("button", { name: "Generate TypeScript" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("valid JSON");
    expect(input).toHaveValue("{");
    expect(input).toHaveAttribute("aria-describedby");
  });
});
