import { fireEvent, screen } from "@testing-library/react";
import { vi } from "vitest";
import { renderWithProviders } from "../../test/renderWithProviders";
import * as svgService from "../../services/svg/svgOptimizerService";
import { SvgOptimizerPage } from "./SvgOptimizerPage";

describe("SvgOptimizerPage", () => {
  it("reports size reduction and disables unsafe preview", async () => {
    vi.spyOn(svgService, "optimizeSvg").mockResolvedValue({ source: "<svg/>", output: "<svg/>", sourceBytes: 20, outputBytes: 6, previewSafe: false, unsafeReason: "active-content" });
    renderWithProviders(<SvgOptimizerPage />);
    fireEvent.click(screen.getByRole("button", { name: "Optimize SVG" }));
    expect(await screen.findByText(/Preview disabled/)).toBeInTheDocument();
    expect(screen.getByLabelText("Optimized SVG")).toHaveValue("<svg/>");
    expect(screen.queryByAltText("Optimized SVG preview")).not.toBeInTheDocument();
  });
});
