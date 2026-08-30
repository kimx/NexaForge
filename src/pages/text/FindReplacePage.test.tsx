import { fireEvent, screen } from "@testing-library/react";
import { renderWithProviders } from "../../test/renderWithProviders";
import { FindReplacePage } from "./FindReplacePage";

describe("FindReplacePage", () => {
  it("replaces matching text and exposes regex workflow navigation", () => {
    renderWithProviders(<FindReplacePage />);
    fireEvent.change(screen.getByLabelText(/^text$/i), { target: { value: "Cat cat catalog" } });
    fireEvent.change(screen.getByLabelText(/^find$/i), { target: { value: "cat" } });
    fireEvent.change(screen.getByLabelText(/replace with/i), { target: { value: "dog" } });
    fireEvent.click(screen.getByLabelText(/whole word/i));
    fireEvent.click(screen.getByRole("button", { name: /replace all/i }));

    expect(screen.getByDisplayValue("dog dog catalog")).toBeInTheDocument();
    expect(screen.getByText(/2 replacements/i)).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText(/use regular expression/i));
    expect(screen.getByRole("link", { name: /test regex/i })).toHaveAttribute("href", "/en/developer/regex-tester");
  });
});
