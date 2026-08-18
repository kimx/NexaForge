import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { LanguageProvider } from "../context/LanguageContext";
import { ToolSidebar } from "./ToolSidebar";

describe("ToolSidebar", () => {
  it("expands a category to show its tools", () => {
    render(
      <MemoryRouter>
        <LanguageProvider>
          <ToolSidebar />
        </LanguageProvider>
      </MemoryRouter>
    );

    const imageCategory = screen.getByRole("button", { name: /image.*tools|影像.*工具/i });
    expect(imageCategory).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("link", { name: /image resize|影像縮放/i })).not.toBeInTheDocument();

    fireEvent.click(imageCategory);

    expect(imageCategory).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("link", { name: /image resize|影像縮放/i })).toHaveAttribute("href", "/image/resize");
  });
});
