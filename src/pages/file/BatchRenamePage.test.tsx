import { fireEvent, screen } from "@testing-library/react";
import { renderWithProviders } from "../../test/renderWithProviders";
import { BatchRenamePage } from "./BatchRenamePage";

describe("batch rename workspace", () => {
  it("previews sequence names and prevents exporting colliding names", () => {
    const { container } = renderWithProviders(<BatchRenamePage />);
    fireEvent.change(container.querySelector('input[type="file"]')!, { target: { files: [new File(["a"], "a.txt"), new File(["b"], "b.txt")] } });
    fireEvent.change(screen.getByLabelText("New base name (optional)"), { target: { value: "attachment" } });
    expect(screen.getByText("attachment-001.txt")).toBeInTheDocument();
    expect(screen.getByText("attachment-002.txt")).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Add sequence numbers"));
    expect(screen.getByRole("button", { name: "Create renamed ZIP" })).toBeDisabled();
    expect(screen.getAllByText("Duplicate name — add numbering or change the rules.")).toHaveLength(2);
  });
  it("rejects directory paths before any archive is created", () => {
    const { container } = renderWithProviders(<BatchRenamePage />);
    fireEvent.change(container.querySelector('input[type="file"]')!, { target: { files: [new File(["a"], "a.txt")] } });
    fireEvent.change(screen.getByLabelText("Prefix"), { target: { value: "../" } });
    expect(screen.getByRole("button", { name: "Create renamed ZIP" })).toBeDisabled();
    expect(screen.getByText("Invalid name — remove path separators or reserved characters.")).toBeInTheDocument();
  });
});
