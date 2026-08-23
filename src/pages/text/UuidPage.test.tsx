import { fireEvent, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import * as uuidService from "../../services/text/uuidService";
import { renderWithProviders } from "../../test/renderWithProviders";
import { UuidPage } from "./UuidPage";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("UuidPage", () => {
  it("generates the chosen identifier type and presentation format", async () => {
    const generate = vi.spyOn(uuidService, "generateIdentifiers").mockReturnValue([
      "{01941F29-7C00-73E4-A310-744D2167FC5B}",
      "{01941F29-7C00-73E4-A310-744D2167FC5C}",
    ]);
    renderWithProviders(<UuidPage />);

    fireEvent.change(screen.getByLabelText("Identifier type"), { target: { value: "v7" } });
    fireEvent.change(screen.getByLabelText("Letter case"), { target: { value: "upper" } });
    fireEvent.change(screen.getByLabelText("Output format"), { target: { value: "braced" } });
    fireEvent.change(screen.getByLabelText("Count"), { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: "Generate identifiers" }));

    await waitFor(() => expect(generate).toHaveBeenCalledWith({
      kind: "v7",
      count: 2,
      case: "upper",
      format: "braced",
    }));
    expect(screen.getByText(/\{01941F29-7C00-73E4/)).toBeVisible();
  });

  it("labels .NET Guid as v4-compatible", () => {
    renderWithProviders(<UuidPage />);
    expect(screen.getByRole("option", { name: ".NET Guid (v4-compatible)" })).toBeVisible();
  });

  it("shows an error and retains controls when generation fails", async () => {
    vi.spyOn(uuidService, "generateIdentifiers").mockImplementation(() => {
      throw new Error("failure");
    });

    renderWithProviders(<UuidPage />);
    fireEvent.click(screen.getByRole("button", { name: "Generate identifiers" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Unable to generate identifiers.");
    expect(screen.getByLabelText("Identifier type")).toHaveValue("v4");
  });

  it("explains how to recover when secure randomness is unavailable", () => {
    vi.spyOn(uuidService, "generateIdentifiers").mockImplementation(() => {
      throw new uuidService.SecureUuidUnavailableError();
    });
    renderWithProviders(<UuidPage />);

    fireEvent.click(screen.getByRole("button", { name: "Generate identifiers" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Secure random generation is unavailable. Use a modern browser with Web Crypto support."
    );
  });
});
