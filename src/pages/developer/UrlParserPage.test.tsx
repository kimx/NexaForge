import { fireEvent, screen, within } from "@testing-library/react";
import { vi } from "vitest";
import { renderWithProviders } from "../../test/renderWithProviders";
import { UrlParserPage } from "./UrlParserPage";

describe("UrlParserPage", () => {
  it("parses pasted input immediately and preserves duplicate query rows", () => {
    renderWithProviders(<UrlParserPage />);

    fireEvent.change(screen.getByLabelText("URL"), {
      target: { value: "https://abc.com/api?id=123&type=A&id=456" },
    });

    expect(screen.getAllByText("abc.com")).toHaveLength(2);
    expect(screen.getByText("/api")).toBeVisible();
    const table = screen.getByRole("table", { name: "Query parameters" });
    expect(within(table).getAllByRole("row")).toHaveLength(4);
    expect(within(table).getAllByText("id")).toHaveLength(2);
  });

  it("copies one parsed field with an explicit accessible name", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    renderWithProviders(<UrlParserPage />);

    fireEvent.change(screen.getByLabelText("URL"), {
      target: { value: "https://abc.com/api?id=123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Copy host" }));

    expect(writeText).toHaveBeenCalledWith("abc.com");
    expect(await screen.findByRole("status")).toHaveTextContent("Copied");
  });

  it("associates invalid input and clears the stale parsed result", () => {
    renderWithProviders(<UrlParserPage />);

    const input = screen.getByLabelText("URL");
    fireEvent.change(input, { target: { value: "https://abc.com/api" } });
    expect(screen.getAllByText("abc.com")).toHaveLength(2);

    fireEvent.change(input, { target: { value: "/relative" } });

    const error = screen.getByText("Enter a valid absolute URL.");
    expect(input).toHaveAttribute("aria-describedby", error.id);
    expect(screen.queryAllByText("abc.com")).toHaveLength(0);
  });
});
