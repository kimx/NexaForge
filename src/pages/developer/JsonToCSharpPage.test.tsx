import { fireEvent, screen } from "@testing-library/react";
import { renderWithProviders } from "../../test/renderWithProviders";
import { JsonToCSharpPage } from "./JsonToCSharpPage";

describe("JsonToCSharpPage", () => {
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
