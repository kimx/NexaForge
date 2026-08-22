import { fireEvent, screen } from "@testing-library/react";
import { renderWithProviders } from "../../test/renderWithProviders";
import { JsonXmlPage } from "./JsonXmlPage";

describe("JsonXmlPage", () => {
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
