import { fireEvent, screen } from "@testing-library/react";
import { vi } from "vitest";
import { renderWithProviders } from "../../test/renderWithProviders";
import * as faviconService from "../../services/image/faviconService";
import { FaviconGeneratorPage } from "./FaviconGeneratorPage";

describe("FaviconGeneratorPage", () => {
  it("keeps source inspection active when options change", async () => {
    let finishInspection!: (value: { width: number; height: number }) => void;
    vi.spyOn(faviconService, "readImageDimensions").mockReturnValue(new Promise((resolve) => { finishInspection = resolve; }));
    const { container } = renderWithProviders(<FaviconGeneratorPage />);
    fireEvent.change(container.querySelector('input[type="file"]') as HTMLInputElement, { target: { files: [new File(["x"], "logo.png", { type: "image/png" })] } });
    fireEvent.change(screen.getByLabelText("App name (optional)"), { target: { value: "NexaForge" } });
    finishInspection({ width: 1200, height: 630 });
    expect(await screen.findByText(/Non-square images are padded/)).toBeInTheDocument();
  });

  it("warns for a non-square source and offers the generated set as a ZIP", async () => {
    vi.spyOn(faviconService, "readImageDimensions").mockResolvedValue({ width: 1200, height: 630 });
    vi.spyOn(faviconService, "generateFaviconSet").mockResolvedValue([
      { blob: new Blob(["ico"]), fileName: "favicon.ico", mimeType: "image/x-icon", size: 3 },
      { blob: new Blob(["json"]), fileName: "site.webmanifest", mimeType: "application/manifest+json", size: 4 },
    ]);
    const { container } = renderWithProviders(<FaviconGeneratorPage />);
    fireEvent.change(container.querySelector('input[type="file"]') as HTMLInputElement, { target: { files: [new File(["x"], "logo.png", { type: "image/png" })] } });
    expect(await screen.findByText(/Non-square images are padded/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Generate favicon set" }));
    expect(await screen.findByText("favicon.ico")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Download ZIP" })).toBeEnabled();
  });
});
