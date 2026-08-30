import { fireEvent, screen } from "@testing-library/react";
import { renderWithProviders } from "../../test/renderWithProviders";
import { TextDiffPage } from "./TextDiffPage";

describe("TextDiffPage", () => {
  it("compares only on request and switches between accessible modes", () => {
    renderWithProviders(<TextDiffPage />);
    fireEvent.change(screen.getByLabelText(/original/i), { target: { value: "apple\norange" } });
    fireEvent.change(screen.getByLabelText(/changed/i), { target: { value: "apple\nbanana\norange" } });
    fireEvent.click(screen.getByRole("button", { name: /^compare$/i }));

    expect(screen.getByText(/1 addition/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/added line/i)).toHaveTextContent("banana");
    fireEvent.click(screen.getByRole("radio", { name: /unified/i }));
    expect(screen.getByLabelText(/unified text differences/i)).toHaveTextContent("+banana");
    expect(screen.getByRole("link", { name: /clean text/i })).toHaveAttribute("href", "/en/text/text-cleaner");
  });

  it("presents the Chinese comparison settings in clear groups", () => {
    renderWithProviders(<TextDiffPage />, { locale: "zh-TW" });

    expect(screen.getByRole("heading", { level: 3, name: "比對規則" })).toBeVisible();
    expect(screen.getByRole("heading", { level: 3, name: "顯示方式" })).toBeVisible();
    expect(screen.getByLabelText("忽略空白差異")).toBeVisible();
    expect(screen.getByRole("radio", { name: "並排檢視" })).toBeVisible();
    expect(screen.getByRole("button", { name: "開始比對" })).toBeVisible();
  });
});
