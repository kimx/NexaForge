import { fireEvent, screen } from "@testing-library/react";
import { vi } from "vitest";
import { renderWithProviders } from "../../test/renderWithProviders";
import * as socialService from "../../services/image/socialImageService";
import { SocialResizerPage } from "./SocialResizerPage";

describe("SocialResizerPage", () => {
  it("validates custom sizes and generates selected presets with partial output status", async () => {
    vi.spyOn(socialService, "generateSocialImages").mockResolvedValue([
      { blob: new Blob(["jpg"]), fileName: "photo-instagram-square-1080x1080.jpg", mimeType: "image/jpeg", size: 3 },
    ]);
    const { container } = renderWithProviders(<SocialResizerPage />);
    fireEvent.change(container.querySelector('input[type="file"]') as HTMLInputElement, { target: { files: [new File(["x"], "photo.png", { type: "image/png" })] } });
    fireEvent.click(screen.getByLabelText("Custom size"));
    fireEvent.change(screen.getByLabelText("Custom width"), { target: { value: "8" } });
    expect(screen.getByRole("button", { name: "Generate social images" })).toBeDisabled();
    fireEvent.click(screen.getByLabelText("Custom size"));
    fireEvent.click(screen.getByLabelText("Facebook post — 1200 × 630"));
    fireEvent.click(screen.getByRole("button", { name: "Generate social images" }));
    expect(await screen.findByText(/1 of 2 outputs generated/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Download ZIP" })).toBeEnabled();
  });
});
