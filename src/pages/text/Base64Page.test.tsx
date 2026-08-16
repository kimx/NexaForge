import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { ReactElement } from "react";
import { vi } from "vitest";
import { Base64Page } from "./Base64Page";
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

describe("Base64Page", () => {
  it("shows processing state for file-to-base64 flow", async () => {
    const neverResolve = new Promise<string>(() => {});
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const hashSpy = vi
      .spyOn(textService, "fileToBase64")
      .mockImplementation(() => neverResolve);

    const { container } = renderWithRouter(<Base64Page />);

    const modeSelect = screen.getByRole("combobox", { name: "Mode" });
    fireEvent.change(modeSelect, { target: { value: "fileToBase64" } });

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
    consoleError.mockRestore();
  });

  it("shows error when file mode has no file", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const { container } = renderWithRouter(<Base64Page />);

    const modeSelect = screen.getByRole("combobox", { name: "Mode" });
    fireEvent.change(modeSelect, { target: { value: "fileToBase64" } });
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [] } });

    fireEvent.click(screen.getByRole("button", { name: "Process" }));
    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Unable to process this file.");
    });

    consoleError.mockRestore();
  });
});
