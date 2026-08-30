import { fireEvent, screen } from "@testing-library/react";
import { renderWithProviders } from "../../test/renderWithProviders";
import { TextCleanerPage } from "./TextCleanerPage";

describe("TextCleanerPage", () => {
  it("cleans text and offers the next workflow tools", () => {
    renderWithProviders(<TextCleanerPage />);
    fireEvent.change(screen.getByLabelText(/input text/i), { target: { value: "  apple  \n\n banana  " } });
    fireEvent.click(screen.getByLabelText(/trim each line/i));
    fireEvent.click(screen.getByRole("button", { name: /clean text/i }));

    expect(screen.getByLabelText(/cleaned text/i)).toHaveValue("apple\n\nbanana");
    expect(screen.getByRole("link", { name: /find & replace/i })).toHaveAttribute("href", "/en/text/find-replace");
    expect(screen.getByRole("link", { name: /compare text/i })).toHaveAttribute("href", "/en/text/diff");
  });

  it("groups the Chinese cleanup settings by their effect", () => {
    renderWithProviders(<TextCleanerPage />, { locale: "zh-TW" });

    expect(screen.getByRole("heading", { level: 3, name: "行首尾空白" })).toBeVisible();
    expect(screen.getByRole("heading", { level: 3, name: "空白與空行" })).toBeVisible();
    expect(screen.getByRole("heading", { level: 3, name: "格式標準化" })).toBeVisible();
    expect(screen.getByLabelText("移除每行前後空白")).toBeVisible();
    expect(screen.getByRole("button", { name: "清理文字" })).toBeVisible();
  });
});
