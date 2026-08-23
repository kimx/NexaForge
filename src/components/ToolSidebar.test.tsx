import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { LanguageProvider } from "../context/LanguageContext";
import { ToolSidebar } from "./ToolSidebar";

describe("ToolSidebar", () => {
  it("uses the NexaForge wordmark as the home link without a duplicate tagline", () => {
    render(
      <MemoryRouter>
        <LanguageProvider initialLocale="en">
          <ToolSidebar />
        </LanguageProvider>
      </MemoryRouter>
    );

    const brandLink = screen.getByRole("link", { name: /NexaForge Utility File Workspace/i });
    expect(brandLink).toHaveAttribute("href", "/en");
    expect(within(brandLink).getByRole("img", { name: "NexaForge" })).toHaveAttribute(
      "src",
      "/nexaforge-logo.png"
    );
    expect(within(brandLink).queryByText("Utility File Workspace")).not.toBeInTheDocument();
  });

  it("exposes a localized navigation name instead of a raw translation key", () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <LanguageProvider>
          <ToolSidebar />
        </LanguageProvider>
      </MemoryRouter>
    );

    expect(screen.getByRole("navigation", { name: /tools navigation|工具導覽/i })).toBeInTheDocument();
    expect(screen.queryByLabelText("sidebar.navigation")).not.toBeInTheDocument();
  });

  it("expands the category containing the active tool", () => {
    render(
      <MemoryRouter initialEntries={["/data/json-formatter"]}>
        <LanguageProvider>
          <ToolSidebar />
        </LanguageProvider>
      </MemoryRouter>
    );

    const dataCategory = screen.getByRole("button", { name: /data.*tools|資料.*工具/i });
    expect(dataCategory).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("link", { name: /json formatter|json 格式化/i })).toHaveClass("is-active");
  });

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
    expect(screen.getByRole("link", { name: /favicon/i })).toHaveAttribute("href", "/image/favicon-generator");
  });

  it("keeps category toggles free of tool-count clutter", () => {
    render(
      <MemoryRouter>
        <LanguageProvider>
          <ToolSidebar />
        </LanguageProvider>
      </MemoryRouter>
    );

    const dataCategory = screen.getByRole("button", { name: /data.*tools|資料.*工具/i });
    expect(within(dataCategory).queryByText("4")).not.toBeInTheDocument();
  });


  it("shows Base64 in the developer category", () => {
    render(
      <MemoryRouter>
        <LanguageProvider>
          <ToolSidebar />
        </LanguageProvider>
      </MemoryRouter>
    );

    const developerCategory = screen.getByRole("button", { name: /developer.*tools|開發者.*工具/i });
    fireEvent.click(developerCategory);

    expect(screen.getByRole("link", { name: /base64/i })).toHaveAttribute("href", "/developer/base64");
  });

  it("groups QR and barcode workflows in a dedicated category", () => {
    render(
      <MemoryRouter>
        <LanguageProvider initialLocale="en">
          <ToolSidebar />
        </LanguageProvider>
      </MemoryRouter>
    );

    const category = screen.getByRole("button", { name: /QR & Barcode.*tools/i });
    fireEvent.click(category);

    expect(screen.getByRole("link", { name: "QR Code Reader" })).toHaveAttribute("href", "/en/qr-code/reader");
    expect(screen.getByRole("link", { name: /Code128/ })).toHaveAttribute("href", "/en/barcode/generator");
  });

  it("does not show the documentation resource link", () => {
    render(
      <MemoryRouter>
        <LanguageProvider>
          <ToolSidebar />
        </LanguageProvider>
      </MemoryRouter>
    );

    expect(screen.queryByRole("link", { name: /documentation|文件/i })).not.toBeInTheDocument();
  });

  it("clears a tool search and restores category navigation", () => {
    render(
      <MemoryRouter>
        <LanguageProvider>
          <ToolSidebar />
        </LanguageProvider>
      </MemoryRouter>
    );

    const search = screen.getByRole("textbox", { name: /tool search|工具搜尋/i });
    fireEvent.change(search, { target: { value: "json" } });

    expect(screen.queryByRole("button", { name: /data.*tools|資料.*工具/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /clear search|清除搜尋/i }));

    expect(search).toHaveValue("");
    expect(screen.getByRole("button", { name: /data.*tools|資料.*工具/i })).toBeInTheDocument();
  });

  it("finds tools through aliases and keywords", () => {
    render(<MemoryRouter><LanguageProvider initialLocale="en"><ToolSidebar /></LanguageProvider></MemoryRouter>);
    fireEvent.change(screen.getByRole("textbox", { name: /tool search/i }), { target: { value: "ico" } });
    expect(screen.getByRole("link", { name: "Favicon Generator" })).toHaveAttribute("href", "/en/image/favicon-generator");
  });
});
