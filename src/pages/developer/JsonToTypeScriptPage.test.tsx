import { fireEvent, screen } from "@testing-library/react";
import { renderWithProviders } from "../../test/renderWithProviders";
import { JsonToTypeScriptPage } from "./JsonToTypeScriptPage";

describe("JsonToTypeScriptPage", () => {
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
