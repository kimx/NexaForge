import { fireEvent, screen } from "@testing-library/react";
import { vi } from "vitest";
import { renderWithProviders } from "../test/renderWithProviders";
import { CodeOutputPanel } from "./CodeOutputPanel";

describe("CodeOutputPanel", () => {
  it("shows an empty state without copy or download actions", () => {
    renderWithProviders(
      <CodeOutputPanel label="Generated code" value="" fileName="model.ts" language="typescript" emptyText="Nothing generated" />
    );
    expect(screen.getByText("Nothing generated")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Copy" })).not.toBeInTheDocument();
  });

  it("renders generated text and copies it", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    renderWithProviders(
      <CodeOutputPanel label="Generated code" value="export interface User {}" fileName="model.ts" language="typescript" emptyText="Nothing generated" />
    );
    fireEvent.click(screen.getByRole("button", { name: "Copy" }));
    expect(writeText).toHaveBeenCalledWith("export interface User {}");
    expect(await screen.findByRole("status")).toHaveTextContent("Copied");
    expect(screen.getByRole("button", { name: "Download" })).toBeInTheDocument();
  });

  it("shows an inline error and keeps output selectable when copy is rejected", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("denied"));
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    renderWithProviders(
      <CodeOutputPanel label="Generated code" value="keep me" fileName="model.ts" language="typescript" emptyText="Nothing generated" />
    );

    fireEvent.click(screen.getByRole("button", { name: "Copy" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Unable to copy result to clipboard.");
    expect(screen.getByLabelText("Generated code")).toHaveValue("keep me");
  });
});
