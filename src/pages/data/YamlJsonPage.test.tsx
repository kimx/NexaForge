import { fireEvent, screen, within } from "@testing-library/react";
import { vi } from "vitest";
import { renderWithProviders } from "../../test/renderWithProviders";
import { YamlJsonPage } from "./YamlJsonPage";

describe("YamlJsonPage", () => {
  beforeEach(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: vi.fn(() => "blob:test"),
    });
  });

  it("renders format controls and line-numbered input and output editors", () => {
    renderWithProviders(<YamlJsonPage />, { route: "/en/data/yaml-json" });

    expect(screen.getByRole("heading", { level: 1, name: "YAML to JSON / JSON to YAML Converter" })).toBeVisible();
    const workspace = screen.getByRole("heading", { name: "Tool Workspace" }).closest("section");
    expect(workspace).not.toBeNull();
    expect(within(workspace as HTMLElement).getByRole("radio", { name: "JSON to YAML" })).toBeChecked();
    expect(within(workspace as HTMLElement).getByRole("radio", { name: "YAML to JSON" })).not.toBeChecked();
    expect(screen.getByRole("textbox", { name: "JSON input" })).toHaveAttribute("rows", "16");
    expect(screen.getByText("Your converted result will appear here.")).toBeInTheDocument();
  });

  it("converts, copies, downloads, swaps, and clears content", async () => {
    renderWithProviders(<YamlJsonPage />, { route: "/en/data/yaml-json" });
    const input = screen.getByRole("textbox", { name: "JSON input" });
    fireEvent.change(input, { target: { value: '{"name":"NexaForge"}' } });
    fireEvent.click(screen.getByRole("button", { name: "Convert" }));

    const output = await screen.findByRole("textbox", { name: "YAML output" });
    expect(output).toHaveValue("name: NexaForge");

    fireEvent.click(screen.getByRole("button", { name: "Copy" }));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("name: NexaForge");
    expect(await screen.findByText(/Copied/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Download" }));
    expect(URL.createObjectURL).toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Swap input and output" }));
    expect(screen.getByRole("textbox", { name: "YAML input" })).toHaveValue("name: NexaForge");
    expect(screen.getByRole("textbox", { name: "JSON output" })).toHaveValue('{"name":"NexaForge"}');

    fireEvent.click(screen.getByRole("button", { name: "Convert" }));
    expect(await screen.findByRole("textbox", { name: "JSON output" })).toHaveValue('{\n  "name": "NexaForge"\n}');

    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(screen.getByRole("textbox", { name: "YAML input" })).toHaveValue("");
    expect(screen.getByText("Your converted result will appear here.")).toBeInTheDocument();
  });

  it("shows a clear YAML syntax error with line and column", () => {
    renderWithProviders(<YamlJsonPage />, { route: "/en/data/yaml-json" });
    fireEvent.click(screen.getByRole("radio", { name: "YAML to JSON" }));
    fireEvent.change(screen.getByRole("textbox", { name: "YAML input" }), {
      target: { value: "name: [broken" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Convert" }));

    expect(screen.getByRole("alert")).toHaveTextContent(/YAML syntax error/);
    expect(screen.getByRole("alert")).toHaveTextContent(/Line \d+, column \d+/);
  });
});
