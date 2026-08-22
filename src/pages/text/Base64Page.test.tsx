import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { ReactElement } from "react";
import { vi } from "vitest";
import { Base64Page } from "./Base64Page";
import * as textService from "../../services/text/textService";
import { LanguageProvider } from "../../context/LanguageContext";

afterEach(() => {
  vi.restoreAllMocks();
});

function renderWithRouter(ui: ReactElement): ReturnType<typeof render> {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <LanguageProvider>{ui}</LanguageProvider>
    </MemoryRouter>
  );
}

describe("Base64Page", () => {
  it("places the copy action below the result instead of in options", () => {
    renderWithRouter(<Base64Page />);

    const options = screen.getByRole("heading", { name: "Options" }).closest("section");
    const result = screen.getByRole("heading", { name: "Result" }).closest("section");

    expect(options).not.toBeNull();
    expect(result).not.toBeNull();
    expect(within(options as HTMLElement).queryByRole("button", { name: "Copy" })).not.toBeInTheDocument();
    expect(within(result as HTMLElement).getByRole("button", { name: "Copy" })).toBeInTheDocument();
  });

  it("places the text input in the workspace", () => {
    renderWithRouter(<Base64Page />);

    const workspace = screen.getByRole("heading", { name: /Tool Workspace|工具工作區/i }).closest("section");

    expect(workspace).not.toBeNull();
    expect(
      within(workspace as HTMLElement).getByRole("textbox", {
        name: /Enter text in the field below|請在下方輸入文字/i,
      })
    ).toBeInTheDocument();
  });

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
