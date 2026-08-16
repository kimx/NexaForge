import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import type { ReactElement } from "react";
import { HashPage } from "./HashPage";
import * as textService from "../../services/text/textService";

afterEach(() => {
  vi.restoreAllMocks();
});

function renderWithRouter(ui: ReactElement): ReturnType<typeof render> {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      {ui}
    </MemoryRouter>
  );
}

describe("HashPage", () => {
  it("shows error when hashing fails", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(textService, "hashText").mockRejectedValue(new Error("invalid"));
    const { container } = renderWithRouter(<HashPage />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["abc"], "sample.txt", { type: "text/plain" });
    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.click(screen.getByRole("button", { name: "Process" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Unable to process this file.");
    });

    consoleError.mockRestore();
  });

  it("disables process button while hashing is in progress", async () => {
    const hashSpy = vi
      .spyOn(textService, "hashText")
      .mockImplementation(() => new Promise<string>(() => {}));
    const { container } = renderWithRouter(<HashPage />);

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["abc"], "sample.txt", { type: "text/plain" });
    fireEvent.change(input, { target: { files: [file] } });

    fireEvent.click(screen.getByRole("button", { name: "Process" }));

    await waitFor(() => {
      const processingButton = screen.getByRole("button", { name: "Processing..." });
      expect(processingButton).toBeDisabled();
      expect(processingButton).toHaveAttribute("aria-busy", "true");
    });

    hashSpy.mockRestore();
  });
});
