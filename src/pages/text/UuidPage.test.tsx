import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { ReactElement } from "react";
import { vi } from "vitest";
import { UuidPage } from "./UuidPage";
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

describe("UuidPage", () => {
  it("shows error when generator fails", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(textService, "generateUuids").mockImplementation(() => {
      throw new Error("failure");
    });

    renderWithRouter(<UuidPage />);
    fireEvent.click(screen.getByRole("button", { name: "Generate" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Unable to process this file.");
    });

    consoleError.mockRestore();
  });

  it("generates uuids and renders output", async () => {
    vi.spyOn(textService, "generateUuids").mockReturnValue(["111", "222"]);
    const { container } = renderWithRouter(<UuidPage />);
    fireEvent.click(screen.getByRole("button", { name: "Generate" }));
    const result = container.querySelector("pre");
    expect(result).not.toBeNull();

    await waitFor(() => {
      expect(result).toHaveTextContent("111");
      expect(result).toHaveTextContent("222");
    });
  });
});
