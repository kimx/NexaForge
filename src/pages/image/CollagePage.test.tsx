import { fireEvent, screen } from "@testing-library/react";
import { renderWithProviders } from "../../test/renderWithProviders";
import { CollagePage } from "./CollagePage";

describe("collage workspace", () => {
  it("lets users remove and reorder source files without exporting first", () => {
    const { container } = renderWithProviders(<CollagePage />);
    fireEvent.change(container.querySelector('input[type="file"]')!, { target: { files: [new File(["a"], "first.png", { type: "image/png" }), new File(["b"], "second.png", { type: "image/png" })] } });
    fireEvent.click(screen.getByRole("button", { name: "Move second.png up" }));
    expect(screen.getAllByTestId("collage-source-name").map(node => node.textContent)).toEqual(["second.png", "first.png"]);
    fireEvent.click(screen.getByRole("button", { name: "Remove second.png" }));
    expect(screen.getAllByTestId("collage-source-name").map(node => node.textContent)).toEqual(["first.png"]);
  });
  it("disables processing for invalid dimensions", () => {
    const { container } = renderWithProviders(<CollagePage />);
    fireEvent.change(container.querySelector('input[type="file"]')!, { target: { files: [new File(["a"], "first.png", { type: "image/png" })] } });
    fireEvent.change(screen.getByLabelText("Output width (px)"), { target: { value: "0" } });
    expect(screen.getByRole("button", { name: "Create image" })).toBeDisabled();
    expect(screen.getByRole("alert")).toHaveTextContent("100–4096");
  });
});
