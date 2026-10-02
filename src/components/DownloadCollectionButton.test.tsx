import { fireEvent, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { renderWithProviders } from "../test/renderWithProviders";
import { DownloadCollectionButton } from "./DownloadCollectionButton";
import * as download from "../utils/download";

describe("DownloadCollectionButton", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("is disabled without successful results and enabled otherwise", () => {
    const { unmount } = renderWithProviders(<DownloadCollectionButton results={[]} fileName="images.zip" />);
    expect(screen.getByRole("button", { name: "Download ZIP" })).toBeDisabled();
    unmount();
    renderWithProviders(<DownloadCollectionButton results={[{ blob: new Blob(["ok"]), fileName: "a.png", mimeType: "image/png", size: 2 }]} fileName="images.zip" />);
    expect(screen.getByRole("button", { name: "Download ZIP" })).toBeEnabled();
  });

  it("reports a download trigger only after the browser download call succeeds", async () => {
    const onDownloaded = vi.fn();
    vi.spyOn(download, "downloadBlob").mockImplementation(() => undefined);
    renderWithProviders(
      <DownloadCollectionButton
        results={[{ blob: new Blob(["ok"]), fileName: "a.png", mimeType: "image/png", size: 2 }]}
        fileName="images.zip"
        onDownloaded={onDownloaded}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Download ZIP" }));
    await waitFor(() => expect(onDownloaded).toHaveBeenCalledOnce());
  });
});
