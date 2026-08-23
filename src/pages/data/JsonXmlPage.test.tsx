import { fireEvent, screen, within } from "@testing-library/react";
import { renderWithProviders } from "../../test/renderWithProviders";
import { JsonXmlPage } from "./JsonXmlPage";

describe("JsonXmlPage", () => {
  it("keeps conversion controls with the source and explains the idle result", () => {
    renderWithProviders(<JsonXmlPage />);

    const workspace = screen.getByRole("heading", { name: "Tool Workspace" }).closest("section");
    expect(workspace).not.toBeNull();
    expect(within(workspace as HTMLElement).getByRole("radio", { name: "JSON to XML" })).toBeInTheDocument();
    expect(within(workspace as HTMLElement).getByRole("combobox", { name: "Indent spaces" })).toBeInTheDocument();
    expect(within(workspace as HTMLElement).getByRole("button", { name: "Convert to XML" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Options" })).not.toBeInTheDocument();
    expect(screen.getByText("No converted output yet.")).toBeInTheDocument();
  });

  it("converts JSON to XML and clears stale output when direction changes", async () => {
    renderWithProviders(<JsonXmlPage />);
    fireEvent.change(screen.getByLabelText("Source input"), { target: { value: '{"root":{"item":"One"}}' } });
    fireEvent.click(screen.getByRole("button", { name: "Convert to XML" }));
    expect(await screen.findByDisplayValue(/<root>/)).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("XML to JSON"));
    expect(screen.queryByDisplayValue(/<root>/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Convert to JSON" })).toBeInTheDocument();
  });

  it("rejects forbidden XML declarations", async () => {
    renderWithProviders(<JsonXmlPage />);
    fireEvent.click(screen.getByLabelText("XML to JSON"));
    fireEvent.change(screen.getByLabelText("Source input"), { target: { value: "<!DOCTYPE x><x/>" } });
    fireEvent.click(screen.getByRole("button", { name: "Convert to JSON" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("DOCTYPE");
  });
});
