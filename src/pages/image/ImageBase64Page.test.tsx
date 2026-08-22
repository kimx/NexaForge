import { fireEvent, screen } from "@testing-library/react";
import { vi } from "vitest";
import { renderWithProviders } from "../../test/renderWithProviders";
import * as textService from "../../services/text/textService";
import { ImageBase64Page } from "./ImageBase64Page";

describe("ImageBase64Page", () => {
  it("switches between raw Base64 and a data URL", async () => {
    vi.spyOn(textService, "fileToBase64").mockResolvedValue("YWJj");
    const { container } = renderWithProviders(<ImageBase64Page />);
    fireEvent.change(container.querySelector('input[type="file"]') as HTMLInputElement, { target: { files: [new File(["abc"], "x.png", { type: "image/png" })] } });
    fireEvent.click(screen.getByLabelText("Data URL"));
    fireEvent.click(screen.getByRole("button", { name: "Encode image" }));
    expect(await screen.findByLabelText("Base64 output")).toHaveValue("data:image/png;base64,YWJj");
    expect(screen.getByRole("button", { name: "Download" })).toBeEnabled();
  });
});
