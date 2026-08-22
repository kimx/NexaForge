import { fireEvent, screen } from "@testing-library/react";
import { renderWithProviders } from "../../test/renderWithProviders";
import { XmlFormatterPage } from "./XmlFormatterPage";

describe("XmlFormatterPage", () => {
  it("formats and minifies XML with explicit actions", async () => {
    renderWithProviders(<XmlFormatterPage />);
    fireEvent.change(screen.getByLabelText("XML input"), { target: { value: "<root><item>One</item></root>" } });
    fireEvent.change(screen.getByLabelText("Output mode"), { target: { value: "minify" } });
    fireEvent.click(screen.getByRole("button", { name: "Format XML" }));
    expect(await screen.findByLabelText("XML output")).toHaveValue("<root><item>One</item></root>");
  });
});
