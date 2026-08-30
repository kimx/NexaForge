import { fireEvent, screen } from "@testing-library/react";
import { renderWithProviders } from "../../test/renderWithProviders";
import { FindReplacePage } from "./FindReplacePage";

describe("FindReplacePage", () => {
  it("replaces matching text and exposes regex workflow navigation", () => {
    renderWithProviders(<FindReplacePage />);
    fireEvent.change(screen.getByLabelText(/^text$/i), { target: { value: "Cat cat catalog" } });
    fireEvent.change(screen.getByLabelText(/^find$/i), { target: { value: "cat" } });
    fireEvent.change(screen.getByLabelText(/replace with/i), { target: { value: "dog" } });
    fireEvent.click(screen.getByLabelText(/whole word/i));
    fireEvent.click(screen.getByRole("button", { name: /replace all/i }));

    expect(screen.getByDisplayValue("dog dog catalog")).toBeInTheDocument();
    expect(screen.getByText(/2 replacements/i)).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText(/use regular expression/i));
    expect(screen.getByRole("link", { name: /test regex/i })).toHaveAttribute("href", "/en/developer/regex-tester");
  });

  it("reveals Chinese regex settings only when regular expressions are enabled", () => {
    renderWithProviders(<FindReplacePage />, { locale: "zh-TW" });

    expect(screen.getByRole("heading", { level: 3, name: "搜尋條件" })).toBeVisible();
    expect(screen.queryByRole("heading", { level: 3, name: "正規表達式" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("使用正規表達式"));
    expect(screen.getByRole("heading", { level: 3, name: "正規表達式" })).toBeVisible();
    expect(screen.getByRole("button", { name: "全部取代" })).toBeVisible();
  });
});
