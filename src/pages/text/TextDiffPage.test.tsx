import { fireEvent, screen } from "@testing-library/react";
import { renderWithProviders } from "../../test/renderWithProviders";
import { TextDiffPage } from "./TextDiffPage";

describe("TextDiffPage", () => {
  it("compares only on request and switches between accessible modes", () => {
    renderWithProviders(<TextDiffPage />);
    fireEvent.change(screen.getByLabelText(/original/i), { target: { value: "apple\norange" } });
    fireEvent.change(screen.getByLabelText(/changed/i), { target: { value: "apple\nbanana\norange" } });
    fireEvent.click(screen.getByRole("button", { name: /^compare$/i }));

    expect(screen.getByText(/1 addition/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/added line/i)).toHaveTextContent("banana");
    fireEvent.click(screen.getByRole("radio", { name: /unified/i }));
    expect(screen.getByLabelText(/unified text differences/i)).toHaveTextContent("+banana");
    expect(screen.getByRole("link", { name: /clean text/i })).toHaveAttribute("href", "/en/text/text-cleaner");
  });
});
