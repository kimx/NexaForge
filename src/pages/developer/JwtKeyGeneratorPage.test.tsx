import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { ReactElement } from "react";
import { LanguageProvider } from "../../context/LanguageContext";
import { JwtKeyGeneratorPage } from "./JwtKeyGeneratorPage";

function renderWithRouter(ui: ReactElement): ReturnType<typeof render> {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <LanguageProvider initialLocale="en">{ui}</LanguageProvider>
    </MemoryRouter>
  );
}

describe("JwtKeyGeneratorPage", () => {
  it("follows the decoder layout with output and copy action in the result section", () => {
    renderWithRouter(<JwtKeyGeneratorPage />);

    const workspace = screen.getByRole("heading", { name: "Tool Workspace" }).closest("section");
    const options = screen.getByRole("heading", { name: "Options" }).closest("section");
    const result = screen.getByRole("heading", { name: "Result" }).closest("section");

    expect(workspace).not.toBeNull();
    expect(options).not.toBeNull();
    expect(result).not.toBeNull();
    expect(
      within(workspace as HTMLElement).getByRole("combobox", { name: /Secret Key Length \(bytes\)/i })
    ).toBeInTheDocument();
    expect(within(options as HTMLElement).queryByRole("button", { name: "Copy Key" })).not.toBeInTheDocument();
    expect(
      within(result as HTMLElement).getByRole("textbox", { name: /Generated Key/i })
    ).toBeInTheDocument();
    expect(within(result as HTMLElement).getByRole("button", { name: "Copy Key" })).toBeInTheDocument();
  });
});
