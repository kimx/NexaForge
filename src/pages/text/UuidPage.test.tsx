import { fireEvent, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { UuidPage } from "./UuidPage";
import * as textService from "../../services/text/textService";
import { renderWithProviders } from "../../test/renderWithProviders";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("UuidPage", () => {
  it("shows error when generator fails", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(textService, "generateUuids").mockImplementation(() => {
      throw new Error("failure");
    });

    renderWithProviders(<UuidPage />);
    fireEvent.click(screen.getByRole("button", { name: "Generate" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Unable to process this file.");
    });

    consoleError.mockRestore();
  });

  it("renders each generated uuid on its own line", async () => {
    vi.spyOn(textService, "generateUuids").mockReturnValue(["111", "222"]);
    const { container } = renderWithProviders(<UuidPage />);
    fireEvent.click(screen.getByRole("button", { name: "Generate" }));
    const result = container.querySelector("pre");
    expect(result).not.toBeNull();

    await waitFor(() => {
      expect(result?.textContent).toBe("111\n222");
    });
  });
});
