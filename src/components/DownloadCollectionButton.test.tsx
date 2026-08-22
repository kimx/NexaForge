import { screen } from "@testing-library/react";
import { renderWithProviders } from "../test/renderWithProviders";
import { DownloadCollectionButton } from "./DownloadCollectionButton";

describe("DownloadCollectionButton", () => {
  it("is disabled without successful results and enabled otherwise", () => {
    const { unmount } = renderWithProviders(<DownloadCollectionButton results={[]} fileName="images.zip" />);
    expect(screen.getByRole("button", { name: "Download ZIP" })).toBeDisabled();
    unmount();
    renderWithProviders(<DownloadCollectionButton results={[{ blob: new Blob(["ok"]), fileName: "a.png", mimeType: "image/png", size: 2 }]} fileName="images.zip" />);
    expect(screen.getByRole("button", { name: "Download ZIP" })).toBeEnabled();
  });
});
