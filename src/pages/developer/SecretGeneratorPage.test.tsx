import { fireEvent, screen } from "@testing-library/react";
import { vi } from "vitest";
import * as secretService from "../../services/security/secretService";
import { renderWithProviders } from "../../test/renderWithProviders";
import { SecretGeneratorPage } from "./SecretGeneratorPage";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("SecretGeneratorPage", () => {
  it("generates a password and labels its entropy as an estimate", () => {
    vi.spyOn(secretService, "generateSecret").mockReturnValue({
      value: "aB3!secureValue",
      entropyBits: 91.234,
      entropyKind: "estimate",
      alphabetSize: 88,
    });
    renderWithProviders(<SecretGeneratorPage />);

    fireEvent.click(screen.getByRole("button", { name: "Generate secret" }));

    expect(screen.getByLabelText("Generated secret")).toHaveValue("aB3!secureValue");
    expect(screen.getByText("Estimated upper-bound entropy: 91.2 bits")).toBeVisible();
  });

  it("shows only the options relevant to byte-based output", () => {
    renderWithProviders(<SecretGeneratorPage />);

    fireEvent.change(screen.getByLabelText("Secret type"), { target: { value: "hex" } });

    expect(screen.getByLabelText("Byte count")).toBeVisible();
    expect(screen.queryByLabelText("Length")).not.toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Character sets" })).not.toBeInTheDocument();
  });

  it("keeps selectable output when clipboard access fails", async () => {
    vi.spyOn(secretService, "generateSecret").mockReturnValue({
      value: "0123456789abcdef",
      entropyBits: 64,
      entropyKind: "exact",
    });
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(new Error("denied")) },
    });
    renderWithProviders(<SecretGeneratorPage />);
    fireEvent.change(screen.getByLabelText("Secret type"), { target: { value: "hex" } });
    fireEvent.click(screen.getByRole("button", { name: "Generate secret" }));
    fireEvent.click(screen.getByRole("button", { name: "Copy" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Unable to copy. Select the secret manually.");
    expect(screen.getByLabelText("Generated secret")).toHaveValue("0123456789abcdef");
  });
});
