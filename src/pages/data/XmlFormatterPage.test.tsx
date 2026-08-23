import { fireEvent, screen, within } from "@testing-library/react";
import { renderWithProviders } from "../../test/renderWithProviders";
import { XmlFormatterPage } from "./XmlFormatterPage";

describe("XmlFormatterPage", () => {
  it("keeps formatting controls with the source and explains the idle result", () => {
    renderWithProviders(<XmlFormatterPage />);

    const workspace = screen.getByRole("heading", { name: "Tool Workspace" }).closest("section");
    expect(workspace).not.toBeNull();
    expect(within(workspace as HTMLElement).getByRole("combobox", { name: "Output mode" })).toBeInTheDocument();
    expect(within(workspace as HTMLElement).getByRole("button", { name: "Format XML" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Options" })).not.toBeInTheDocument();
    expect(screen.getByText("No XML output yet.")).toBeInTheDocument();
  });

  it("formats and minifies XML with explicit actions", async () => {
    renderWithProviders(<XmlFormatterPage />);
    fireEvent.change(screen.getByLabelText("XML input"), { target: { value: "<root><item>One</item></root>" } });
    fireEvent.change(screen.getByLabelText("Output mode"), { target: { value: "minify" } });
    fireEvent.click(screen.getByRole("button", { name: "Format XML" }));
    expect(await screen.findByLabelText("XML output")).toHaveValue("<root><item>One</item></root>");
  });
});
