import { fireEvent, screen } from "@testing-library/react";
import { vi } from "vitest";
import * as secretService from "../../services/security/secretService";
import { renderWithProviders } from "../../test/renderWithProviders";
import { SecretGeneratorPage } from "./SecretGeneratorPage";

const { trackEvent } = vi.hoisted(() => ({ trackEvent: vi.fn() }));
vi.mock("../../utils/analytics", () => ({ trackEvent }));

afterEach(() => {
  vi.restoreAllMocks();
  trackEvent.mockClear();
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
    expect(screen.getByLabelText("Privacy Notice")).toHaveTextContent("never uploaded");
    expect(trackEvent.mock.calls).toEqual([
      ["tool_open", { tool: "secret-generator" }],
      ["process_start", { tool: "secret-generator" }],
      ["process_success", { tool: "secret-generator" }],
    ]);
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

  it("associates an actionable error when every password character set is disabled", () => {
    renderWithProviders(<SecretGeneratorPage />);
    const group = screen.getByRole("group", { name: "Character sets" });
    for (const checkbox of screen.getAllByRole("checkbox")) {
      fireEvent.click(checkbox);
    }

    fireEvent.click(screen.getByRole("button", { name: "Generate secret" }));

    const error = screen.getByRole("alert");
    expect(error).toHaveTextContent("Select at least one character set.");
    expect(group).toHaveAttribute("aria-describedby", error.id);
    expect(group).toHaveAttribute("aria-invalid", "true");
  });
});
