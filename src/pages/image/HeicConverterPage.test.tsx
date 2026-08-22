import { fireEvent, screen } from "@testing-library/react";
import { vi } from "vitest";
import { renderWithProviders } from "../../test/renderWithProviders";
import * as heicService from "../../services/image/heicService";
import { HeicConverterPage } from "./HeicConverterPage";

describe("HeicConverterPage", () => {
  it("accepts HEIC and exposes JPEG/PNG output", async () => {
    vi.spyOn(heicService, "convertHeic").mockResolvedValue({ blob: new Blob(["jpg"], { type: "image/jpeg" }), fileName: "photo.jpg", mimeType: "image/jpeg", size: 3 });
    const { container } = renderWithProviders(<HeicConverterPage />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input.accept).toContain(".heic");
    fireEvent.change(input, { target: { files: [new File(["heic"], "photo.heic", { type: "image/heic" })] } });
    fireEvent.click(screen.getByRole("button", { name: "Convert HEIC" }));
    expect(await screen.findByRole("button", { name: "Download" })).toBeEnabled();
    expect(screen.getByRole("option", { name: "PNG" })).toBeInTheDocument();
  });
});
